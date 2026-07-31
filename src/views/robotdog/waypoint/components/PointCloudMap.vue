<template>
  <div class="point-cloud-map">
    <div class="map-hd">
      <span class="title">3D 点云地图</span>
      <div class="ops">
        <a-space>
          <a-tag color="arcoblue" size="small">航点 {{ waypoints.length }}</a-tag>
          <a-tag v-if="routeWaypointIds.length" color="green" size="small">
            航线 {{ routeWaypointIds.length }} 点
          </a-tag>
          <a-button size="mini" @click="resetCamera">复位视角</a-button>
        </a-space>
      </div>
    </div>
    <div ref="hostRef" class="map-canvas" />
    <div class="map-tip">拖拽旋转 · 滚轮缩放 · 右键平移 · 选中航线显示绿色动态路径</div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WaypointItem } from '@/api/robotdog/waypoint';

const props = defineProps<{
  waypoints: WaypointItem[];
  activeWaypointId: number | null;
  routeWaypointIds?: number[];
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let cloud: THREE.Points | null = null;
let markerGroup: THREE.Group | null = null;
let routeGroup: THREE.Group | null = null;
let raf = 0;
let resizeObserver: ResizeObserver | null = null;
let lastTs = 0;

/** 占位点云：原点中心 20m × 20m × 0.3m */
const CLOUD_SIZE = 20;
const CLOUD_HEIGHT = 0.3;
const ROUTE_COLOR = 0x22c55e;
const SEGMENT_DURATION = 0.45;

const round2 = (n: number) => Number(n.toFixed(2));

type RouteAnimState = {
  points: THREE.Vector3[];
  /** 已完整画出的段数 */
  doneSegments: number;
  /** 当前段绘制进度 0~1 */
  segT: number;
  /** 虚线流动偏移 */
  dashOffset: number;
  growLine: THREE.Line | null;
  flowLine: THREE.Line | null;
  finished: boolean;
};

const routeAnim: RouteAnimState = {
  points: [],
  doneSegments: 0,
  segT: 0,
  dashOffset: 0,
  growLine: null,
  flowLine: null,
  finished: false,
};

const wpToScenePos = (wp: Pick<WaypointItem, 'x' | 'y' | 'z'>) => {
  const x = round2(Number(wp.x ?? 0));
  const y = round2(Number(wp.y ?? 0));
  const z = round2(Number(wp.z ?? 0));
  return new THREE.Vector3(x, z + 0.25, y);
};

const disposeObject3D = (obj: THREE.Object3D) => {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
    if (child instanceof THREE.Sprite) {
      const mat = child.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  });
};

const clearGroup = (group: THREE.Group | null) => {
  if (!group) return;
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    disposeObject3D(child);
  }
};

const makeAxisLabel = (text: string, color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    })
  );
  sprite.scale.set(0.9, 0.9, 1);
  return sprite;
};

/**
 * 航点坐标系：场景 X←wp.x，场景 Z←wp.y，场景 Y←wp.z（高度）
 * 轴线半透明虚化显示方向
 */
const buildAxesGuide = (length = 3) => {
  const group = new THREE.Group();
  const axes: Array<{
    label: string;
    dir: THREE.Vector3;
    color: number;
    labelColor: string;
  }> = [
    { label: 'X', dir: new THREE.Vector3(1, 0, 0), color: 0xf87171, labelColor: 'rgba(248,113,113,0.85)' },
    { label: 'Y', dir: new THREE.Vector3(0, 0, 1), color: 0x60a5fa, labelColor: 'rgba(96,165,250,0.85)' },
    { label: 'Z', dir: new THREE.Vector3(0, 1, 0), color: 0x4ade80, labelColor: 'rgba(74,222,128,0.85)' },
  ];

  axes.forEach(({ label, dir, color, labelColor }) => {
    const end = dir.clone().multiplyScalar(length);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), end]);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    group.add(new THREE.Line(geo, mat));

    // 箭头小尖端
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.28, 10),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    cone.position.copy(end);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(cone);

    const sprite = makeAxisLabel(label, labelColor);
    sprite.position.copy(dir.clone().multiplyScalar(length + 0.45));
    group.add(sprite);
  });

  return group;
};

const buildCloud = () => {
  const count = 10000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * CLOUD_SIZE;
    const y = (Math.random() - 0.5) * CLOUD_SIZE;
    const z = Math.random() * CLOUD_HEIGHT;
    positions[i * 3] = x;
    positions[i * 3 + 1] = z;
    positions[i * 3 + 2] = y;
    const c = 0.45 + Math.random() * 0.4;
    colors[i * 3] = c * 0.55;
    colors[i * 3 + 1] = c * 0.75;
    colors[i * 3 + 2] = c;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
};

const syncMarkers = () => {
  if (!markerGroup || !scene) return;
  clearGroup(markerGroup);
  const routeSet = new Set(props.routeWaypointIds || []);
  props.waypoints.forEach((wp, index) => {
    const active = wp.id === props.activeWaypointId;
    const onRoute = routeSet.has(wp.id);
    const x = round2(Number(wp.x ?? 0));
    const y = round2(Number(wp.y ?? 0));
    const z = round2(Number(wp.z ?? 0));
    const geo = new THREE.SphereGeometry(active ? 0.22 : onRoute ? 0.18 : 0.16, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: active ? 0xff6a00 : onRoute ? ROUTE_COLOR : 0x1677ff,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, z + 0.2, y);
    markerGroup!.add(mesh);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 128, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${index + 1}.${wp.name}`.slice(0, 10), 8, 30);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true })
    );
    sprite.scale.set(1.6, 0.6, 1);
    sprite.position.set(x, z + 0.7, y);
    markerGroup!.add(sprite);
  });
};

const resolveRoutePoints = (): THREE.Vector3[] => {
  const ids = props.routeWaypointIds || [];
  if (ids.length < 2) return [];
  const map = new Map(props.waypoints.map((w) => [w.id, w]));
  const points: THREE.Vector3[] = [];
  ids.forEach((id) => {
    const wp = map.get(id);
    if (wp) points.push(wpToScenePos(wp));
  });
  return points.length >= 2 ? points : [];
};

const makeGrowLine = (maxPoints: number) => {
  const positions = new Float32Array(maxPoints * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color: ROUTE_COLOR,
    linewidth: 2,
    transparent: true,
    opacity: 0.95,
  });
  return new THREE.Line(geometry, material);
};

const makeFlowLine = (points: THREE.Vector3[]) => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: ROUTE_COLOR,
    dashSize: 0.35,
    gapSize: 0.22,
    transparent: true,
    opacity: 0.9,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.visible = false;
  return line;
};

const writeGrowPositions = (points: THREE.Vector3[], tip: THREE.Vector3, doneSegments: number) => {
  if (!routeAnim.growLine) return;
  const attr = routeAnim.growLine.geometry.getAttribute('position') as THREE.BufferAttribute;
  let idx = 0;
  for (let i = 0; i <= doneSegments; i++) {
    const p = points[i];
    attr.setXYZ(idx++, p.x, p.y, p.z);
  }
  attr.setXYZ(idx++, tip.x, tip.y, tip.z);
  attr.needsUpdate = true;
  routeAnim.growLine.geometry.setDrawRange(0, idx);
  routeAnim.growLine.geometry.computeBoundingSphere();
};

const syncRoutePath = () => {
  if (!routeGroup || !scene) return;
  clearGroup(routeGroup);
  routeAnim.growLine = null;
  routeAnim.flowLine = null;
  routeAnim.points = resolveRoutePoints();
  routeAnim.doneSegments = 0;
  routeAnim.segT = 0;
  routeAnim.dashOffset = 0;
  routeAnim.finished = false;

  if (routeAnim.points.length < 2) return;

  routeAnim.growLine = makeGrowLine(routeAnim.points.length + 1);
  routeAnim.flowLine = makeFlowLine(routeAnim.points);
  routeGroup.add(routeAnim.growLine);
  routeGroup.add(routeAnim.flowLine);

  // 起点先亮一点
  writeGrowPositions(routeAnim.points, routeAnim.points[0].clone(), 0);
};

const updateRouteAnim = (dt: number) => {
  const points = routeAnim.points;
  if (points.length < 2) return;

  // 虚线流动（完成后更明显）
  routeAnim.dashOffset -= dt * 1.6;
  if (routeAnim.flowLine) {
    const mat = routeAnim.flowLine.material as THREE.LineDashedMaterial;
    mat.dashOffset = routeAnim.dashOffset;
  }

  if (routeAnim.finished) return;

  const totalSeg = points.length - 1;
  routeAnim.segT += dt / SEGMENT_DURATION;

  while (routeAnim.segT >= 1 && routeAnim.doneSegments < totalSeg) {
    routeAnim.segT -= 1;
    routeAnim.doneSegments += 1;
  }

  if (routeAnim.doneSegments >= totalSeg) {
    routeAnim.doneSegments = totalSeg;
    routeAnim.segT = 1;
    routeAnim.finished = true;
    writeGrowPositions(points, points[points.length - 1].clone(), totalSeg);
    if (routeAnim.growLine) routeAnim.growLine.visible = false;
    if (routeAnim.flowLine) routeAnim.flowLine.visible = true;
    return;
  }

  const a = points[routeAnim.doneSegments];
  const b = points[routeAnim.doneSegments + 1];
  const tip = a.clone().lerp(b, Math.min(routeAnim.segT, 1));
  writeGrowPositions(points, tip, routeAnim.doneSegments);
};

const resetCamera = () => {
  if (!camera || !controls) return;
  camera.position.set(12, 10, 12);
  controls.target.set(0, 0, 0);
  controls.update();
};

const renderLoop = (ts?: number) => {
  if (!renderer || !scene || !camera || !controls) return;
  const now = ts ?? performance.now();
  const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 0.016;
  lastTs = now;
  updateRouteAnim(dt);
  controls.update();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(renderLoop);
};

const resize = () => {
  if (!hostRef.value || !renderer || !camera) return;
  const { clientWidth: w, clientHeight: h } = hostRef.value;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
};

onMounted(() => {
  if (!hostRef.value) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);

  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(12, 10, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  hostRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const grid = new THREE.GridHelper(CLOUD_SIZE, CLOUD_SIZE, 0x2a4a7a, 0x1a2a44);
  scene.add(grid);
  scene.add(buildAxesGuide(3));
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  cloud = buildCloud();
  scene.add(cloud);

  markerGroup = new THREE.Group();
  scene.add(markerGroup);
  routeGroup = new THREE.Group();
  scene.add(routeGroup);
  syncMarkers();
  syncRoutePath();

  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hostRef.value);
  renderLoop();
});

watch(
  () => [props.waypoints, props.activeWaypointId, props.routeWaypointIds],
  () => {
    syncMarkers();
    syncRoutePath();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  controls?.dispose();
  cloud?.geometry.dispose();
  (cloud?.material as THREE.Material | undefined)?.dispose();
  if (markerGroup) clearGroup(markerGroup);
  if (routeGroup) clearGroup(routeGroup);
  renderer?.dispose();
  if (renderer?.domElement?.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement);
  }
  renderer = null;
  scene = null;
  camera = null;
  controls = null;
  cloud = null;
  markerGroup = null;
  routeGroup = null;
});

defineExpose({ resetCamera });
</script>

<style lang="less" scoped>
.point-cloud-map {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b1220;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: hidden;
}

.map-hd {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  background: rgba(22, 119, 255, 0.12);

  .title {
    color: #e8f3ff;
    font-size: 14px;
    font-weight: 600;
  }
}

.map-canvas {
  flex: 1;
  min-height: 0;

  :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
}

.map-tip {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  color: rgba(186, 220, 255, 0.7);
  border-top: 1px solid rgba(64, 158, 255, 0.15);
}
</style>

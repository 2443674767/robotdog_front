<template>
  <div class="point-cloud-map">
    <div class="map-hd">
      <span class="title">3D 点云地图</span>
      <div class="ops">
        <a-space>
          <a-tag color="arcoblue" size="small">航点 {{ waypoints.length }}</a-tag>
          <a-button size="mini" @click="resetCamera">复位视角</a-button>
        </a-space>
      </div>
    </div>
    <div ref="hostRef" class="map-canvas" />
    <div class="map-tip">拖拽旋转 · 滚轮缩放 · 右键平移（占位点云，后续可换真实 PCD/LAS）</div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WaypointItem } from '../mock';

const props = defineProps<{
  waypoints: WaypointItem[];
  activeWaypointId: number | null;
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let cloud: THREE.Points | null = null;
let markerGroup: THREE.Group | null = null;
let raf = 0;
let resizeObserver: ResizeObserver | null = null;

const buildCloud = () => {
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 12;
    const z = Math.random() * 0.4;
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
  while (markerGroup.children.length) {
    const child = markerGroup.children[0];
    markerGroup.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
    if (child instanceof THREE.Sprite) {
      const mat = child.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  }
  props.waypoints.forEach((wp, index) => {
    const active = wp.id === props.activeWaypointId;
    const geo = new THREE.SphereGeometry(active ? 0.22 : 0.16, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: active ? 0xff6a00 : 0x1677ff,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(wp.x, wp.z + 0.2, wp.y);
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
    sprite.position.set(wp.x, wp.z + 0.7, wp.y);
    markerGroup!.add(sprite);
  });
};

const resetCamera = () => {
  if (!camera || !controls) return;
  camera.position.set(8, 8, 10);
  controls.target.set(0, 0, 0);
  controls.update();
};

const renderLoop = () => {
  if (!renderer || !scene || !camera || !controls) return;
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
  camera.position.set(8, 8, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  hostRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const grid = new THREE.GridHelper(24, 24, 0x2a4a7a, 0x1a2a44);
  scene.add(grid);
  scene.add(new THREE.AxesHelper(2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  cloud = buildCloud();
  scene.add(cloud);

  markerGroup = new THREE.Group();
  scene.add(markerGroup);
  syncMarkers();

  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hostRef.value);
  renderLoop();
});

watch(
  () => [props.waypoints, props.activeWaypointId],
  () => syncMarkers(),
  { deep: true }
);

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  controls?.dispose();
  cloud?.geometry.dispose();
  (cloud?.material as THREE.Material | undefined)?.dispose();
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

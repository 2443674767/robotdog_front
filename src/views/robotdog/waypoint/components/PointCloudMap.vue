<template>
  <div class="point-cloud-map">
    <div class="map-hd">
      <span class="title">3D 点云地图</span>
      <div class="ops">
        <a-space wrap>
          <a-tag color="arcoblue" size="small">航点 {{ waypoints.length }}</a-tag>
          <a-tag v-if="routeWaypointIds.length" color="green" size="small">
            航线 {{ routeWaypointIds.length }} 点
          </a-tag>
          <a-select
            v-model="selectedMapId"
            size="mini"
            allow-clear
            :loading="mapListLoading"
            placeholder="切换地图"
            style="width: 160px"
            @change="onMapSelect"
          >
            <a-option v-for="m in mapList" :key="m.id" :value="m.id">{{ m.name || `地图 ${m.id}` }}</a-option>
          </a-select>
          <a-button size="mini" :loading="mapLoading" @click="fetchAndLoadMap()">获取地图</a-button>
          <a-button size="mini" @click="settingsVisible = true">地图设置</a-button>
          <a-button size="mini" @click="resetCamera">复位视角</a-button>
        </a-space>
      </div>
    </div>

    <div class="map-body">
      <div ref="hostRef" class="map-canvas" />
      <div v-if="mapLoading" class="map-overlay">加载点云中…</div>
      <div v-else-if="statusText" class="map-status" :class="statusKind">{{ statusText }}</div>
    </div>
    <div class="map-tip">
      拖拽旋转 · 滚轮缩放 · 右键平移 · 选中航线后显示其航点与绿色路径
      <span v-if="pointCount > 0"> · 点数 {{ pointCount.toLocaleString() }}</span>
    </div>

    <a-modal
      v-model:visible="settingsVisible"
      title="地图设置"
      :width="420"
      draggable
      unmount-on-close
      :footer="false"
    >
      <div class="settings-body">
        <div class="settings-section">
          <div class="section-title">图层</div>
          <a-checkbox-group
            v-if="layerOptions.length"
            v-model="checkedLayerKeys"
            direction="vertical"
            @change="onLayerKeysChange"
          >
            <a-checkbox v-for="layer in layerOptions" :key="layer.key" :value="layer.key">
              <span class="layer-swatch" :style="{ background: layer.colorHex }" />
              {{ layer.name || layer.key }}
            </a-checkbox>
          </a-checkbox-group>
          <div v-else class="muted">暂无图层，请先获取或上传地图</div>
        </div>

        <div class="settings-section">
          <div class="section-title">精度</div>
          <a-checkbox v-model="useDownsize">使用 downsize（更快）</a-checkbox>
        </div>

        <div class="settings-section">
          <div class="section-title">点大小</div>
          <div class="row-between">
            <span class="muted">size</span>
            <span>{{ pointSize.toFixed(2) }}</span>
          </div>
          <a-slider v-model="pointSize" :min="0.01" :max="0.4" :step="0.01" />
        </div>

        <div class="settings-section">
          <div class="section-title">上传 PCD</div>
          <a-input v-model="uploadName" size="small" placeholder="地图名称（可选）" allow-clear style="margin-bottom: 8px" />
          <a-upload
            :file-list="uploadFileList"
            :auto-upload="false"
            :custom-request="noopUploadRequest"
            accept=".pcd,application/octet-stream"
            multiple
            tip="仅支持 .pcd，可多选"
            @change="onUploadChange"
          />
          <a-button
            type="primary"
            long
            style="margin-top: 10px"
            :loading="uploading"
            :disabled="!uploadFileList.length"
            @click="doUpload"
          >
            上传并加载
          </a-button>
        </div>

        <a-button long :loading="mapLoading" @click="reloadCurrentLayers">重新加载当前图层</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { FileItem } from '@arco-design/web-vue';
import type { RequestOption } from '@arco-design/web-vue/es/upload/interfaces';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import {
  getPcdMap,
  getPcdMapList,
  uploadPcdMap,
  type PcdMapItem,
  type PcdMapLayer,
  type WaypointItem,
} from '@/api/robotdog/waypoint';

const props = defineProps<{
  waypoints: WaypointItem[];
  activeWaypointId: number | null;
  routeWaypointIds?: number[];
  dogId?: number | null;
}>();

const LAYER_META: Record<string, { label: string; color: number }> = {
  global_map: { label: '全局地图', color: 0x9ec9ff },
  global_ground_map: { label: '地面', color: 0x6bcf7f },
  global_obstacles_map: { label: '障碍物', color: 0xf07178 },
  global_traversable_map: { label: '可行驶', color: 0xf0c674 },
  trajectory: { label: '轨迹', color: 0xff9f43 },
};
const DEFAULT_LAYER_COLOR = 0xa0b4c8;
const ROUTE_COLOR = 0x22c55e;
const SEGMENT_DURATION = 0.45;

const hostRef = ref<HTMLDivElement | null>(null);
const mapList = ref<PcdMapItem[]>([]);
const mapListLoading = ref(false);
const selectedMapId = ref<number | undefined>(undefined);
const mapLoading = ref(false);
const statusText = ref('');
const statusKind = ref('');
const pointCount = ref(0);

const settingsVisible = ref(false);
const useDownsize = ref(true);
const pointSize = ref(0.08);
const checkedLayerKeys = ref<string[]>([]);
const layerOptions = ref<Array<{ key: string; name: string; colorHex: string }>>([]);
const uploadName = ref('');
const uploadFileList = ref<FileItem[]>([]);
const uploading = ref(false);

let currentMap: PcdMapItem | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let cloudGroup: THREE.Group | null = null;
let markerGroup: THREE.Group | null = null;
let routeGroup: THREE.Group | null = null;
let grid: THREE.GridHelper | null = null;
let raf = 0;
let resizeObserver: ResizeObserver | null = null;
let lastTs = 0;
let loadToken = 0;
let syncingLayerKeys = false;
const pcdLoader = new PCDLoader();

const round2 = (n: number) => Number(n.toFixed(2));

type RouteAnimState = {
  points: THREE.Vector3[];
  doneSegments: number;
  segT: number;
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

/** Z-up：场景坐标与航点/PCD 一致 */
const wpToScenePos = (wp: Pick<WaypointItem, 'x' | 'y' | 'z'>) => {
  const x = round2(Number(wp.x ?? 0));
  const y = round2(Number(wp.y ?? 0));
  const z = round2(Number(wp.z ?? 0));
  return new THREE.Vector3(x, y, z + 0.25);
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

const layerColor = (key: string) => LAYER_META[key]?.color ?? DEFAULT_LAYER_COLOR;

const layerColorHex = (key: string) => `#${layerColor(key).toString(16).padStart(6, '0')}`;

const resolveLayerUrl = (layer: PcdMapLayer, preferDownsize: boolean): string => {
  if (preferDownsize) {
    return layer.downsize_file_url || layer.downsize_url || layer.file_url || layer.url || '';
  }
  return layer.file_url || layer.url || layer.downsize_file_url || layer.downsize_url || '';
};

const syncLayerOptions = (layers: PcdMapLayer[]) => {
  layerOptions.value = layers.map((l) => ({
    key: l.key,
    name: LAYER_META[l.key]?.label || l.name || l.key,
    colorHex: layerColorHex(l.key),
  }));
  syncingLayerKeys = true;
  if (!checkedLayerKeys.value.length) {
    checkedLayerKeys.value = layers.map((l) => l.key);
  } else {
    const keys = new Set(layers.map((l) => l.key));
    const kept = checkedLayerKeys.value.filter((k) => keys.has(k));
    checkedLayerKeys.value = kept.length ? kept : layers.map((l) => l.key);
  }
  syncingLayerKeys = false;
};

const colorizePoints = (points: THREE.Points, hex: number) => {
  const geom = points.geometry;
  const pos = geom.getAttribute('position');
  if (!pos) return;

  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(hex);
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const range = Math.max(maxZ - minZ, 1e-6);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getZ(i) - minZ) / range;
    const c = base.clone().offsetHSL(0, 0, (t - 0.5) * 0.35);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = points.material as THREE.PointsMaterial;
  mat.vertexColors = true;
  mat.color.set(0xffffff);
  mat.size = pointSize.value;
  mat.sizeAttenuation = true;
  mat.needsUpdate = true;
};

const applyPointSize = (size: number) => {
  cloudGroup?.traverse((obj) => {
    if ((obj as THREE.Points).isPoints && (obj as THREE.Points).material) {
      const mat = (obj as THREE.Points).material as THREE.PointsMaterial;
      mat.size = size;
      mat.needsUpdate = true;
    }
  });
};

const fitCameraToObject = (object: THREE.Object3D) => {
  if (!camera || !controls) return;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const dist = maxDim * 1.4;

  camera.near = Math.max(0.01, maxDim / 1000);
  camera.far = Math.max(5000, maxDim * 20);
  camera.updateProjectionMatrix();
  camera.position.set(center.x, center.y - dist, center.z + dist * 0.55);
  controls.target.copy(center);
  controls.update();

  if (grid) {
    const gridScale = Math.ceil(maxDim / 10) * 10;
    grid.scale.setScalar(gridScale / 100);
    grid.position.set(center.x, center.y, box.min.z);
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

/** Z-up 轴：X 红、Y 蓝、Z 绿（高度） */
const buildAxesGuide = (length = 3) => {
  const group = new THREE.Group();
  const axes: Array<{
    label: string;
    dir: THREE.Vector3;
    color: number;
    labelColor: string;
  }> = [
    { label: 'X', dir: new THREE.Vector3(1, 0, 0), color: 0xf87171, labelColor: 'rgba(248,113,113,0.85)' },
    { label: 'Y', dir: new THREE.Vector3(0, 1, 0), color: 0x60a5fa, labelColor: 'rgba(96,165,250,0.85)' },
    { label: 'Z', dir: new THREE.Vector3(0, 0, 1), color: 0x4ade80, labelColor: 'rgba(74,222,128,0.85)' },
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

const syncMarkers = () => {
  if (!markerGroup || !scene) return;
  clearGroup(markerGroup);
  const routeSet = new Set(props.routeWaypointIds || []);
  props.waypoints.forEach((wp, index) => {
    const active = wp.id === props.activeWaypointId;
    const onRoute = routeSet.has(wp.id);
    const pos = wpToScenePos(wp);
    const geo = new THREE.SphereGeometry(active ? 0.22 : onRoute ? 0.18 : 0.16, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: active ? 0xff6a00 : onRoute ? ROUTE_COLOR : 0x1677ff,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(1.6, 0.6, 1);
    sprite.position.set(pos.x, pos.y, pos.z + 0.5);
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
  writeGrowPositions(routeAnim.points, routeAnim.points[0].clone(), 0);
};

const updateRouteAnim = (dt: number) => {
  const points = routeAnim.points;
  if (points.length < 2) return;

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
  if (cloudGroup && cloudGroup.children.length) {
    fitCameraToObject(cloudGroup);
    return;
  }
  camera.position.set(0, -30, 20);
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

const loadLayersToScene = async (map: PcdMapItem) => {
  if (!cloudGroup || !scene) return;
  const token = ++loadToken;
  const layers = map.layers || [];
  syncLayerOptions(layers);

  const keys = checkedLayerKeys.value.length
    ? checkedLayerKeys.value
    : layers.map((l) => l.key);
  const selected = layers.filter((l) => keys.includes(l.key));

  mapLoading.value = true;
  statusText.value = `正在加载 ${map.name || map.id}…`;
  statusKind.value = 'loading';
  clearGroup(cloudGroup);
  pointCount.value = 0;

  if (!selected.length) {
    mapLoading.value = false;
    statusText.value = '请至少选择一个图层';
    statusKind.value = 'error';
    return;
  }

  let total = 0;
  const errors: string[] = [];

  for (const layer of selected) {
    if (token !== loadToken) return;
    const url = resolveLayerUrl(layer, useDownsize.value);
    if (!url) {
      errors.push(`${layer.key}: 无可用地址`);
      continue;
    }
    try {
      const points = await pcdLoader.loadAsync(url);
      if (token !== loadToken) {
        disposeObject3D(points);
        return;
      }
      colorizePoints(points, layerColor(layer.key));
      points.name = layer.key;
      cloudGroup.add(points);
      total += points.geometry.getAttribute('position')?.count ?? 0;
    } catch (err) {
      console.error(err);
      errors.push(`${layer.key}: 加载失败`);
    }
  }

  if (token !== loadToken) return;

  mapLoading.value = false;
  pointCount.value = total;

  if (!cloudGroup.children.length) {
    statusText.value = errors.join('；') || '加载失败';
    statusKind.value = 'error';
    return;
  }

  fitCameraToObject(cloudGroup);
  statusText.value = errors.length
    ? `已加载 ${cloudGroup.children.length} 层（部分失败）`
    : `已加载 ${cloudGroup.children.length} 层`;
  statusKind.value = errors.length ? 'error' : 'ok';
};

const applyMapData = async (map: PcdMapItem | null | undefined) => {
  if (!map?.id) {
    statusText.value = '暂无点云地图';
    statusKind.value = 'error';
    return;
  }
  currentMap = map;
  selectedMapId.value = map.id;
  if (!mapList.value.some((m) => m.id === map.id)) {
    mapList.value = [map, ...mapList.value];
  }
  await loadLayersToScene(map);
};

const fetchMapList = async () => {
  mapListLoading.value = true;
  try {
    const res = await getPcdMapList({ page: 1, limit: 100 });
    mapList.value = res?.list || [];
  } catch {
    mapList.value = [];
  } finally {
    mapListLoading.value = false;
  }
};

const fetchAndLoadMap = async (opts?: { map_id?: number; dog_id?: number }) => {
  mapLoading.value = true;
  statusText.value = '正在获取地图…';
  statusKind.value = 'loading';
  try {
    const params: { map_id?: number; dog_id?: number } = {};
    if (opts?.map_id != null) params.map_id = opts.map_id;
    else if (selectedMapId.value != null) params.map_id = selectedMapId.value;
    else if (opts?.dog_id != null) params.dog_id = opts.dog_id;
    else if (props.dogId != null) params.dog_id = props.dogId;

    const map = await getPcdMap(params);
    await applyMapData(map);
  } catch (e: any) {
    statusText.value = e?.message || '获取地图失败';
    statusKind.value = 'error';
  } finally {
    mapLoading.value = false;
  }
};

const onMapSelect = async (id: number | undefined) => {
  if (id == null) return;
  await fetchAndLoadMap({ map_id: id });
};

const reloadCurrentLayers = async () => {
  if (!currentMap) {
    await fetchAndLoadMap();
    return;
  }
  // 重新拉详情以拿到最新 layers
  await fetchAndLoadMap({ map_id: currentMap.id });
};

/** 仅本地选文件，真正上传由「上传并加载」触发 */
const noopUploadRequest = (options: RequestOption) => {
  options.onSuccess?.();
  return { abort: () => undefined };
};

const fileItemToFile = (item: FileItem): File | null => {
  const raw = item.file as File | Blob | undefined;
  if (raw instanceof File) return raw;
  if (raw instanceof Blob) {
    return new File([raw], item.name || 'map.pcd', {
      type: raw.type || 'application/octet-stream',
    });
  }
  return null;
};

const onUploadChange = (fileList: FileItem[]) => {
  uploadFileList.value = (fileList || []).filter((f) => {
    const name = f.name || fileItemToFile(f)?.name || '';
    return name.toLowerCase().endsWith('.pcd');
  });
};

const doUpload = async () => {
  const files = uploadFileList.value
    .map((f) => fileItemToFile(f))
    .filter((f): f is File => !!f);
  if (!files.length) {
    Message.warning('请选择 .pcd 文件');
    return;
  }
  uploading.value = true;
  try {
    const map = await uploadPcdMap(files, { name: uploadName.value.trim() || undefined });
    Message.success('上传地图成功');
    uploadFileList.value = [];
    uploadName.value = '';
    await fetchMapList();
    if (map?.id) {
      // 上传响应若缺 layers，再按 id 拉一次完整详情再加载
      const detail = map.layers?.length ? map : await getPcdMap({ map_id: map.id });
      await applyMapData(detail || map);
    } else {
      await applyMapData(map);
    }
    settingsVisible.value = false;
  } catch (e: any) {
    Message.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
};

watch(pointSize, (v) => applyPointSize(v));

watch(useDownsize, () => {
  if (currentMap) loadLayersToScene(currentMap);
});

const onLayerKeysChange = () => {
  if (syncingLayerKeys || !currentMap) return;
  loadLayersToScene(currentMap);
};

watch(
  () => [props.waypoints, props.activeWaypointId, props.routeWaypointIds],
  () => {
    syncMarkers();
    syncRoutePath();
  },
  { deep: true }
);

onMounted(async () => {
  if (!hostRef.value) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1016);

  camera = new THREE.PerspectiveCamera(60, 1, 0.01, 5000);
  camera.up.set(0, 0, 1);
  camera.position.set(0, -30, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  hostRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;

  grid = new THREE.GridHelper(100, 50, 0x2a3a4f, 0x1a2332);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);
  scene.add(buildAxesGuide(3));
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
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

  await fetchMapList();
  await fetchAndLoadMap(props.dogId != null ? { dog_id: props.dogId } : undefined);
});

/** 父页异步选中机械狗后，若尚未加载到地图则再按 dog_id 拉一次 */
watch(
  () => props.dogId,
  async (id, prev) => {
    if (prev == null && id != null && !currentMap) {
      await fetchAndLoadMap({ dog_id: id });
    }
  }
);

onBeforeUnmount(() => {
  loadToken += 1;
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  controls?.dispose();
  if (cloudGroup) clearGroup(cloudGroup);
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
  cloudGroup = null;
  markerGroup = null;
  routeGroup = null;
  grid = null;
  currentMap = null;
});

defineExpose({ resetCamera, fetchAndLoadMap });
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
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  background: rgba(22, 119, 255, 0.12);

  .title {
    color: #e8f3ff;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .ops {
    min-width: 0;
  }
}

.map-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

.map-canvas {
  width: 100%;
  height: 100%;

  :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
}

.map-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 18, 32, 0.45);
  color: #8ec8ff;
  font-size: 13px;
  pointer-events: none;
}

.map-status {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(15, 20, 25, 0.75);
  border: 1px solid rgba(64, 158, 255, 0.25);
  color: rgba(186, 220, 255, 0.85);
  pointer-events: none;

  &.ok {
    color: #3ecf8e;
  }
  &.error {
    color: #e85d5d;
  }
  &.loading {
    color: #3d9cf0;
  }
}

.map-tip {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  color: rgba(186, 220, 255, 0.7);
  border-top: 1px solid rgba(64, 158, 255, 0.15);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 12px;
  color: var(--color-text-3);
  letter-spacing: 0.04em;
}

.layer-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: middle;
}

.row-between {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.muted {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>

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
            :loading="mapListLoading"
            placeholder="切换地图"
            style="width: 160px"
            @change="onMapSelect"
          >
            <a-option v-for="m in mapList" :key="m.id" :value="m.id" :disabled="invalidMapIds.has(m.id)">
              {{ m.name || `地图 ${m.id}` }}{{ invalidMapIds.has(m.id) ? '（无效）' : '' }}
            </a-option>
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
          <div class="muted" style="margin-bottom: 6px">
            须为真实点云（文件头含 VERSION）。勿上传设备返回的 JSON 错误内容。
          </div>
          <a-input v-model="uploadName" size="small" placeholder="地图名称（可选）" allow-clear style="margin-bottom: 8px" />
          <a-upload
            :file-list="uploadFileList"
            :auto-upload="false"
            :custom-request="noopUploadRequest"
            accept=".pcd,application/octet-stream"
            multiple
            tip="仅支持真实 .pcd，可多选"
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
        <a-button
          long
          status="danger"
          :loading="deletingMap"
          :disabled="!selectedMapId"
          style="margin-top: 8px"
          @click="confirmDeleteMap"
        >
          删除当前地图（含无效点云）
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import type { FileItem } from '@arco-design/web-vue';
import type { RequestOption } from '@arco-design/web-vue/es/upload/interfaces';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import {
  delPcdMap,
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
/** 已确认点云内容无效的地图（MinIO 里是 JSON 错误而非 PCD） */
const invalidMapIds = ref<Set<number>>(new Set());

const settingsVisible = ref(false);
const useDownsize = ref(true);
const pointSize = ref(0.08);
const checkedLayerKeys = ref<string[]>([]);
const layerOptions = ref<Array<{ key: string; name: string; colorHex: string }>>([]);
const uploadName = ref('');
const uploadFileList = ref<FileItem[]>([]);
const uploading = ref(false);
const deletingMap = ref(false);

let currentMap: PcdMapItem | null = null;
/** 上一次成功发起加载的地图 ID，用于切换地图时重置图层勾选 */
let lastLoadedMapId: number | null = null;
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

const apiBaseUrl = () => {
  const cfg = (window as any)?.globalConfig || {};
  const base =
    import.meta.env.VITE_APP_ENV === 'production'
      ? cfg.Main_url
      : cfg.Main_url_dev || cfg.Main_url;
  return String(base || '').replace(/\/$/, '');
};

/** 相对路径拼到 API 域名；MinIO 直链仅作最后后备 */
const toAbsolutePcdUrl = (raw: string): string => {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = apiBaseUrl();
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
};

const proxyFromPath = (objectPath?: string): string => {
  const path = String(objectPath || '').trim().replace(/^\/+/, '');
  if (!path || !path.toLowerCase().endsWith('.pcd')) return '';
  return `/robotdog/waypoint/getPcdFile?path=${encodeURIComponent(path)}`;
};

/**
 * 优先使用后端代理 url/downsize_url（或 path 拼代理），
 * 不要优先 MinIO file_url（localhost:9000 易 CORS，PCDLoader 会解析失败）。
 */
const resolveLayerUrl = (layer: PcdMapLayer, preferDownsize: boolean): string => {
  let raw = '';
  if (preferDownsize) {
    raw =
      layer.downsize_url ||
      proxyFromPath(layer.downsize_path) ||
      layer.url ||
      proxyFromPath(layer.path) ||
      layer.downsize_file_url ||
      layer.file_url ||
      '';
  } else {
    raw =
      layer.url ||
      proxyFromPath(layer.path) ||
      layer.file_url ||
      layer.downsize_url ||
      proxyFromPath(layer.downsize_path) ||
      layer.downsize_file_url ||
      '';
  }
  return toAbsolutePcdUrl(raw);
};

/** 校验二进制是否为 PCD（避免把 JSON 错误页交给 PCDLoader） */
const inspectPcdBuffer = (buf: ArrayBuffer): { ok: true } | { ok: false; reason: string } => {
  if (!buf || buf.byteLength < 16) {
    return { ok: false, reason: '文件过小，不是有效 PCD' };
  }
  const head = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, Math.min(buf.byteLength, 256)));
  const trimmed = head.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(new TextDecoder().decode(buf));
      const msg = json?.message || json?.msg || '接口返回了 JSON 而非 PCD';
      return { ok: false, reason: String(msg) };
    } catch {
      return { ok: false, reason: '内容是 JSON/文本，不是 PCD 点云' };
    }
  }
  if (trimmed.startsWith('<')) {
    return { ok: false, reason: '内容是 HTML/XML，不是 PCD 点云' };
  }
  // ASCII PCD 通常含 VERSION；二进制 PCD 头也以 # .PCD / VERSION 文本开头
  if (!/VERSION\s+/i.test(head) && !/#\s*\.?PCD/i.test(head)) {
    return { ok: false, reason: '缺少 PCD 文件头（VERSION），请重新上传真实 .pcd' };
  }
  return { ok: true };
};

const loadPcdPoints = async (url: string): Promise<THREE.Points> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const check = inspectPcdBuffer(buf);
  if (!check.ok) {
    throw new Error(check.reason);
  }
  return pcdLoader.parse(buf) as THREE.Points;
};

const isLikelyPcdFile = async (file: File): Promise<string | null> => {
  if (!file.name.toLowerCase().endsWith('.pcd')) return '仅支持 .pcd 文件';
  if (file.size < 64) return `${file.name} 过小，不像有效点云`;
  const slice = await file.slice(0, 256).arrayBuffer();
  const check = inspectPcdBuffer(slice);
  return check.ok ? null : `${file.name}: ${check.reason}`;
};

const syncLayerOptions = (layers: PcdMapLayer[], resetChecked = false) => {
  layerOptions.value = layers.map((l) => ({
    key: l.key,
    name: LAYER_META[l.key]?.label || l.name || l.key,
    colorHex: layerColorHex(l.key),
  }));
  syncingLayerKeys = true;
  if (resetChecked || !checkedLayerKeys.value.length) {
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

/** 勾选图层只改显隐，不重复下载 */
const applyLayerVisibility = () => {
  if (!cloudGroup) return;
  const selected = new Set(checkedLayerKeys.value);
  let visiblePoints = 0;
  cloudGroup.children.forEach((child) => {
    const show = selected.has(child.name);
    child.visible = show;
    if (show && (child as THREE.Points).isPoints) {
      visiblePoints += (child as THREE.Points).geometry.getAttribute('position')?.count ?? 0;
    }
  });
  if (cloudGroup.children.length) {
    pointCount.value = visiblePoints;
  }
};

const markMapInvalid = (mapId: number) => {
  const next = new Set(invalidMapIds.value);
  next.add(mapId);
  invalidMapIds.value = next;
};

const isCorruptErrors = (errors: string[]) =>
  errors.some(
    (e) =>
      e.includes('文件不存在') ||
      e.includes('不是 PCD') ||
      e.includes('JSON') ||
      e.includes('缺少 PCD')
  );

const loadLayersToScene = async (map: PcdMapItem): Promise<boolean> => {
  if (!cloudGroup || !scene) return false;
  const token = ++loadToken;
  const layers = map.layers || [];
  const mapChanged = lastLoadedMapId !== map.id;
  lastLoadedMapId = map.id;
  syncLayerOptions(layers, mapChanged);

  mapLoading.value = true;
  statusText.value = `正在加载 ${map.name || map.id}…`;
  statusKind.value = 'loading';
  clearGroup(cloudGroup);
  pointCount.value = 0;

  if (!layers.length) {
    mapLoading.value = false;
    statusText.value = '该地图没有图层文件';
    statusKind.value = 'error';
    markMapInvalid(map.id);
    return false;
  }

  let total = 0;
  const errors: string[] = [];

  // 一次拉取全部图层，勾选只控制 visible，避免反复请求刷屏
  for (const layer of layers) {
    if (token !== loadToken) return false;
    const url = resolveLayerUrl(layer, useDownsize.value);
    if (!url) {
      errors.push(`${layer.key}: 无可用地址`);
      continue;
    }
    try {
      const points = await loadPcdPoints(url);
      if (token !== loadToken) {
        disposeObject3D(points);
        return false;
      }
      colorizePoints(points, layerColor(layer.key));
      points.name = layer.key;
      points.visible = checkedLayerKeys.value.includes(layer.key);
      cloudGroup.add(points);
      if (points.visible) {
        total += points.geometry.getAttribute('position')?.count ?? 0;
      }
    } catch (err: any) {
      errors.push(`${layer.key}: ${err?.message || '加载失败'}`);
    }
  }

  if (token !== loadToken) return false;

  mapLoading.value = false;
  pointCount.value = total;

  if (!cloudGroup.children.length) {
    const corrupt = isCorruptErrors(errors);
    if (corrupt) markMapInvalid(map.id);
    statusText.value = corrupt
      ? `地图 ${map.id} 点云无效（不是 PCD 文件）`
      : errors.slice(0, 3).join('；') || '加载失败';
    statusKind.value = 'error';
    if (errors.length) {
      console.warn(`[PCD] 地图 ${map.id} 全部图层失败（${errors.length}）:`, errors[0]);
    }
    return false;
  }

  applyLayerVisibility();
  fitCameraToObject(cloudGroup);
  statusText.value = errors.length
    ? `已加载 ${cloudGroup.children.length}/${layers.length} 层（部分失败）`
    : `已加载 ${cloudGroup.children.length} 层`;
  statusKind.value = errors.length ? 'error' : 'ok';
  return true;
};

const applyMapData = async (map: PcdMapItem | null | undefined) => {
  if (!map?.id) {
    statusText.value = '暂无点云地图';
    statusKind.value = 'error';
    return false;
  }
  currentMap = map;
  selectedMapId.value = map.id;
  if (!mapList.value.some((m) => m.id === map.id)) {
    mapList.value = [map, ...mapList.value];
  }
  return loadLayersToScene(map);
};

/** 按候选列表依次尝试，跳过已确认无效的地图（解决最新地图 5 为坏数据的问题） */
const loadBestAvailableMap = async (preferred?: { map_id?: number; dog_id?: number }) => {
  mapLoading.value = true;
  statusText.value = '正在获取可用点云地图…';
  statusKind.value = 'loading';
  const tried = new Set<number>();
  const candidates: number[] = [];

  const pushId = (id?: number | null) => {
    const n = Number(id);
    if (Number.isFinite(n) && n > 0 && !candidates.includes(n)) candidates.push(n);
  };

  pushId(preferred?.map_id);
  if (preferred?.dog_id != null) {
    try {
      const byDog = await getPcdMap({ dog_id: preferred.dog_id });
      pushId(byDog?.id);
    } catch {
      // ignore
    }
  }
  mapList.value.forEach((m) => pushId(m.id));

  if (!candidates.length) {
    try {
      const latest = await getPcdMap(preferred?.dog_id != null ? { dog_id: preferred.dog_id } : {});
      pushId(latest?.id);
    } catch {
      // ignore
    }
  }

  for (const id of candidates) {
    if (tried.has(id) || invalidMapIds.value.has(id)) continue;
    tried.add(id);
    try {
      const detail = await getPcdMap({ map_id: id });
      if (!detail?.id) continue;
      const ok = await applyMapData(detail);
      if (ok) {
        if (preferred?.map_id && preferred.map_id !== detail.id) {
          Message.success(`地图 ${preferred.map_id} 无效，已切换到：${detail.name || detail.id}`);
        } else if (id !== candidates[0]) {
          Message.success(`已自动切换到可用地图：${detail.name || detail.id}`);
        }
        return true;
      }
    } catch {
      markMapInvalid(id);
    }
  }

  mapLoading.value = false;
  statusText.value = '未找到可用点云地图，请上传真实 .pcd（文件头含 VERSION）';
  statusKind.value = 'error';
  Message.warning('未找到可用点云地图。请勿上传 JSON/错误响应文件，需上传真实 PCD');
  return false;
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
  try {
    if (opts?.map_id != null) {
      mapLoading.value = true;
      statusText.value = '正在获取地图…';
      statusKind.value = 'loading';
      const map = await getPcdMap({ map_id: opts.map_id });
      const ok = await applyMapData(map);
      if (!ok) {
        await loadBestAvailableMap({ map_id: opts.map_id, dog_id: opts.dog_id ?? props.dogId ?? undefined });
      }
      return;
    }
    await loadBestAvailableMap({
      dog_id: opts?.dog_id ?? props.dogId ?? undefined,
    });
  } catch (e: any) {
    statusText.value = e?.message || '获取地图失败';
    statusKind.value = 'error';
    mapLoading.value = false;
  }
};

const onMapSelect = async (id: unknown) => {
  const mapId = Number(id);
  if (!Number.isFinite(mapId) || mapId <= 0) return;
  if (invalidMapIds.value.has(mapId)) {
    Message.warning('该地图点云无效，请选择其他地图或重新上传');
    selectedMapId.value = currentMap?.id;
    return;
  }
  mapLoading.value = true;
  statusText.value = '正在获取地图…';
  statusKind.value = 'loading';
  try {
    const map = await getPcdMap({ map_id: mapId });
    const ok = await applyMapData(map);
    if (!ok) {
      Message.warning('该地图点云无效，已保持/切换到可用地图');
      await loadBestAvailableMap({ dog_id: props.dogId ?? undefined });
    }
  } catch (e: any) {
    Message.error(e?.message || '获取地图失败');
    mapLoading.value = false;
  }
};

const reloadCurrentLayers = async () => {
  if (!currentMap?.id) {
    await loadBestAvailableMap({ dog_id: props.dogId ?? undefined });
    return;
  }
  const map = await getPcdMap({ map_id: currentMap.id });
  await applyMapData(map);
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

const confirmDeleteMap = () => {
  const id = selectedMapId.value;
  if (id == null) {
    Message.warning('请先选择要删除的地图');
    return;
  }
  const name = mapList.value.find((m) => m.id === id)?.name || `地图 ${id}`;
  Modal.confirm({
    title: '删除点云地图',
    content: `确认删除「${name}」及其 MinIO 点云文件？此操作不可恢复。`,
    okText: '删除',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      deletingMap.value = true;
      try {
        await delPcdMap({ id });
        const next = new Set(invalidMapIds.value);
        next.delete(id);
        invalidMapIds.value = next;
        mapList.value = mapList.value.filter((m) => m.id !== id);
        if (currentMap?.id === id) {
          currentMap = null;
          selectedMapId.value = undefined;
          clearGroup(cloudGroup);
          pointCount.value = 0;
          layerOptions.value = [];
          checkedLayerKeys.value = [];
        }
        Message.success('地图已删除');
        await loadBestAvailableMap({ dog_id: props.dogId ?? undefined });
      } catch (e: any) {
        Message.error(e?.message || '删除失败');
      } finally {
        deletingMap.value = false;
      }
    },
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
  for (const file of files) {
    const invalid = await isLikelyPcdFile(file);
    if (invalid) {
      Message.error(`请勿上传无效文件：${invalid}`);
      return;
    }
  }
  uploading.value = true;
  try {
    // 上传期间取消进行中的旧地图加载，避免和上传结果抢状态
    loadToken += 1;
    const map = await uploadPcdMap(files, { name: uploadName.value.trim() || undefined });
    if (!map?.id) {
      Message.error('上传成功但未返回地图 ID');
      return;
    }
    // 新上传的地图从无效集合中移除
    if (invalidMapIds.value.has(map.id)) {
      const next = new Set(invalidMapIds.value);
      next.delete(map.id);
      invalidMapIds.value = next;
    }
    Message.success('上传地图成功');
    uploadFileList.value = [];
    uploadName.value = '';
    await fetchMapList();
    const detail = map.layers?.length ? map : await getPcdMap({ map_id: map.id });
    selectedMapId.value = map.id;
    const ok = await applyMapData(detail || map);
    if (!ok) {
      Message.error('上传成功但点云无法解析，请确认文件是真实 PCD（含 VERSION 头）');
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
  if (syncingLayerKeys) return;
  applyLayerVisibility();
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
  // 不要盲信「最新地图」：地图 5 这类坏数据会挡住可用地图
  await loadBestAvailableMap({ dog_id: props.dogId ?? undefined });
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

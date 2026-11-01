/* =========================================================================
 * 无尽之海 · Procedural Ocean
 * WebGPURenderer + TSL,原生 ES Modules,零纹理 / 零模型 / 零构建。
 *
 *  - 5 组 Gerstner 波 + 顶点级解析切线 → 大尺度稳定法线
 *  - 3 层带解析梯度的梯度噪声 + FBM(法线扰动 / 泡沫 / 云 / 闪斑)
 *  - 解析天空:太阳 / 月亮 / 流星 / 星空 / 云带 / 岛屿剪影,昼夜连续调色,
 *    天空 / 反射 / 雾化共用同一函数与太阳 uniform
 *  - 生态(真实形态 + 脊柱柔韧波动,TSL 顶点级实现,贴合自然游姿):
 *      银鸥群(实例化振翅)/ 宽吻海豚(脊柱垂直波动,跃浪)/ 绿海龟(鳍状肢划水)
 *      夜光水母(脉冲发光)/ 蝠鲼(双翼波动 + 跃出水面)/ 座头鲸(风暴夜换气)
 *  - 夜间风浪自动增强;稀有物种只在夜晚 / 风暴夜现身;生物收集图鉴
 *  - TSL Bloom + ACES + OrbitControls + 慢速自动漂移
 * ========================================================================= */

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  Fn, uniform, varying, float, vec2, vec3,
  sin, cos, dot, cross, normalize, mix, pow, max, min, clamp, smoothstep, sign,
  exp, length, abs, fract, floor, step, hash, reflect, mod, attribute,
  positionLocal, positionWorld, cameraPosition, normalWorld,
  instanceIndex, screenUV, uv, pass
} from 'three/tsl';

/* ----------------------------- 常量与参数 ----------------------------- */

const OCEAN_SIZE = 24000;
const OCEAN_SEGMENTS = 720;   // 覆盖整片可航行海域,骑终极泰坦高空视角也不露黑边
const SKY_RADIUS = 14000;
const DPR_CAP = 2;
const GULL_COUNT = 16;
const DOLPHIN_COUNT = 4;
const JELLY_COUNT = 4;
const MANTA_COUNT = 2;
const NIGHT_SEA_BOOST = 0.30;   // 深夜风浪增益

// 主涌 Gerstner 波:方向(单位向量)、波长、波幅、陡峭度、初相
// 前两列波长相近、方向交叉约 40°;第三列是 220m 超长涌("小型海啸"),
// 波幅另乘 seaState² 因子 —— 低海况隐形,拉满才显形。小尺度浪由平流噪声场驱动。
// groupAmp:空间波群强度;warpF/warpA:相位扭曲(逐浪长匹配,扭曲场随时间漂移)
const WAVES = [
  { dx:  0.985, dz:  0.174, L: 57.0, A: 0.72, Q: 0.45, phase: 0.0, modS: 0.071, modP: 0.0, groupAmp: 1.30, warpF: 0.029, warpA: 3.0, seedX: 2.3,  seedZ: 7.1  },
  { dx:  0.755, dz: -0.656, L: 44.0, A: 0.62, Q: 0.42, phase: 1.7, modS: 0.113, modP: 2.1, groupAmp: 1.15, warpF: 0.038, warpA: 3.2, seedX: 11.7, seedZ: 3.9  },
  { dx:  0.940, dz:  0.342, L: 220.0, A: 1.60, Q: 0.28, phase: 4.2, modS: 0.043, modP: 5.3, groupAmp: 0.80, warpF: 0.008, warpA: 1.8, seedX: 6.4,  seedZ: 19.2 },
];
const TOTAL_AMPLITUDE = WAVES.reduce((s, w) => s + w.A, 0);
const NOISE_AMP_SUM = 0.45 + 0.32 + 0.18;   // 三层平流噪声位移的振幅和(crest 归一化用)
const TSUNAMI_AMP = 1.60;                     // 超长涌基础波幅(另乘 seaState² 显形)
const GRAVITY = 9.81;

/* --------------------------- 共享 uniform ---------------------------- */

const uTime = uniform(0);
const uSeaState = uniform(0.5);
const uSunDir = uniform(new THREE.Vector3(0, 1, 0));
const uMoonDir = uniform(new THREE.Vector3(0, -1, 0));
const uCloudCover = uniform(0.5);
const uGlow = uniform(0.8);
const uMeteorPos = uniform(new THREE.Vector3(0, 1, 0));
const uMeteorTail = uniform(new THREE.Vector3(0, 0, 0));
const uMeteorLife = uniform(0);
const uUnderwater = uniform(0);   // 相机没入水下程度 0..1
const uCamDepth = uniform(0);     // 相机距波面的深度(米)
const uChaos = uniform(new THREE.Vector3(0, 0, 0));  // Lorenz 混沌输出(滤波后 -1..1)
const uTsunami = uniform(new THREE.Vector2(-10000.0, 0.0));  // x=波前位置(米) y=波幅包络(米)
const uSplash = uniform(0);   // 波前扫过相机时的全屏白沫冲击 0..1
const uStorm = uniform(0);    // 风暴强度(平滑过渡) 0..1
const uFlash = uniform(0);    // 闪电闪光强度(闪烁包络)
const uFlashDir = uniform(new THREE.Vector3(0, 0.4, 1));   // 闪电方位(单位向量)
const uTornado = uniform(new THREE.Vector3(0, 0, 0));  // 水龙卷:x=位置X y=位置Z z=强度 0..1
const uRainbow = uniform(0);  // 彩虹强度 0..1
const uJiaolong = uniform(new THREE.Vector4(0, 0, 0, 0));  // 蛟龙号:xyz=位置 w=探照灯开关
const uLamp = uniform(0);     // 探照灯发光强度(灯体/光锥用)
const uCampfire = uniform(new THREE.Vector4(0, 0, 0, 0));  // 篝火:xy=位置XZ z=强度 w=未用
const uSurvival = uniform(0); // 求生虚脱程度 0..1(驱动画面暗角)
const uHorror = uniform(0);   // 血色恐怖滤镜 0..1(全局后期)
const uBloodEye = uniform(new THREE.Vector4(0, 0, 1, 0));  // 血色之眼:xy=海床中心 z/w=朝向 cos/sin

// 水龙卷状态(CPU 侧;船只拖拽逻辑读取)
const spoutState = { x: 0, z: 0, strength: 0, radius: 150, target: null, targetKind: '' };

// 海啸事件状态(CPU 侧;waveHeightAt 镜像读取)
const tsunamiState = { front: -10000, amp: 0 };
const TSUNAMI_DIR = { x: 0.940, z: 0.342 };

/* ------------------- 不稳定性引擎:Lorenz 混沌吸引子 ------------------- */
/* 真·混沌系统(σ=10 ρ=28 β=8/3):对初值敏感、永不重复。
   输出经低通滤波后驱动:两列主涌的相位失稳、波群漂移速度、整体波幅涨落,
   波列像真实海面一样发生 Benjamin-Feir 式的调制失稳。 */
const lorenz = { x: 3.1, y: 2.7, z: 21.0 };
const chaosState = { p1: 0, p2: 0, p3: 0 };
function stepChaos(dt) {
  const h = Math.min(dt, 0.1) * 1.4;
  const sub = Math.max(1, Math.ceil(h / 0.006));
  const s = h / sub;
  const f = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
  for (let i = 0; i < sub; i++) {
    const [a1, b1, c1] = f(lorenz.x, lorenz.y, lorenz.z);
    const [a2, b2, c2] = f(lorenz.x + a1 * s / 2, lorenz.y + b1 * s / 2, lorenz.z + c1 * s / 2);
    const [a3, b3, c3] = f(lorenz.x + a2 * s / 2, lorenz.y + b2 * s / 2, lorenz.z + c2 * s / 2);
    const [a4, b4, c4] = f(lorenz.x + a3 * s, lorenz.y + b3 * s, lorenz.z + c3 * s);
    lorenz.x += (a1 + 2 * a2 + 2 * a3 + a4) * s / 6;
    lorenz.y += (b1 + 2 * b2 + 2 * b3 + b4) * s / 6;
    lorenz.z += (c1 + 2 * c2 + 2 * c3 + c4) * s / 6;
  }
  // 归一化到约 -1..1 并低通滤波(避免高频抖动)
  const nx = Math.max(-1, Math.min(1, lorenz.x / 16));
  const ny = Math.max(-1, Math.min(1, lorenz.y / 20));
  const nz = Math.max(-1, Math.min(1, (lorenz.z - 25) / 20));
  const k = Math.min(1, dt * 0.5);
  chaosState.p1 += (nx - chaosState.p1) * k;
  chaosState.p2 += (ny - chaosState.p2) * k;
  chaosState.p3 += (nz - chaosState.p3) * k;
  uChaos.value.set(chaosState.p1, chaosState.p2, chaosState.p3);
}

/* --------------------- 工具:整数哈希与梯度噪声 --------------------- */
/* 基于 three 内置 hash()(PCG 整数哈希,WGSL 生产级实现),
   CPU 侧 hashJS 逐位镜像同一算法 → 波面高度可在两侧精确对齐 */

const hash22 = Fn(([p]) => {
  // p:整数格点坐标(已 floor,可为负);大偏移保证种子为正,57 去相关
  const s = p.x.add(p.y.mul(57.0)).add(524288.0).toVar();
  return vec2(hash(s), hash(s.add(0.5))).mul(2.0).sub(1.0); // -1..1
});

const gnoise = Fn(([p]) => {
  const i = floor(p).toVar();
  const f = fract(p).toVar();
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0)).toVar();
  const du = f.mul(f).mul(30.0).mul(f.mul(f.sub(2.0)).add(1.0)).toVar();

  const ga = hash22(i);
  const gb = hash22(i.add(vec2(1.0, 0.0)));
  const gc = hash22(i.add(vec2(0.0, 1.0)));
  const gd = hash22(i.add(vec2(1.0, 1.0)));

  const va = dot(ga, f).toVar();
  const vb = dot(gb, f.sub(vec2(1.0, 0.0))).toVar();
  const vc = dot(gc, f.sub(vec2(0.0, 1.0))).toVar();
  const vd = dot(gd, f.sub(vec2(1.0, 1.0))).toVar();

  const k1 = vb.sub(va);
  const k2 = vc.sub(va);
  const k4 = va.sub(vb).sub(vc).add(vd);

  const value = va.add(u.x.mul(k1)).add(u.y.mul(k2)).add(u.x.mul(u.y).mul(k4));
  const ddx = du.x.mul(k1.add(u.y.mul(k4)));
  const ddy = du.y.mul(k2.add(u.x.mul(k4)));
  return vec3(value, ddx, ddy);
});

const fbm3 = Fn(([p]) => {
  const a = gnoise(p);
  const b = gnoise(p.mul(2.03).add(17.13));
  const c = gnoise(p.mul(4.07).add(-9.71));
  return a.x.mul(0.55).add(b.x.mul(0.30)).add(c.x.mul(0.15)).mul(0.5).add(0.5);
});

// 孤立子剖面 sech²(x) 及其导数(海啸波包用);数值上 |x| 大时自然衰减到 0
const sech2 = Fn(([x]) => {
  const u = exp(x.abs().negate());
  const u2 = u.mul(u);
  return u2.mul(4.0).div(u2.add(1.0).mul(u2.add(1.0)));
});
const dSech2 = Fn(([x]) => {
  const u = exp(x.abs().negate());
  const u2 = u.mul(u);
  const s2 = u2.mul(4.0).div(u2.add(1.0).mul(u2.add(1.0)));
  const th = u2.oneMinus().div(u2.add(1.0)).mul(sign(x));
  return s2.mul(th).mul(-2.0);
});

/* ------------------- 海啸浪唇飞沫(粒子节点) ------------------- */
/* 粒子只编码索引(positionLocal.x = i),其余全部由 hash + uTsunami 推导:
   出生在浪唇(与海面同一 shape 场),向前上方抛出,重力下落,生命周期循环。
   uTsunami.y = 0(无事件)时粒子沉入水下且透明。 */
const sprayPosition = Fn(() => {
  const idx = positionLocal.x;
  const r1 = hash(idx.mul(3.71).add(11.3));
  const r2 = hash(idx.mul(7.13).add(29.7));
  const r3 = hash(idx.mul(5.47).add(47.1));
  const r4 = hash(idx.mul(9.31).add(63.9));
  const s = r1.sub(0.5).mul(5200.0);                       // 沿波前线的位置,覆盖整片海域
  const lipShape = float(0.75).add(gnoise(vec2(s.mul(0.006), 3.71)).x.mul(0.5));
  const lipH = uTsunami.y.mul(lipShape);
  const tau = fract(uTime.mul(0.30).add(r2)).mul(3.2);     // 0..3.2s 生命
  const fwd = float(12.0).add(r3.mul(18.0));               // 前抛速度(管口喷射更猛)
  const up = float(5.0).add(r4.mul(9.0));                  // 上抛速度
  const d0 = r2.sub(0.5).mul(30.0).sub(10.0);              // 出生点(波前稍后)
  const along = uTsunami.x.add(d0).add(fwd.mul(tau));
  const xz = vec2(0.940, 0.342).mul(along).add(vec2(-0.342, 0.940).mul(s));
  const y = lipH.mul(0.75).add(up.mul(tau)).sub(float(4.9).mul(tau).mul(tau));
  return vec3(xz.x, max(y, -2.0), xz.y);
});
const sprayOpacity = Fn(() => {
  const idx = positionLocal.x;
  const r2 = hash(idx.mul(7.13).add(29.7));
  const tau = fract(uTime.mul(0.30).add(r2)).mul(3.2);
  const eventF = clamp(uTsunami.y.div(18.0), 0.0, 1.0);
  return float(1.0).sub(tau.div(3.2)).mul(eventF).mul(0.6);
});

/* ------------------- 水下气泡(粒子节点,跟随相机) ------------------- */
/* 粒子位置即随机种子:在相机周围 26m 盒内分布,各自以不同速度上升、
   左右摆动,到顶循环。opacity 由 uUnderwater 控制,水上完全隐藏。 */
const bubblePosition = Fn(() => {
  const r1 = hash(positionLocal.x.mul(3.71).add(positionLocal.z.mul(1.93)).add(5.7));
  const r2 = hash(positionLocal.z.mul(7.13).add(positionLocal.y.mul(2.51)).add(17.3));
  const rise = mod(positionLocal.y.mul(7.0).add(uTime.mul(float(0.55).add(r1.mul(0.75)))), 14.0);
  const sway = sin(uTime.mul(1.2).add(r2.mul(39.0))).mul(0.45);
  const swayZ = cos(uTime.mul(0.9).add(r1.mul(51.0))).mul(0.45);
  return vec3(
    cameraPosition.x.add(positionLocal.x).add(sway),
    cameraPosition.y.sub(10.0).add(rise),
    cameraPosition.z.add(positionLocal.z).add(swayZ)
  );
});
const bubbleOpacity = Fn(() => {
  const r1 = hash(positionLocal.x.mul(3.71).add(positionLocal.z.mul(1.93)).add(5.7));
  const rise = mod(positionLocal.y.mul(7.0).add(uTime.mul(float(0.55).add(r1.mul(0.75)))), 14.0);
  const fadeTop = smoothstep(14.0, 11.0, rise);   // 升到循环顶端前淡出
  return uUnderwater.mul(0.45).mul(fadeTop);
});

/* ------------------- 水龙卷:旋转漏斗(网格顶点/片元节点) ------------------- */
const tornadoTwist = Fn(() => {
  const p = positionLocal;
  const t01 = p.y.add(65.0).div(130.0).toVar();      // 0 海面 → 1 云底
  const twist = t01.mul(6.5).add(uTime.mul(2.4));    // 越靠近海面拧得越狠
  const c = cos(twist), s = sin(twist);
  const rx = p.x.mul(c).sub(p.z.mul(s));
  const rz = p.x.mul(s).add(p.z.mul(c));
  // 半径脉动 + 顶部大幅摇摆(真实水龙卷会"弯腰")
  const flare = gnoise(vec2(t01.mul(3.5), uTime.mul(0.35))).x.mul(0.4).add(1.0);
  const swayX = sin(uTime.mul(0.45).add(t01.mul(2.2))).mul(10.0).mul(t01);
  const swayZ = cos(uTime.mul(0.38).add(t01.mul(1.9))).mul(10.0).mul(t01);
  return vec3(rx.mul(flare).add(swayX), p.y, rz.mul(flare).add(swayZ));
});
const tornadoColor = Fn(() => {
  const lightL = float(0.14).add(max(uSunDir.y, 0.0).mul(1.2));
  const stormGrey = vec3(0.46, 0.52, 0.60).mul(lightL);
  const bloodVortex = vec3(0.70, 0.025, 0.010)
    .mul(float(0.42).add(uTornado.z.mul(0.55)));
  return mix(stormGrey, bloodVortex, uHorror);
});
const tornadoOpacity = Fn(() => {
  const t01 = positionLocal.y.add(65.0).div(130.0);
  const bands = gnoise(vec2(t01.mul(9.0).sub(uTime.mul(1.2)), positionLocal.x.mul(0.2))).x.mul(0.5).add(0.5);
  const vfade = smoothstep(0.0, 0.12, t01).mul(smoothstep(1.0, 0.75, t01));
  return uTornado.z.mul(0.34).mul(vfade).mul(bands.mul(0.5).add(0.5));
});

/* ------------------- 船尾航迹(粒子节点,aBirth 记录出生时刻) ------------------- */
const wakeSize = Fn(() => {
  const age = uTime.sub(attribute('aBirth'));
  return min(float(0.5).add(age.mul(0.6)), float(6.5));   // 泡沫随时间扩散
});
const wakeOpacity = Fn(() => {
  const age = uTime.sub(attribute('aBirth'));
  return clamp(float(1.0).sub(age.div(11.0)), 0.0, 1.0).mul(0.8);
});

/* ------------------------- 昼夜权重(调色用) ------------------------- */

const dayWeights = Fn(([elev]) => {
  const dayF = smoothstep(0.0, 0.30, elev).toVar();
  const nightF = float(1.0).sub(smoothstep(-0.22, -0.05, elev)).toVar();
  const duskF = clamp(float(1.0).sub(dayF).sub(nightF), 0.0, 1.0).toVar();
  return vec3(nightF, duskF, dayF);
});

// JS 侧同款 smoothstep(供夜间风浪增益等 CPU 逻辑使用)
const sstep01 = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* ----------------------- 海面:顶点 Gerstner 位移 ----------------------- */

const vNormal = varying(vec3(0.0, 1.0, 0.0));
const vCrest = varying(float(0.0));
const vTsunami = varying(float(0.0));   // 海啸事件波高贡献(米),泡沫唇口专用

const gerstnerPosition = Fn(() => {
  const p = positionLocal;
  const px = p.x.toVar();
  const pz = p.z.toVar();

  const disp = vec3(0.0).toVar();
  const dPdx = vec3(1.0, 0.0, 0.0).toVar();
  const dPdz = vec3(0.0, 0.0, 1.0).toVar();
  const crest = float(0.0).toVar();

  const ampScale = float(0.15).add(uSeaState.mul(2.4))
    .mul(float(1.0).add(uChaos.z.mul(0.12))).toVar();
  const chopScale = float(0.6).add(uSeaState.mul(0.9)).toVar();

  // 空间波群场(低频、随时间漂移,漂移速度被混沌搅动):
  // 浪高在空间上有涨落斑块,大浪群与平静区交替。CPU 侧逐位镜像。
  // 海啸因子:220m 超长涌只在高海况显形(seaState² 曲线)
  const tsunamiF = pow(uSeaState, 2.0).toVar();
  const groupSpeed = float(1.0).add(uChaos.y.mul(0.35));
  const groupDrift = vec2(uTime.mul(0.012).mul(groupSpeed), uTime.mul(-0.008).mul(groupSpeed));
  const groupA = gnoise(p.xz.mul(0.0045).add(groupDrift)).x.toVar();
  const groupB = gnoise(p.xz.mul(0.010).add(vec2(37.2, 61.8)).add(groupDrift.mul(1.3))).x.toVar();

  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const k = (2.0 * Math.PI) / w.L;
    const omega = Math.sqrt(GRAVITY * k);

    // 色散角频率含 ±5% 混沌摄动 —— 波列的节奏本身也在漂移,周期性被持续打散
    const omegaJit = float(omega).mul(float(1.0).add(uChaos.z.mul(i === 0 ? 0.05 : i === 1 ? -0.05 : 0.0)));
    const f = float(k)
      .mul(float(w.dx).mul(px).add(float(w.dz).mul(pz)))
      .sub(omegaJit.mul(uTime))
      .add(w.phase)
      .toVar();

    // 全部波浪做空间相位扭曲:波脊线蜿蜒、破碎、不再平行重复。
    // 扭曲场随时间缓慢漂移,避免"站着不动的蛇形波列"。
    // 扭曲用整数哈希噪声,CPU 侧 waveHeightAt 逐位镜像同一公式
    const warp = gnoise(
      p.xz.mul(w.warpF)
        .add(vec2(w.seedX, w.seedZ))
        .add(vec2(uTime.mul(0.010), uTime.mul(-0.007)))
    ).x;
    f.addAssign(warp.mul(w.warpA));
    // 混沌相位失稳:Lorenz 吸引子缓慢搅动两列主涌的相位,
    // 波列永不重复(Benjamin-Feir 调制失稳的近似)
    f.addAssign((i === 0 ? uChaos.x : i === 1 ? uChaos.y : uChaos.z).mul(1.4));

    const sF = sin(f);
    const cF = cos(f);

    // 波幅群化:空间波群场 + 残余时间调制
    const groupMod = clamp(
      float(1.0)
        .add((i < 2 ? groupA : groupB).mul(w.groupAmp))
        .add(sin(uTime.mul(w.modS).add(w.modP)).mul(0.15)),
      0.15, 2.5
    );

    const tsMul = i === 2 ? tsunamiF : float(1.0);
    const aEff = float(w.A).mul(ampScale).mul(groupMod).mul(tsMul);
    const qaEff = float(w.Q * w.A).mul(ampScale).mul(chopScale).mul(groupMod).mul(tsMul);
    const qaK = qaEff.mul(k);
    const aK = aEff.mul(k);

    disp.addAssign(vec3(
      qaEff.mul(w.dx).mul(cF),
      aEff.mul(sF),
      qaEff.mul(w.dz).mul(cF)
    ));

    dPdx.addAssign(vec3(
      qaK.mul(w.dx * w.dx).mul(sF).negate(),
      aK.mul(w.dx).mul(cF),
      qaK.mul(w.dx * w.dz).mul(sF).negate()
    ));
    dPdz.addAssign(vec3(
      qaK.mul(w.dx * w.dz).mul(sF).negate(),
      aK.mul(w.dz).mul(cF),
      qaK.mul(w.dz * w.dz).mul(sF).negate()
    ));

    crest.addAssign(aEff.mul(sF));
  }

  // 三层平流噪声位移场(替代小尺度 Gerstner 波):
  // 噪声随时间平流演化,数学上无周期 —— 中细碎浪永不出现重复图案。
  // 法线用噪声的解析梯度(链式法则)保持精确。CPU 侧逐位镜像。
  const nAmp = ampScale.mul(float(0.8).add(groupB.mul(0.5))).toVar();
  const nC = gnoise(p.xz.mul(0.048).add(vec2(uTime.mul(0.105), uTime.mul(0.062))).add(vec2(23.9, 17.3)));
  const nA = gnoise(p.xz.mul(0.085).add(vec2(uTime.mul(0.16), uTime.mul(-0.094))).add(vec2(3.1, 8.7)));
  const nB = gnoise(p.xz.mul(0.19).add(vec2(uTime.mul(-0.17), uTime.mul(0.26))).add(vec2(13.7, 5.9)));
  const hN = nC.x.mul(0.45).add(nA.x.mul(0.32)).add(nB.x.mul(0.18)).mul(nAmp).toVar();
  disp.y.addAssign(hN);
  const dhNdx = nC.y.mul(0.048 * 0.45).add(nA.y.mul(0.085 * 0.32)).add(nB.y.mul(0.19 * 0.18)).mul(nAmp);
  const dhNdz = nC.z.mul(0.048 * 0.45).add(nA.z.mul(0.085 * 0.32)).add(nB.z.mul(0.19 * 0.18)).mul(nAmp);
  dPdx.addAssign(vec3(0.0, dhNdx, 0.0));
  dPdz.addAssign(vec3(0.0, dhNdz, 0.0));
  crest.addAssign(hN);

  // 巨型海啸事件:孤立子波包(sech² 剖面)—— 前导回撤(海水先退)+ 主水墙
  // + 两级尾随波列。波前形状沿其长度有起伏,不是一堵死板的直墙。
  // uTsunami.x = 波前位置(沿传播方向的米数),uTsunami.y = 波幅包络(米)
  const tsDirV = vec2(0.940, 0.342);
  const tsD = dot(p.xz, tsDirV).sub(uTsunami.x).toVar();        // 距波前(米)
  const tsAlong = dot(p.xz, vec2(-0.342, 0.940));               // 沿波前线坐标
  const tsShape = float(0.75).add(gnoise(vec2(tsAlong.mul(0.006), 3.71)).x.mul(0.5));
  const tsH = uTsunami.y.mul(tsShape).toVar();
  const tsProfile = sech2(tsD.div(260.0))
    .sub(sech2(tsD.sub(820.0).div(420.0)).mul(0.45))
    .add(sech2(tsD.add(1180.0).div(290.0)).mul(0.45))
    .add(sech2(tsD.add(2050.0).div(250.0)).mul(0.22)).toVar();
  const tsDeriv = dSech2(tsD.div(260.0)).div(260.0)
    .sub(dSech2(tsD.sub(820.0).div(420.0)).div(420.0).mul(0.45))
    .add(dSech2(tsD.add(1180.0).div(290.0)).div(290.0).mul(0.45))
    .add(dSech2(tsD.add(2050.0).div(250.0)).div(250.0).mul(0.22)).toVar();
  disp.y.addAssign(tsH.mul(tsProfile));

  // 卷浪(浪管):波唇向前抛出 + 唇口下扣 —— 截面呈"C"形翻卷。
  // 前抛强而窄(中心略偏波前后方),位移斜率超过 -1 处表面真正折叠(悬垂),
  // 折叠阈值约 tsH>44m,浪管沿波前大部分段落连续成形;shape 高的区段卷得更狠。
  // 唇口下扣项把波前前方的水面向下压 —— 浪管开口朝前、管内悬空、管腔朝前透光。
  const tsCurl = tsH.mul(1.85).mul(sech2(tsD.add(18.0).div(120.0))).toVar();
  const tsCurlD = tsH.mul(1.85).mul(dSech2(tsD.add(18.0).div(120.0)).div(120.0)).toVar();
  const tsLipDrop = tsH.mul(0.46).mul(sech2(tsD.sub(96.0).div(78.0))).toVar();
  const tsLipDropD = tsH.mul(0.46).mul(dSech2(tsD.sub(96.0).div(78.0)).div(78.0)).toVar();
  disp.x.addAssign(tsCurl.mul(0.940));
  disp.z.addAssign(tsCurl.mul(0.342));
  disp.y.addAssign(tsLipDrop.negate());

  const tsGrad = tsH.mul(tsDeriv).sub(tsLipDropD);
  // 完整链式法则:水平前抛位移也进切向量 —— 卷曲处法线自然翻转,浪管内侧变暗
  dPdx.addAssign(vec3(
    tsCurlD.mul(0.940 * 0.940),
    tsGrad.mul(0.940),
    tsCurlD.mul(0.940 * 0.342)
  ));
  dPdz.addAssign(vec3(
    tsCurlD.mul(0.940 * 0.342),
    tsGrad.mul(0.342),
    tsCurlD.mul(0.342 * 0.342)
  ));
  vTsunami.assign(tsH.mul(tsProfile));

  // 归一化随海啸因子动态调整:低海况超长涌隐形时,其余浪的 crest 不被稀释
  crest.divAssign(
    float(TOTAL_AMPLITUDE - TSUNAMI_AMP + NOISE_AMP_SUM)
      .add(float(TSUNAMI_AMP).mul(tsunamiF)).mul(ampScale)
  );
  vCrest.assign(crest);
  vNormal.assign(normalize(cross(dPdz, dPdx)));

  return p.add(disp);
});

/* --------------------- 细节法线:三层梯度噪声梯度 --------------------- */

const detailGradient = Fn(([p]) => {
  const t = uTime;
  const g1 = gnoise(p.mul(0.65).add(vec2(t.mul(0.10), t.mul(0.06))));
  const g2 = gnoise(p.mul(0.22).add(vec2(t.mul(-0.045), t.mul(0.075))));
  const g3 = gnoise(p.mul(1.90).add(vec2(t.mul(-0.14), t.mul(-0.11))));
  return vec2(
    g1.y.mul(0.55).add(g2.y.mul(0.95)).add(g3.y.mul(0.28)),
    g1.z.mul(0.55).add(g2.z.mul(0.95)).add(g3.z.mul(0.28))
  );
});

/* --------------------------- 远方岛屿剪影 --------------------------- */

const islandMask = Fn(([dir, iDir, freq, seed, maxH]) => {
  const nxz = dir.xz.div(max(length(dir.xz), 0.001));
  const sector = smoothstep(0.955, 0.990, dot(nxz, iDir));
  const perp = vec2(iDir.y.negate(), iDir.x);
  const s = dot(nxz, perp).mul(freq).add(seed);
  const ridge = max(gnoise(vec2(s, seed)).x, 0.0);
  const detail = gnoise(vec2(s.mul(3.7), seed.add(5.0))).x.mul(0.25);
  const h = max(ridge.add(detail).sub(0.18), 0.0).mul(maxH).mul(sector);
  return smoothstep(0.0, 0.006, h.sub(dir.y));
});

/* ------------------------------ 解析天空 ------------------------------ */

const skyColor = Fn(([rawDir]) => {
  const dir = normalize(rawDir).toVar();
  const elev = uSunDir.y;

  const w = dayWeights(elev);
  const nightF = w.x, duskF = w.y, dayF = w.z;

  const zenith = vec3(0.004, 0.007, 0.024).mul(nightF)
    .add(vec3(0.055, 0.065, 0.190).mul(duskF))
    .add(vec3(0.100, 0.300, 0.680).mul(dayF))
    .toVar();
  const horizon = vec3(0.016, 0.026, 0.062).mul(nightF)
    .add(vec3(0.860, 0.380, 0.210).mul(duskF))
    .add(vec3(0.520, 0.720, 0.900).mul(dayF))
    .toVar();

  const tSky = pow(max(dir.y, 0.0), 0.42);
  const col = mix(horizon, zenith, tSky).toVar();
  col.assign(mix(col, horizon.mul(0.14), smoothstep(0.0, 0.25, dir.y.negate())));

  // 太阳
  const sunD = dot(dir, uSunDir).toVar();
  const sunCol = mix(vec3(1.0, 0.38, 0.12), vec3(1.0, 0.95, 0.85), dayF).toVar();
  const sunVisible = smoothstep(-0.02, 0.005, elev);
  const disc = smoothstep(0.999880, 0.999970, sunD).mul(60.0).mul(sunVisible);
  const glowNear = pow(max(sunD, 0.0), 700.0).mul(6.0).mul(sunVisible);
  const halo = pow(max(sunD, 0.0), 24.0).mul(0.35).mul(duskF.add(dayF.mul(0.5)));
  const horizonGlow = pow(max(sunD, 0.0), 6.0)
    .mul(exp(max(dir.y, 0.0).mul(-4.0)))
    .mul(0.22).mul(duskF.mul(1.6).add(dayF.mul(0.3)));
  col.addAssign(sunCol.mul(disc.add(glowNear).add(halo).add(horizonGlow)));

  // 月亮
  const moonVis = nightF.mul(smoothstep(-0.02, 0.01, uMoonDir.y));
  const moonD = dot(dir, uMoonDir);
  const maria = gnoise(vec2(dir.x.add(dir.z), dir.y).mul(80.0)).x.mul(0.18).add(0.88);
  const moonDisc = smoothstep(0.999500, 0.999850, moonD).mul(maria).mul(2.2);
  const moonGlow = pow(max(moonD, 0.0), 150.0).mul(0.32);
  const moonCol = mix(vec3(0.82, 0.88, 1.0), vec3(1.0, 0.035, 0.010), uHorror);
  col.addAssign(moonCol.mul(moonDisc.add(moonGlow)).mul(moonVis));

  // 远方岛屿剪影(isl1 方向已落成真实荒岛,只保留另一座剪影)
  const islMask = islandMask(dir, vec2(-0.42, 0.91), 16.0, 9.2, 0.038)
    .mul(smoothstep(-0.01, 0.004, dir.y));
  col.assign(mix(col, horizon.mul(0.30), islMask));

  // 海啸末日天 + 风暴天:天空压暗、去饱和、云量拉满(反射同步变阴沉)
  const gloom = clamp(max(uTsunami.y.div(60.0), uStorm.mul(0.5)), 0.0, 1.0).toVar();

  // 低空云带
  const cloudBand = smoothstep(0.0, 0.035, dir.y).mul(exp(max(dir.y, 0.0).mul(-3.2))).toVar();
  const cp = dir.xz.div(max(dir.y, 0.0).add(0.18)).mul(1.15)
    .add(vec2(uTime.mul(0.008), uTime.mul(0.0035)));
  const cl = fbm3(cp).add(gnoise(cp.mul(3.1).add(4.7)).x.mul(0.22)).toVar();
  const cloudEdge = float(0.62).sub(uCloudCover.mul(0.22));
  const coverAmt = max(uCloudCover, gloom.mul(0.95));
  const cover = smoothstep(cloudEdge, cloudEdge.add(0.26), cl)
    .mul(cloudBand).mul(float(0.05).add(coverAmt.mul(0.95))).toVar();
  const sunFacing = pow(max(sunD, 0.0), 3.0);
  const cloudBright = vec3(0.055, 0.065, 0.110).mul(nightF)
    .add(vec3(0.720, 0.420, 0.300).mul(duskF))
    .add(vec3(0.950, 0.960, 1.000).mul(dayF));
  const cloudCol = mix(cloudBright.mul(0.5), cloudBright,
    clamp(cl.mul(0.75).add(sunFacing.mul(0.55)), 0.0, 1.0));
  col.assign(mix(col, cloudCol.mul(float(1.0).sub(gloom.mul(0.45))), cover.mul(0.85)));

  // 星空
  const sp = dir.mul(220.0);
  const cellId = floor(sp);
  const h = hash(dot(cellId, vec3(12.9898, 78.233, 37.719)).add(32768.0));
  const starCore = smoothstep(0.35, 0.05, length(fract(sp).sub(0.5)));
  const twinkle = sin(uTime.mul(2.5).add(h.mul(628.0))).mul(0.3).add(0.7);
  const star = step(0.995, h).mul(starCore).mul(twinkle)
    .mul(nightF).mul(smoothstep(0.02, 0.20, dir.y)).mul(cover.oneMinus());
  col.addAssign(vec3(0.85, 0.92, 1.0).mul(star.mul(2.2)));

  // 流星
  const metHead = dot(dir, uMeteorPos);
  const metTailPos = normalize(uMeteorPos.add(uMeteorTail));
  const met = pow(max(metHead, 0.0), 6000.0).mul(6.0)
    .add(pow(max(metHead, 0.0), 600.0).mul(0.5))
    .add(pow(max(dot(dir, metTailPos), 0.0), 6000.0).mul(1.5));
  col.addAssign(vec3(0.90, 0.95, 1.0).mul(met).mul(uMeteorLife).mul(nightF));

  // 闪电:从 uFlashDir 方位照亮整片天空,云层处最亮(海面反射自动同步)
  const flashD = pow(max(dot(dir, uFlashDir), 0.0), 3.0);
  col.addAssign(vec3(0.75, 0.82, 1.05).mul(uFlash)
    .mul(float(0.10).add(flashD.mul(0.9)))
    .mul(float(0.35).add(cover.mul(1.5))));

  // 末日压暗:整片天空向风暴灰冷却收拢
  col.assign(mix(col, col.mul(vec3(0.55, 0.62, 0.66)).add(vec3(0.020, 0.026, 0.032)), gloom.mul(0.65)));

  // 彩虹:太阳对侧 40°~42° 角半径的光谱弧(风雨+低日时出现,CPU 侧控制 uRainbow)
  const cosA = dot(dir, uSunDir.negate());
  const bandT = clamp(cosA.sub(0.743).div(0.023), 0.0, 1.0);   // 42° → 40°
  const bandShape = sin(bandT.mul(Math.PI));                   // 带内亮、边缘暗
  const spectral = vec3(
    cos(bandT.mul(6.2831)),
    cos(bandT.mul(6.2831).add(2.09)),
    cos(bandT.mul(6.2831).add(4.19))
  ).mul(0.5).add(0.5);
  col.addAssign(spectral.mul(bandShape).mul(uRainbow).mul(0.35)
    .mul(smoothstep(-0.02, 0.05, dir.y))
    .mul(float(1.0).sub(gloom.mul(0.5))));

  // 血色模式只改变环境:黑天 + 小范围血月晕光,不把整片天空/海雾染红。
  const bloodMoonHalo = pow(max(moonD, 0.0), 80.0).mul(moonVis);
  const bloodSky = vec3(0.001, 0.001, 0.005)
    .add(vec3(0.22, 0.0, 0.0).mul(bloodMoonHalo.mul(0.58)))
    .add(vec3(1.0, 0.025, 0.006).mul(moonDisc.mul(3.0).add(moonGlow.mul(0.30))).mul(moonVis));
  col.assign(mix(col, bloodSky, uHorror));

  return col;
});

/* ------------------------------ 海面着色 ------------------------------ */

const waterColor = Fn(() => {
  const wpos = positionWorld;
  const toCam = cameraPosition.sub(wpos);
  const dist = length(toCam).toVar();
  const V = normalize(toCam).toVar();

  const elev = uSunDir.y;
  const w = dayWeights(elev);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const sunTint = vec3(0.10, 0.12, 0.20).mul(nightF)
    .add(vec3(1.00, 0.55, 0.35).mul(duskF))
    .add(vec3(1.00, 1.00, 0.98).mul(dayF))
    .toVar();
  const lightLevel = float(0.06).add(max(elev, 0.0).mul(1.15)).add(duskF.mul(0.12)).toVar();

  // 大尺度斑驳:数百米尺度的起伏区/平静区交替,打破全场均匀的碎浪感
  const patch = gnoise(wpos.xz.mul(0.004).add(uTime.mul(0.006))).x;
  const chopMod = clamp(float(0.75).add(patch.mul(0.55)), 0.15, 1.40);

  const detailFade = exp(dist.mul(-0.004));
  const grad = detailGradient(wpos.xz)
    .mul(float(0.35).mul(detailFade).mul(float(0.6).add(uSeaState)).mul(chopMod));
  const N = normalize(vNormal.add(vec3(grad.x.negate(), 0.0, grad.y.negate()))).toVar();

  const crest = vCrest.mul(0.5).add(0.5).toVar();

  const NdV = max(dot(N, V), 0.0);
  const F = float(0.02).add(float(0.98).mul(pow(NdV.oneMinus(), 5.0))).toVar();
  const R = reflect(V.negate(), N).toVar();
  R.assign(vec3(R.x, max(R.y, 0.015), R.z));
  const refl = skyColor(R).toVar();

  const mottle = fbm3(wpos.xz.mul(0.02).add(uTime.mul(0.01)));
  const body = mix(
    vec3(0.012, 0.075, 0.105),
    vec3(0.040, 0.300, 0.330),
    clamp(crest.mul(0.50).add(mottle.mul(0.40)), 0.0, 1.0)
  ).mul(sunTint).mul(lightLevel).toVar();

  const col = mix(body, refl, F).toVar();

  // 太阳闪光
  const sunCol = mix(vec3(1.0, 0.38, 0.12), vec3(1.0, 0.95, 0.85), dayF);
  const RdS = max(dot(R, uSunDir), 0.0);
  const sparkle = fract(mottle.mul(7.13)).mul(1.6).add(0.2);
  const specTight = pow(RdS, 1000.0).mul(40.0).mul(sparkle);
  const specWide = pow(RdS, 80.0).mul(0.55);
  col.addAssign(sunCol.mul(specTight.add(specWide)).mul(smoothstep(-0.06, 0.02, elev)).mul(float(1.0).sub(uHorror)));

  // 月光波道
  const moonVis = nightF.mul(smoothstep(-0.02, 0.01, uMoonDir.y));
  const MdS = max(dot(R, uMoonDir), 0.0);
  const moonSpec = pow(MdS, 1200.0).mul(mix(13.0, 22.0, uHorror)).mul(sparkle)
    .add(pow(MdS, 120.0).mul(mix(0.10, 0.32, uHorror)));
  col.addAssign(mix(vec3(0.70, 0.80, 1.0), vec3(1.0, 0.025, 0.006), uHorror)
    .mul(moonSpec).mul(moonVis));

  // 浪尖透光
  const scatterAmt = pow(max(dot(V, uSunDir), 0.0), 3.0).mul(pow(crest, 2.5)).mul(0.85);
  col.addAssign(vec3(0.020, 0.450, 0.420).mul(scatterAmt).mul(sunTint).mul(smoothstep(-0.05, 0.10, elev)));

  // 泡沫:各向异性噪声拉成顺风条带(类似 Langmuir 风列),crest 只占一部分权重,
  // 白浪帽是"波峰上一段段的碎斑",不再贴着整条波脊线发光。
  // 阈值按 SEA STATE 分级:平静几乎无泡沫,大风浪 ~1/3 波峰带白帽。
  const foamN = fbm3(vec2(
    dot(wpos.xz, vec2(0.985, 0.174)).mul(0.045),
    dot(wpos.xz, vec2(-0.174, 0.985)).mul(0.35)
  ).add(vec2(uTime.mul(0.05), uTime.mul(-0.03))));
  const foamThresh = float(1.00).sub(uSeaState.mul(0.34)).sub(patch.mul(0.04));
  const foamMask = smoothstep(
    foamThresh, foamThresh.add(0.10),
    crest.mul(0.55).add(foamN.mul(0.75)).add(patch.mul(0.15))
  ).toVar();
  const foamTex = gnoise(wpos.xz.mul(2.6).sub(uTime.mul(0.12))).x.mul(0.5).add(0.5);
  // 白浪帽反照率高,黄昏/夜晚也不该暗到消失:混入天光底色、保底亮度
  const foamCol = vec3(0.85, 0.92, 0.95)
    .mul(foamTex.mul(0.5).add(0.6))
    .mul(mix(vec3(0.55, 0.62, 0.72), sunTint, clamp(lightLevel.mul(1.4), 0.0, 1.0)))
    .mul(lightLevel.mul(0.65).add(0.45));
  const bloodFoamCol = vec3(1.00, 0.065, 0.020)
    .mul(foamTex.mul(0.55).add(0.75));
  // 海啸水墙的唇口卷浪:只在墙面数米高以上的区域起白沫,
  // 黑绿色的水墙本体保持阴沉 —— 遮天蔽日感来自大体积而不是全屏白
  const tsLip = smoothstep(2.5, 7.0, vTsunami);
  foamMask.assign(max(foamMask, tsLip.mul(foamN.mul(0.6).add(0.4))));
  // 水龙卷底部:旋转泡沫环(漏斗接地处海水被卷起)
  const spD = length(wpos.xz.sub(vec2(uTornado.x, uTornado.y)));
  const spRing = smoothstep(30.0, 9.0, spD).mul(uTornado.z).toVar();
  const spSwirl = gnoise(vec2(spD.mul(0.22).sub(uTime.mul(2.5)), uTime.mul(0.7))).x.mul(0.5).add(0.5);
  foamMask.assign(max(foamMask, spRing.mul(spSwirl.mul(0.6).add(0.4))));
  const horrorFoamCol = mix(foamCol, bloodFoamCol, uHorror);
  col.assign(mix(col, horrorFoamCol, foamMask.mul(0.85)));
  // 血色模式加强动态红色:普通浪尖略红,海啸浪唇和水龙卷泡沫环更明显。
  const bloodEdge = foamMask.mul(0.18).add(tsLip.mul(0.85)).add(spRing.mul(0.65));
  col.addAssign(vec3(0.95, 0.020, 0.006).mul(bloodEdge).mul(uHorror));

  // 浪管内侧压暗(法线翻下/背光处 → 黑洞洞的浪管),
  // 浪唇透光(逆光时墙顶泛出半透明青绿 —— 巨浪的"玻璃质感")
  const barrelF = smoothstep(2.5, 9.0, vTsunami)
    .mul(clamp(float(0.62).sub(N.y), 0.0, 1.0)).toVar();
  col.mulAssign(float(1.0).sub(barrelF.mul(0.62)));
  // 管口透光:顺着传播方向看进浪管时,管腔深处泛出幽绿微光(光从管口灌入)
  const tubeView = pow(max(dot(V, vec3(0.940, 0.0, 0.342)), 0.0), 3.0);
  const tubeGlow = barrelF.mul(tubeView).mul(smoothstep(6.0, 20.0, vTsunami));
  col.addAssign(mix(vec3(0.02, 0.22, 0.20), vec3(0.95, 0.030, 0.010), uHorror)
    .mul(tubeGlow).mul(lightLevel.add(uHorror.mul(0.45))));
  const lipGlow = smoothstep(8.0, 24.0, vTsunami)
    .mul(pow(max(dot(V, uSunDir), 0.0), 2.0));
  col.addAssign(mix(vec3(0.05, 0.45, 0.40), vec3(1.0, 0.040, 0.012), uHorror)
    .mul(lipGlow).mul(lightLevel.add(uHorror.mul(0.55))).mul(0.8));

  // 血色之海:暗血底色 + 红色浪峰/泡沫/巨浪/水龙卷反光,保留黑色暗部层次。
  const bloodSeaBase = col.mul(vec3(0.30, 0.085, 0.075))
    .add(vec3(0.16, 0.003, 0.002).mul(crest.mul(0.65).add(0.18)));
  const bloodSeaGlint = vec3(1.0, 0.018, 0.004)
    .mul(foamMask.mul(0.24).add(tsLip.mul(0.90)).add(spRing.mul(0.72)).add(moonSpec.mul(moonVis).mul(0.028)));
  col.assign(mix(col, bloodSeaBase.add(bloodSeaGlint), uHorror.mul(0.88)));

  // 夜光藻
  const bioMask = smoothstep(0.55, 0.78, crest.mul(0.30).add(foamN.mul(0.62)).add(patch.mul(0.28)));
  const bioCol = vec3(0.05, 0.85, 0.75);
  col.addAssign(bioCol.mul(bioMask.mul(nightF).mul(uGlow).mul(0.7)));
  col.addAssign(bioCol.mul(foamMask.mul(nightF).mul(uGlow).mul(0.35)));

  // 水下仰视:斯涅尔窗亮斑 + 太阳透射光柱 + 深度衰减 + 浪尖荧光
  const viewDir = V.negate(); // 相机 → 片元方向(水下看水面朝上)
  const upness = pow(max(viewDir.y, 0.0), 2.2);
  const sunThru = pow(max(dot(viewDir, uSunDir), 0.0), 6.0).mul(1.4)
    .mul(smoothstep(-0.05, 0.10, elev));
  const depthFade = exp(uCamDepth.mul(-0.05));
  const underCol = vec3(0.006, 0.085, 0.100).mul(sunTint)
    .add(vec3(0.060, 0.380, 0.400).mul(upness).mul(sunTint))
    .add(sunCol.mul(sunThru))
    .mul(lightLevel.add(0.15))
    .mul(depthFade.add(0.25))
    .add(bioCol.mul(bioMask.mul(nightF).mul(uGlow).mul(0.5)));
  const bloodUnderCol = underCol.mul(vec3(0.50, 0.18, 0.16))
    .add(vec3(0.22, 0.018, 0.010).mul(upness.mul(0.75).add(0.25)))
    .add(vec3(0.35, 0.020, 0.006).mul(bioMask.mul(0.16)));
  col.assign(mix(col, mix(underCol, bloodUnderCol, uHorror), uUnderwater));

  // 地平线雾化(水下关闭)
  const fogF = smoothstep(250.0, 700.0, dist).mul(float(1.0).sub(uUnderwater));
  const fogDir = vec3(wpos.x.sub(cameraPosition.x), 6.0, wpos.z.sub(cameraPosition.z));
  col.assign(mix(col, skyColor(fogDir), fogF));

  return col;
});

/* ---------------------------- 海底:沙地与焦散 ---------------------------- */

const seafloorColor = Fn(() => {
  const wpos = positionWorld;
  const dist = length(cameraPosition.sub(wpos)).toVar();

  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const sunTint = vec3(0.10, 0.12, 0.20).mul(nightF)
    .add(vec3(1.00, 0.55, 0.35).mul(duskF))
    .add(vec3(1.00, 1.00, 0.98).mul(dayF)).toVar();
  const lightLevel = float(0.05).add(max(uSunDir.y, 0.0).mul(1.1)).add(duskF.mul(0.10)).toVar();

  // 沙地基色:大尺度斑块 + 细颗粒
  const sandPatch = fbm3(wpos.xz.mul(0.02));
  const grain = gnoise(wpos.xz.mul(1.4)).x.mul(0.05);
  const sand = mix(vec3(0.28, 0.30, 0.26), vec3(0.52, 0.52, 0.42), sandPatch)
    .add(grain).toVar();

  // 动态焦散:两层不同频率/方向的脊线噪声相互干涉,取高次尖峰
  // —— 波面透镜效应在池底投下的流动光网
  const c1 = abs(gnoise(wpos.xz.mul(0.22).add(vec2(uTime.mul(0.045), uTime.mul(0.028)))).x).oneMinus();
  const c2 = abs(gnoise(wpos.xz.mul(0.17).add(vec2(uTime.mul(-0.036), uTime.mul(0.052))).add(7.3)).x).oneMinus();
  const caustic = pow(c1.mul(c2), 6.0).mul(2.6)
    .mul(smoothstep(-0.05, 0.15, uSunDir.y));   // 夜间几乎无焦散

  const col = sand.mul(sunTint).mul(lightLevel).toVar();
  col.addAssign(vec3(0.45, 0.85, 0.85).mul(caustic).mul(lightLevel));

  // 血色模式:海床上浮现一只凝视相机的巨大眼睛,血丝随水流轻微扭动。
  const eyeRel = wpos.xz.sub(uBloodEye.xy);
  const eyeP = vec2(
    eyeRel.x.mul(uBloodEye.z).add(eyeRel.y.mul(uBloodEye.w)),
    eyeRel.y.mul(uBloodEye.z).sub(eyeRel.x.mul(uBloodEye.w))
  );
  const eyeQ = vec2(eyeP.x.div(56.0), eyeP.y.div(24.0));
  const eyeR = length(eyeQ);
  const eyeMask = smoothstep(1.0, 0.88, eyeR).mul(uHorror).toVar();
  const irisR = length(vec2(eyeP.x.div(11.0), eyeP.y.div(11.0)));
  const irisMask = smoothstep(1.0, 0.58, irisR).mul(eyeMask);
  const pupilMask = smoothstep(0.42, 0.24, irisR).mul(eyeMask);
  const irisRing = smoothstep(0.98, 0.72, irisR).sub(smoothstep(0.58, 0.42, irisR)).mul(eyeMask);
  const veinNoise = fbm3(eyeP.mul(0.075).add(vec2(uTime.mul(0.020), uTime.mul(-0.015))));
  const veinA = smoothstep(0.080, 0.0, abs(sin(eyeP.x.mul(0.31).add(veinNoise.mul(5.2)))));
  const veinB = smoothstep(0.055, 0.0, abs(sin(eyeP.y.mul(0.43).add(eyeP.x.mul(0.10)).add(veinNoise.mul(7.1)))));
  const veinMask = max(veinA.mul(0.55), veinB.mul(0.75)).mul(eyeMask).mul(float(1.0).sub(irisMask.mul(0.80)));
  const sclera = vec3(0.52, 0.42, 0.34).mul(eyeMask);
  const iris = vec3(0.55, 0.02, 0.012).mul(irisMask)
    .add(vec3(1.0, 0.07, 0.02).mul(irisRing.mul(0.55)));
  const pupil = vec3(0.002, 0.0, 0.0).mul(pupilMask);
  const veins = vec3(1.0, 0.0, 0.0).mul(veinMask.mul(0.90));
  col.assign(mix(col, sclera.add(iris).add(veins), eyeMask.mul(0.82)));
  col.assign(mix(col, pupil.add(vec3(0.18, 0.0, 0.0).mul(irisMask)), pupilMask));

  // 蛟龙号探照灯:潜水器正下方照亮一圈暖色光池(深海里唯一的人工光)
  // 深度越深光池相对越亮(环境光已被吸收)
  const jiaoD = length(wpos.xz.sub(vec2(uJiaolong.x, uJiaolong.z)));
  const jiaoDepth = clamp(uJiaolong.y.negate().div(20.0), 0.0, 1.0);
  const lightPool = smoothstep(15.0, 2.5, jiaoD)
    .mul(uJiaolong.w).mul(jiaoDepth.mul(0.7).add(0.3));
  col.addAssign(vec3(1.0, 0.92, 0.75).mul(lightPool.mul(0.85)));

  // 距离雾:向深蓝收拢;水上俯视时整体压暗(海 mesh 边缘外读作深渊)
  const fogF = smoothstep(15.0, 95.0, dist);
  col.assign(mix(col, mix(vec3(0.010, 0.055, 0.075), vec3(0.075, 0.010, 0.008), uHorror), fogF));
  col.mulAssign(float(0.05).add(uUnderwater.mul(0.95)));
  return col;
});

/* ----------------------- 生物:柔韧波动与皮肤着色 ----------------------- */

// 鲸豚脊柱波动:垂直面内的行波,向尾柄逐渐放大(真实鲸豚游姿)
// uPhase 为每个个体的相位 uniform
const spineFlex = Fn(([uPhase, freq, amp, tailStart, tailEnd]) => {
  const z = positionLocal.z;
  const tailW = smoothstep(tailStart, tailEnd, z.negate()); // 0 头部 → 1 尾端
  const wavePh = uTime.mul(freq).add(uPhase).sub(z.mul(0.85));
  const swimY = sin(wavePh).mul(amp).mul(tailW);
  const swayX = sin(wavePh.sub(1.2)).mul(amp.mul(0.35)).mul(tailW);
  return positionLocal.add(vec3(swayX, swimY, 0.0));
});

// 蝠鲼双翼波动:垂直面行波沿翼展向翼尖放大(真实蝠鲼"飞行"泳姿)
const mantaFlex = Fn(([uPhase]) => {
  const ax = abs(positionLocal.x);
  const wingW = smoothstep(0.15, 1.7, ax);
  const flap = sin(ax.mul(0.9).sub(uTime.mul(1.9)).add(uPhase));
  const liftY = flap.mul(0.42).mul(wingW);
  const bodySway = sin(uTime.mul(1.9).add(uPhase).sub(1.0)).mul(0.05);
  return positionLocal.add(vec3(0.0, liftY.add(bodySway), 0.0));
});

// 海洋动物湿润表皮:日光漫射 + 天空轮廓光 + 湿亮高光(base 体色可变)
const marineSkin = Fn(([baseCol]) => {
  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const sunTint = vec3(0.10, 0.12, 0.20).mul(nightF)
    .add(vec3(1.00, 0.55, 0.35).mul(duskF))
    .add(vec3(1.00, 1.00, 0.98).mul(dayF));
  const lightLevel = float(0.10).add(max(uSunDir.y, 0.0).mul(1.1)).add(duskF.mul(0.15));
  const N = normalize(normalWorld);
  const V = normalize(cameraPosition.sub(positionWorld));
  const diffuse = max(dot(N, uSunDir), 0.0).mul(0.7).add(0.3);
  const rim = pow(max(dot(N, V), 0.0).oneMinus(), 3.0);
  const skyTint = vec3(0.020, 0.030, 0.060).mul(nightF)
    .add(vec3(0.900, 0.450, 0.300).mul(duskF))
    .add(vec3(0.550, 0.720, 0.880).mul(dayF));
  const wetSpec = pow(max(dot(reflect(V.negate(), N), uSunDir), 0.0), 60.0);
  return baseCol.mul(sunTint).mul(lightLevel).mul(diffuse)
    .add(skyTint.mul(rim.mul(float(0.12).add(dayF.mul(0.45)).add(duskF.mul(0.3)))))
    .add(sunTint.mul(wetSpec.mul(1.1)).mul(smoothstep(-0.05, 0.05, uSunDir.y)));
});

// 蝠鲼体色:深背 + 夜间生物荧光描边
const mantaColor = Fn(() => {
  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const N = normalize(normalWorld);
  const V = normalize(cameraPosition.sub(positionWorld));
  const rim = pow(max(dot(N, V), 0.0).oneMinus(), 2.5);
  const base = vec3(0.045, 0.060, 0.080).mul(float(0.2).add(dayF.mul(0.8)).add(duskF.mul(0.3)));
  const bioRim = vec3(0.05, 0.85, 0.75).mul(rim).mul(nightF).mul(uGlow);
  return base.add(bioRim);
});

// 虎鲸涂装:黑背 + 白腹 + 白色眼斑(供 marineSkin 作体色)
const orcaBaseColor = Fn(() => {
  const y = positionLocal.y;
  const z = positionLocal.z;
  const ax = abs(positionLocal.x);
  const belly = smoothstep(0.05, -0.35, y);                       // 白色腹部
  const eyePatch = smoothstep(0.55, 0.20,                          // 白色眼斑(头侧椭圆)
    length(vec2(ax.sub(0.42).mul(1.6), y.sub(0.45))))
    .mul(smoothstep(1.8, 2.4, z)).mul(smoothstep(3.6, 3.0, z));
  return mix(vec3(0.020, 0.026, 0.034), vec3(0.80, 0.84, 0.88), max(belly, eyePatch));
});

// 终极泰坦:吞噬 4 种不同泰坦后白化,身上浮现四套不同方向的纹路
const ultimateTitanSkin = Fn(() => {
  const p = positionLocal;
  const base = vec3(0.92, 0.95, 0.94).toVar();
  const stripeA = smoothstep(0.94, 1.0, sin(p.z.mul(1.7).add(p.x.mul(0.45))).mul(0.5).add(0.5));
  const stripeB = smoothstep(0.95, 1.0, sin(p.z.mul(2.3).sub(p.y.mul(3.2)).add(1.4)).mul(0.5).add(0.5));
  const stripeC = smoothstep(0.955, 1.0, sin(p.x.mul(3.1).add(p.y.mul(2.1)).sub(0.6)).mul(0.5).add(0.5));
  const stripeD = smoothstep(0.96, 1.0, sin(length(p.xz).mul(2.0).add(p.y.mul(1.4))).mul(0.5).add(0.5));
  base.assign(mix(base, vec3(0.10, 0.46, 0.95), stripeA.mul(0.52)));
  base.assign(mix(base, vec3(0.95, 0.18, 0.12), stripeB.mul(0.48)));
  base.assign(mix(base, vec3(0.12, 0.72, 0.34), stripeC.mul(0.44)));
  base.assign(mix(base, vec3(0.88, 0.66, 0.10), stripeD.mul(0.40)));
  return marineSkin(base);
});

// 蛟龙号涂装:白色耐压壳体 + 橙色上部整流罩 + 前部黑色观察窗带 + 灰色尾段
// (真实蛟龙号为白/橙配色,按局部坐标分色,喂给 marineSkin)
const jiaolongColor = Fn(() => {
  const y = positionLocal.y;
  const z = positionLocal.z;
  const orangeZone = smoothstep(0.30, 0.55, y)                     // 上部
    .mul(smoothstep(-2.2, -1.2, z));                               // 尾部整流罩除外
  const winZone = smoothstep(2.1, 2.45, z)                         // 前部观察窗带
    .mul(smoothstep(-0.15, 0.05, y)).mul(smoothstep(0.65, 0.45, y));
  const tailZone = smoothstep(-2.7, -3.3, z);                      // 尾段推进舱
  const c = mix(vec3(0.86, 0.87, 0.86), vec3(0.85, 0.38, 0.08), orangeZone).toVar();
  c.assign(mix(c, vec3(0.04, 0.05, 0.07), winZone));
  c.assign(mix(c, vec3(0.30, 0.32, 0.34), tailZone));
  return c;
});

// 水母:半透明发光体,脉冲明暗(喂给 Bloom)
const jellyColor = Fn(([uPhase]) => {
  const w = dayWeights(uSunDir.y);
  const pulse = sin(uTime.mul(1.8).add(uPhase)).mul(0.5).add(0.5);
  const glowAmt = float(0.35).add(pulse.mul(0.85));
  const col = vec3(0.10, 0.75, 0.80).mul(glowAmt)
    .add(vec3(0.55, 0.30, 0.75).mul(pulse.mul(0.25)));
  return col.mul(float(0.25).add(w.x.mul(1.1)));
});

/* --------------------------- 海鸥:实例化振翅 --------------------------- */

const gullFlap = Fn(() => {
  const ph = hash(instanceIndex.toFloat().add(0.5)).mul(39.0);
  const glideRaw = sin(uTime.mul(0.31).add(ph)).mul(0.5).add(0.5);
  const flapAmp = mix(0.15, 1.0, smoothstep(0.35, 0.65, glideRaw));
  const flap = sin(uTime.mul(7.0).add(ph)).mul(flapAmp);
  const wing = smoothstep(0.06, 0.30, abs(positionLocal.x));
  const liftY = flap.mul(wing).mul(abs(positionLocal.x)).mul(1.15);
  const tuckX = float(1.0).sub(abs(flap).mul(wing).mul(0.18));
  return vec3(positionLocal.x.mul(tuckX), positionLocal.y.add(liftY), positionLocal.z);
});

const gullColor = Fn(() => {
  const w = dayWeights(uSunDir.y);
  return vec3(0.030, 0.035, 0.050).mul(w.x)
    .add(vec3(0.100, 0.080, 0.085).mul(w.y))
    .add(vec3(0.260, 0.270, 0.290).mul(w.z));
});

function createGullGeometry() {
  const p = [];
  const tri = (a, b, c) => p.push(...a, ...b, ...c);
  const nose = [0, 0, 0.30], tail = [0, 0.02, -0.24];
  const bl = [-0.055, -0.01, 0], br = [0.055, -0.01, 0];
  tri(nose, bl, tail); tri(nose, tail, br);
  tri(tail, [-0.07, 0.02, -0.31], [0.07, 0.02, -0.31]);
  tri([-0.05, 0, 0.10], [-0.62, 0.02, -0.03], [-0.05, 0, -0.10]);
  tri([0.05, 0, 0.10], [0.05, 0, -0.10], [0.62, 0.02, -0.03]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}

/* --------------------- 真实形态生物几何(多部件合并) --------------------- */

// 宽吻海豚:纺锤躯干 + 额隆 + 吻 + 尾柄 + 背鳍 + 胸鳍 + 尾鳍,朝 +Z
function createDolphinGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 18, 12), 0, 0, 0.10, 0, 0, 0, 0.44, 0.47, 1.55); // 躯干
  add(new THREE.SphereGeometry(0.30, 12, 8), 0, 0.13, 1.42, 0, 0, 0, 0.95, 0.85, 1.05); // 额隆
  add(new THREE.ConeGeometry(0.115, 0.60, 10), 0, -0.03, 1.95, Math.PI / 2, 0, 0, 1, 1, 1); // 吻
  add(new THREE.CylinderGeometry(0.07, 0.20, 1.35, 10), 0, 0.01, -2.00, -Math.PI / 2, 0, 0, 1, 1, 1); // 尾柄
  add(new THREE.ConeGeometry(0.26, 0.60, 8), 0, 0.55, -0.15, -0.38, 0, 0, 0.13, 1, 1); // 背鳍
  add(new THREE.SphereGeometry(0.30, 8, 6), -0.48, -0.22, 0.55, 0, 0.50, 0.60, 1.0, 0.10, 0.42); // 胸鳍 L
  add(new THREE.SphereGeometry(0.30, 8, 6), 0.48, -0.22, 0.55, 0, -0.50, -0.60, 1.0, 0.10, 0.42); // 胸鳍 R
  add(new THREE.SphereGeometry(0.36, 8, 6), -0.33, 0, -2.72, 0, 0.55, 0, 1.10, 0.09, 0.50); // 尾鳍 L
  add(new THREE.SphereGeometry(0.36, 8, 6), 0.33, 0, -2.72, 0, -0.55, 0, 1.10, 0.09, 0.50); // 尾鳍 R
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 座头鲸:粗壮躯干 + 小背鳍 + 大尾鳍,朝 +Z(约 13m)
function createWhaleGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 20, 14), 0, 0, 0, 0, 0, 0, 1.50, 1.60, 6.00); // 躯干
  add(new THREE.SphereGeometry(1, 12, 8), 0, -0.15, 5.2, 0, 0, 0, 1.05, 0.95, 1.60); // 头部
  add(new THREE.ConeGeometry(0.30, 0.80, 8), 0, 1.55, -2.60, -0.30, 0, 0, 0.25, 1, 1); // 背鳍
  add(new THREE.SphereGeometry(1, 10, 6), -1.15, 0.1, -6.30, 0, 0.42, 0, 1.30, 0.14, 0.60); // 尾鳍 L
  add(new THREE.SphereGeometry(1, 10, 6), 1.15, 0.1, -6.30, 0, -0.42, 0, 1.30, 0.14, 0.60); // 尾鳍 R
  add(new THREE.SphereGeometry(1, 8, 6), -1.55, -0.5, 2.6, 0, 0.35, 0.5, 1.4, 0.12, 0.45); // 长胸鳍 L
  add(new THREE.SphereGeometry(1, 8, 6), 1.55, -0.5, 2.6, 0, -0.35, -0.5, 1.4, 0.12, 0.45); // 长胸鳍 R
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 蝠鲼:菱形双翼 + 头鳍 + 鞭尾,朝 +Z
function createMantaGeometry() {
  const p = [];
  const tri = (a, b, c) => p.push(...a, ...b, ...c);
  const nose = [0, 0.05, 1.9], top = [0, 0.34, 0.1], tail = [0, 0.02, -1.6];
  const lw = [-2.3, 0.05, -0.5], rw = [2.3, 0.05, -0.5];
  tri(nose, lw, top); tri(nose, top, rw);
  tri(lw, tail, top); tri(top, tail, rw);
  tri([0, 0.02, 1.9], [-0.28, -0.05, 1.55], [-0.05, 0.14, 1.45]); // 头鳍 L
  tri([0, 0.02, 1.9], [0.05, 0.14, 1.45], [0.28, -0.05, 1.55]);   // 头鳍 R
  tri([-0.03, 0.02, -1.55], [0.03, 0.02, -1.55], [0, 0.0, -4.2]); // 鞭尾
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}

/* --------------------------- 船只:几何与动力学 --------------------------- */

// 摩托艇:圆底船体 + 甲板 + 驾驶台 + 风挡 + 舷外机,朝 +Z(约 7m)
function createMotorboatGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 18, 12), 0, 0.10, 0, 0, 0, 0, 1.00, 0.55, 3.50);   // 船体
  add(new THREE.BoxGeometry(1.55, 0.22, 5.60), 0, 0.50, -0.20, 0, 0, 0, 1, 1, 1);    // 甲板
  add(new THREE.BoxGeometry(1.05, 0.75, 1.25), 0, 0.95, 0.35, 0, 0, 0, 1, 1, 1);     // 驾驶台
  add(new THREE.BoxGeometry(1.10, 0.45, 0.07), 0, 1.55, 1.02, -0.32, 0, 0, 1, 1, 1); // 风挡
  add(new THREE.BoxGeometry(0.45, 0.55, 0.35), 0, 0.40, -3.35, 0.15, 0, 0, 1, 1, 1); // 舷外机
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 帆船:船体 + 舱室 + 桅杆 + 帆桁 + 主帆 + 前帆,朝 +Z(约 9m)
function createSailboatGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo.toNonIndexed());   // 与帆面(非索引)保持一致的属性布局
  };
  add(new THREE.SphereGeometry(1, 18, 12), 0, 0.12, 0, 0, 0, 0, 1.20, 0.60, 4.50);
  add(new THREE.BoxGeometry(1.40, 0.55, 2.20), 0, 0.70, -0.40, 0, 0, 0, 1, 1, 1);
  add(new THREE.CylinderGeometry(0.06, 0.09, 7.6, 8), 0, 4.30, 0.80, 0, 0, 0, 1, 1, 1);          // 桅杆
  add(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), 0, 1.75, -0.90, Math.PI / 2, 0, 0, 1, 1, 1); // 帆桁
  const sail = [];
  const tri = (a, b, c) => sail.push(...a, ...b, ...c);
  tri([0, 1.9, 0.75], [0, 7.6, 0.75], [0, 1.9, -2.5]);   // 主帆
  tri([0, 1.4, 4.30], [0, 6.9, 0.85], [0, 1.4, 1.00]);   // 前帆
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sail, 3));
  sg.computeVertexNormals();
  // 与其余部件属性布局一致(mergeGeometries 要求各部件属性集合相同)
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((sail.length / 3) * 2), 2));
  parts.push(sg);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 虎鲸:粗壮躯干 + 圆头 + 高三角背鳍 + 胸鳍 + 尾鳍,朝 +Z(约 7m)
function createOrcaGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 18, 12), 0, 0, 0.2, 0, 0, 0, 1.05, 1.10, 3.30);      // 躯干
  add(new THREE.SphereGeometry(0.9, 12, 8), 0, -0.05, 3.1, 0, 0, 0, 1.00, 0.90, 1.20); // 圆头
  add(new THREE.ConeGeometry(0.42, 1.70, 8), 0, 1.35, -0.4, -0.18, 0, 0, 0.28, 1, 1);  // 高背鳍
  add(new THREE.SphereGeometry(0.5, 8, 6), -0.85, -0.55, 1.4, 0, 0.5, 0.6, 1.2, 0.14, 0.55);  // 胸鳍 L
  add(new THREE.SphereGeometry(0.5, 8, 6), 0.85, -0.55, 1.4, 0, -0.5, -0.6, 1.2, 0.14, 0.55); // 胸鳍 R
  add(new THREE.SphereGeometry(0.42, 8, 6), -0.50, 0.05, -3.4, 0, 0.55, 0, 1.2, 0.10, 0.55);  // 尾鳍 L
  add(new THREE.SphereGeometry(0.42, 8, 6), 0.50, 0.05, -3.4, 0, -0.55, 0, 1.2, 0.10, 0.55);  // 尾鳍 R
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

/* 船体动力学(尽量贴近真实):
   - 油门决定目标航速,加/减速度受限 —— 起步与停船都有明显惯性
   - 舵效正比于航速 —— 低速几乎打不动方向、无法原地转向,倒车时舵效反向
   - 转向离心力把船体向外甩出侧滑,龙骨横向阻力让其缓慢衰减
   - 直线航行时带微弱海流漂移 */
const BOAT_SPECS = {
  motor: { vmax: 9.0, accel: 1.0, brake: 1.4, turnRate: 0.50, L: 7.0, B: 2.4, draft: 0.0 },
  sail:  { vmax: 5.5, accel: 0.5, brake: 0.8, turnRate: 0.32, L: 9.0, B: 3.0, draft: 0.0 },
  speed: { vmax: 26.0, accel: 2.4, brake: 3.2, turnRate: 0.40, L: 10.0, B: 2.6, draft: 0.0, plane: true },
};
const PLAYER_HP_MAX = 200;

function stepBoatDynamics(b, inp, dt) {
  const spec = BOAT_SPECS[b.kind];
  const uT = inp.throttle * spec.vmax;                 // 目标航速(负油门=倒船)
  const dv = uT - b.u;
  const aLim = (dv > 0 ? spec.accel : spec.brake) * dt;
  b.u += Math.max(-aLim, Math.min(aLim, dv));
  const authority = Math.max(-1, Math.min(1, b.u / 3.5));  // 舵效(低速≈0,倒车反向)
  const rT = inp.rudder * authority * spec.turnRate;
  b.r += (rT - b.r) * Math.min(1, dt * 1.8);
  b.v += (b.r * b.u * 0.22 - b.v * 1.6) * dt;              // 侧滑产生与衰减
  b.heading += b.r * dt;
  const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
  b.x += (fx * b.u + fz * b.v) * dt + 0.04 * dt;
  b.z += (fz * b.u - fx * b.v) * dt;
}

// 浮力姿态:船首/船尾/左右舷四点采样波面 → 纵摇/横摇(限幅防翻船,转向带压舷)
function boatAttitude(b, t, seaEff) {
  const spec = BOAT_SPECS[b.kind];
  const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
  const L = spec.L * 0.36, B = spec.B * 0.5;
  const hBow = waveHeightAt(b.x + fx * L, b.z + fz * L, t, seaEff);
  const hSt = waveHeightAt(b.x - fx * L, b.z - fz * L, t, seaEff);
  const hR = waveHeightAt(b.x + fz * B, b.z - fx * B, t, seaEff);
  const hL = waveHeightAt(b.x - fz * B, b.z + fx * B, t, seaEff);
  const y = (hBow + hSt + hR + hL) * 0.25 + spec.draft
    + (spec.plane ? Math.min(0.85, b.u * b.u * 0.0022) : 0);   // 滑行艇:高速被水动力托起
  const pitch = Math.max(-0.5, Math.min(0.5, Math.atan2(hSt - hBow, L * 2)
    + (spec.plane ? Math.min(0.09, b.u * b.u * 0.00025) : 0)));   // 滑行时船头微抬
  const heel = -b.r * Math.min(Math.abs(b.u), 6) * 0.03;   // 高速转向时的压舷
  const roll = Math.max(-0.45, Math.min(0.45, Math.atan2(hR - hL, B * 2) + heel));
  return { y, pitch, roll };
}

// 蛟龙号载人潜水器(真实 8.2m 级):耐压球壳 + 橙色整流罩 + 尾部推进舱
// + 横贯侧推槽 + 前部采样篮 + 双机械臂 + 顶灯架,朝 +Z
function createJiaolongGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 20, 14), 0, 0, 0, 0, 0, 0, 1.15, 1.05, 3.45);      // 主耐压壳
  add(new THREE.SphereGeometry(0.8, 14, 10), 0, 0.75, 0.5, 0, 0, 0, 0.90, 0.55, 1.60); // 上部整流罩(橙)
  add(new THREE.CylinderGeometry(0.35, 0.75, 1.8, 12), 0, 0, -3.6, Math.PI / 2, 0, 0, 1, 1, 1); // 尾部收缩
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 10), 0, 0, -4.6, Math.PI / 2, 0, 0, 1, 1, 1);   // 主推螺旋桨毂
  add(new THREE.CylinderGeometry(0.22, 0.22, 2.8, 8), 0, 0.1, -0.6, 0, 0, Math.PI / 2, 1, 1, 1); // 横贯侧推槽
  add(new THREE.BoxGeometry(1.5, 0.5, 1.2), 0, -0.95, 2.2, 0, 0, 0, 1, 1, 1);         // 前部采样篮
  add(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), -0.6, -0.8, 2.8, 0.9, 0.3, 0, 1, 1, 1);   // 机械臂 L
  add(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), 0.6, -0.8, 2.8, 0.9, -0.3, 0, 1, 1, 1);   // 机械臂 R
  add(new THREE.BoxGeometry(0.9, 0.18, 0.18), 0, 1.15, 1.6, 0, 0, 0, 1, 1, 1);        // 顶灯架
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

/* 潜水器动力学(贴近真实蛟龙号的操作特性):
   - 主推进最高约 1.5 m/s(≈2.9 节,与蛟龙号 2.5 节同级),加减速迟缓、惯性大
   - 垂直推进器与水平解耦:上浮/下潜独立控制,垂速最高约 1.1 m/s
   - 悬停模式:位置式自动定深(潜航员作业时的核心模式)
   - 抛弃压载:正浮力无动力上浮(真实的保命机构),优先级高于一切指令
   - 差速转向非常迟缓,且依赖航速(悬停时几乎转不动)
   - 软接触:坐底(floorY)与出水(maxY)限幅 */
function stepSubDynamics(s, inp, dt, floorY, maxY, ballastVy) {
  const uT = inp.throttle * 1.5;
  const dv = uT - s.u;
  const aLim = (dv > 0 ? 0.35 : 0.5) * dt;
  s.u += Math.max(-aLim, Math.min(aLim, dv));
  let vyT;
  if (ballastVy > 0) {
    vyT = ballastVy;                                   // 抛载上浮:浮力接管
  } else if (inp.hover) {
    vyT = Math.max(-0.8, Math.min(0.8, (inp.holdY - s.y) * 0.4));   // 自动定深
  } else {
    vyT = inp.vert * 1.1;                              // 手动垂直推进
  }
  s.vy += (vyT - s.vy) * Math.min(1, dt * 0.9);
  const rT = inp.rudder * 0.28 * (0.3 + Math.min(1, Math.abs(s.u)) * 0.7);
  s.r += (rT - s.r) * Math.min(1, dt * 1.2);
  s.heading += s.r * dt;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  s.x += fx * s.u * dt;
  s.z += fz * s.u * dt;
  s.y += s.vy * dt;
  if (s.y < floorY) { s.y = floorY; s.vy = Math.max(0, s.vy); }   // 坐底
  if (s.y > maxY) { s.y = maxY; s.vy = Math.min(0, s.vy); }       // 出水
}

/* =========================== 荒岛:地形与植被 =========================== */
/* 位于 (0.83, 0.55) 方位 700m 处 —— 正好是天空剪影 isl1 的方向,
   真岛落成后该剪影从天空里移除。地形为 CPU 精确高度场(行走/搁浅/潜水
   触底都用它),着色在 GPU 按高度/坡度分带。 */
const ISLAND = { x: 498, z: 330, R: 170 };   // 扩大后的岛(海面 ±800 内)
const BEACH_R = ISLAND.R * 0.72;             // 干滩半径(导航距离用)

// 与 GPU gnoise 同源的 CPU 分形噪声(3 倍频)
function fbmJS(x, z) {
  return gnoiseValueJS(x, z) * 0.55
    + gnoiseValueJS(x * 2.13 + 5.2, z * 2.13 + 1.3) * 0.30
    + gnoiseValueJS(x * 4.41 + 9.7, z * 4.41 + 3.1) * 0.15;
}

// 岛高度场:径向衰减 × 分形起伏,水线外沉入海底(-30)
function islandHeightAt(x, z) {
  const dx = x - ISLAND.x, dz = z - ISLAND.z;
  const d = Math.hypot(dx, dz) / (ISLAND.R * 1.35);
  if (d >= 1) return -30;
  const t = 1 - d * d;
  const rough = 0.72 + 0.42 * fbmJS(x * 0.011 + 31.7, z * 0.011 - 17.3);
  const detail = fbmJS(x * 0.06, z * 0.06) * 1.6;
  return -30 + Math.pow(t, 1.55) * 74 * rough + detail * Math.min(1, t * 2);
}

// 另一块海域:更大的荒岛(岛上有野人),骑融合泰坦横渡深海才能到达
const NEW_ISLAND = { x: -720, z: -680, R: 360 };
const THIRD_ISLAND = { x: -1180, z: -220, R: 165, name: '石牙远岛', form: 'concave' };
const FOURTH_ISLAND = { x: -260, z: -1220, R: 165, name: '雾叶远岛', form: 'convex' };
function newIslandRiverMetrics(x, z) {
  const nx = (x - NEW_ISLAND.x) / NEW_ISLAND.R;
  const nz = (z - NEW_ISLAND.z) / NEW_ISLAND.R;
  const curve = -0.12 + Math.sin((nz + 0.70) * 2.45) * 0.18 + Math.sin((nz + 0.70) * 8.2) * 0.045;
  const edgeIn = Math.max(0, Math.min(1, (nz + 0.82) / 0.18));
  const edgeOut = Math.max(0, Math.min(1, (0.88 - nz) / 0.18));
  return { lateral: Math.abs(nx - curve) * NEW_ISLAND.R, gate: edgeIn * edgeOut, curve };
}
function newIslandHeightAt(x, z) {
  const dx = x - NEW_ISLAND.x, dz = z - NEW_ISLAND.z;
  const d = Math.hypot(dx, dz) / (NEW_ISLAND.R * 1.35);
  if (d >= 1) return -30;
  const t = 1 - d * d;
  const rough = 0.70 + 0.46 * fbmJS(x * 0.009 + 71.1, z * 0.009 + 23.9);
  const detail = fbmJS(x * 0.05 + 3.3, z * 0.05 - 8.8) * 2.2;
  let h = -30 + Math.pow(t, 1.5) * 96 * rough + detail * Math.min(1, t * 2);
  // 第二岛固定河谷:从雨林高地蜿蜒切到海边,让地形本身出现可读的溪谷。
  const river = newIslandRiverMetrics(x, z);
  const cut = Math.exp(-(river.lateral * river.lateral) / (15 * 15)) * river.gate;
  h -= cut * (10 + 10 * Math.min(1, t * 1.5));
  return h;
}
function newIslandWallPoint(i) {
  const u = i / 33;
  const x = NEW_ISLAND.x - 175 + u * 350;
  const z = NEW_ISLAND.z - 82 + Math.sin(u * Math.PI * 1.35) * 46 + Math.sin(u * Math.PI * 5.0) * 10;
  return { x, z, h: newIslandHeightAt(x, z) };
}
function newIslandGreatWallHighPoint() {
  return [2, 16, 31].map(i => newIslandWallPoint(i)).sort((a, b) => b.h - a.h)[0];
}
const GREAT_WALL_SAVAGE_KEEP_OUT = 46;
function keepSavageOutOfGreatWall(x, z) {
  const high = newIslandGreatWallHighPoint();
  const dx = x - high.x, dz = z - high.z;
  const d = Math.hypot(dx, dz) || 1;
  if (d >= GREAT_WALL_SAVAGE_KEEP_OUT) return { x, z };
  const k = GREAT_WALL_SAVAGE_KEEP_OUT / d;
  return { x: high.x + dx * k, z: high.z + dz * k };
}
function distToSegment2D(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const wx = px - ax, wz = pz - az;
  const c = Math.max(0, Math.min(1, (wx * vx + wz * vz) / Math.max(0.0001, vx * vx + vz * vz)));
  const x = ax + vx * c, z = az + vz * c;
  return { d: Math.hypot(px - x, pz - z), t: c };
}
function newIslandGreatWallRampInfo() {
  const high = newIslandGreatWallHighPoint();
  const vx = NEW_ISLAND.x - high.x, vz = NEW_ISLAND.z - high.z;
  const len = Math.hypot(vx, vz) || 1;
  const dx = vx / len, dz = vz / len;
  const start = { x: high.x + dx * 48, z: high.z + dz * 48 };
  const end = { x: high.x + dx * 6, z: high.z + dz * 6 };
  return { start, end, top: high.h + 15.8, width: 8.4, collisionWidth: 0 };
}
function newIslandGreatWallHeightAt(x, z) {
  let h = -30;
  const ramp = newIslandGreatWallRampInfo();
  const rhit = distToSegment2D(x, z, ramp.start.x, ramp.start.z, ramp.end.x, ramp.end.z);
  if (rhit.d < ramp.collisionWidth) {
    const base = newIslandHeightAt(ramp.start.x, ramp.start.z);
    const shoulder = newIslandHeightAt(x, z);
    const rt = Math.max(0, Math.min(1, rhit.t));
    const crown = base + (ramp.top - base) * (rt * rt * (3 - 2 * rt));
    const edge = 1 - Math.max(0, rhit.d - ramp.collisionWidth * 0.72) / (ramp.collisionWidth * 0.28);
    h = Math.max(h, shoulder + (crown - shoulder) * Math.max(0, Math.min(1, edge)));
  }
  const towerIdx = [2, 16, 31];
  for (const idx of towerIdx) {
    const p = newIslandWallPoint(idx);
    const d = Math.hypot(x - p.x, z - p.z);
    const top = p.h + 15.8;
    if (d < 12.2) h = Math.max(h, top);
    else if (d < 30) h = Math.max(h, newIslandHeightAt(x, z) + (top - newIslandHeightAt(x, z)) * (1 - (d - 12.2) / 17.8));
  }
  for (let i = 0; i < 33; i++) {
    if (i === 11 || i === 12 || i === 23) continue;
    const a = newIslandWallPoint(i), b = newIslandWallPoint(i + 1);
    const hit = distToSegment2D(x, z, a.x, a.z, b.x, b.z);
    if (hit.d < 3.2) {
      const baseH = a.h + (b.h - a.h) * hit.t;
      h = Math.max(h, baseH + 8.4);
    }
  }
  return h;
}
function remoteIslandHeightAt(isle, x, z) {
  const dx = x - isle.x, dz = z - isle.z;
  const d = Math.hypot(dx, dz) / (isle.R * 1.28);
  if (d >= 1) return -30;
  const t = 1 - d * d;
  const nx = dx / isle.R, nz = dz / isle.R;
  const rough = 0.66 + 0.35 * fbmJS(x * 0.013 + isle.x * 0.01, z * 0.013 + isle.z * 0.01);
  let h = -30 + Math.pow(t, 1.45) * 58 * rough + fbmJS(x * 0.06, z * 0.06) * 1.3;
  if (isle.form === 'concave') {
    // 凹岛:中部被掏成裂湾,东侧留出缺口;外缘抬成环状断崖。
    const bowl = Math.exp(-((nx + 0.05) * (nx + 0.05) / 0.18 + nz * nz / 0.40));
    const cleft = Math.exp(-((nx - 0.56) * (nx - 0.56) / 0.035 + nz * nz / 0.16));
    const rim = Math.exp(-Math.pow(Math.hypot(nx, nz) - 0.72, 2) / 0.022);
    h += rim * 21 - bowl * 34 - cleft * 42;
  } else if (isle.form === 'convex') {
    // 凸岛:西侧伸出石崖楔块,形状与凹岛裂湾呼应;岛心向上鼓成脊背。
    const plug = Math.exp(-((nx + 0.58) * (nx + 0.58) / 0.045 + nz * nz / 0.16));
    const spine = Math.exp(-(nx * nx / 0.22 + nz * nz / 0.50));
    const cutBack = Math.exp(-((nx - 0.48) * (nx - 0.48) / 0.09 + nz * nz / 0.45));
    h += plug * 48 + spine * 24 - cutBack * 12;
  }
  return h;
}
// 脚下的地面:两座岛取高者(行走/落水判定统一走这里)
function groundHeightAt(x, z) {
  return Math.max(
    islandHeightAt(x, z),
    newIslandHeightAt(x, z),
    newIslandGreatWallHeightAt(x, z),
    remoteIslandHeightAt(THIRD_ISLAND, x, z),
    remoteIslandHeightAt(FOURTH_ISLAND, x, z));
}

/* 地形着色:沙/草/岩按高度坡度分带(噪声打碎边界)+ 日光漫射 + 云影
   + 湿沙高光 + 篝火暖光 + 大气透视(直接混入视线方向的天空色) */
const islandTerrainColor = Fn(() => {
  const wpos = positionWorld;
  const N = normalize(normalWorld);
  const V = normalize(cameraPosition.sub(wpos));
  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const sunTint = vec3(0.12, 0.14, 0.24).mul(nightF)
    .add(vec3(1.00, 0.55, 0.35).mul(duskF))
    .add(vec3(1.00, 1.00, 0.98).mul(dayF)).toVar();
  const lightLevel = float(0.07).add(max(uSunDir.y, 0.0).mul(1.15)).add(duskF.mul(0.12)).toVar();

  const h = wpos.y;
  const flat = N.y;
  const band = fbm3(wpos.xz.mul(0.045)).mul(1.4);
  const grassM = smoothstep(1.8, 3.6, h.add(band)).mul(smoothstep(0.58, 0.80, flat));
  const rockM = smoothstep(0.82, 0.55, flat).mul(smoothstep(0.2, 1.6, h.add(band)));
  const underM = smoothstep(0.3, -1.8, h);
  const sandCol = mix(vec3(0.76, 0.70, 0.52), vec3(0.46, 0.42, 0.32), smoothstep(0.55, -0.15, h));
  const grassCol = mix(vec3(0.14, 0.30, 0.11), vec3(0.30, 0.42, 0.16),
    fbm3(wpos.xz.mul(0.13)).mul(0.5).add(0.5));
  const rockCol = mix(vec3(0.30, 0.28, 0.26), vec3(0.44, 0.42, 0.38),
    gnoise(wpos.xz.mul(0.35)).x.mul(0.5).add(0.5));
  const base = mix(sandCol, grassCol, grassM).toVar();
  base.assign(mix(base, rockCol, rockM));
  base.assign(mix(base, vec3(0.22, 0.24, 0.20), underM));
  const bloodIslandBase = mix(
    mix(vec3(0.25, 0.018, 0.012), vec3(0.48, 0.030, 0.016), grassM),
    vec3(0.12, 0.012, 0.010),
    rockM.mul(0.72)
  );
  base.assign(mix(base, bloodIslandBase, uHorror.mul(0.82)));

  // 日光漫射 + 烘焙 AO(谷地/树荫压暗)+ 云影(随风漂移的大块阴影)
  const ao = attribute('aAO');
  const diffuse = max(dot(N, uSunDir), 0.0).mul(0.78).add(0.22).mul(ao);
  const cloudSh = gnoise(wpos.xz.mul(0.006)
    .add(vec2(uTime.mul(0.012), uTime.mul(0.004)))).x.mul(0.5).add(0.5);
  const shade = mix(float(1.0), float(0.42),
    cloudSh.mul(uCloudCover).mul(smoothstep(0.02, 0.2, uSunDir.y)));
  const col = base.mul(sunTint).mul(lightLevel).mul(diffuse).mul(shade).toVar();
  // 天空环境光:阴面不死黑(AO 同样生效)
  col.addAssign(base.mul(vec3(0.35, 0.45, 0.60)).mul(ao)
    .mul(float(0.05).add(dayF.mul(0.12)).add(duskF.mul(0.06))));
  // 湿沙高光:水线一带的镜面反耀
  const wetM = smoothstep(0.75, 0.15, h).mul(smoothstep(-0.6, -0.1, h));
  const spec = pow(max(dot(reflect(V.negate(), N), uSunDir), 0.0), 42.0);
  col.addAssign(sunTint.mul(spec.mul(wetM).mul(lightLevel).mul(0.9)));
  col.addAssign(vec3(0.55, 0.010, 0.004)
    .mul(uHorror).mul(diffuse).mul(float(0.10).add(wetM.mul(0.75))));
  // 篝火暖光:夜间岛上唯一的人工光,带火焰闪烁
  const fireD = length(wpos.xz.sub(vec2(uCampfire.x, uCampfire.y)));
  const flick = gnoise(vec2(uTime.mul(2.6), 7.3)).x.mul(0.3).add(0.9);
  col.addAssign(vec3(1.0, 0.46, 0.16)
    .mul(uCampfire.z.mul(flick).mul(smoothstep(20.0, 2.5, fireD)).mul(0.85)));
  // 大气透视:远处没入天色
  const dist = length(cameraPosition.sub(wpos));
  col.assign(mix(col, skyColor(wpos.sub(cameraPosition)),
    smoothstep(160.0, 850.0, dist).mul(0.85)));
  return col;
});

const canalWaterColor = Fn(() => {
  const wpos = positionWorld;
  const V = normalize(cameraPosition.sub(wpos));
  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const ripple = gnoise(vec2(wpos.x.mul(0.075).add(uTime.mul(0.18)), wpos.z.mul(0.075).sub(uTime.mul(0.13)))).x
    .add(gnoise(vec2(wpos.x.mul(0.21).sub(uTime.mul(0.33)), wpos.z.mul(0.21).add(4.7))).x.mul(0.35));
  const deep = vec3(0.025, 0.17, 0.21);
  const jade = vec3(0.06, 0.48, 0.52);
  const sky = mix(vec3(0.03, 0.06, 0.12), mix(vec3(0.75, 0.42, 0.24), vec3(0.42, 0.78, 0.92), dayF), duskF.add(dayF));
  const fresnel = pow(float(1.0).sub(max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0)), 3.0);
  const N = normalize(vec3(ripple.mul(0.07), 1.0, ripple.mul(0.045)));
  const spec = pow(max(dot(reflect(V.negate(), N), uSunDir), 0.0), 96.0)
    .mul(smoothstep(-0.04, 0.12, uSunDir.y));
  const caustic = sin(wpos.x.mul(0.55).add(wpos.z.mul(0.37)).add(uTime.mul(1.8))).mul(0.5).add(0.5)
    .mul(sin(wpos.x.mul(-0.32).add(wpos.z.mul(0.62)).sub(uTime.mul(1.35))).mul(0.5).add(0.5));
  return mix(deep, jade, float(0.45).add(ripple.mul(0.18))).mul(float(0.46).add(dayF.mul(0.58)).add(duskF.mul(0.18)))
    .add(sky.mul(fresnel.mul(0.62)))
    .add(vec3(0.45, 0.95, 0.92).mul(caustic.mul(0.11).mul(dayF)))
    .add(vec3(1.0, 0.82, 0.58).mul(spec.mul(1.35)))
    .mul(float(1.0).sub(nightF.mul(0.46)));
});

/* 棕榈着色:树干/叶片分色(uv.x 作掩码)+ 叶片逆光透光 + 篝火暖光 */
const palmColor = Fn(() => {
  const w = dayWeights(uSunDir.y);
  const nightF = w.x, duskF = w.y, dayF = w.z;
  const sunTint = vec3(0.12, 0.14, 0.24).mul(nightF)
    .add(vec3(1.00, 0.55, 0.35).mul(duskF))
    .add(vec3(1.00, 1.00, 0.98).mul(dayF)).toVar();
  const lightLevel = float(0.07).add(max(uSunDir.y, 0.0).mul(1.15)).add(duskF.mul(0.12)).toVar();
  const N = normalize(normalWorld);
  const V = normalize(cameraPosition.sub(positionWorld));
  const isFrond = uv().x;    // 0=树干 1=叶片
  const trunk = vec3(0.30, 0.21, 0.13)
    .mul(gnoise(vec2(positionLocal.y.mul(3.0), 1.7)).x.mul(0.15).add(0.95));
  const frond = vec3(0.10, 0.30, 0.10)
    .mul(gnoise(vec2(positionLocal.x.mul(2.0), positionLocal.z.mul(2.0))).x.mul(0.2).add(1.0));
  const base = mix(trunk, frond, isFrond);
  const diffuse = max(dot(N, uSunDir), 0.0).mul(0.75).add(0.25);
  const col = base.mul(sunTint).mul(lightLevel).mul(diffuse).toVar();
  // 叶片透光:逆光泛嫩绿(廉价次表面散射)
  const back = pow(max(dot(V, uSunDir.negate()), 0.0), 3.0);
  col.addAssign(vec3(0.25, 0.55, 0.15)
    .mul(back.mul(isFrond).mul(dayF.add(duskF.mul(0.5))).mul(0.6)));
  const fireD = length(positionWorld.xz.sub(vec2(uCampfire.x, uCampfire.y)));
  const flick = gnoise(vec2(uTime.mul(2.6), 7.3)).x.mul(0.3).add(0.9);
  col.addAssign(vec3(1.0, 0.46, 0.16)
    .mul(uCampfire.z.mul(flick).mul(smoothstep(16.0, 2.0, fireD)).mul(0.7)));
  return col;
});

/* 棕榈风摆:高度平方加权,每棵相位不同(instanceIndex 哈希) */
const palmSway = Fn(() => {
  const hgt = clamp(positionLocal.y.div(7.0), 0.0, 1.0);
  const phase = hash(instanceIndex).mul(6.2831);
  const wind = float(0.25).add(uSeaState.mul(0.5)).add(uStorm.mul(0.8));
  const bend = hgt.mul(hgt).mul(wind);
  return positionLocal.add(vec3(
    sin(uTime.mul(1.15).add(phase)).mul(bend.mul(0.45)),
    bend.mul(-0.12),
    cos(uTime.mul(0.95).add(phase)).mul(bend.mul(0.35))
  ));
});

// 棕榈:5 段渐弯树干 + 7 片先扬后垂的羽叶(uv.x: 0 干 1 叶,高约 7m)
function createPalmGeometry() {
  const parts = [];
  const setMask = (geo, m) => {
    const uvA = geo.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setX(i, m);
    return geo;
  };
  let cx = 0, cy = 0, ang = 0.10;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.CylinderGeometry(0.15 - i * 0.016, 0.18 - i * 0.016, 1.45, 7);
    seg.translate(0, 0.72, 0);
    seg.rotateZ(-ang);
    seg.translate(cx, cy, 0);
    parts.push(setMask(seg, 0));
    cx += Math.sin(ang) * 1.45;
    cy += Math.cos(ang) * 1.45;
    ang += 0.055;
  }
  for (let i = 0; i < 7; i++) {
    const az = (i / 7) * Math.PI * 2 + 0.3;
    const frond = new THREE.BoxGeometry(0.55, 0.025, 3.0, 1, 1, 6);
    const p = frond.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const k = (p.getZ(v) + 1.5) / 3.0;            // 0 根 → 1 尖
      p.setY(v, p.getY(v) - k * k * 1.5 + k * 0.35); // 先扬后垂
      p.setX(v, p.getX(v) * (1 - k * 0.7));          // 向尖收窄
    }
    frond.translate(0, 0, 1.5);
    frond.rotateX(-0.35);
    frond.rotateY(az);
    frond.translate(cx, cy, 0);
    parts.push(setMask(frond, 1));
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 超级快艇:低扁针型艇体 + 座舱整流罩 + 弧形风挡 + 双舷外机 + 尾翼,朝 +Z(约 11m)
function createSpeedboatGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 20, 12), 0, 0.05, 0, 0, 0, 0, 0.85, 0.42, 5.40);   // 针型艇体
  add(new THREE.BoxGeometry(1.50, 0.16, 7.60), 0, 0.40, -0.40, 0, 0, 0, 1, 1, 1);    // 甲板
  add(new THREE.BoxGeometry(0.95, 0.50, 1.70), 0, 0.70, 0.30, 0, 0, 0, 1, 1, 1);     // 座舱整流罩
  add(new THREE.BoxGeometry(1.00, 0.34, 0.06), 0, 1.10, 1.20, -0.38, 0, 0, 1, 1, 1); // 风挡
  add(new THREE.BoxGeometry(0.42, 0.50, 0.32), -0.50, 0.30, -4.55, 0.12, 0, 0, 1, 1, 1); // 舷外机 L
  add(new THREE.BoxGeometry(0.42, 0.50, 0.32), 0.50, 0.30, -4.55, 0.12, 0, 0, 1, 1, 1);  // 舷外机 R
  add(new THREE.BoxGeometry(1.70, 0.06, 0.50), 0, 0.78, -4.30, 0, 0, 0, 1, 1, 1);    // 尾翼
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 阔叶树:较直树干 + 三层错落树冠(uv.x: 0 干 1 叶,与棕榈同一着色约定,高约 9m)
function createCanopyTreeGeometry() {
  const parts = [];
  const setMask = (geo, m) => {
    const uvA = geo.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setX(i, m);
    return geo;
  };
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, 5.2, 8);
  trunk.translate(0, 2.6, 0);
  parts.push(setMask(trunk, 0));
  const blob = (x, y, z, s) => {
    const g = new THREE.SphereGeometry(1, 12, 9);
    g.scale(s * 1.35, s, s * 1.35);
    g.translate(x, y, z);
    parts.push(setMask(g, 1));
  };
  blob(0, 5.6, 0, 2.2);        // 主冠
  blob(1.3, 4.7, 0.6, 1.4);    // 侧冠
  blob(-1.1, 4.9, -0.7, 1.5);
  blob(0.2, 6.9, -0.3, 1.3);   // 顶冠
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 板根巨树:热带雨林高大乔木,底部有外张板根,树冠高而疏(uv.x: 0 干 1 叶)
function createButtressTreeGeometry() {
  const parts = [];
  const setMask = (geo, m) => {
    const uvA = geo.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setX(i, m);
    return geo;
  };
  const trunk = new THREE.CylinderGeometry(0.24, 0.42, 8.6, 9);
  trunk.translate(0, 4.3, 0);
  parts.push(setMask(trunk, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const root = new THREE.BoxGeometry(0.18, 1.7, 2.8);
    root.translate(0, 0.85, 1.15);
    root.rotateX(-0.18);
    root.rotateY(a);
    parts.push(setMask(root, 0));
  }
  const crown = (x, y, z, sx, sy, sz) => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    parts.push(setMask(g, 1));
  };
  crown(0, 9.2, 0, 2.7, 1.45, 2.5);
  crown(1.8, 8.2, -0.4, 1.8, 1.05, 1.8);
  crown(-1.6, 8.4, 0.6, 1.9, 1.10, 1.7);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 榕树:低而宽的伞冠 + 多条气根,适合第二岛村落和河边(uv.x: 0 干 1 叶)
function createBanyanTreeGeometry() {
  const parts = [];
  const setMask = (geo, m) => {
    const uvA = geo.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setX(i, m);
    return geo;
  };
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, 4.8, 9);
  trunk.translate(0, 2.4, 0);
  parts.push(setMask(trunk, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 1.2 + (i % 3) * 0.55;
    const root = new THREE.CylinderGeometry(0.035, 0.055, 3.4, 6);
    root.translate(Math.cos(a) * r, 2.0, Math.sin(a) * r);
    parts.push(setMask(root, 0));
  }
  const canopy = new THREE.SphereGeometry(1, 16, 10);
  canopy.scale(3.4, 1.25, 3.2);
  canopy.translate(0, 5.2, 0);
  parts.push(setMask(canopy, 1));
  for (const [x, z, s] of [[2.1, 0.8, 1.2], [-2.0, -0.6, 1.15], [0.4, -2.0, 1.05]]) {
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.scale(s * 1.7, s * 0.8, s * 1.5);
    g.translate(x, 4.6, z);
    parts.push(setMask(g, 1));
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 桫椤蕨树:细干 + 放射蕨叶,补足雨林下层轮廓(uv.x: 0 干 1 叶)
function createTreeFernGeometry() {
  const parts = [];
  const setMask = (geo, m) => {
    const uvA = geo.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setX(i, m);
    return geo;
  };
  const trunk = new THREE.CylinderGeometry(0.10, 0.15, 3.3, 7);
  trunk.translate(0, 1.65, 0);
  parts.push(setMask(trunk, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const frond = new THREE.BoxGeometry(0.22, 0.018, 2.5, 1, 1, 5);
    const p = frond.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const k = (p.getZ(v) + 1.25) / 2.5;
      p.setY(v, p.getY(v) - k * k * 0.65 + k * 0.18);
      p.setX(v, p.getX(v) * (1 - k * 0.55));
    }
    frond.translate(0, 0, 1.15);
    frond.rotateX(-0.18);
    frond.rotateY(a);
    frond.translate(0, 3.45, 0);
    parts.push(setMask(frond, 1));
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 沙滩蟹:扁圆甲 + 双螯 + 两侧细腿(约 0.3m,朝 +Z)
function createCrabGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 12, 8), 0, 0.10, 0, 0, 0, 0, 0.16, 0.075, 0.12);     // 甲壳
  add(new THREE.SphereGeometry(1, 8, 6), -0.15, 0.07, 0.13, 0, 0, 0, 0.055, 0.045, 0.06); // 螯 L
  add(new THREE.SphereGeometry(1, 8, 6), 0.15, 0.07, 0.13, 0, 0, 0, 0.055, 0.045, 0.06);  // 螯 R
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.17, 5),
        sx * 0.19, 0.05, -0.05 + i * 0.055, 0, 0, sx * 1.15, 1, 1, 1);   // 侧腿
    }
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 岩蜥:细长躯干 + 弯尾 + 三角头 + 四肢(约 0.45m,朝 +Z)
function createLizardGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), 0, 0.06, 0, Math.PI / 2, 0, 0, 1, 1, 1);  // 躯干
  add(new THREE.ConeGeometry(0.045, 0.12, 8), 0, 0.06, 0.20, Math.PI / 2, 0, 0, 1, 1, 1);     // 三角头
  add(new THREE.CylinderGeometry(0.012, 0.035, 0.30, 6), 0, 0.05, -0.28, Math.PI / 2 + 0.15, 0, 0, 1, 1, 1); // 尾
  for (const sx of [-1, 1]) {
    for (const zz of [0.10, -0.12]) {
      add(new THREE.CylinderGeometry(0.010, 0.010, 0.10, 5),
        sx * 0.075, 0.035, zz, 0, 0, sx * 1.0, 1, 1, 1);   // 四肢外展
    }
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 白鹭躯干(翅膀单独做,便于扇动):纺锤身 + 曲颈 + 尖喙 + 细腿(约 0.6m,朝 +Z)
function createEgretGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 12, 9), 0, 0.42, 0, 0, 0, 0, 0.11, 0.10, 0.19);      // 身
  add(new THREE.CylinderGeometry(0.020, 0.030, 0.26, 7), 0, 0.58, 0.10, 0.5, 0, 0, 1, 1, 1); // 曲颈
  add(new THREE.SphereGeometry(0.035, 8, 6), 0, 0.70, 0.16, 0, 0, 0, 1, 1, 1.3);       // 头
  add(new THREE.ConeGeometry(0.014, 0.14, 6), 0, 0.70, 0.26, Math.PI / 2, 0, 0, 1, 1, 1);   // 喙
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.30, 5), -0.03, 0.15, 0, 0, 0, 0, 1, 1, 1); // 腿 L
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.30, 5), 0.03, 0.15, 0, 0, 0, 0, 1, 1, 1);  // 腿 R
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 鹿:纺锤躯干 + 上伸颈 + 头 + 耳 + 细腿;雄鹿带多叉大角(麋鹿气质,肩高约 1.2m,朝 +Z)
function createDeerGeometry(withAntlers) {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.CapsuleGeometry(0.21, 0.60, 4, 10), 0, 0.66, 0, Math.PI / 2, 0, 0, 1, 1, 1);   // 躯干
  add(new THREE.SphereGeometry(0.19, 10, 8), 0, 0.70, -0.30, 0, 0, 0, 1, 1.05, 1.15);   // 臀
  add(new THREE.CylinderGeometry(0.065, 0.095, 0.46, 8), 0, 1.00, 0.34, -0.55, 0, 0, 1, 1, 1); // 颈
  add(new THREE.SphereGeometry(1, 10, 8), 0, 1.22, 0.50, 0, 0, 0, 0.080, 0.095, 0.150);  // 头
  add(new THREE.CylinderGeometry(0.030, 0.042, 0.15, 7), 0, 1.17, 0.63, Math.PI / 2, 0, 0, 1, 1, 1); // 吻部
  add(new THREE.ConeGeometry(0.030, 0.11, 6), -0.075, 1.30, 0.42, -0.2, 0, 0.55, 1, 1, 1);    // 耳 L
  add(new THREE.ConeGeometry(0.030, 0.11, 6), 0.075, 1.30, 0.42, -0.2, 0, -0.55, 1, 1, 1);    // 耳 R
  if (withAntlers) {
    for (const sx of [-1, 1]) {
      // 主枝向后上伸展 + 三根分叉(麋鹿的多叉角)
      add(new THREE.CylinderGeometry(0.011, 0.016, 0.40, 6), sx * 0.075, 1.48, 0.36, -0.55, 0, sx * 0.35, 1, 1, 1);
      add(new THREE.CylinderGeometry(0.008, 0.011, 0.20, 5), sx * 0.14, 1.55, 0.42, -1.0, 0, sx * 0.9, 1, 1, 1);
      add(new THREE.CylinderGeometry(0.007, 0.010, 0.18, 5), sx * 0.16, 1.62, 0.28, -0.4, 0, sx * 0.5, 1, 1, 1);
      add(new THREE.CylinderGeometry(0.006, 0.009, 0.15, 5), sx * 0.10, 1.58, 0.22, 0.1, 0, sx * 0.25, 1, 1, 1);
    }
  }
  for (const sx of [-1, 1]) for (const zz of [0.26, -0.26]) {
    add(new THREE.CylinderGeometry(0.040, 0.030, 0.32, 6), sx * 0.115, 0.48, zz, 0, 0, 0, 1, 1, 1); // 上腿
    add(new THREE.CylinderGeometry(0.026, 0.020, 0.34, 6), sx * 0.115, 0.16, zz, 0, 0, 0, 1, 1, 1); // 下腿
  }
  add(new THREE.ConeGeometry(0.04, 0.14, 6), 0, 0.72, -0.48, Math.PI + 0.5, 0, 0, 1, 1, 1);   // 尾
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

/* 鹿皮色(uTint 基调:雄鹿深灰褐 / 雌鹿黄褐):黑腿 + 浅臀斑 + 深吻部 */
const deerColor = Fn(([uTint]) => {
  const y = positionLocal.y, z = positionLocal.z, ax = abs(positionLocal.x);
  const c = uTint.mul(gnoise(vec2(y.mul(6.0), z.mul(6.0))).x.mul(0.05).add(1.0)).toVar();
  c.assign(mix(c, vec3(0.10, 0.09, 0.08), smoothstep(0.40, 0.16, y).mul(0.85)));       // 黑腿
  c.assign(mix(c, vec3(0.78, 0.72, 0.60),                                              // 浅臀斑
    smoothstep(-0.26, -0.46, z).mul(smoothstep(0.92, 0.55, y)).mul(0.8)));
  c.assign(mix(c, vec3(0.12, 0.10, 0.09), smoothstep(0.54, 0.66, z).mul(0.7)));        // 深吻部
  c.assign(mix(c, c.mul(1.25), smoothstep(0.55, 0.30, y).mul(smoothstep(0.22, 0.06, ax)).mul(0.45))); // 腹亮
  return marineSkin(c);
});

// 野猪:桶状躯干 + 肩峰 + 低垂楔头 + 吻盘 + 獠牙 + 耳 + 背鬃 + 细尾(肩高约 0.8m,朝 +Z)
function createBoarGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.CapsuleGeometry(0.24, 0.55, 4, 10), 0, 0.52, 0, Math.PI / 2, 0, 0, 1, 1, 1);   // 躯干
  add(new THREE.SphereGeometry(0.20, 10, 8), 0, 0.62, 0.14, 0, 0, 0, 0.9, 0.85, 1.1);   // 肩峰
  add(new THREE.SphereGeometry(1, 10, 8), 0, 0.47, 0.47, 0, 0, 0, 0.13, 0.12, 0.21);    // 楔头
  add(new THREE.CylinderGeometry(0.052, 0.062, 0.09, 8), 0, 0.40, 0.65, Math.PI / 2, 0, 0, 1, 1, 1); // 吻盘
  add(new THREE.ConeGeometry(0.014, 0.09, 5), -0.055, 0.36, 0.58, 0.8, 0, 0.3, 1, 1, 1); // 獠牙 L
  add(new THREE.ConeGeometry(0.014, 0.09, 5), 0.055, 0.36, 0.58, 0.8, 0, -0.3, 1, 1, 1); // 獠牙 R
  add(new THREE.ConeGeometry(0.032, 0.10, 6), -0.08, 0.60, 0.36, -0.3, 0, 0.3, 1, 1, 1); // 耳 L
  add(new THREE.ConeGeometry(0.032, 0.10, 6), 0.08, 0.60, 0.36, -0.3, 0, -0.3, 1, 1, 1); // 耳 R
  add(new THREE.BoxGeometry(0.055, 0.10, 0.52), 0, 0.71, -0.03, 0, 0, 0, 1, 1, 1);      // 背鬃
  for (const sx of [-1, 1]) for (const zz of [0.22, -0.22]) {
    add(new THREE.CylinderGeometry(0.042, 0.034, 0.24, 6), sx * 0.13, 0.34, zz, 0, 0, 0, 1, 1, 1); // 上腿
    add(new THREE.CylinderGeometry(0.028, 0.022, 0.26, 6), sx * 0.13, 0.12, zz, 0, 0, 0, 1, 1, 1); // 下腿
  }
  add(new THREE.CylinderGeometry(0.010, 0.014, 0.22, 5), 0, 0.50, -0.45, 2.5, 0, 0, 1, 1, 1); // 细尾
  add(new THREE.SphereGeometry(0.025, 6, 5), 0, 0.40, -0.49, 0, 0, 0, 1, 1.4, 1);        // 尾穗
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

/* 野猪皮色:灰棕刚毛(噪声毛流)+ 黑腿 + 深面罩 + 浅背鬃 */
const boarColor = Fn(() => {
  const y = positionLocal.y, z = positionLocal.z;
  const bristle = gnoise(vec2(positionLocal.x.mul(14.0), positionLocal.z.mul(14.0))).x.mul(0.06);
  const c = vec3(0.34, 0.30, 0.26).add(bristle).toVar();
  c.assign(mix(c, vec3(0.10, 0.09, 0.09), smoothstep(0.30, 0.12, y).mul(0.9)));        // 黑腿
  c.assign(mix(c, vec3(0.14, 0.12, 0.11), smoothstep(0.42, 0.60, z).mul(0.6)));        // 面罩
  c.assign(mix(c, vec3(0.44, 0.40, 0.34), smoothstep(0.64, 0.76, y).mul(0.5)));        // 背鬃
  return marineSkin(c);
});

// 反曲弓:弓把 + 上下弓臂(梢部前弯)+ 弓弦(竖直持握,弦朝射手)
function createBowGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz) => {
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.035, 0.30, 0.050), 0, 0, 0, 0);                       // 弓把
  add(new THREE.BoxGeometry(0.045, 0.10, 0.060), 0, 0, 0, 0);                       // 握把缠皮
  add(new THREE.BoxGeometry(0.020, 0.42, 0.030), 0, 0.35, -0.035, -0.16);           // 上弓臂
  add(new THREE.BoxGeometry(0.016, 0.16, 0.024), 0, 0.585, -0.095, -0.55);          // 上弓梢
  add(new THREE.BoxGeometry(0.020, 0.42, 0.030), 0, -0.35, -0.035, 0.16);           // 下弓臂
  add(new THREE.BoxGeometry(0.016, 0.16, 0.024), 0, -0.585, -0.095, 0.55);          // 下弓梢
  add(new THREE.BoxGeometry(0.004, 1.13, 0.004), 0, 0, 0.035, 0);                   // 弓弦
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 野人长矛:削尖木杆 + 石质矛头(沿 +Z,投掷/持握共用)
function createSpearGeometry() {
  const parts = [];
  const shaft = new THREE.CylinderGeometry(0.014, 0.018, 1.25, 7);
  shaft.rotateX(Math.PI / 2);
  shaft.translate(0, 0, 0.02);
  parts.push(shaft);
  const head = new THREE.ConeGeometry(0.045, 0.18, 7);
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, 0.72);
  parts.push(head);
  const lash = new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6);
  lash.rotateX(Math.PI / 2);
  lash.translate(0, 0, 0.61);
  parts.push(lash);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 野人投石机:小型皮索投石器/杠杆架,获得后用石块发射巨石
function createCatapultGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.42, 0.045, 0.16), 0, -0.04, -0.10, 0, 0, 0, 1, 1, 1); // 横梁
  add(new THREE.CylinderGeometry(0.014, 0.018, 0.72, 6), 0, 0.08, 0.16, -0.70, 0, 0, 1, 1, 1); // 抛臂
  add(new THREE.SphereGeometry(0.07, 8, 6), 0, 0.31, 0.43, 0, 0, 0, 1.0, 0.45, 1.0); // 石兜
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 5), -0.18, -0.19, -0.10, 0, 0, -0.35, 1, 1, 1);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 5), 0.18, -0.19, -0.10, 0, 0, 0.35, 1, 1, 1);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 斧头:木柄 + 楔状斧首 + 前刃(竖持,刃朝 +Z)
function createAxeGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.CylinderGeometry(0.016, 0.020, 0.72, 8), 0, 0, 0, 0, 0, 0, 1, 1, 1);      // 木柄
  add(new THREE.SphereGeometry(1, 8, 6), 0, 0.33, 0.01, 0, 0, 0, 0.035, 0.075, 0.10);     // 斧首楔体
  add(new THREE.BoxGeometry(0.012, 0.11, 0.06), 0, 0.33, 0.115, 0, 0, 0, 1, 1, 1);        // 斧刃
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 捕蟹笼:上下双圈 + 六根立条 + 锥顶入口(浮标在放置时单独挂)
function createCrabPotGeometry() {
  const parts = [];
  const ringB = new THREE.TorusGeometry(0.36, 0.018, 5, 14);
  ringB.rotateX(Math.PI / 2);
  ringB.translate(0, 0.03, 0);
  parts.push(ringB);
  const ringT = new THREE.TorusGeometry(0.24, 0.016, 5, 12);
  ringT.rotateX(Math.PI / 2);
  ringT.translate(0, 0.42, 0);
  parts.push(ringT);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = Math.cos(a) * 0.36, bz = Math.sin(a) * 0.36;
    const tx = Math.cos(a) * 0.24, tz = Math.sin(a) * 0.24;
    const bar = new THREE.CylinderGeometry(0.010, 0.010, 0.42, 5);
    bar.translate(0, 0.21, 0);
    bar.rotateZ(Math.atan2(bx - tx, 0.42) * -1);
    bar.rotateY(-a);
    bar.translate((bx + tx) / 2, 0.015, (bz + tz) / 2);
    parts.push(bar);
  }
  const funnel = new THREE.CylinderGeometry(0.24, 0.09, 0.16, 10, 1, true);   // 锥顶入口(蟹进得去出不来)
  funnel.translate(0, 0.50, 0);
  parts.push(funnel);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 鱼竿:细竿身(前细后粗)+ 握把 + 渔轮(沿 +Y 持握,竿梢在 +Y 顶端)
function createFishingRodGeometry() {
  const parts = [];
  const butt = new THREE.CylinderGeometry(0.016, 0.019, 0.34, 7);
  butt.translate(0, -0.55, 0);
  parts.push(butt);
  const blank = new THREE.CylinderGeometry(0.004, 0.014, 1.45, 6);
  blank.translate(0, 0.34, 0);
  parts.push(blank);
  const reel = new THREE.CylinderGeometry(0.035, 0.035, 0.028, 10);
  reel.rotateZ(Math.PI / 2);
  reel.translate(0.030, -0.40, 0);
  parts.push(reel);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 卡莫星狙击枪:长枪管 + 瞄准镜 + 枪口制退器(沿 +Z,枪口朝前)
function createSniperGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.052, 0.105, 0.60), 0, -0.010, -0.32, 0, 0, 0, 1, 1, 1);   // 枪身/枪托
  add(new THREE.BoxGeometry(0.044, 0.062, 0.55), 0, 0.012, 0.22, 0, 0, 0, 1, 1, 1);    // 护木
  add(new THREE.CylinderGeometry(0.011, 0.011, 0.70, 8), 0, 0.028, 0.68, Math.PI / 2, 0, 0, 1, 1, 1); // 长枪管
  add(new THREE.CylinderGeometry(0.020, 0.020, 0.07, 8), 0, 0.028, 1.02, Math.PI / 2, 0, 0, 1, 1, 1); // 枪口制退器
  add(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 10), 0, 0.085, 0.05, Math.PI / 2, 0, 0, 1, 1, 1); // 瞄准镜
  add(new THREE.BoxGeometry(0.010, 0.035, 0.02), 0, 0.048, 0.12, 0, 0, 0, 1, 1, 1);    // 镜架前
  add(new THREE.BoxGeometry(0.010, 0.035, 0.02), 0, 0.048, -0.03, 0, 0, 0, 1, 1, 1);   // 镜架后
  add(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6), 0.035, 0.055, -0.08, 0, 0, 0.9, 1, 1, 1);    // 栓柄
  add(new THREE.BoxGeometry(0.008, 0.025, 0.008), 0, 0.065, 0.95, 0, 0, 0, 1, 1, 1);   // 准星
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 波波沙冲锋枪:木枪托 + 机匣 + 散热套筒 + 圆形弹鼓(沿 +Z,枪口朝前)
function createSMGGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.045, 0.095, 0.55), 0, -0.012, -0.28, 0, 0, 0, 1, 1, 1);  // 木枪托
  add(new THREE.BoxGeometry(0.042, 0.060, 0.30), 0, 0.012, 0.06, 0, 0, 0, 1, 1, 1);   // 机匣
  add(new THREE.CylinderGeometry(0.019, 0.019, 0.32, 8), 0, 0.025, 0.36, Math.PI / 2, 0, 0, 1, 1, 1); // 散热套筒
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.10, 6), 0, 0.025, 0.55, Math.PI / 2, 0, 0, 1, 1, 1); // 枪口
  add(new THREE.CylinderGeometry(0.056, 0.056, 0.028, 14), 0, -0.055, 0.10, 0, 0, Math.PI / 2, 1, 1, 1); // 圆弹鼓
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// 莫辛纳甘步枪:木枪身(枪托+护木)+ 枪管 + 栓柄 + 弹仓(沿 +Z,枪口朝前)
function createRifleGeometry() {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.BoxGeometry(0.050, 0.100, 0.62), 0, -0.010, -0.30, 0, 0, 0, 1, 1, 1);   // 枪身/枪托
  add(new THREE.BoxGeometry(0.042, 0.060, 0.58), 0, 0.012, 0.26, 0, 0, 0, 1, 1, 1);    // 护木
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 8), 0, 0.030, 0.54, Math.PI / 2, 0, 0, 1, 1, 1); // 枪管
  add(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6), 0.035, 0.055, -0.06, 0, 0, 0.9, 1, 1, 1);    // 栓柄
  add(new THREE.BoxGeometry(0.036, 0.045, 0.10), 0, -0.045, 0.02, 0, 0, 0, 1, 1, 1);   // 弹仓
  add(new THREE.BoxGeometry(0.008, 0.025, 0.008), 0, 0.065, 0.78, 0, 0, 0, 1, 1, 1);   // 准星
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

/* 人手(side=+1 右手 / -1 左手):手掌 + 四指两节微曲 + 拇指两节 + 腕部,
   掌心朝下、手指朝 +Z(相机前方)。真实比例(掌长约 18cm)。
   左手由右手整体镜像(scale 翻转,材质双面渲染)。 */
function createHandGeometry(side) {
  const parts = [];
  const add = (geo, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    if (rx) geo.rotateX(rx);
    geo.translate(px, py, pz);
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 14, 10), 0, 0, 0, 0, 0, 0, 0.050, 0.026, 0.085);   // 手掌
  const fingerX = [-0.034, -0.0115, 0.0115, 0.034];     // 食→小
  const fingerL = [0.056, 0.064, 0.058, 0.045];         // 中指最长
  for (let i = 0; i < 4; i++) {
    const fx = fingerX[i], L1 = fingerL[i] * 0.55, L2 = fingerL[i] * 0.45;
    // 指根节:略向前下(掌心朝下时手指自然下垂)
    add(new THREE.CapsuleGeometry(0.0082, L1, 3, 7), fx, -0.004, 0.082 + L1 * 0.45, Math.PI / 2 + 0.15, 0, 0, 1, 1, 1);
    // 指尖节:再向下弯一点(自然放松卷曲)
    add(new THREE.CapsuleGeometry(0.0072, L2, 3, 7), fx, -0.022, 0.082 + L1 * 0.9 + L2 * 0.42, Math.PI / 2 + 0.55, 0, 0, 1, 1, 1);
  }
  // 拇指:掌侧前方,斜出两节(略向下扣)
  add(new THREE.CapsuleGeometry(0.0095, 0.034, 3, 7), -0.052, -0.008, 0.028, Math.PI / 2 + 0.22, -0.55, 0, 1, 1, 1);
  add(new THREE.CapsuleGeometry(0.0085, 0.028, 3, 7), -0.068, -0.018, 0.062, Math.PI / 2 + 0.45, -0.65, 0, 1, 1, 1);
  // 腕部向相机延伸
  add(new THREE.CylinderGeometry(0.024, 0.030, 0.17, 10), 0, -0.004, -0.115, Math.PI / 2, 0, 0, 1, 1, 1);
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  if (side < 0) merged.scale(-1, 1, 1);   // 左手:整体镜像
  return merged;
}

/* 手部皮肤:日光照明 + 逆光次表面泛红(真实皮肤的透光感)+ 篝火暖光 */
const handSkin = Fn(() => {
  const base = marineSkin(vec3(0.62, 0.45, 0.33)).toVar();
  const V = normalize(cameraPosition.sub(positionWorld));
  const w = dayWeights(uSunDir.y);
  const sss = pow(max(dot(V, uSunDir.negate()), 0.0), 3.0);
  base.addAssign(vec3(0.55, 0.20, 0.08).mul(sss.mul(0.55)).mul(w.z.add(w.y.mul(0.5))));
  const fireD = length(positionWorld.xz.sub(vec2(uCampfire.x, uCampfire.y)));
  const flick = gnoise(vec2(uTime.mul(2.6), 7.3)).x.mul(0.3).add(0.9);
  base.addAssign(vec3(1.0, 0.46, 0.16)
    .mul(uCampfire.z.mul(flick).mul(smoothstep(14.0, 1.5, fireD)).mul(0.8)));
  return base;
});

/* --------------------------- CPU 侧镜像:波面高度 --------------------------- */
/* 与 three 内置 TSL hash() 逐位一致的 JS 实现(纯 uint32 位运算) */

function hashJS(seed) {
  let state = (Math.imul(seed >>> 0, 747796405) + 2891336453) | 0;
  const shift = (state >>> 28) + 4;
  const word = Math.imul((state >>> shift) ^ state, 277803737);
  const result = ((word >>> 22) ^ word) >>> 0;
  return result / 4294967296;
}

function hash2JS(x, y) {
  // 与 GPU hash22 相同的种子构造
  const s = x + y * 57 + 524288;
  return [hashJS(s) * 2 - 1, hashJS(s + 0.5) * 2 - 1];
}

function gnoiseValueJS(px, pz) {
  const ix = Math.floor(px), iz = Math.floor(pz);
  const fx = px - ix, fz = pz - iz;
  const quint = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const ux = quint(fx), uz = quint(fz);
  const ga = hash2JS(ix, iz);
  const gb = hash2JS(ix + 1, iz);
  const gc = hash2JS(ix, iz + 1);
  const gd = hash2JS(ix + 1, iz + 1);
  const va = ga[0] * fx + ga[1] * fz;
  const vb = gb[0] * (fx - 1) + gb[1] * fz;
  const vc = gc[0] * fx + gc[1] * (fz - 1);
  const vd = gd[0] * (fx - 1) + gd[1] * (fz - 1);
  const k1 = vb - va, k2 = vc - va, k4 = va - vb - vc + vd;
  return va + ux * k1 + uz * k2 + ux * uz * k4;
}

function waveHeightAt(x, z, t, seaStateEff) {
  const ampScale = (0.15 + seaStateEff * 2.4) * (1 + chaosState.p3 * 0.12);
  // 与着色器一致的空间波群场(漂移速度含混沌搅动)
  const gs = 1 + chaosState.p2 * 0.35;
  const gA = gnoiseValueJS(x * 0.0045 + t * 0.012 * gs, z * 0.0045 - t * 0.008 * gs);
  const gB = gnoiseValueJS(x * 0.010 + 37.2 + t * 0.012 * 1.3 * gs, z * 0.010 + 61.8 - t * 0.008 * 1.3 * gs);
  let y = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const k = (2.0 * Math.PI) / w.L;
    const omega = Math.sqrt(GRAVITY * k) * (1 + chaosState.p3 * (i === 0 ? 0.05 : i === 1 ? -0.05 : 0));
    // 与着色器一致:空间波群 + 残余时间调制 + 相位扭曲 + 混沌相位失稳
    const groupMod = Math.min(2.5, Math.max(0.15,
      1 + (i < 2 ? gA : gB) * w.groupAmp + 0.15 * Math.sin(t * w.modS + w.modP)
    ));
    const warp = gnoiseValueJS(
      x * w.warpF + w.seedX + t * 0.010,
      z * w.warpF + w.seedZ - t * 0.007
    ) * w.warpA;
    const chaosPh = (i === 0 ? chaosState.p1 : i === 1 ? chaosState.p2 : chaosState.p3) * 1.4;
    const tsMul = i === 2 ? seaStateEff * seaStateEff : 1;
    y += w.A * ampScale * groupMod * tsMul *
      Math.sin(k * (w.dx * x + w.dz * z) - omega * t + w.phase + warp + chaosPh);
  }
  // 与着色器一致的三层平流噪声位移
  const nAmp = ampScale * (0.8 + 0.5 * gB);
  const nC = gnoiseValueJS(x * 0.048 + t * 0.105 + 23.9, z * 0.048 + t * 0.062 + 17.3);
  const nA = gnoiseValueJS(x * 0.085 + t * 0.16 + 3.1, z * 0.085 - t * 0.094 + 8.7);
  const nB = gnoiseValueJS(x * 0.19 - t * 0.17 + 13.7, z * 0.19 + t * 0.26 + 5.9);
  y += (nC * 0.45 + nA * 0.32 + nB * 0.18) * nAmp;
  // 与着色器一致的海啸孤立子波包
  if (tsunamiState.amp > 0.001) {
    const d = x * TSUNAMI_DIR.x + z * TSUNAMI_DIR.z - tsunamiState.front;
    const along = x * (-TSUNAMI_DIR.z) + z * TSUNAMI_DIR.x;
    const shape = 0.75 + gnoiseValueJS(along * 0.006, 3.71) * 0.5;
    const s2 = (v) => { const u = Math.exp(-Math.abs(v)); const u2 = u * u; return 4 * u2 / ((1 + u2) * (1 + u2)); };
    y += tsunamiState.amp * shape * (
      s2(d / 260) - 0.45 * s2((d - 820) / 420) + 0.45 * s2((d + 1180) / 290) + 0.22 * s2((d + 2050) / 250)
      - 0.46 * s2((d - 96) / 78)   // 唇口下扣(与着色器一致)
    );
  }
  return y;
}

/* ------------------------------ 生物图鉴 ------------------------------ */

const SPECIES = [
  {
    id: 'gull', name: '银鸥', latin: 'Larus argentatus', rarity: 1,
    desc: '成群盘旋于浪峰之上,借海风滑翔,振翅与滑翔交替。',
    when: '白天常见',
    icon: '<path d="M6 22 Q17 8 32 20 Q47 8 58 22"/><path d="M32 20 l0 5"/>',
  },
  {
    id: 'dolphin', name: '宽吻海豚', latin: 'Tursiops truncatus', rarity: 1,
    desc: '结成小群逐浪而行,脊柱上下摆动推进,时常跃出水面。',
    when: '全天可见',
    icon: '<path d="M8 28 Q16 12 34 14 Q48 16 56 8"/><path d="M34 14 q2 -6 8 -6"/><path d="M8 28 q6 3 11 1"/>',
  },
  {
    id: 'turtle', name: '绿海龟', latin: 'Chelonia mydas', rarity: 2,
    desc: '在日照充足的暖水层缓缓划动鳍状肢,随涌浪起伏。',
    when: '白天与黄昏',
    icon: '<ellipse cx="32" cy="22" rx="14" ry="8"/><path d="M46 20 q7 -2 9 3"/><path d="M20 16 l-9 -6 M20 28 l-9 6 M43 15 l7 -5 M43 29 l7 5"/>',
  },
  {
    id: 'jelly', name: '夜光水母', latin: 'Pelagia noctiluca', rarity: 3,
    desc: '暗夜里伞体发出幽蓝荧光,随浪漂游,一张一缩。',
    when: '夜晚现身',
    icon: '<path d="M20 22 a12 11 0 0 1 24 0 z"/><path d="M24 22 q-1 8 -4 13 M32 22 q0 9 0 14 M40 22 q1 8 4 13"/>',
  },
  {
    id: 'manta', name: '蝠鲼', latin: 'Mobula birostris', rarity: 3,
    desc: '展翼如风筝,在月浪间滑行,偶尔猛然跃出水面。',
    when: '夜晚现身',
    icon: '<path d="M32 8 L57 22 L32 30 L7 22 Z"/><path d="M32 30 l0 8"/>',
  },
  {
    id: 'whale', name: '座头鲸', latin: 'Megaptera novaeangliae', rarity: 3,
    desc: '只在风暴之夜靠近这片海域,浮出水面喷出水柱换气。',
    when: '夜晚 + 大风浪',
    icon: '<path d="M6 28 Q14 12 36 14 Q52 17 58 24"/><path d="M14 10 q-2 -5 -5 -6 M18 9 q0 -6 2 -8 M22 10 q2 -5 5 -6"/>',
  },
  {
    id: 'orca', name: '虎鲸', latin: 'Orcinus orca', rarity: 3,
    desc: '黄昏与风浪中成群巡游的顶级掠食者,背鳍如刀,黑白分明,偶尔跃身击浪。',
    when: '黄昏 + 大风浪',
    icon: '<path d="M8 30 Q18 14 40 16 Q54 18 58 26"/><path d="M28 15 q1 -9 5 -12 q1 7 1 12"/><circle cx="46" cy="18" r="1.6"/>',
  },
];

const DEX_KEY = 'ocean-dex-v1';
const store = {
  get(k) { try { return (typeof localStorage !== 'undefined') ? localStorage.getItem(k) : null; } catch { return null; } },
  set(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch { /* 隐私模式忽略 */ } },
};

/* ------------------------------ 应用装配 ------------------------------ */

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    console.warn('[ocean] 缺少界面元素 #' + id + '(可能是页面缓存新旧错位,请强制刷新)');
    return new Proxy({}, { get: (t, k) => (k === 'classList'
      ? { add() {}, remove() {}, toggle() {} } : () => {}), set: () => true });
  }
  return el;
};

let timeOfDay = 15.5;
let drift = 0.35;
let seaState = 0.5;      // 用户设定的基准海况
let seaStateEff = 0.5;   // 叠加夜风后的有效海况
let cloudBase = 0.5;     // 用户设定的基准云量(风暴在其上叠加)
let dayCycle = false;
let bioOn = true;

function updateSun() {
  const ang = ((timeOfDay - 6.0) / 12.0) * Math.PI;
  const elev = Math.sin(ang) * THREE.MathUtils.degToRad(62);
  const azim = ang * 0.45 + 2.35;
  const ce = Math.cos(elev);
  uSunDir.value.set(Math.cos(azim) * ce, Math.sin(elev), Math.sin(azim) * ce);
  const mElev = Math.sin(ang + Math.PI) * THREE.MathUtils.degToRad(50);
  const mAzim = azim + 1.1;
  const mce = Math.cos(mElev);
  uMoonDir.value.set(Math.cos(mAzim) * mce, Math.sin(mElev), Math.sin(mAzim) * mce);
}

function syncTodUI() {
  const h = Math.floor(timeOfDay) % 24;
  const m = Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60);
  $('tod-out').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  $('tod').value = String(timeOfDay);
}

async function boot() {
  // 联机:房间号即世界种子 —— 同号好友生成同一片海域与同一座荒岛
  const mpRoom = new URLSearchParams(location.search).get('room');
  let restoreRandom = null;
  if (mpRoom) {
    let hs = 2166136261 >>> 0;
    for (const ch of mpRoom) { hs ^= ch.codePointAt(0); hs = Math.imul(hs, 16777619); }
    let seed = hs >>> 0;
    const origRandom = Math.random.bind(Math);
    Math.random = () => {                // mulberry32,仅世界生成期使用
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    restoreRandom = () => { Math.random = origRandom; };
  }
  // --- WebGPU 能力检测(三级:API → 适配器 → 画布上下文) ---
  if (!navigator.gpu) {
    window.__oceanError(
      '当前浏览器不支持 WebGPU。请使用 Chrome / Edge 113+、Safari 26+ 或最新版 Firefox;Safari 17/18 需在 开发 → 实验性功能 中手动开启 WebGPU。',
      'navigator.gpu is undefined'
    );
    return;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      window.__oceanError(
        '浏览器有 WebGPU 接口,但拿不到 GPU 适配器。请确认系统显卡驱动正常、浏览器"硬件加速"已开启,然后完全退出浏览器重试。',
        'navigator.gpu.requestAdapter() 返回 null'
      );
      return;
    }
  } catch (err) {
    window.__oceanError('WebGPU 适配器请求失败。', err && err.message);
    return;
  }

  $('loading-status').textContent = '正在初始化 WebGPU 渲染器';

  const canvas = $('scene');
  // 预检:部分浏览器(套壳 Chromium 等)暴露了 navigator.gpu,
  // 但 canvas.getContext('webgpu') 返回 null —— three 内部会对 null
  // 直接 .configure() 抛出 TypeError。提前检出并给出明确指引,
  // 同时把自建 context 传给渲染器,避免二次创建。
  let gpuContext = null;
  try { gpuContext = canvas.getContext ? canvas.getContext('webgpu') : null; } catch (_) { gpuContext = null; }
  if (!gpuContext) {
    window.__oceanError(
      '当前浏览器无法创建 WebGPU 画布上下文。请换用 Chrome / Edge 113+ 或 Safari 26+;若已经是,请在设置里开启"硬件加速 / 图形加速"后重启浏览器再试。',
      "canvas.getContext('webgpu') 返回 null"
    );
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, context: gpuContext, antialias: true });
  } catch (err) {
    window.__oceanError('WebGPU 渲染器创建失败,请换用 Chrome / Edge 113+ 或 Safari 26+。', err && err.message);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  try {
    await renderer.init();
  } catch (err) {
    window.__oceanError('WebGPU 设备初始化失败,请确认 GPU 可用且未禁用硬件加速。', err && err.message);
    return;
  }

  // --- 场景与相机 ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.5, 26000
  );
  camera.position.set(46, 14, 62);

  // --- 海面 ---
  const oceanGeo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshBasicNodeMaterial();
  oceanMat.side = THREE.DoubleSide; // 水下也能看到水面下侧
  oceanMat.positionNode = gerstnerPosition();
  oceanMat.colorNode = waterColor();
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.frustumCulled = false;
  scene.add(ocean);

  // --- 天空穹顶 ---
  const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 64, 32);
  const skyMat = new THREE.MeshBasicNodeMaterial();
  skyMat.side = THREE.BackSide;
  skyMat.colorNode = skyColor(positionWorld.sub(cameraPosition));
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  /* =========================== 生物群落 =========================== */

  const speciesSeen = new Set((store.get(DEX_KEY) || '').split(',').filter(Boolean));
  let toastTimer = 0;

  function refreshDexCount() {
    $('dex-count').textContent = speciesSeen.size + '/' + SPECIES.length;
    $('dex-head-count').textContent = '已发现 ' + speciesSeen.size + ' / ' + SPECIES.length;
  }
  function showToast(text) {
    $('toast-text').textContent = text;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600);
  }
  function unlockSpecies(id) {
    if (speciesSeen.has(id)) return;
    speciesSeen.add(id);
    store.set(DEX_KEY, [...speciesSeen].join(','));
    const sp = SPECIES.find((s) => s.id === id);
    if (sp) showToast('发现新物种 · ' + sp.name);
    refreshDexCount();
    renderDex();
  }
  function renderDex() {
    $('dex-grid').innerHTML = SPECIES.map((sp) => {
      const got = speciesSeen.has(sp.id);
      const stars = '★'.repeat(sp.rarity) + '☆'.repeat(3 - sp.rarity);
      return '<div class="dex-card' + (got ? '' : ' locked') + '">' +
        '<svg viewBox="0 0 64 40" fill="none" stroke="#8fe8e3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        sp.icon + '</svg>' +
        '<div class="dex-name">' + (got ? sp.name : '???') + '</div>' +
        '<div class="dex-latin">' + (got ? sp.latin : '尚未发现') + '</div>' +
        '<div class="dex-stars r' + sp.rarity + '">' + stars + '</div>' +
        '<div class="dex-desc">' + (got ? sp.desc : '继续观察这片海,也许它会现身。') + '</div>' +
        '<div class="dex-when">' + sp.when + '</div>' +
        '</div>';
    }).join('');
  }
  renderDex();
  refreshDexCount();
  $('btn-dex').addEventListener('click', () => $('dex').classList.add('show'));
  $('dex-close').addEventListener('click', () => $('dex').classList.remove('show'));
  $('dex').addEventListener('click', (e) => { if (e.target === $('dex')) $('dex').classList.remove('show'); });

  // --- 银鸥群(实例化) ---
  const gullMat = new THREE.MeshBasicNodeMaterial();
  gullMat.side = THREE.DoubleSide;
  gullMat.positionNode = gullFlap();
  gullMat.colorNode = gullColor();
  const gulls = new THREE.InstancedMesh(createGullGeometry(), gullMat, GULL_COUNT);
  gulls.frustumCulled = false;
  scene.add(gulls);

  const gullParams = [];
  for (let i = 0; i < GULL_COUNT; i++) {
    // 盘旋中心限制在离原点 45~95m 的环带上,避免海鸥贴着镜头糊成一团
    const homeAng = Math.random() * Math.PI * 2;
    const homeDist = 45 + Math.random() * 50;
    gullParams.push({
      cx: Math.cos(homeAng) * homeDist,
      cz: Math.sin(homeAng) * homeDist,
      r: 16 + Math.random() * 30,
      w: (0.05 + Math.random() * 0.10) * (Math.random() < 0.5 ? 1 : -1),
      h: 7 + Math.random() * 15,
      ph: Math.random() * Math.PI * 2,
      bob: 0.6 + Math.random() * 1.4,
    });
  }
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';

  function updateGulls(t) {
    for (let i = 0; i < GULL_COUNT; i++) {
      const g = gullParams[i];
      const a = t * g.w + g.ph;
      const x = g.cx + g.r * Math.cos(a);
      const z = g.cz + g.r * Math.sin(a);
      // 海啸来临时鸥群惊飞升高(灾难前的真实行为)
      const y = g.h + Math.sin(t * 0.5 + g.ph * 3.0) * g.bob + tsunamiState.amp * 0.30;
      const vx = -g.r * g.w * Math.sin(a);
      const vz = g.r * g.w * Math.cos(a);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(vx, vz), -Math.sign(g.w) * 0.32);
      dummy.scale.setScalar(1.5);
      dummy.updateMatrix();
      gulls.setMatrixAt(i, dummy.matrix);
    }
    gulls.instanceMatrix.needsUpdate = true;
  }

  // --- 宽吻海豚群(脊柱垂直波动) ---
  const dolphinGeo = createDolphinGeometry();
  const dolphins = new THREE.Group();
  const dolphinParams = [];
  for (let i = 0; i < DOLPHIN_COUNT; i++) {
    const mat = new THREE.MeshBasicNodeMaterial();
    const phase = i * 2.17 + 0.9;
    mat.positionNode = spineFlex(uniform(phase), 5.2, 0.13, -0.7, 2.4);
    mat.colorNode = marineSkin(vec3(0.095, 0.135, 0.170));
    const mesh = new THREE.Mesh(dolphinGeo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.frustumCulled = false;
    dolphins.add(mesh);
    dolphinParams.push({
      mesh,
      r: 26 + i * 4.5,
      w: 0.10 + Math.random() * 0.04,
      off: (i / DOLPHIN_COUNT) * Math.PI * 2 + Math.random(),
      ang: (i / DOLPHIN_COUNT) * Math.PI * 2 + Math.random(),  // 积分角(逃逸时可平滑加速)
      cycle: 5.5 + i * 1.9,
      jumpDur: 1.3,
      jumpH: 1.8 + i * 0.35,
    });
  }
  scene.add(dolphins);

  function updateDolphins(t, dt) {
    // 海啸来临时:停止跃浪、加速游动、深潜躲避(海洋动物避难的真实行为)
    const fleeing = tsunamiState.amp > 5;
    for (const d of dolphinParams) {
      d.ang += d.w * dt * (fleeing ? 2.6 : 1.0);
      const a = d.ang;
      const x = d.r * Math.cos(a);
      const z = d.r * Math.sin(a);
      const vx = -d.r * d.w * Math.sin(a);
      const vz = d.r * d.w * Math.cos(a);
      const waveY = waveHeightAt(x, z, t, seaStateEff);
      const local = (t + d.off * 7.0) % d.cycle;

      let y, pitch;
      if (!fleeing && local < d.jumpDur) {
        const k = local / d.jumpDur;
        y = waveY - 0.35 + d.jumpH * 4 * k * (1 - k);
        const vy = (d.jumpH * 4 * (1 - 2 * k)) / d.jumpDur;
        pitch = -Math.atan2(vy, Math.hypot(vx, vz));
      } else {
        y = waveY - (fleeing ? 2.4 : 0.62);
        pitch = fleeing ? 0.18 : 0;   // 头部下压的下潜姿态
      }
      d.mesh.position.set(x, y, z);
      d.mesh.rotation.set(pitch, Math.atan2(vx, vz), 0);
    }
  }

  // --- 绿海龟(白天 / 黄昏) ---
  const turtle = new THREE.Group();
  const turtleMat = new THREE.MeshBasicNodeMaterial();
  turtleMat.colorNode = marineSkin(vec3(0.180, 0.200, 0.110));
  {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), turtleMat);
    shell.scale.set(0.62, 0.28, 0.80);
    turtle.add(shell);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), turtleMat);
    head.position.set(0, -0.02, 0.88);
    turtle.add(head);
    const tailT = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), turtleMat);
    tailT.geometry.rotateX(-Math.PI / 2);
    tailT.position.set(0, -0.03, -0.85);
    turtle.add(tailT);
  }
  const turtleFlippers = [];
  {
    const mk = (side, front) => {
      const geo = new THREE.SphereGeometry(front ? 0.34 : 0.20, 8, 6);
      geo.scale(1.0, 0.09, front ? 0.45 : 0.55);
      geo.translate(side * (front ? 0.30 : 0.18), 0, 0); // 支点在肩部
      const m = new THREE.Mesh(geo, turtleMat);
      m.position.set(side * 0.42, -0.06, front ? 0.38 : -0.48);
      turtle.add(m);
      turtleFlippers.push({ mesh: m, side, front });
    };
    mk(-1, true); mk(1, true); mk(-1, false); mk(1, false);
  }
  turtle.rotation.order = 'YXZ';
  const turtleParam = { r: 17, w: 0.055, off: 1.2, ph: Math.random() * 6.28 };
  scene.add(turtle);

  function updateTurtle(t) {
    const a = t * turtleParam.w + turtleParam.off;
    const x = turtleParam.r * Math.cos(a);
    const z = turtleParam.r * Math.sin(a);
    const vx = -turtleParam.r * turtleParam.w * Math.sin(a);
    const vz = turtleParam.r * turtleParam.w * Math.cos(a);
    // 海啸来临时海龟也下潜躲避
    turtle.position.set(x, waveHeightAt(x, z, t, seaStateEff) - (tsunamiState.amp > 5 ? 1.6 : 0.16), z);
    turtle.rotation.set(0, Math.atan2(vx, vz), Math.sin(t * 0.8) * 0.06);
    for (const f of turtleFlippers) {
      const beat = Math.sin(t * (f.front ? 2.4 : 1.8) + turtleParam.ph + (f.front ? 0 : 1.1));
      f.mesh.rotation.z = f.side * (f.front ? -0.25 : -0.1) + f.side * beat * (f.front ? 0.55 : 0.3);
    }
  }

  // --- 夜光水母群(夜晚) ---
  const jellies = new THREE.Group();
  const jellyParams = [];
  for (let i = 0; i < JELLY_COUNT; i++) {
    const mat = new THREE.MeshBasicNodeMaterial();
    const phase = i * 1.71;
    mat.colorNode = jellyColor(uniform(phase));
    const j = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    j.add(dome);
    for (let k = 0; k < 5; k++) {
      const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 0.9, 5), mat);
      const ang = (k / 5) * Math.PI * 2;
      tent.position.set(Math.cos(ang) * 0.28, -0.45, Math.sin(ang) * 0.28);
      j.add(tent);
    }
    jellies.add(j);
    jellyParams.push({
      mesh: j, dome, phase,
      r: 9 + i * 3.5,
      w: 0.03 + Math.random() * 0.02,
      off: Math.random() * Math.PI * 2,
    });
  }
  scene.add(jellies);

  function updateJellies(t) {
    for (const jp of jellyParams) {
      const a = t * jp.w + jp.off;
      const x = jp.r * Math.cos(a);
      const z = jp.r * Math.sin(a);
      const pulse = Math.sin(t * 1.8 + jp.phase) * 0.5 + 0.5;
      jp.mesh.position.set(
        x, waveHeightAt(x, z, t, seaStateEff) - 0.08 + pulse * 0.06, z);
      jp.dome.scale.set(1 + pulse * 0.16, 1 - pulse * 0.13, 1 + pulse * 0.16);
    }
  }

  // --- 蝠鲼(夜晚,双翼波动 + 偶尔跃出) ---
  const mantaGeo = createMantaGeometry();
  const mantas = new THREE.Group();
  const mantaParams = [];
  for (let i = 0; i < MANTA_COUNT; i++) {
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.side = THREE.DoubleSide;
    mat.positionNode = mantaFlex(uniform(i * 2.6 + 0.4));
    mat.colorNode = mantaColor();
    const mesh = new THREE.Mesh(mantaGeo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.frustumCulled = false;
    mantas.add(mesh);
    mantaParams.push({
      mesh,
      r: 34 + i * 9,
      w: (0.075 + Math.random() * 0.02) * (i % 2 ? -1 : 1),
      off: Math.random() * Math.PI * 2,
      cycle: 8 + i * 3.5,
      jumpDur: 1.5,
      jumpH: 2.4,
    });
  }
  scene.add(mantas);

  function updateMantas(t) {
    for (const m of mantaParams) {
      const a = t * m.w + m.off;
      const x = m.r * Math.cos(a);
      const z = m.r * Math.sin(a);
      const vx = -m.r * m.w * Math.sin(a);
      const vz = m.r * m.w * Math.cos(a);
      const waveY = waveHeightAt(x, z, t, seaStateEff);
      const local = (t + m.off * 5.0) % m.cycle;
      let y, pitch, roll;
      if (local < m.jumpDur) {
        // 跃出:双翼展开,身体翻出弧线
        const k = local / m.jumpDur;
        y = waveY - 0.25 + m.jumpH * 4 * k * (1 - k);
        const vy = (m.jumpH * 4 * (1 - 2 * k)) / m.jumpDur;
        pitch = -Math.atan2(vy, Math.hypot(vx, vz));
        roll = Math.sin(k * Math.PI) * 0.4;
      } else {
        // 滑翔:贴着浪面,翼尖节律性地切水
        y = waveY - 0.05;
        pitch = 0;
        roll = Math.sin(t * 0.9 + m.off) * 0.12;
      }
      m.mesh.position.set(x, y, z);
      m.mesh.rotation.set(pitch, Math.atan2(vx, vz), roll);
    }
  }

  // --- 座头鲸(风暴夜事件:浮出水面换气喷水) ---
  const whaleMat = new THREE.MeshBasicNodeMaterial();
  whaleMat.positionNode = spineFlex(uniform(0), 1.8, 0.22, -1.5, 6.2);
  whaleMat.colorNode = marineSkin(vec3(0.070, 0.095, 0.125));
  const whale = new THREE.Mesh(createWhaleGeometry(), whaleMat);
  whale.rotation.order = 'YXZ';
  whale.frustumCulled = false;
  whale.visible = false;
  scene.add(whale);

  const spoutMat = new THREE.MeshBasicNodeMaterial();
  spoutMat.transparent = true;
  spoutMat.depthWrite = false;
  const uSpout = uniform(0);
  spoutMat.colorNode = vec3(0.90, 0.95, 1.0).mul(1.4);
  spoutMat.opacityNode = uSpout;
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 10, 1, true), spoutMat);
  spout.visible = false;
  spout.frustumCulled = false;
  scene.add(spout);

  const whaleEvent = { active: false, t0: 0, dur: 26, nextAt: 25, spouted: false, spoutT: 0 };

  function updateWhale(t, nightFjs, effSea) {
    if (!whaleEvent.active) {
      // 海啸期间座头鲸不上浮换气(深海躲避)
      if (t >= whaleEvent.nextAt && nightFjs > 0.5 && effSea > 0.6 && bioOn && tsunamiState.amp < 5) {
        whaleEvent.active = true;
        whaleEvent.t0 = t;
        whaleEvent.spouted = false;
        whale.visible = true;
        unlockSpecies('whale');
      }
      return;
    }
    const k = (t - whaleEvent.t0) / whaleEvent.dur;
    if (k >= 1) {
      whaleEvent.active = false;
      whaleEvent.nextAt = t + 45 + Math.random() * 45;
      whale.visible = false;
      spout.visible = false;
      return;
    }
    // 横越视野的直线路径,背部缓慢拱出海面
    const x = -95 + 190 * k;
    const z = 48;
    const arch = Math.pow(Math.sin(Math.PI * Math.min(k * 1.15, 1)), 0.8);
    const y = -3.6 + arch * 4.8;
    whale.position.set(x, y, z);
    whale.rotation.set(-arch * 0.10 + 0.06, Math.PI / 2, 0); // 朝 +X 游动
    // 换气喷水(行至中段触发一次,约 2 秒)
    if (!whaleEvent.spouted && k > 0.42) {
      whaleEvent.spouted = true;
      whaleEvent.spoutT = t;
      spout.visible = true;
    }
    if (spout.visible) {
      const sk = (t - whaleEvent.spoutT) / 2.0;
      if (sk >= 1) {
        spout.visible = false;
        uSpout.value = 0;
      } else {
        spout.position.set(x + 5.5, y + 1.6 + sk * 1.6, z);
        const s = 0.4 + sk * 1.8;
        spout.scale.set(s, 1 + sk * 0.8, s);
        uSpout.value = (1 - sk) * 0.55;
      }
    }
  }

  /* ========================= 生物群落结束 ========================= */

  /* =========================== 船队 =========================== */
  /* 1 艘玩家摩托艇(红)+ 2 艘 AI 摩托艇 + 1 艘 AI 帆船。
     驾驶:W/S 油门、A/D 舵、滚轮视距、B 下船。 */
  const BOAT_COLORS = [
    { kind: 'motor', color: vec3(0.55, 0.12, 0.10), player: true,  home: [26, 34],  heading: -2.1 },
    { kind: 'speed', color: vec3(0.78, 0.60, 0.08), player: true,  home: [40, 20],  heading: -2.4 },
    { kind: 'motor', color: vec3(0.20, 0.30, 0.38), player: false, home: [-60, -20], heading: 0.8 },
    { kind: 'motor', color: vec3(0.35, 0.36, 0.34), player: false, home: [70, -45],  heading: 2.6 },
    { kind: 'sail',  color: vec3(0.80, 0.82, 0.85), player: false, home: [-40, 70],  heading: 1.6 },
  ];
  const boatMat = () => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.side = THREE.DoubleSide;
    return m;
  };
  const motorGeo = createMotorboatGeometry();
  const sailGeo = createSailboatGeometry();
  const speedGeo = createSpeedboatGeometry();
  const boats = [];
  for (const spec of BOAT_COLORS) {
    const mat = boatMat();
    mat.colorNode = marineSkin(spec.color);
    const mesh = new THREE.Mesh(
      spec.kind === 'motor' ? motorGeo : spec.kind === 'speed' ? speedGeo : sailGeo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.frustumCulled = false;
    scene.add(mesh);
    boats.push({
      kind: spec.kind, mesh, player: spec.player,
      x: spec.home[0], z: spec.home[1], heading: spec.heading,
      u: 0, v: 0, r: 0,
      throttle: 0, rudder: 0,
      ai: !spec.player, aiPhase: Math.random() * 100,
      aiThrottle: 0.3,
      capsizeT: 0,
      shown: { y: 0, pitch: 0, roll: 0 },
    });
  }
  const playerBoat = boats[0];
  const driveKeys = { throttle: false, brake: false, left: false, right: false };
  let driving = false;
  let driveTarget = playerBoat;   // 当前驾驶的船(摩托艇/快艇)
  let chaseDist = 14;

  /* =========================== 蛟龙号载人潜水器 =========================== */
  /* 白橙涂装 8.2m 级深潜器。操作贴近真实:主推进约 2.5 节、垂直推进器
     独立控制上浮下潜、C 悬停自动定深、X 抛弃压载紧急上浮、探照灯自动开。
     波浪影响随深度指数衰减(深海无浪),可坐底(-24.3m)。 */
  const subKeys = { up: false, down: false };
  let pilotSub = false;
  const jiaoMat = new THREE.MeshBasicNodeMaterial();
  jiaoMat.side = THREE.DoubleSide;
  jiaoMat.colorNode = marineSkin(jiaolongColor());
  const subMesh = new THREE.Mesh(createJiaolongGeometry(), jiaoMat);
  subMesh.rotation.order = 'YXZ';
  subMesh.frustumCulled = false;
  scene.add(subMesh);
  // 探照灯:灯体(高亮小球,喂 Bloom)+ 前向暖色光锥(半透明)
  const lampMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = vec3(2.2, 2.0, 1.6).mul(uLamp); return m; })()
  );
  lampMesh.position.set(0, 1.0, 2.0);
  lampMesh.frustumCulled = false;
  subMesh.add(lampMesh);
  const coneGeo = new THREE.ConeGeometry(3.2, 11, 16, 1, true);
  coneGeo.rotateX(Math.PI / 2 - 0.18);              // 锥尖朝 +Z 并略向下压
  coneGeo.translate(0, 0, 6.5);
  const coneMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  coneMat.side = THREE.DoubleSide;
  coneMat.colorNode = vec3(1.0, 0.9, 0.7);
  coneMat.opacityNode = uLamp.mul(0.07);
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.set(0, 0.5, 2.0);
  coneMesh.frustumCulled = false;
  subMesh.add(coneMesh);

  const sub = {
    mesh: subMesh, x: -16, z: 12, y: 0, heading: 2.3,
    u: 0, vy: 0, r: 0,
    throttle: 0, rudder: 0, vert: 0,
    hover: false, holdY: 0, ballastDropped: false,
    shown: { pitch: 0, roll: 0 },
  };

  function updateSub(t, dt) {
    const waveY = waveHeightAt(sub.x, sub.z, t, seaStateEff);
    let inp;
    if (pilotSub) {
      // 油门杆:W 增 S 减,保持式(与船上操作一致);抛载后主推进断电
      if (driveKeys.throttle) sub.throttle = Math.min(1, sub.throttle + dt * 0.5);
      if (driveKeys.brake) sub.throttle = Math.max(-0.4, sub.throttle - dt * 0.5);
      const rudIn = (driveKeys.right ? 1 : 0) - (driveKeys.left ? 1 : 0);
      sub.rudder += (rudIn - sub.rudder * (rudIn === 0 ? 2.0 : 0)) * Math.min(1, dt * 3.0);
      sub.rudder = Math.max(-1, Math.min(1, sub.rudder));
      sub.vert = (subKeys.up ? 1 : 0) - (subKeys.down ? 1 : 0);
      inp = {
        throttle: sub.ballastDropped ? 0 : sub.throttle,
        rudder: sub.rudder, vert: sub.vert,
        hover: sub.hover, holdY: sub.holdY,
      };
    } else {
      inp = { throttle: 0, rudder: 0, vert: 0, hover: true, holdY: sub.y };  // 离舱自动悬停保深
    }
    // 抛弃压载:正浮力紧急上浮(真实蛟龙号保命机构);出水后自动重装
    let ballastVy = 0;
    if (sub.ballastDropped) {
      ballastVy = 0.85;
      if (sub.y > waveY - 0.6) {
        sub.ballastDropped = false;
        if (pilotSub) showToast('已浮出水面 · 压载重装完毕');
      }
    }
    // 海底或岛礁坡面,取其高者为触底限
    stepSubDynamics(sub, inp, dt,
      Math.max(-24.3, islandHeightAt(sub.x, sub.z) + 1.5), waveY + 0.35, ballastVy);
    // 姿态:波浪影响随深度指数衰减(深海无浪)+ 垂速纵倾 + 转向微横倾
    const depth = Math.max(0, waveY - sub.y);
    const wInf = Math.exp(-depth * 0.22);
    const fx = Math.sin(sub.heading), fz = Math.cos(sub.heading);
    const hBow = waveHeightAt(sub.x + fx * 3, sub.z + fz * 3, t, seaStateEff);
    const hSt = waveHeightAt(sub.x - fx * 3, sub.z - fz * 3, t, seaStateEff);
    const pitchT = Math.atan2(hSt - hBow, 6) * wInf - sub.vy * 0.28;
    const rollT = sub.r * sub.u * 0.10;
    const k = Math.min(1, dt * 2.5);
    sub.shown.pitch += (Math.max(-0.4, Math.min(0.4, pitchT)) - sub.shown.pitch) * k;
    sub.shown.roll += (Math.max(-0.3, Math.min(0.3, rollT)) - sub.shown.roll) * k;
    sub.mesh.position.set(sub.x, sub.y, sub.z);
    sub.mesh.rotation.set(sub.shown.pitch, sub.heading, sub.shown.roll);
    // 探照灯:下潜超过 4m 或入夜自动开;uniform 供海底光池/灯体/光锥
    const lightOn = (depth > 4 || uSunDir.value.y < 0.05) ? 1 : 0;
    uJiaolong.value.set(sub.x, sub.y, sub.z, lightOn);
    uLamp.value += (lightOn - uLamp.value) * Math.min(1, dt * 2.0);
  }

  /* =========================== 荒岛与荒野求生 =========================== */
  /* 地形用 CPU 精确高度场(与行走/搁浅/潜水触底同一函数);着色全在 GPU:
     高度坡度分带 + 烘焙 AO(谷地+树荫)+ 云影 + 湿沙高光 + 篝火 + 大气透视。 */
  // 第一步:先确定树的位置(地形烘焙树荫要用)
  const palmData = [];
  {
    let guard = 0;
    while (palmData.length < 42 && guard++ < 4000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ISLAND.R * 0.85;
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 2.0 || h > 13) continue;
      const slope = Math.abs(islandHeightAt(x + 2, z) - h) + Math.abs(islandHeightAt(x, z + 2) - h);
      if (slope > 1.6) continue;
      palmData.push({ x, z, y: h, nuts: 1 + Math.floor(Math.random() * 3), regrowT: 0 });
    }
    // 新岛雨林外缘:棕榈明显加密,形成从海滩到林线的热带植被带。
    guard = 0;
    while (palmData.length < 42 + 240 && guard++ < 22000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * NEW_ISLAND.R * 0.88;
      const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
      const h = newIslandHeightAt(x, z);
      if (h < 1.2 || h > 24) continue;
      const slope = Math.abs(newIslandHeightAt(x + 2, z) - h) + Math.abs(newIslandHeightAt(x, z + 2) - h);
      if (slope > 2.2) continue;
      palmData.push({ x, z, y: h, nuts: 1 + Math.floor(Math.random() * 3), regrowT: 0 });
    }
  }
  const canopyData = [];
  {
    let guard = 0;
    while (canopyData.length < 55 && guard++ < 5000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ISLAND.R * 0.62;   // 内陆树林
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 3.0 || h > 18) continue;
      const slope = Math.abs(islandHeightAt(x + 2, z) - h) + Math.abs(islandHeightAt(x, z + 2) - h);
      if (slope > 2.2) continue;
      canopyData.push({ x, z, y: h });
    }
    // 新岛内陆的阔叶雨林:密度大幅提高,远看是一整片连续树冠。
    guard = 0;
    while (canopyData.length < 55 + 620 && guard++ < 52000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * NEW_ISLAND.R * 0.82;
      const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
      const h = newIslandHeightAt(x, z);
      if (h < 2.2 || h > 32) continue;
      const slope = Math.abs(newIslandHeightAt(x + 2, z) - h) + Math.abs(newIslandHeightAt(x, z + 2) - h);
      if (slope > 3.0) continue;
      canopyData.push({ x, z, y: h });
    }
  }
  const jungleTreeData = [];
  {
    const addJungleTrees = (kind, count, rMin, rMax, hMin, hMax, maxSlope, guardMax) => {
      let made = 0, guard = 0;
      while (made < count && guard++ < guardMax) {
        const a = Math.random() * Math.PI * 2;
        const r = NEW_ISLAND.R * (rMin + Math.random() * (rMax - rMin));
        const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
        const h = newIslandHeightAt(x, z);
        if (h < hMin || h > hMax) continue;
        const slope = Math.abs(newIslandHeightAt(x + 2, z) - h) + Math.abs(newIslandHeightAt(x, z + 2) - h);
        if (slope > maxSlope) continue;
        jungleTreeData.push({ kind, x, z, y: h });
        made++;
      }
    };
    addJungleTrees('buttress', 95, 0.18, 0.68, 4.5, 36, 3.1, 16000); // 高大板根树
    addJungleTrees('banyan', 70, 0.22, 0.74, 2.8, 28, 2.8, 14000);   // 榕树/气根树
    addJungleTrees('fern', 150, 0.16, 0.80, 1.4, 24, 3.2, 18000);    // 桫椤蕨树
  }
  // 第二步:地形网格 + 烘焙 AO(谷地压暗 + 每棵树的树荫)
  const islGeo = new THREE.PlaneGeometry(ISLAND.R * 2.8, ISLAND.R * 2.8, 190, 190);
  islGeo.rotateX(-Math.PI / 2);
  {
    const p = islGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, islandHeightAt(p.getX(i) + ISLAND.x, p.getZ(i) + ISLAND.z));
    }
    islGeo.computeVertexNormals();
    // AO:邻点比我高 → 我在洼地/皱褶里,压暗;树荫:指数衰减暗斑
    const aoArr = new Float32Array(p.count);
    const shadows = [];
    for (const t of palmData) shadows.push({ x: t.x, z: t.z, r2: 3.5 * 3.5, k: 0.30 });
    for (const t of canopyData) shadows.push({ x: t.x, z: t.z, r2: 5.5 * 5.5, k: 0.45 });
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + ISLAND.x, z = p.getZ(i) + ISLAND.z, h = p.getY(i);
      const nb = (islandHeightAt(x + 3, z) + islandHeightAt(x - 3, z)
        + islandHeightAt(x, z + 3) + islandHeightAt(x, z - 3)) * 0.25;
      let ao = Math.max(0.45, Math.min(1, 1 - (nb - h) * 0.10));
      for (const s of shadows) {
        const dx = x - s.x, dz = z - s.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < s.r2) ao *= 1 - s.k * (1 - d2 / s.r2);
      }
      aoArr[i] = ao;
    }
    islGeo.setAttribute('aAO', new THREE.BufferAttribute(aoArr, 1));
  }
  const islMat = new THREE.MeshBasicNodeMaterial();
  islMat.colorNode = islandTerrainColor();
  const islMesh = new THREE.Mesh(islGeo, islMat);
  islMesh.position.set(ISLAND.x, 0, ISLAND.z);
  scene.add(islMesh);

  // ---- 新海域:更大的荒岛(地形网格 + 野人)----
  const newIsland = { unlocked: false, landedT: 0 };    // 踏上过新岛后解锁死亡重生选项;landedT=上岸后和平计时
  const relicSpots = {};
  {
    const g2 = new THREE.PlaneGeometry(NEW_ISLAND.R * 2.8, NEW_ISLAND.R * 2.8, 150, 150);
    g2.rotateX(-Math.PI / 2);
    const p2 = g2.attributes.position;
    const ao2 = new Float32Array(p2.count);
    const shadows2 = [];
    for (const t of palmData) shadows2.push({ x: t.x, z: t.z, r2: 4.2 * 4.2, k: 0.34 });
    for (const t of canopyData) shadows2.push({ x: t.x, z: t.z, r2: 7.0 * 7.0, k: 0.52 });
    for (const t of jungleTreeData) {
      const big = t.kind === 'buttress' || t.kind === 'banyan';
      shadows2.push({ x: t.x, z: t.z, r2: (big ? 8.5 : 4.8) ** 2, k: big ? 0.58 : 0.36 });
    }
    for (let i = 0; i < p2.count; i++) {
      const x = p2.getX(i) + NEW_ISLAND.x, z = p2.getZ(i) + NEW_ISLAND.z;
      const h = newIslandHeightAt(x, z);
      p2.setY(i, h);
      const nb = (newIslandHeightAt(x + 3, z) + newIslandHeightAt(x - 3, z)
        + newIslandHeightAt(x, z + 3) + newIslandHeightAt(x, z - 3)) * 0.25;
      let ao = Math.max(0.36, Math.min(1, 1 - (nb - h) * 0.11));
      for (const s of shadows2) {
        const dx = x - s.x, dz = z - s.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < s.r2) ao *= 1 - s.k * (1 - d2 / s.r2);
      }
      ao2[i] = ao;
    }
    g2.computeVertexNormals();
    g2.setAttribute('aAO', new THREE.BufferAttribute(ao2, 1));
    const m2 = new THREE.MeshBasicNodeMaterial();
    m2.colorNode = islandTerrainColor();
    const mesh2 = new THREE.Mesh(g2, m2);
    mesh2.position.set(NEW_ISLAND.x, 0, NEW_ISLAND.z);
    scene.add(mesh2);
  }
  let swordTurret = null;
  const SWORD_TURRET_EYE_LIFT = 4.8;       // 操控炮台时把视角放到炮台最顶上方,便于俯瞰脚下野人。
  const greatWallMeshes = [];
  const SHOW_GREAT_WALL = true;
  // 第二岛制高点:保留长城墙体;高架长剑炮台只保留柱子和炮身,不显示炮台底部圆盘。
  {
    const wallPts = [];
    for (let i = 0; i < 34; i++) wallPts.push(newIslandWallPoint(i));
    const high = newIslandGreatWallHighPoint();
    relicSpots.greatWall = { x: high.x, z: high.z };
    if (SHOW_GREAT_WALL) {
    const wallMat = (() => { const m = new THREE.MeshBasicNodeMaterial({ transparent: true }); m.colorNode = marineSkin(vec3(0.36, 0.34, 0.30)); return m; })();
    const rampMat = (() => { const m = new THREE.MeshBasicNodeMaterial({ transparent: true }); m.colorNode = marineSkin(vec3(0.31, 0.28, 0.22)); return m; })();
    const moatMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    moatMat.colorNode = canalWaterColor();
    moatMat.opacityNode = float(0.86);
    moatMat.side = THREE.DoubleSide;
    const moatVerts = [], moatIdx = [];
    const moatW = 13.5;
    for (let i = 0; i < wallPts.length; i++) {
      const p = wallPts[i];
      const q = wallPts[Math.min(i + 1, wallPts.length - 1)];
      let dx = q.x - p.x, dz = q.z - p.z;
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const bankFloor = Math.min(p.h, newIslandHeightAt(p.x - dz * moatW, p.z + dx * moatW), newIslandHeightAt(p.x + dz * moatW, p.z - dx * moatW));
      const waterY = bankFloor + 1.45;
      moatVerts.push(p.x - dz * moatW, waterY, p.z + dx * moatW,
                     p.x + dz * moatW, waterY, p.z - dx * moatW);
      if (i > 0) {
        const b = i * 2;
        moatIdx.push(b - 2, b - 1, b, b - 1, b + 1, b);
      }
    }
    const moatGeo = new THREE.BufferGeometry();
    moatGeo.setAttribute('position', new THREE.Float32BufferAttribute(moatVerts, 3));
    moatGeo.setIndex(moatIdx);
    moatGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(moatGeo, moatMat));
    {
      const ramp = newIslandGreatWallRampInfo();
      const sx = ramp.start.x, sz = ramp.start.z, ex = ramp.end.x, ez = ramp.end.z;
      let dx = ex - sx, dz = ez - sz;
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const px = -dz, pz = dx, w = ramp.width;
      const sy = newIslandHeightAt(sx, sz) + 0.18, ey = ramp.top + 0.1;
      const verts = [
        sx + px * w, sy, sz + pz * w,
        sx - px * w, sy, sz - pz * w,
        ex + px * w, ey, ez + pz * w,
        ex - px * w, ey, ez - pz * w
      ];
      const rampGeo = new THREE.BufferGeometry();
      rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      rampGeo.setIndex([0, 1, 2, 1, 3, 2]);
      rampGeo.computeVertexNormals();
      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      scene.add(rampMesh);
      greatWallMeshes.push(rampMesh);
    }
    for (let i = 0; i < wallPts.length - 1; i++) {
      if (i === 11 || i === 12 || i === 23) continue; // 几处坍塌缺口
      const a = wallPts[i], b = wallPts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const midX = (a.x + b.x) * 0.5, midZ = (a.z + b.z) * 0.5;
      const midH = newIslandHeightAt(midX, midZ);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(6.4, 8.4, len + 1.0), wallMat);
      seg.position.set(midX, midH + 4.2, midZ);
      seg.rotation.y = Math.atan2(dx, dz);
      scene.add(seg);
      greatWallMeshes.push(seg);
      if (i % 2 === 0) {
        const crenel = new THREE.Mesh(new THREE.BoxGeometry(6.9, 1.25, Math.min(6.4, len * 0.55)), wallMat);
        crenel.position.set(midX, midH + 9.05, midZ);
        crenel.rotation.y = seg.rotation.y;
        scene.add(crenel);
        greatWallMeshes.push(crenel);
      }
    }
    const towerIdx = [2, 16, 31];
    for (const idx of towerIdx) {
      const p = wallPts[idx], h = newIslandHeightAt(p.x, p.z);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(13.5, 15.8, 13.5), wallMat);
      tower.position.set(p.x, h + 7.9, p.z);
      tower.rotation.y = idx * 0.37;
      scene.add(tower);
      greatWallMeshes.push(tower);
      const top = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.35, 15.5), wallMat);
      top.position.set(p.x, h + 16.45, p.z);
      top.rotation.y = tower.rotation.y;
      scene.add(top);
      greatWallMeshes.push(top);
    }
    }
    const turretMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.48, 0.38, 0.24)); return m; })();
    const bladeMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.76, 0.78, 0.72)); return m; })();
    const turret = new THREE.Group();
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 5.0), bladeMat);
    rail.position.set(0, 0.86, 1.8);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.22), bladeMat);
    cross.position.set(0, 0.86, 0.05);
    const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10), bladeMat);
    sight.rotation.x = Math.PI / 2;
    sight.position.set(0, 1.22, 0.55);
    turret.add(rail, cross, sight);
    const th = newIslandHeightAt(high.x, high.z);
    const turretY = th + 42.0;
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.3, 24.0, 12), turretMat);
    lift.position.set(high.x, th + 28.9, high.z);
    scene.add(lift);
    turret.position.set(high.x, turretY, high.z);
    turret.rotation.y = Math.atan2(NEW_ISLAND.x - high.x, NEW_ISLAND.z - high.z);
    scene.add(turret);
    swordTurret = { x: high.x, y: turretY, z: high.z, dir: turret.rotation.y, ammo: 1000, mesh: turret };
  }
  // 新岛边缘低雾:只围在外缘与林线之间,海边水面仍然清楚可见
  {
    const fogMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    fogMat.colorNode = marineSkin(vec3(0.72, 0.82, 0.80));
    fogMat.opacityNode = float(0.26);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = NEW_ISLAND.R * (1.02 + (i % 3) * 0.035);
      const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
      const h = Math.max(0.8, newIslandHeightAt(x, z) + 1.0);
      const fog = new THREE.Mesh(new THREE.PlaneGeometry(34 + (i % 4) * 10, 7 + (i % 3) * 2), fogMat);
      fog.position.set(x, h + 2.2, z);
      fog.rotation.y = -a + Math.PI / 2;
      fog.frustumCulled = false;
      scene.add(fog);
    }
  }
  // 第三/第四岛:由野人阵营结局解锁航向,先作为远方真实岛体存在
  function addRemoteIslandMesh(isle) {
    const g = new THREE.PlaneGeometry(isle.R * 2.6, isle.R * 2.6, 96, 96);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const ao = new Float32Array(p.count).fill(0.82);
    for (let i = 0; i < p.count; i++) {
      p.setY(i, remoteIslandHeightAt(isle, p.getX(i) + isle.x, p.getZ(i) + isle.z));
    }
    g.computeVertexNormals();
    g.setAttribute('aAO', new THREE.BufferAttribute(ao, 1));
    const mesh = new THREE.Mesh(g, islMat);
    mesh.position.set(isle.x, 0, isle.z);
    scene.add(mesh);
  }
  addRemoteIslandMesh(THIRD_ISLAND);
  addRemoteIslandMesh(FOURTH_ISLAND);
  // 野人:新岛上的原住民,持矛游荡;玩家初始生命 200,野人伤害偏低但频繁。
  const savages = [];
  {
    const SAVAGE_JOBS = {
      swordsman: { name: '剑士', hp: 100, speed: 1.12, dmg: 13 },
      spearman: { name: '长矛战士', hp: 100, speed: 1.00, dmg: 12 },
      shield: { name: '盾兵', hp: 100, speed: 0.82, dmg: 9 },
      poisoner: { name: '炼毒师', hp: 100, speed: 0.95, dmg: 8, poison: true },
    };
    const jobCycle = ['swordsman', 'spearman', 'shield', 'poisoner'];
    const sBody = new THREE.CapsuleGeometry(0.19, 0.9, 4, 10);
    sBody.translate(0, 0.72, 0);
    const sHead = new THREE.SphereGeometry(0.15, 10, 8);
    sHead.translate(0, 1.42, 0);
    const sGeo = mergeGeometries([sBody, sHead], false);
    sGeo.computeVertexNormals();
    const sMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.42, 0.28, 0.16)); return m; })();
    const spearGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.9, 5);
    const spearMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.35, 0.24, 0.12)); return m; })();
    const swordGeo = new THREE.BoxGeometry(0.08, 0.04, 1.05);
    const swordMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.62, 0.64, 0.58)); return m; })();
    const shieldGeo = new THREE.BoxGeometry(0.38, 0.55, 0.07);
    const shieldMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.18, 0.20, 0.16)); return m; })();
    const poisonGeo = new THREE.SphereGeometry(0.10, 8, 6);
    const poisonMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.10, 0.55, 0.22)); return m; })();
    const elderBoneMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.86, 0.78, 0.58)); return m; })();
    const elderCloakMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.05, 0.04)); return m; })();
    const guardArmorMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.08, 0.10, 0.09)); return m; })();
    const guardPaintMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.78, 0.78, 0.70)); return m; })();
    const stoneClothMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.55, 0.36, 0.18)); return m; })();
    const stonePaintMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.82, 0.78, 0.64)); return m; })();
    const mistClothMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.10, 0.34, 0.22)); return m; })();
    const mistPaintMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.22, 0.64, 0.58)); return m; })();
    function applySavageFactionVisual(mesh, faction) {
      const mark = new THREE.Group();
      mark.name = 'factionVisual';
      if (faction === 'stone') {
        const sash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.045), stoneClothMat);
        sash.position.set(-0.08, 0.93, 0.205);
        sash.rotation.z = -0.46;
        mark.add(sash);
        const waist = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.055), stoneClothMat);
        waist.position.set(0, 0.70, 0.21);
        mark.add(waist);
        const faceStripe = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.035), stonePaintMat);
        faceStripe.position.set(0, 1.46, 0.145);
        mark.add(faceStripe);
        for (let k = 0; k < 3; k++) {
          const bead = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.035), stonePaintMat);
          bead.position.set((k - 1) * 0.09, 1.20, 0.20);
          mark.add(bead);
        }
      } else {
        const leafCape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.05), mistClothMat);
        leafCape.position.set(0, 1.02, -0.19);
        leafCape.rotation.x = -0.28;
        mark.add(leafCape);
        for (const sx of [-1, 1]) {
          const armBand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.045), mistClothMat);
          armBand.position.set(sx * 0.22, 1.03, 0.18);
          armBand.rotation.z = sx * 0.28;
          mark.add(armBand);
        }
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.028, 0.032), mistPaintMat);
        brow.position.set(0, 1.52, 0.145);
        mark.add(brow);
        const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.032), mistPaintMat);
        cheekL.position.set(-0.095, 1.40, 0.145);
        const cheekR = cheekL.clone();
        cheekR.position.x = 0.095;
        mark.add(cheekL, cheekR);
      }
      mesh.add(mark);
    }
    function clearSavageRankVisual(mesh) {
      const old = mesh.getObjectByName('rankVisual');
      if (old) mesh.remove(old);
    }
    function applySavageRankVisual(mesh, elder) {
      clearSavageRankVisual(mesh);
      const mark = new THREE.Group();
      mark.name = 'rankVisual';
      if (elder) {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.32, 7), elderBoneMat);
        crown.position.set(0, 1.67, 0);
        mark.add(crown);
        for (let k = 0; k < 5; k++) {
          const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.038, 0.34, 5), elderBoneMat);
          tooth.position.set((k - 2) * 0.08, 1.88, -0.03);
          tooth.rotation.z = (k - 2) * 0.16;
          mark.add(tooth);
        }
        const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.055), elderCloakMat);
        cloak.position.set(0, 1.03, -0.19);
        cloak.rotation.x = -0.18;
        mark.add(cloak);
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.17, 0.04), elderBoneMat);
        badge.position.set(0, 1.12, 0.21);
        mark.add(badge);
      } else {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.22), guardArmorMat);
        band.position.set(0, 1.50, 0.01);
        mark.add(band);
        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.09, 0.22), guardArmorMat);
        shoulderL.position.set(-0.22, 1.18, 0.03);
        shoulderL.rotation.z = 0.22;
        const shoulderR = shoulderL.clone();
        shoulderR.position.x = 0.22;
        shoulderR.rotation.z = -0.22;
        mark.add(shoulderL, shoulderR);
        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.045), guardPaintMat);
        stripeL.position.set(-0.15, 0.98, 0.21);
        stripeL.rotation.z = -0.25;
        const stripeR = stripeL.clone();
        stripeR.position.x = 0.15;
        stripeR.rotation.z = 0.25;
        mark.add(stripeL, stripeR);
      }
      mesh.add(mark);
    }
    let placed = 0, guard = 0;
    while (placed < 16 && guard++ < 7000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * NEW_ISLAND.R * 0.75;
      const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
      const h = newIslandHeightAt(x, z);
      if (h < 1.5 || h > 22) continue;
      const mesh = new THREE.Mesh(sGeo, sMat);
      const faction = placed % 2 === 0 ? 'stone' : 'mist';
      applySavageFactionVisual(mesh, faction);
      const job = jobCycle[placed % jobCycle.length];
      if (job === 'swordsman') {
        const sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(0.32, 0.95, 0.18);
        sword.rotation.set(0.72, 0, -0.28);
        mesh.add(sword);
      } else {
        const spear = new THREE.Mesh(spearGeo, spearMat);
        spear.position.set(0.3, 0.9, 0.1);
        spear.rotation.z = -0.25;
        mesh.add(spear);
      }
      if (job === 'shield') {
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(-0.25, 0.92, 0.13);
        shield.rotation.y = 0.18;
        mesh.add(shield);
      }
      if (job === 'poisoner') {
        const vial = new THREE.Mesh(poisonGeo, poisonMat);
        vial.position.set(-0.24, 1.10, 0.16);
        mesh.add(vial);
      }
      mesh.position.set(x, h, z);
      scene.add(mesh);
      savages.push({ mesh, x, z, dir: Math.random() * Math.PI * 2, t: 0, speed: 0,
                     faction,
                     job, jobName: SAVAGE_JOBS[job].name, maxHp: SAVAGE_JOBS[job].hp,
                     state: 'wander', hp: SAVAGE_JOBS[job].hp, dead: false, fallK: 0, hitCd: 0, respawnT: 0,
                     homeX: x, homeZ: z });
      placed++;
    }
  }

  // ---- 新岛风物:前人遗物与野人家园(不只是枪械)----
  // 祭坛(不要密码的彩蛋):石阵中央,E 祭拜 → 野人好感,30s 不被攻击
  // 沉船宝藏(要密码的彩蛋):密码线索刻在图腾上(图腾可按 E 查看)
  const RELIC_PASSWORD = '523';          // 图腾密码:五座山 · 两条河 · 三棵神树
  const MEMORIAL_PASSWORD = '1942';      // 红五星墓碑密码:帕维尔随西比里亚科夫号激战沉海之年(墓志铭里有)
  const relics = {
    chestOpen: false, totemRead: false, altarCd: 0, altarUsed: 0, memorialRead: false, memorialOpen: false,
    tribeAlly: null, thirdUnlocked: false, fourthUnlocked: false, yinyangCompass: false, antidote: 0,
    stoneMercy: 0, mistMercy: 0,
    tombFound: false, tombKit: false, tombDug: false, tombOpened: false, tombOpeningT: 0,
    tombLooted: false, tombWaterOpen: false, tombLetterPage: 0,
    tombDeaths: 0, authorMode: false, tombGuide: false,
    war: { mode: 'none', t: 0, next: 8, waveT: 0, sent: 0, killed: 0, max: 500, ending: false }
  };
  {
    const stoneMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.42, 0.40, 0.36)); return m; })();
    const woodMat2 = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.36, 0.24, 0.12)); return m; })();
    const goldMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.75, 0.58, 0.18)); return m; })();
    // 找一块新岛上的平地放遗物
    function flatSpot(rMin, rMax, hMin, hMax) {
      for (let i = 0; i < 3000; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * (rMax - rMin);
        const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
        const h = newIslandHeightAt(x, z);
        if (h < hMin || h > hMax) continue;
        const slope = Math.abs(newIslandHeightAt(x + 2, z) - h) + Math.abs(newIslandHeightAt(x, z + 2) - h);
        if (slope < 2.0) return { x, z, h };
      }
      return { x: NEW_ISLAND.x, z: NEW_ISLAND.z, h: newIslandHeightAt(NEW_ISLAND.x, NEW_ISLAND.z) };
    }
    // 祭坛:五块立石围一圈 + 中央石台(对应密码线索「五座山」)
    {
      const s = flatSpot(NEW_ISLAND.R * 0.1, NEW_ISLAND.R * 0.4, 8, 24);
      relicSpots.altar = { x: s.x, z: s.z };
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const rx = s.x + Math.cos(a) * 3.2, rz = s.z + Math.sin(a) * 3.2;
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4 + Math.random(), 0.6), stoneMat);
        rock.position.set(rx, newIslandHeightAt(rx, rz) + 1.0, rz);
        rock.rotation.set((Math.random() - 0.5) * 0.12, a, (Math.random() - 0.5) * 0.12);
        scene.add(rock);
      }
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.1), stoneMat);
      table.position.set(s.x, s.h + 0.35, s.z);
      scene.add(table);
    }
    // 图腾柱:刻着密码线索(「两条河 · 三棵神树」纹样的立柱)
    {
      const s = flatSpot(NEW_ISLAND.R * 0.3, NEW_ISLAND.R * 0.6, 2, 12);
      relicSpots.totem = { x: s.x, z: s.z };
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 4.2, 8), woodMat2);
      pole.position.set(s.x, s.h + 2.1, s.z);
      scene.add(pole);
      for (let i = 0; i < 3; i++) {     // 三张图腾面孔
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), goldMat);
        face.position.set(s.x, s.h + 1.1 + i * 1.1, s.z + 0.32);
        scene.add(face);
      }
    }
    // 沉船残骸 + 宝箱(密码锁):船头斜插在沙滩上
    {
      const s = flatSpot(NEW_ISLAND.R * 0.72, NEW_ISLAND.R * 0.95, 0.6, 2.2);
      relicSpots.wreck = { x: s.x, z: s.z };
      const hull = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.8, 2.4), woodMat2);
      hull.position.set(s.x, s.h + 0.5, s.z);
      hull.rotation.set(0.12, Math.random() * Math.PI * 2, 0.22);
      scene.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 6), woodMat2);
      mast.position.set(s.x + 1.2, s.h + 2.2, s.z);
      mast.rotation.z = 0.5;
      scene.add(mast);
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55), goldMat);
      chest.position.set(s.x - 2.2, newIslandHeightAt(s.x - 2.2, s.z + 1.2) + 0.25, s.z + 1.2);
      scene.add(chest);
      relicSpots.chest = { x: s.x - 2.2, z: s.z + 1.2 };
    }
    // 野人营地:茅草屋三顶 + 熄灭篝火堆
    {
      const s = flatSpot(NEW_ISLAND.R * 0.35, NEW_ISLAND.R * 0.6, 3, 14);
      relicSpots.camp = { x: s.x, z: s.z };
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.6;
        const hx = s.x + Math.cos(a) * 4.5, hz = s.z + Math.sin(a) * 4.5;
        const hut = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 7), woodMat2);
        hut.position.set(hx, newIslandHeightAt(hx, hz) + 1.2, hz);
        scene.add(hut);
      }
      const firePile = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), stoneMat);
      firePile.position.set(s.x, s.h + 0.15, s.z);
      scene.add(firePile);
    }
    // 石牙村:六座茅屋围一圈 + 村口图腾 + 石火塘,信奉强攻与投石
    {
      const s = flatSpot(NEW_ISLAND.R * 0.45, NEW_ISLAND.R * 0.65, 4, 14);
      relicSpots.village = { x: s.x, z: s.z };
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const hx = s.x + Math.cos(a) * 9, hz = s.z + Math.sin(a) * 9;
        const hut = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.0, 7), woodMat2);
        hut.position.set(hx, newIslandHeightAt(hx, hz) + 1.5, hz);
        scene.add(hut);
      }
      const vpole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 3.6, 8), woodMat2);
      vpole.position.set(s.x, s.h + 1.8, s.z);
      scene.add(vpole);
      const vface = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.18), goldMat);
      vface.position.set(s.x, s.h + 2.6, s.z + 0.28);
      scene.add(vface);
      const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 8), stoneMat);
      fire.position.set(s.x + 3, newIslandHeightAt(s.x + 3, s.z + 2) + 0.15, s.z + 2);
      scene.add(fire);
      const sax = s.x + 14, saz = s.z;
      relicSpots.stoneAltar = { x: sax, z: saz };
      const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8), stoneMat);
      altar.position.set(sax, newIslandHeightAt(sax, saz) + 0.25, saz);
      scene.add(altar);
      // 石牙野人把家安在村落里
      let moved = 0;
      for (const sv of savages) {
        if (sv.faction !== 'stone' || moved >= 6) continue;
        const a = Math.random() * Math.PI * 2;
        sv.x = s.x + Math.cos(a) * (5 + Math.random() * 6);
        sv.z = s.z + Math.sin(a) * (5 + Math.random() * 6);
        sv.homeX = s.x; sv.homeZ = s.z;
        sv.mesh.position.set(sv.x, newIslandHeightAt(sv.x, sv.z), sv.z);
        moved++;
      }
    }
    // 雾叶村:另一套观念,相信避战、毒药与迷雾,与石牙村长期敌对
    {
      const s = flatSpot(NEW_ISLAND.R * 0.46, NEW_ISLAND.R * 0.72, 4, 16);
      relicSpots.village2 = { x: s.x, z: s.z };
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - 0.4;
        const hx = s.x + Math.cos(a) * 10, hz = s.z + Math.sin(a) * 10;
        const hut = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.4, 8), woodMat2);
        hut.position.set(hx, newIslandHeightAt(hx, hz) + 1.7, hz);
        hut.rotation.y = a;
        scene.add(hut);
      }
      const vpole = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.32, 4.2, 8), woodMat2);
      vpole.position.set(s.x, s.h + 2.1, s.z);
      scene.add(vpole);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), goldMat);
      leaf.scale.set(1.0, 0.45, 0.35);
      leaf.position.set(s.x, s.h + 3.2, s.z + 0.28);
      scene.add(leaf);
      const sax = s.x - 14, saz = s.z;
      relicSpots.mistAltar = { x: sax, z: saz };
      const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 0.45, 8), stoneMat);
      altar.position.set(sax, newIslandHeightAt(sax, saz) + 0.23, saz);
      scene.add(altar);
      let moved = 0;
      for (const sv of savages) {
        if (sv.faction !== 'mist' || moved >= 6) continue;
        const a = Math.random() * Math.PI * 2;
        sv.x = s.x + Math.cos(a) * (5 + Math.random() * 7);
        sv.z = s.z + Math.sin(a) * (5 + Math.random() * 7);
        sv.homeX = s.x; sv.homeZ = s.z;
        sv.mesh.position.set(sv.x, newIslandHeightAt(sv.x, sv.z), sv.z);
        moved++;
      }
    }
    // 红五星墓碑(年份密码彩蛋):纪念帕维尔·瓦维洛夫 —— 西比里亚科夫号锅炉工
    {
      const s = flatSpot(NEW_ISLAND.R * 0.2, NEW_ISLAND.R * 0.45, 6, 18);
      relicSpots.memorial = { x: s.x, z: s.z };
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 2.0), stoneMat);
      base.position.set(s.x, s.h + 0.2, s.z);
      scene.add(base);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.3), stoneMat);
      slab.position.set(s.x, s.h + 1.5, s.z);
      scene.add(slab);
      // 碑面镌刻的红五星
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.34 : 0.14;
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) starShape.moveTo(px, py); else starShape.lineTo(px, py);
      }
      starShape.closePath();
      const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape),
        (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.85, 0.12, 0.10)); return m; })());
      star.position.set(s.x, s.h + 1.85, s.z + 0.17);
      scene.add(star);
    }
    // 第二岛河流:固定宽河道,沿雨林溪谷蜿蜒入海,远看也能读出水线。
    {
      const path = [];
      for (let i = 0; i < 132; i++) {
        const u = i / 131;
        const nz = -0.78 + u * 1.56;
        const curve = -0.12 + Math.sin((nz + 0.70) * 2.45) * 0.18 + Math.sin((nz + 0.70) * 8.2) * 0.045;
        const x = NEW_ISLAND.x + curve * NEW_ISLAND.R;
        const z = NEW_ISLAND.z + nz * NEW_ISLAND.R;
        const h = Math.max(0.18, newIslandHeightAt(x, z) + 0.18);
        path.push({ x, z, h, w: 4.8 + Math.sin(u * Math.PI) * 3.6 });
      }
      if (path.length > 4) {
        const verts = [], idx = [];
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          const q = path[Math.min(i + 1, path.length - 1)];
          let dx = q.x - p.x, dz = q.z - p.z;
          const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          verts.push(p.x - dz * p.w, p.h + 0.09, p.z + dx * p.w,
                     p.x + dz * p.w, p.h + 0.09, p.z - dx * p.w);
          if (i > 0) {
            const b = i * 2;
            idx.push(b - 2, b - 1, b, b - 1, b + 1, b);
          }
        }
        const sgeo = new THREE.BufferGeometry();
        sgeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        sgeo.setIndex(idx);
        sgeo.computeVertexNormals();
        const smat = new THREE.MeshBasicNodeMaterial();
        smat.colorNode = marineSkin(vec3(0.22, 0.70, 0.72));
        scene.add(new THREE.Mesh(sgeo, smat));
        const mid = path[Math.floor(path.length / 2)];
        relicSpots.stream = { x: mid.x, z: mid.z };
      }
    }
  }
  // 祭拜祭坛:野人 30 秒内不攻击你(不要密码的彩蛋)
  function useAltar() {
    if (relics.altarCd > 0) { showToast('祭坛的余温还没散去……(冷却 ' + Math.ceil(relics.altarCd) + 's)'); return; }
    relics.altarCd = 60;
    relics.altarUsed = 30;
    walker.hp = Math.min(PLAYER_HP_MAX, walker.hp + 20);
    startHandAction('shake');
    showToast('🗿 你把手放上古老石台 —— 远处野人朝你点头致意!30 秒内它们不会攻击你(生命 +20)');
  }
  // 图腾:刻着宝箱密码的线索
  function readTotem() {
    relics.totemRead = true;
    showToast('🗿 图腾上刻着先民的歌谣:「五座山矗立 · 两条河奔流 · 三棵神树结果」—— 像是在暗示一串数字');
  }
  // 宝箱:输入图腾密码 → 前人宝藏(磁吸炸弹补给 + 神肉 + 弹药)
  function openRelicChest() {
    if (relics.chestOpen) { showToast('宝箱已经空了'); return; }
    const pwd = window.prompt('鎏金宝箱上着一把三位数密码锁' + (relics.totemRead ? '(想想图腾上的歌谣)' : '(岛上似乎有线索……)') + ':');
    if (pwd === null) return;
    if (pwd.trim() === RELIC_PASSWORD) {
      relics.chestOpen = true;
      walker.bombs += 5;
      walker.godMeat += 2;
      walker.sniperAmmo += 8;
      walker.smgAmmo += 60;
      startHandAction('pickup');
      showToast('🏆 宝箱开了!前人留下的宝藏:磁吸炸弹补给 +5 · 神肉 ×2 · 狙击弹 +8 · 冲锋弹 +60');
    } else showToast('密码不对…… 去岛上找找线索吧(图腾?)');
  }
  // 红五星墓碑:第一次 E 读墓志铭(帕维尔的事迹,答案就在里面);第二次 E 开暗格输年份
  function openMemorial() {
    if (relics.memorialOpen) { showToast('墓碑下的暗格已经空了'); return; }
    if (!relics.memorialRead) {
      relics.memorialRead = true;
      showToast('🪦 红五星墓碑 · 墓志铭:「帕维尔·瓦维洛夫 —— 北极破冰船西比里亚科夫号锅炉工。1942 年,他随舰激战德国重巡洋舰"舍尔海军上将",掩护北极航线;舰沉后漂流至别卢哈岛,孤身求生 49 天,终获救援。他没有埋在这里 —— 他活着回到了祖国。」碑底有个暗格,锁孔刻着年份……');
      return;
    }
    const pwd = window.prompt('墓碑底座有个暗格,锁孔刻着:「他随舰激战、舰沉大海的那一年」—— 输入四位年份(墓志铭里有答案):');
    if (pwd === null) return;
    if (pwd.trim() === MEMORIAL_PASSWORD) {
      relics.memorialOpen = true;
      walker.godMeat += 2;
      walker.sniperAmmo += 6;
      walker.smgAmmo += 40;
      walker.bombs += 1;
      startHandAction('pickup');
      showToast('🏆 暗格开了!帕维尔的遗物:神肉 ×2 · 狙击弹 +6 · 冲锋弹 +40 · 磁吸炸弹 +1 —— 他的勇气与你同在');
    } else showToast('年份不对…… 再读一遍墓志铭吧');
  }

  function allyStoneVillage() {
    if (relics.tribeAlly && relics.tribeAlly !== 'stone') {
      showToast('雾叶村已经把你视作同伴,石牙村只会冷冷盯着你');
      return;
    }
    relics.tribeAlly = 'stone';
    walker.villageLooted = true;
    walker.catapult = true;
    walker.spear = true;
    walker.weapon = 'spear';
    $('ih-weapon-item').style.display = 'flex';
    startHandAction('pickup');
    showToast('🪨 结局分支 · 石牙盟友:你帮助强攻派压制雾叶村,获得固定投石机部件;去石崖岛还需要墓穴里的阴阳罗盘为泰坦指路');
  }
  function allyMistVillage() {
    if (relics.tribeAlly && relics.tribeAlly !== 'mist') {
      showToast('石牙村已经把你视作同伴,雾叶村不再信任你');
      return;
    }
    relics.tribeAlly = 'mist';
    relics.antidote += 3;
    walker.spear = true;
    walker.weapon = 'spear';
    $('ih-weapon-item').style.display = 'flex';
    startHandAction('pickup');
    showToast('🌫 结局分支 · 雾叶盟友:你帮助避战派守住迷雾林,获得解毒药 ×3;去物业/雾叶岛还需要墓穴里的阴阳罗盘为泰坦指路');
  }
  function markSavageDead(sv, respawnT = 90) {
    if (!sv || sv.dead) return;
    sv.dead = true;
    sv.fallK = 0;
    sv.respawnT = respawnT;
    sv.warActive = false;
    if (sv.warUnit && !sv.warCounted) {
      sv.warCounted = true;
      relics.war.killed = Math.min(relics.war.max, relics.war.killed + 1);
      if (relics.war.killed >= relics.war.max && !relics.war.ending) {
        relics.war.ending = true;
        relics.war.mode = 'none';
        relics.war.next = 1e9;
        relics.thirdUnlocked = true;
        walker.buff = true;
        showToast('🏆 第三结局 · 孤岛征服者:两个阵营派出的 500 名野人全部被你歼灭!第三岛航向解锁,两村再也无力围剿你');
      } else if (relics.war.killed > 0 && relics.war.killed % 50 === 0) {
        showToast('⚔ 围剿野人已歼灭 ' + relics.war.killed + '/' + relics.war.max);
      }
      if (relics.war.max - relics.war.killed <= 36) spawnSavageElderSquad();
    }
    if (sv.elder) {
      for (const guard of savages) {
        if (guard.guard && !guard.dead) {
          guard.aggroT = Math.min(guard.aggroT || 0, 8);
          guard.state = 'wander';
        }
      }
      showToast('野人长老倒下,警卫队开始溃散 —— 赶紧清掉剩下的人');
    }
  }
  function spawnSavageElderSquad() {
    if (relics.war.elderSent || !walker.on) return;
    relics.war.elderSent = true;
    relics.war.mode = 'elder';
    relics.war.t = Math.max(relics.war.t || 0, 95);
    relics.war.waveT = 1e9;
    const squad = savages.filter(sv => !sv.dead).slice().sort((a, b) => {
      const da = Math.hypot((a.homeX || NEW_ISLAND.x) - a.x, (a.homeZ || NEW_ISLAND.z) - a.z);
      const db = Math.hypot((b.homeX || NEW_ISLAND.x) - b.x, (b.homeZ || NEW_ISLAND.z) - b.z);
      return da - db;
    }).slice(0, 11);
    for (let i = 0; i < squad.length; i++) {
      const sv = squad[i];
      const elder = i === 0;
      const h = Math.max(1, newIslandHeightAt(sv.x, sv.z));
      sv.dir = Math.atan2(walker.x - sv.x, walker.z - sv.z);
      sv.fallK = 0; sv.respawnT = elder ? 999 : 180;
      sv.warUnit = true; sv.warActive = true; sv.warCounted = false;
      sv.elder = elder; sv.guard = !elder;
      sv.job = elder ? 'elder' : (i % 3 === 0 ? 'shield' : i % 3 === 1 ? 'spearman' : 'poisoner');
      sv.jobName = elder ? '野人长老' : '长老警卫';
      sv.maxHp = elder ? 200 : 100;
      sv.hp = sv.maxHp;
      sv.hitCd = elder ? 1.5 : 0.8;
      sv.aggroT = elder ? 240 : 120;
      sv.mesh.visible = true;
      sv.mesh.scale.setScalar(elder ? 1.45 : 1.16);
      applySavageRankVisual(sv.mesh, elder);
      sv.mesh.rotation.x = 0;
      sv.mesh.position.set(sv.x, h, sv.z);
    }
    showToast('⚠ 野人长老亲自出动!他带着 10 名警卫锁定了炮台,毒矛能打到高处的你 —— 速战速决!');
  }
  function trustByMercy(faction) {
    const isStone = faction === 'stone';
    if (relics.tribeAlly && relics.tribeAlly !== faction) {
      showToast((isStone ? '石牙' : '雾叶') + '祭坛沉默不语 —— 你已经选择了另一方');
      return true;
    }
    walker.hp = Math.min(PLAYER_HP_MAX, walker.hp + 70);
    walker.hunger = Math.min(100, walker.hunger + 18);
    walker.thirst = Math.min(100, walker.thirst + 18);
    relics.war.mode = 'none';
    relics.war.t = 0;
    if (isStone) relics.stoneMercy++; else relics.mistMercy++;
    const n = isStone ? relics.stoneMercy : relics.mistMercy;
    startHandAction('shake');
    if (n >= 5) {
      if (isStone) allyStoneVillage(); else allyMistVillage();
      relics.war.next = 1e9;
      showToast((isStone ? '🪨' : '🌫') + ' 彻底信任达成:你第 5 次来到祭坛接受治疗,'
        + (isStone ? '石牙村' : '雾叶村') + '承认你不是入侵者,两村不再联合围攻你');
    } else {
      showToast((isStone ? '🪨 石牙' : '🌫 雾叶') + '祭坛治疗了你(信任 ' + n + '/5)');
    }
    return true;
  }

  // 毒性生态:雨林毒蛇/毒蛙,不主动远追,但靠太近会中毒
  const toxicAnimals = [];
  {
    const snakeMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.12, 0.34, 0.14)); return m; })();
    const frogMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.08, 0.55, 0.32)); return m; })();
    const snakeGeo = new THREE.CapsuleGeometry(0.08, 1.2, 4, 8);
    snakeGeo.rotateZ(Math.PI / 2);
    const frogGeo = new THREE.SphereGeometry(0.18, 10, 8);
    for (let i = 0; i < 18; i++) {
      const wet = i >= 10;
      for (let tries = 0; tries < 300; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = NEW_ISLAND.R * (wet ? 0.25 + Math.random() * 0.55 : 0.35 + Math.random() * 0.45);
        const x = NEW_ISLAND.x + Math.cos(a) * r, z = NEW_ISLAND.z + Math.sin(a) * r;
        const h = newIslandHeightAt(x, z);
        if (h < (wet ? 1.0 : 3.5) || h > 22) continue;
        const mesh = new THREE.Mesh(wet ? frogGeo : snakeGeo, wet ? frogMat : snakeMat);
        mesh.position.set(x, h + (wet ? 0.14 : 0.08), z);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        scene.add(mesh);
        toxicAnimals.push({ kind: wet ? 'frog' : 'snake', mesh, x, z, dir: mesh.rotation.y, t: Math.random() * 3, biteCd: 0 });
        break;
      }
    }
  }

  // 棕榈林:实例化,长在缓坡草带;每棵结 1~3 只椰子
  const palmGeo = createPalmGeometry();
  const palmMat = new THREE.MeshBasicNodeMaterial();
  palmMat.side = THREE.DoubleSide;
  palmMat.colorNode = palmColor();
  palmMat.positionNode = palmSway();
  const palms = new THREE.InstancedMesh(palmGeo, palmMat, palmData.length);
  palms.frustumCulled = false;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3();
    palmData.forEach((pd, i) => {
      const sc = 0.8 + Math.random() * 0.5;
      e.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(pd.x, pd.y - 0.15, pd.z), q, sv.set(sc, sc, sc));
      palms.setMatrixAt(i, m);
      pd.sc = sc; pd.rotY = e.y; pd.tiltZ = e.z;          // 砍柴倒伏要用
      pd.hp = 3; pd.fallK = 0; pd.gone = false; pd.wood = 3;
    });
  }
  scene.add(palms);

  // 阔叶树林:内陆高处,与棕榈同一着色/风摆约定
  const canopyGeo = createCanopyTreeGeometry();
  const canopies = new THREE.InstancedMesh(canopyGeo, palmMat, canopyData.length);
  canopies.frustumCulled = false;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3();
    canopyData.forEach((cd, i) => {
      const sc = 0.85 + Math.random() * 0.6;
      e.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.08);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(cd.x, cd.y - 0.1, cd.z), q, sv.set(sc, sc, sc));
      canopies.setMatrixAt(i, m);
      cd.sc = sc; cd.rotY = e.y; cd.tiltZ = e.z;
      cd.hp = 3; cd.fallK = 0; cd.gone = false; cd.wood = 5;
    });
  }
  scene.add(canopies);

  // 第二岛雨林额外树种:板根巨树 / 榕树气根 / 桫椤蕨树,只作为热带雨林层次补强。
  function addJungleTreeInstances(kind, geo, yOffset, scaleMin, scaleMax) {
    const items = jungleTreeData.filter(t => t.kind === kind);
    const mesh = new THREE.InstancedMesh(geo, palmMat, items.length);
    mesh.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3();
    items.forEach((td, i) => {
      const sc = scaleMin + Math.random() * (scaleMax - scaleMin);
      e.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.06);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(td.x, td.y + yOffset, td.z), q, sv.set(sc, sc, sc));
      mesh.setMatrixAt(i, m);
    });
    scene.add(mesh);
    return mesh;
  }
  addJungleTreeInstances('buttress', createButtressTreeGeometry(), -0.08, 0.88, 1.35);
  addJungleTreeInstances('banyan', createBanyanTreeGeometry(), -0.06, 0.80, 1.22);
  addJungleTreeInstances('fern', createTreeFernGeometry(), -0.04, 0.72, 1.18);

  // 岸边礁石:与地形同一套着色,天然融入(aAO 填 1,与地形属性布局一致)
  const rockGeoAO = new THREE.IcosahedronGeometry(1, 1);
  rockGeoAO.setAttribute('aAO', new THREE.BufferAttribute(
    new Float32Array(rockGeoAO.attributes.position.count).fill(1), 1));
  const rocks = new THREE.InstancedMesh(rockGeoAO, islMat, 80);
  rocks.frustumCulled = false;
  const rockData = [];                       // 斧头可凿:每块礁石 45s 出 4 石块
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3();
    let placed = 0, guard = 0;
    while (placed < 80 && guard++ < 6000) {
      const isle = placed % 2 === 0 ? ISLAND : NEW_ISLAND;
      const heightAt = isle === ISLAND ? islandHeightAt : newIslandHeightAt;
      const a = Math.random() * Math.PI * 2;
      const r = isle.R * (0.55 + Math.random() * 0.45);
      const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h < -2.0 || h > 4.0) continue;
      e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, h, z), q,
        sv.set(0.7 + Math.random() * 1.6, 0.5 + Math.random() * 0.9, 0.7 + Math.random() * 1.6));
      rocks.setMatrixAt(placed, m);
      rockData.push({ x, z, cd: 0 });
      placed++;
    }
    rocks.count = placed;
  }
  scene.add(rocks);

  // 篝火点:朝来路一侧的沙滩;石圈 + 火焰/烟雾粒子
  let fireSpot = { x: ISLAND.x, z: ISLAND.z, y: 0 };
  {
    const dirHome = Math.atan2(-ISLAND.z, -ISLAND.x);
    for (let r = ISLAND.R; r > 10; r -= 2) {
      const x = ISLAND.x + Math.cos(dirHome) * r, z = ISLAND.z + Math.sin(dirHome) * r;
      const h = islandHeightAt(x, z);
      if (h > 1.1) { fireSpot = { x, z, y: h }; break; }
    }
  }
  const fire = { x: fireSpot.x, z: fireSpot.z, y: fireSpot.y, fuel: 0 };
  {
    const stoneMat = new THREE.MeshBasicNodeMaterial();
    stoneMat.colorNode = marineSkin(vec3(0.25, 0.24, 0.23));
    const stoneGeo = new THREE.BoxGeometry(0.22, 0.16, 0.18);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = new THREE.Mesh(stoneGeo, stoneMat);
      st.position.set(fire.x + Math.cos(a) * 0.55, fire.y + 0.06, fire.z + Math.sin(a) * 0.55);
      st.rotation.y = a;
      scene.add(st);
    }
  }
  const mkFirePoints = (count, size, spread) => {
    const pos = new Float32Array(count * 3), seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const m = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
    m.sizeNode = float(size);
    return { g, m };
  };
  // 火焰:底部聚拢上升、顶端飘散,黄→红渐变,高亮喂 Bloom
  const flamePts = mkFirePoints(90, 0.30, 0.38);
  flamePts.m.positionNode = Fn(() => {
    const sd = attribute('aSeed');
    const t01 = fract(uTime.mul(sd.mul(0.5).add(0.45)).add(sd.mul(7.0)));
    const pinch = t01.oneMinus().mul(0.75).add(0.25);
    return vec3(
      positionLocal.x.mul(pinch).add(sin(uTime.mul(2.8).add(sd.mul(40.0))).mul(0.09).mul(t01)),
      t01.mul(1.6),
      positionLocal.z.mul(pinch).add(cos(uTime.mul(2.3).add(sd.mul(31.0))).mul(0.09).mul(t01))
    );
  })();
  flamePts.m.colorNode = Fn(() => {
    const sd = attribute('aSeed');
    const t01 = fract(uTime.mul(sd.mul(0.5).add(0.45)).add(sd.mul(7.0)));
    return mix(vec3(1.0, 0.82, 0.30), vec3(0.85, 0.22, 0.04), t01).mul(2.2);
  })();
  flamePts.m.opacityNode = Fn(() => {
    const sd = attribute('aSeed');
    const t01 = fract(uTime.mul(sd.mul(0.5).add(0.45)).add(sd.mul(7.0)));
    return uCampfire.z.mul(t01.oneMinus().mul(0.85).add(0.10));
  })();
  const flame = new THREE.Points(flamePts.g, flamePts.m);
  flame.position.set(fire.x, fire.y + 0.12, fire.z);
  flame.frustumCulled = false;
  flame.visible = false;
  scene.add(flame);
  // 烟:缓慢升起的灰幕
  const smokePts = mkFirePoints(40, 0.65, 0.30);
  smokePts.m.positionNode = Fn(() => {
    const sd = attribute('aSeed');
    const t01 = fract(uTime.mul(sd.mul(0.2).add(0.14)).add(sd.mul(5.0)));
    return vec3(
      positionLocal.x.add(uTime.mul(0.3).mod(3.0).mul(t01)).add(sin(sd.mul(50.0)).mul(t01.mul(1.2))),
      t01.mul(4.5).add(1.2),
      positionLocal.z.add(cos(sd.mul(43.0)).mul(t01.mul(1.2)))
    );
  })();
  smokePts.m.colorNode = vec3(0.22, 0.22, 0.24);
  smokePts.m.opacityNode = Fn(() => {
    const sd = attribute('aSeed');
    const t01 = fract(uTime.mul(sd.mul(0.2).add(0.14)).add(sd.mul(5.0)));
    return uCampfire.z.mul(0.20).mul(t01.oneMinus());
  })();
  const smoke = new THREE.Points(smokePts.g, smokePts.m);
  smoke.position.set(fire.x, fire.y, fire.z);
  smoke.frustumCulled = false;
  smoke.visible = false;
  scene.add(smoke);

  // 沙滩漂木:可拾取的燃料
  const driftwoods = [];
  {
    const dwMat = new THREE.MeshBasicNodeMaterial();
    dwMat.colorNode = marineSkin(vec3(0.42, 0.33, 0.22));
    const dwGeo = new THREE.BoxGeometry(1.4, 0.09, 0.12);
    let placed = 0, guard = 0;
    while (placed < 6 && guard++ < 1500) {
      const a = Math.random() * Math.PI * 2;
      const r = ISLAND.R * (0.6 + Math.random() * 0.35);
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 0.25 || h > 1.6) continue;
      const mesh = new THREE.Mesh(dwGeo, dwMat);
      mesh.position.set(x, h + 0.05, z);
      mesh.rotation.y = Math.random() * Math.PI;
      scene.add(mesh);
      driftwoods.push({ mesh, x, z, taken: false, respawnT: 0 });
      placed++;
    }
  }

  // 海滩绳子:建房与后续升级材料,比漂木更多,主要散在两座岛的潮线附近
  const ropes = [];
  {
    const ropeMat = new THREE.MeshBasicNodeMaterial();
    ropeMat.colorNode = marineSkin(vec3(0.54, 0.42, 0.25));
    const ropeGeo = new THREE.TorusGeometry(0.26, 0.035, 6, 18);
    ropeGeo.rotateX(Math.PI / 2);
    function scatterRopes(isle, heightFn, count) {
      let placed = 0, guard = 0;
      while (placed < count && guard++ < 4000) {
        const a = Math.random() * Math.PI * 2;
        const r = isle.R * (0.70 + Math.random() * 0.27);
        const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
        const h = heightFn(x, z);
        if (h < 0.15 || h > 2.1) continue;
        const mesh = new THREE.Mesh(ropeGeo, ropeMat);
        mesh.position.set(x, h + 0.075, z);
        mesh.rotation.y = Math.random() * Math.PI;
        scene.add(mesh);
        ropes.push({ mesh, x, z, taken: false, respawnT: 0 });
        placed++;
      }
    }
    scatterRopes(ISLAND, islandHeightAt, 12);
    scatterRopes(NEW_ISLAND, newIslandHeightAt, 18);
  }

  // 房基:按 X 用斧子施工,先交材料,再累计敲击;后续可继续升级
  const buildSites = [];
  const HOUSE_COSTS = [
    { timber: 50, rope: 10, hits: 10, name: '小木屋' },
    { timber: 30, rope: 6, hits: 8, name: '加固木屋' },
    { timber: 45, rope: 8, hits: 10, name: '雨林据点' },
  ];
  {
    const postMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.38, 0.25, 0.12)); return m; })();
    const wallMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.58, 0.42, 0.22)); return m; })();
    const roofMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.24, 0.18, 0.10)); return m; })();
    function addHouseSite(label, x, z, heightFn) {
      const y = heightFn(x, z);
      const group = new THREE.Group();
      group.position.set(x, y, z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 3.3), wallMat);
      base.position.y = 0.08;
      group.add(base);
      const parts = { base, posts: [], walls: [], roof: null, loft: null };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 2.0, 6), postMat);
        p.position.set(sx * 1.8, 1.0, sz * 1.35);
        group.add(p);
        parts.posts.push(p);
      }
      for (const [wx, wz, sx, sz] of [[0, -1.45, 4.1, 0.18], [0, 1.45, 4.1, 0.18], [-2.05, 0, 0.18, 2.6], [2.05, 0, 0.18, 2.6]]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 1.45, sz), wallMat);
        w.position.set(wx, 0.98, wz);
        group.add(w);
        parts.walls.push(w);
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.35, 4), roofMat);
      roof.position.y = 2.45;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      parts.roof = roof;
      const loft = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 4.0), postMat);
      loft.position.y = 3.05;
      group.add(loft);
      parts.loft = loft;
      scene.add(group);
      const site = { label, x, z, y, heightFn, stage: 0, paid: false, hits: 0, useCd: 0, mesh: group, parts };
      buildSites.push(site);
      updateBuildSiteMesh(site);
    }
    function offsetFrom(cx, cz, ox, oz, heightFn) {
      return { x: cx + ox, z: cz + oz, y: heightFn(cx + ox, cz + oz) };
    }
    const oldSpot = offsetFrom(fire.x, fire.z, 8, -5, islandHeightAt);
    addHouseSite('旧岛房基', oldSpot.x, oldSpot.z, islandHeightAt);
    const newBase = relicSpots.camp || { x: NEW_ISLAND.x + 58, z: NEW_ISLAND.z - 36 };
    const newSpot = offsetFrom(newBase.x, newBase.z, -9, 7, newIslandHeightAt);
    addHouseSite('雨林房基', newSpot.x, newSpot.z, newIslandHeightAt);
  }

  // 求生者角色:胶囊人 + 四肢摆动 + 贴地阴影
  const avatar = new THREE.Group();
  const avatarMat = (c) => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(c); return m; };
  {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), avatarMat(vec3(0.20, 0.32, 0.38)));
    torso.position.y = 1.02;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), avatarMat(vec3(0.72, 0.54, 0.42)));
    head.position.y = 1.55;
    avatar.add(torso, head);
  }
  const mkLimbs = (x, y, r, len, c) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), avatarMat(c));
    limb.position.y = -len / 2 - r;
    g.add(limb);
    avatar.add(g);
    return g;
  };
  const armL = mkLimbs(-0.24, 1.32, 0.05, 0.40, vec3(0.20, 0.32, 0.38));
  const armR = mkLimbs(0.24, 1.32, 0.05, 0.40, vec3(0.20, 0.32, 0.38));
  const legL = mkLimbs(-0.10, 0.82, 0.065, 0.48, vec3(0.16, 0.20, 0.26));
  const legR = mkLimbs(0.10, 0.82, 0.065, 0.48, vec3(0.16, 0.20, 0.26));
  {
    const blobMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    blobMat.colorNode = vec3(0.0, 0.0, 0.0);
    blobMat.opacityNode = float(0.32);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), blobMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.04;
    avatar.add(blob);
  }
  avatar.visible = false;
  scene.add(avatar);

  // ---- 第一人称双手(挂在相机上):呼吸浮动 + 走路摆动 + 动作动画 ----
  scene.add(camera);
  const handsGroup = new THREE.Group();
  handsGroup.position.set(0, -0.30, -0.70);   // FOV 55° 下半视界 27.5°:必须在视锥内
  camera.add(handsGroup);
  const handMat = new THREE.MeshBasicNodeMaterial();
  handMat.side = THREE.DoubleSide;      // 左手为镜像几何,绕序翻转需双面渲染
  handMat.colorNode = handSkin();
  // 手指朝前(-Z)、掌心向下:先绕 Y 转 π 再略下压;拇指侧互换几何保持朝内
  const handL = new THREE.Mesh(createHandGeometry(1), handMat);
  const handR = new THREE.Mesh(createHandGeometry(-1), handMat);
  handL.rotation.order = handR.rotation.order = 'YXZ';
  handL.rotation.y = handR.rotation.y = Math.PI;
  handL.rotation.x = handR.rotation.x = -0.25;
  handL.position.set(-0.19, 0, 0);
  handR.position.set(0.19, 0, 0);
  handsGroup.add(handL, handR);
  // 左手持弓(竖直,弦朝自己)+ 搭箭(有箭时可见)
  const bowProp = new THREE.Mesh(
    createBowGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.24, 0.15, 0.08)); return m; })()
  );
  bowProp.position.set(-0.23, 0.10, -0.06);
  bowProp.rotation.z = 0.10;
  handsGroup.add(bowProp);
  const arrowGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5);
  arrowGeo.rotateX(Math.PI / 2);          // 箭杆朝 +Z
  const arrowMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.45, 0.35, 0.20)); return m; })();
  const nockedArrow = new THREE.Mesh(arrowGeo, arrowMat);
  nockedArrow.position.set(-0.20, 0.10, -0.16);
  handsGroup.add(nockedArrow);
  // 右手持斧(常驻;钓鱼时换成鱼竿)
  const axeProp = new THREE.Mesh(
    createAxeGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.38, 0.26, 0.14)); return m; })()
  );
  axeProp.position.set(0.235, 0.10, -0.05);
  axeProp.rotation.set(-0.5, 0, -0.12);
  handsGroup.add(axeProp);
  const rodProp = new THREE.Mesh(
    createFishingRodGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.20, 0.10)); return m; })()
  );
  rodProp.position.set(0.22, 0.02, -0.04);
  rodProp.rotation.set(-0.95, 0, -0.10);   // 斜向前上方
  rodProp.visible = false;
  handsGroup.add(rodProp);
  // 老兵步枪(找到后手持;枪口闪光在射击瞬间亮起)
  const rifleProp = new THREE.Mesh(
    createRifleGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.20, 0.11)); return m; })()
  );
  rifleProp.position.set(0.07, 0.04, -0.18);
  rifleProp.rotation.set(-0.04, 0.06, 0);
  rifleProp.visible = false;
  handsGroup.add(rifleProp);
  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(1.6, 1.1, 0.4)); return m; })()
  );
  muzzleFlash.position.set(0, 0.03, 0.85);   // 枪口
  muzzleFlash.visible = false;
  rifleProp.add(muzzleFlash);
  // 卡莫星狙击枪(箱底夹层;更长枪管带瞄准镜)
  const sniperProp = new THREE.Mesh(
    createSniperGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.22, 0.20, 0.16)); return m; })()
  );
  sniperProp.position.set(0.07, 0.04, -0.18);
  sniperProp.rotation.set(-0.04, 0.06, 0);
  sniperProp.visible = false;
  handsGroup.add(sniperProp);
  const sniperFlash = new THREE.Mesh(muzzleFlash.geometry, muzzleFlash.material);
  sniperFlash.position.set(0, 0.028, 1.06);
  sniperFlash.visible = false;
  sniperProp.add(sniperFlash);
  // 波波沙冲锋枪(军火库;圆弹鼓)
  const smgProp = new THREE.Mesh(
    createSMGGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.28, 0.19, 0.10)); return m; })()
  );
  smgProp.position.set(0.07, 0.04, -0.14);
  smgProp.rotation.set(-0.04, 0.06, 0);
  smgProp.visible = false;
  handsGroup.add(smgProp);
  const smgFlash = new THREE.Mesh(muzzleFlash.geometry, muzzleFlash.material);
  smgFlash.position.set(0, 0.025, 0.62);
  smgFlash.visible = false;
  smgProp.add(smgFlash);
  const spearProp = new THREE.Mesh(
    createSpearGeometry(),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.37, 0.26, 0.13)); return m; })()
  );
  spearProp.position.set(0.12, 0.03, -0.18);
  spearProp.rotation.set(-0.18, 0.04, -0.06);
  spearProp.visible = false;
  handsGroup.add(spearProp);
  const catapultMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.20, 0.10)); return m; })();
  const catapultGeo = createCatapultGeometry();
  const placedCatapults = [];
  const catapultEffects = [];
  // 手上的椰子道具(有存货时左手捧着)
  const coconutProp = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 10, 8),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.20, 0.10)); return m; })()
  );
  coconutProp.position.set(0, -0.035, 0.06);
  handL.add(coconutProp);
  handsGroup.visible = false;
  const hands = { action: null, t: 0 };

  function startHandAction(name) {
    hands.action = name;
    hands.t = 0;
  }

  function updateHands(t, dt) {
    if (!handsGroup.visible) return;
    const moving = walker.on && (driveKeys.throttle || driveKeys.brake || driveKeys.left || driveKeys.right);
    // 基础位:呼吸 + 步伐摆动
    let bobY = Math.sin(t * 1.6) * 0.008;
    let swayX = 0;
    if (moving) {
      bobY += Math.sin(walker.phase * 2) * 0.022;
      swayX = Math.sin(walker.phase) * 0.012;
    }
    // 动作包络:sin(π·p) 出去再回来
    const DUR = { shake: 1.1, pickup: 0.7, eat: 1.5, fire: 0.9, shoot: 0.35, chop: 0.55, dig: 0.72, drink: 1.2 };
    let lift = 0, reach = 0, curl = 0, jitter = 0, gather = 0;
    if (hands.action) {
      hands.t += dt;
      const p = Math.min(1, hands.t / DUR[hands.action]);
      const e = Math.sin(p * Math.PI);
      if (hands.action === 'shake') { lift = 0.17 * e; reach = 0.20 * e; curl = 0.5 * e; jitter = Math.sin(hands.t * 22) * 0.025 * e; }
      if (hands.action === 'pickup') { lift = -0.13 * e; reach = 0.16 * e; curl = 0.3 * e; }
      if (hands.action === 'eat') { lift = 0.12 * e; reach = 0.12 * e; gather = 0.55 * e; }
      if (hands.action === 'fire') { lift = -0.08 * e; reach = 0.20 * e; }
      if (hands.action === 'shoot') { lift = 0.03 * e; reach = -0.13 * e; curl = 0.35 * e; }
      if (hands.action === 'chop') { lift = 0.16 * e; reach = 0.26 * e; curl = 0.8 * e; }
      if (hands.action === 'dig') { lift = 0.22 * e - 0.08; reach = 0.33 * e; curl = 0.9 * e; jitter = Math.sin(hands.t * 35) * 0.018 * e; }
      if (hands.action === 'drink') { lift = 0.16 * e; reach = 0.10 * e; gather = 0.7 * e; curl = 0.6 * e; }
      if (p >= 1) hands.action = null;
    }
    handsGroup.position.set(swayX, -0.30 + bobY + lift * 0.6, -0.70 - reach + jitter);
    handsGroup.rotation.x = -curl * 0.5;
    // 吃椰子时双手向中间合拢
    handL.position.x = -0.19 + gather * 0.10;
    handR.position.x = 0.19 - gather * 0.10;
    coconutProp.visible = walker.coconut > 0;
    // 钓鱼时右手换鱼竿;持枪/野人武器时收起弓与箭
    const rifleOut = walker.rifle && walker.weapon === 'rifle' && !fishing.active;
    const sniperOut = walker.sniper && walker.weapon === 'sniper' && !fishing.active;
    const smgOut = walker.smg && walker.weapon === 'smg' && !fishing.active;
    const spearOut = walker.spear && walker.weapon === 'spear' && !fishing.active;
    rodProp.visible = fishing.active;
    axeProp.visible = (!fishing.active && !spearOut) || hands.action === 'dig';
    rifleProp.visible = rifleOut;
    sniperProp.visible = sniperOut;
    smgProp.visible = smgOut;
    spearProp.visible = spearOut;
    bowProp.visible = !fishing.active && !rifleOut && !sniperOut && !smgOut && !spearOut;
    nockedArrow.visible = walker.arrows > 0 && !fishing.active && !rifleOut && !sniperOut && !smgOut && !spearOut;
    muzzleFlash.visible = rifleOut && hands.action === 'shoot' && hands.t < 0.09;
    sniperFlash.visible = sniperOut && hands.action === 'shoot' && hands.t < 0.09;
    smgFlash.visible = smgOut && hands.action === 'shoot' && hands.t < 0.09;
  }

  // ---- 岛上野生动物:沙滩蟹 / 岩蜥 / 白鹭 ----
  const animals = [];
  {
    const mkMat = (c) => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(c); return m; };
    // 沙滩蟹:沙滩带游荡,受惊横向疾逃
    const crabGeo = createCrabGeometry();
    const crabMat = mkMat(vec3(0.45, 0.22, 0.12));
    let guard = 0, placed = 0;
    while (placed < 10 && guard++ < 2000) {
      const a = Math.random() * Math.PI * 2, r = ISLAND.R * (0.55 + Math.random() * 0.4);
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 0.2 || h > 1.4) continue;
      const mesh = new THREE.Mesh(crabGeo, crabMat);
      scene.add(mesh);
      animals.push({ kind: 'crab', mesh, x, z, dir: Math.random() * Math.PI * 2, state: 'idle', t: Math.random() * 2, speed: 0 });
      placed++;
    }
    // 岩蜥:草地/岩石上晒太阳,受惊窜逃后僵住
    const lizGeo = createLizardGeometry();
    const lizMat = mkMat(vec3(0.35, 0.38, 0.22));
    guard = 0; placed = 0;
    while (placed < 6 && guard++ < 2000) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * ISLAND.R * 0.7;
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 1.5 || h > 9) continue;
      const mesh = new THREE.Mesh(lizGeo, lizMat);
      scene.add(mesh);
      animals.push({ kind: 'lizard', mesh, x, z, dir: Math.random() * Math.PI * 2, state: 'bask', t: Math.random() * 3, speed: 0 });
      placed++;
    }
    // 白鹭:水线站立,受惊振翅飞往另一处水线
    const egretGeo = createEgretGeometry();
    const egretMat = mkMat(vec3(0.90, 0.90, 0.88));
    const wingGeo = new THREE.BoxGeometry(0.26, 0.012, 0.14);
    wingGeo.translate(0.13, 0, 0);   // 翼根 pivot
    guard = 0; placed = 0;
    while (placed < 5 && guard++ < 2500) {
      const a = Math.random() * Math.PI * 2, r = ISLAND.R * (0.62 + Math.random() * 0.35);
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < -0.3 || h > 0.5) continue;
      const mesh = new THREE.Mesh(egretGeo, egretMat);
      const wingL = new THREE.Mesh(wingGeo, egretMat);
      wingL.position.set(0.08, 0.46, 0);       // 左翼(镜像靠 rotation.z 负值)
      const wingR = new THREE.Mesh(wingGeo, egretMat);
      wingR.position.set(-0.08, 0.46, 0);
      wingR.rotation.y = Math.PI;              // 镜像
      mesh.add(wingL, wingR);
      scene.add(mesh);
      animals.push({ kind: 'egret', mesh, wingL, wingR, x, z, dir: Math.random() * Math.PI * 2, state: 'stand', t: Math.random() * 4, fx: 0, fz: 0, flyDur: 1 });
      placed++;
    }
  }

  // ---- 猎物:鹿与野猪(头/身双碰撞区,弓箭与陷阱可捕杀) ----
  const HUNT_SPECS = {
    deer: { hp: 4, headY: 1.22, headZ: 0.50, headR: 0.22, bodyY: 0.66, bodyR: 0.52,
            meat: 2, speed: 4.6, name: '鹿' },
    boar: { hp: 6, headY: 0.47, headZ: 0.50, headR: 0.20, bodyY: 0.52, bodyR: 0.55,
            meat: 3, speed: 5.2, name: '野猪' },
  };
  const huntables = [];
  {
    const deerStagGeo = createDeerGeometry(true);    // 雄鹿带角
    const deerHindGeo = createDeerGeometry(false);   // 雌鹿无角
    const boarGeo = createBoarGeometry();
    const stagMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = deerColor(uniform(new THREE.Vector3(0.20, 0.18, 0.16))); return m; })();
    const hindMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = deerColor(uniform(new THREE.Vector3(0.50, 0.38, 0.23))); return m; })();
    const boarMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = boarColor(); return m; })();
    for (const [kind, count, zLo, zHi] of [['deer', 4, 2, 14], ['boar', 4, 1, 10]]) {
      let placed = 0, guard = 0;
      while (placed < count && guard++ < 2500) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * ISLAND.R * 0.75;
        const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
        const h = islandHeightAt(x, z);
        if (h < zLo || h > zHi) continue;
        const isStag = kind === 'deer' && placed < 2;
        const mesh = new THREE.Mesh(
          kind === 'boar' ? boarGeo : (isStag ? deerStagGeo : deerHindGeo),
          kind === 'boar' ? boarMat : (isStag ? stagMat : hindMat));
        scene.add(mesh);
        huntables.push({
          kind, spec: HUNT_SPECS[kind], mesh, x, z,
          dir: Math.random() * Math.PI * 2,
          state: 'graze', t: Math.random() * 3, speed: 0,
          hp: HUNT_SPECS[kind].hp, fallK: 0,
        });
        placed++;
      }
    }
  }

  function killHuntable(h) {
    h.state = 'dead';
    h.fallK = 0;
    h.speed = 0;
  }

  // 被箭命中:dmg —— 爆头造成半管伤害(两发致命),身体 1 点
  function hitHuntable(h, isHead) {
    h.hp -= walker.buff ? h.spec.hp : (isHead ? h.spec.hp / 2 : 1);   // 神力:箭箭致命
    if (h.hp <= 0) {
      killHuntable(h);
      showToast((isHead ? '爆头!' : '命中!') + h.spec.name + '倒下了 · 按 E 收割');
    } else {
      showToast(isHead ? '命中头部!' : '命中!');
      if (h.kind === 'boar' && walker.on) {
        h.state = 'charge'; h.t = 4;      // 野猪被激怒,冲撞!
        showToast('⚠ 野猪被激怒了,小心!');
      } else {
        h.state = 'flee'; h.t = 3 + Math.random();
      }
    }
  }

  // ---- 石块(打磨箭矢材料)/ 陷阱 / 飞行箭矢 ----
  const stones = [];
  {
    const stMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.38, 0.36, 0.33)); return m; })();
    const stGeo = new THREE.IcosahedronGeometry(0.18, 0);
    let placed = 0, guard = 0;
    while (placed < 42 && guard++ < 9000) {
      const isle = placed % 2 === 0 ? ISLAND : NEW_ISLAND;
      const heightAt = isle === ISLAND ? islandHeightAt : newIslandHeightAt;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * isle.R * 0.85;
      const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h < 0.3 || h > 8) continue;
      const mesh = new THREE.Mesh(stGeo, stMat);
      mesh.position.set(x, h + 0.11, z);
      scene.add(mesh);
      stones.push({ mesh, x, z, taken: false, respawnT: 0 });
      placed++;
    }
  }

  // 枪械制作:旧岛/第二岛都有工作台和必要材料,靠近后按 E 制作。
  const workbenches = [];
  const gunParts = [];
  const gunPartNames = { scrap: '废铁', gear: '机件', powder: '火药材料', lead: '铅块', casing: '铜壳', primer: '引火帽' };
  const makeNodeMat = (c) => {
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = marineSkin(c);
    return m;
  };
  function drySpotNear(cx, cz, isle, heightFn) {
    let best = { x: cx, z: cz, y: heightFn(cx, cz) };
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * isle.R * 0.28;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const y = heightFn(x, z);
      if (y > 1.2 && y < 32) return { x, z, y };
      if (y > best.y) best = { x, z, y };
    }
    best.y = Math.max(1.2, best.y);
    return best;
  }
  function addWorkbench(label, cx, cz, isle, heightFn) {
    const spot = drySpotNear(cx, cz, isle, heightFn);
    const group = new THREE.Group();
    const woodMat = makeNodeMat(vec3(0.34, 0.22, 0.13));
    const metalMat = makeNodeMat(vec3(0.30, 0.32, 0.34));
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.25), woodMat);
    top.position.y = 0.86;
    group.add(top);
    for (const sx of [-0.9, 0.9]) for (const sz of [-0.42, 0.42]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.82, 0.13), woodMat);
      leg.position.set(sx, 0.40, sz);
      group.add(leg);
    }
    const vice = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.28), metalMat);
    vice.position.set(-0.62, 1.02, -0.18);
    group.add(vice);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8), metalMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.32, 1.06, 0.16);
    group.add(barrel);
    group.position.set(spot.x, spot.y, spot.z);
    group.rotation.y = Math.atan2(isle.x - spot.x, isle.z - spot.z);
    scene.add(group);
    workbenches.push({ label, x: spot.x, z: spot.z, y: spot.y, mesh: group });
  }
  const oldWorkbenchSeed = drySpotNear(fire.x + 9, fire.z + 4, ISLAND, islandHeightAt);
  addWorkbench('旧岛工作台', oldWorkbenchSeed.x, oldWorkbenchSeed.z, ISLAND, islandHeightAt);
  const newWorkbenchBase = relicSpots.camp || { x: NEW_ISLAND.x + 58, z: NEW_ISLAND.z - 36 };
  addWorkbench('雨林工作台', newWorkbenchBase.x + 10, newWorkbenchBase.z - 8, NEW_ISLAND, newIslandHeightAt);
  {
    const mats = {
      scrap: { mat: makeNodeMat(vec3(0.34, 0.36, 0.36)), geo: new THREE.BoxGeometry(0.55, 0.12, 0.32), lift: 0.08 },
      gear: { mat: makeNodeMat(vec3(0.46, 0.42, 0.30)), geo: new THREE.TorusGeometry(0.18, 0.045, 8, 16), lift: 0.16 },
      powder: { mat: makeNodeMat(vec3(0.42, 0.20, 0.13)), geo: new THREE.CylinderGeometry(0.16, 0.18, 0.38, 9), lift: 0.20 },
      lead: { mat: makeNodeMat(vec3(0.28, 0.30, 0.34)), geo: new THREE.IcosahedronGeometry(0.22, 0), lift: 0.16 },
      casing: { mat: makeNodeMat(vec3(0.72, 0.48, 0.20)), geo: new THREE.CylinderGeometry(0.08, 0.08, 0.32, 10), lift: 0.18 },
      primer: { mat: makeNodeMat(vec3(0.85, 0.70, 0.36)), geo: new THREE.BoxGeometry(0.26, 0.08, 0.20), lift: 0.08 },
    };
    function scatterGunParts(isle, heightFn, counts) {
      for (const kind of Object.keys(counts)) {
        let placed = 0, guard = 0;
        while (placed < counts[kind] && guard++ < 3000) {
          const a = Math.random() * Math.PI * 2;
          const r = isle.R * (0.24 + Math.random() * 0.58);
          const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
          const y = heightFn(x, z);
          if (y < 1.0 || y > 46) continue;
          const def = mats[kind];
          const mesh = new THREE.Mesh(def.geo, def.mat);
          mesh.position.set(x, y + def.lift, z);
          mesh.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.35);
          mesh.scale.setScalar(0.9 + Math.random() * 0.55);
          scene.add(mesh);
          gunParts.push({ kind, name: gunPartNames[kind], mesh, x, z, taken: false, respawnT: 0 });
          placed++;
        }
      }
    }
    scatterGunParts(ISLAND, islandHeightAt, { scrap: 5, gear: 3, powder: 4, lead: 4, casing: 4, primer: 3 });
    scatterGunParts(NEW_ISLAND, newIslandHeightAt, { scrap: 8, gear: 5, powder: 7, lead: 7, casing: 8, primer: 5 });
  }

  // 盗墓装备材料:墓穴彩蛋触发后用得上,但材料一开始就在海滩可捡。
  const tombMaterials = [];
  const tombMaterialNames = { tombIron: '铁锭', tombLamp: '灯油罐', tombHandle: '硬木柄' };
  {
    const defs = {
      tombIron: { mat: makeNodeMat(vec3(0.46, 0.48, 0.46)), geo: new THREE.BoxGeometry(0.62, 0.18, 0.32), lift: 0.10 },
      tombLamp: { mat: makeNodeMat(vec3(0.78, 0.60, 0.25)), geo: new THREE.CylinderGeometry(0.15, 0.18, 0.34, 10), lift: 0.18 },
      tombHandle: { mat: makeNodeMat(vec3(0.36, 0.22, 0.12)), geo: new THREE.CylinderGeometry(0.055, 0.07, 0.82, 8), lift: 0.12 },
    };
    function scatterTombMaterials(isle, heightFn, counts) {
      for (const kind of Object.keys(counts)) {
        let placed = 0, guard = 0;
        while (placed < counts[kind] && guard++ < 3600) {
          const a = Math.random() * Math.PI * 2;
          const r = isle.R * (0.70 + Math.random() * 0.23);
          const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
          const y = heightFn(x, z);
          if (y < 0.25 || y > 3.2) continue;
          const def = defs[kind];
          const mesh = new THREE.Mesh(def.geo, def.mat);
          mesh.position.set(x, y + def.lift, z);
          mesh.rotation.set(Math.random() * 0.35, Math.random() * Math.PI, Math.random() * 0.35);
          scene.add(mesh);
          tombMaterials.push({ kind, name: tombMaterialNames[kind], mesh, x, z, taken: false });
          placed++;
        }
      }
    }
    scatterTombMaterials(ISLAND, islandHeightAt, { tombIron: 4, tombLamp: 2, tombHandle: 2 });
    scatterTombMaterials(NEW_ISLAND, newIslandHeightAt, { tombIron: 5, tombLamp: 3, tombHandle: 3 });
  }

  // 趣味物件:贝壳号角/回声鼓/夜光蘑菇/漂流瓶/萤火灯/潮汐石/远岛古遗迹,都是可见可互动的小事件。
  const curios = [];
  {
    const shellMat = makeNodeMat(vec3(0.92, 0.76, 0.58));
    const drumMat = makeNodeMat(vec3(0.32, 0.18, 0.10));
    const glowMat = makeNodeMat(vec3(0.18, 1.15, 0.72));
    const bottleMat = makeNodeMat(vec3(0.45, 0.86, 0.78));
    const corkMat = makeNodeMat(vec3(0.45, 0.27, 0.12));
    const tideMat = makeNodeMat(vec3(0.22, 0.38, 0.48));
    const pearlMat = makeNodeMat(vec3(1.08, 0.96, 0.82));
    const tearMat = makeNodeMat(vec3(0.14, 0.70, 1.18));
    const pyramidMat = makeNodeMat(vec3(0.52, 0.47, 0.36));
    const goldMat = makeNodeMat(vec3(1.05, 0.76, 0.24));
    const obsidianMat = makeNodeMat(vec3(0.055, 0.045, 0.075));
    const boneMat = makeNodeMat(vec3(0.86, 0.82, 0.68));
    const ropeTieMat = makeNodeMat(vec3(0.54, 0.42, 0.25));
    const charMat = makeNodeMat(vec3(0.055, 0.045, 0.035));
    const leafMat = makeNodeMat(vec3(0.10, 0.42, 0.18));
    const shadowMat = (() => { const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false }); m.colorNode = vec3(0.0, 0.0, 0.0); m.opacity = 0.26; return m; })();
    function addCurio(kind, label, x, z, y, mesh) {
      mesh.position.set(x, y, z);
      if (kind === 'mushroom' || kind === 'firefly') mesh.visible = false;
      scene.add(mesh);
      curios.push({ kind, label, x, z, y, mesh, taken: false, respawnT: 0, cd: 0, baseY: y, score: 0, hitT: 0, challengeT: 0 });
    }
    function shoreSpot(isle, heightFn) {
      for (let tries = 0; tries < 200; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = isle.R * (0.75 + Math.random() * 0.25);
        const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
        const y = heightFn(x, z);
        if (y > 0.15 && y < 2.4) return { x, z, y };
      }
      return drySpotNear(isle.x, isle.z, isle, heightFn);
    }
    function jungleSpot(isle, heightFn) {
      for (let tries = 0; tries < 260; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = isle.R * (0.28 + Math.random() * 0.48);
        const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
        const y = heightFn(x, z);
        if (y > 2.0 && y < 24) return { x, z, y };
      }
      return drySpotNear(isle.x, isle.z, isle, heightFn);
    }
    function addContactShadow(g, r = 0.55) {
      const sh = new THREE.Mesh(new THREE.CircleGeometry(r, 24), shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.012;
      g.add(sh);
      return sh;
    }
    function makeShell() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.56, 9), shellMat);
      body.rotation.set(0, 0, Math.PI / 2);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 18), shellMat);
      lip.position.x = -0.27;
      lip.rotation.y = Math.PI / 2;
      g.add(body, lip);
      return g;
    }
    function makeDrum() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.54, 10), drumMat);
      body.position.y = 0.27;
      const hide = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 10), shellMat);
      hide.position.y = 0.56;
      g.add(body, hide);
      return g;
    }
    function makeMushroom() {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.28, 8), shellMat);
      stem.position.y = 0.14;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), glowMat);
      cap.scale.y = 0.42;
      cap.position.y = 0.31;
      g.add(stem, cap);
      return g;
    }
    function makeBottle() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.55, 10), bottleMat);
      body.rotation.z = Math.PI / 2;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.24, 8), bottleMat);
      neck.rotation.z = Math.PI / 2;
      neck.position.x = 0.34;
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8), corkMat);
      cork.rotation.z = Math.PI / 2;
      cork.position.x = 0.49;
      g.add(body, neck, cork);
      return g;
    }
    function makeFireflyLantern() {
      const g = new THREE.Group();
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), bottleMat);
      jar.scale.y = 1.25;
      jar.position.y = 0.35;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), corkMat);
      cap.position.y = 0.66;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glowMat);
      glow.position.y = 0.36;
      g.add(jar, cap, glow);
      return g;
    }
    function makeSurvivalCairn() {
      const g = new THREE.Group();
      addContactShadow(g, 0.55);
      for (let i = 0; i < 6; i++) {
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.30 - i * 0.025, 0.12, 0.22 - i * 0.018), tideMat);
        rock.position.set((Math.random() - 0.5) * 0.12, 0.06 + i * 0.105, (Math.random() - 0.5) * 0.10);
        rock.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
        g.add(rock);
      }
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.11), shellMat);
      flag.position.set(0.16, 0.76, 0);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.008, 5, 14), ropeTieMat);
      lash.position.set(0.02, 0.66, 0);
      lash.rotation.set(Math.PI / 2, 0.2, 0);
      g.add(flag, lash);
      return g;
    }
    function makeFishboneVane() {
      const g = new THREE.Group();
      addContactShadow(g, 0.42);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.95, 8), corkMat);
      pole.position.y = 0.48;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.035, 0.035), boneMat);
      spine.position.y = 0.92;
      for (let i = 0; i < 5; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.025), boneMat);
        rib.position.set(-0.18 + i * 0.10, 0.92, 0.075);
        rib.rotation.y = 0.62;
        g.add(rib);
        const rib2 = rib.clone();
        rib2.position.z = -0.075;
        rib2.rotation.y = -0.62;
        g.add(rib2);
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 3), boneMat);
      tail.position.set(-0.43, 0.92, 0);
      tail.rotation.z = Math.PI / 2;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), obsidianMat);
      eye.position.set(0.40, 0.925, 0.022);
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 5, 12), ropeTieMat);
      cord.position.y = 0.82;
      cord.rotation.x = Math.PI / 2;
      g.add(pole, spine, tail, eye, cord);
      return g;
    }
    function makeTidePool() {
      const g = new THREE.Group();
      addContactShadow(g, 0.62);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 24), tideMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.07;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.025, 24), bottleMat);
      water.position.y = 0.07;
      for (let i = 0; i < 5; i++) {
        const shell = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 7), shellMat);
        const a = i / 5 * Math.PI * 2;
        shell.position.set(Math.cos(a) * 0.24, 0.11, Math.sin(a) * 0.24);
        shell.rotation.set(Math.PI / 2, 0, -a);
        g.add(shell);
      }
      for (let i = 0; i < 3; i++) {
        const fish = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 5), glowMat);
        fish.scale.set(1.7, 0.35, 0.55);
        fish.position.set(-0.12 + i * 0.12, 0.105, Math.sin(i * 1.7) * 0.11);
        fish.rotation.y = i * 0.9;
        g.add(fish);
      }
      const crab = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 5), corkMat);
      crab.scale.set(1.2, 0.35, 0.8);
      crab.position.set(0.18, 0.12, -0.17);
      g.add(crab);
      g.add(rim, water);
      return g;
    }
    function makeTriClam() {
      const g = new THREE.Group();
      addContactShadow(g, 0.72);
      const lower = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10), shellMat);
      lower.scale.set(1.18, 0.18, 0.72);
      lower.position.y = 0.12;
      lower.rotation.z = -0.06;
      const upper = new THREE.Mesh(new THREE.SphereGeometry(0.40, 20, 10), shellMat);
      upper.scale.set(1.12, 0.16, 0.68);
      upper.position.set(0, 0.34, -0.10);
      upper.rotation.x = -0.58;
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 8), pearlMat);
      inner.scale.set(1.2, 0.055, 0.72);
      inner.position.set(0, 0.245, 0.03);
      for (let i = -3; i <= 3; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.60), pearlMat);
        rib.position.set(i * 0.105, 0.39 - Math.abs(i) * 0.015, -0.09);
        rib.rotation.x = -0.50;
        rib.rotation.z = i * 0.055;
        g.add(rib);
      }
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), pearlMat);
      pearl.position.set(-0.10, 0.30, 0.07);
      const tear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), tearMat);
      tear.scale.set(0.72, 1.35, 0.72);
      tear.position.set(0.12, 0.31, 0.08);
      g.add(lower, upper, inner, pearl, tear);
      return g;
    }
    function makeSignalFire() {
      const g = new THREE.Group();
      addContactShadow(g, 0.72);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.14), tideMat);
        rock.position.set(Math.cos(a) * 0.38, 0.05, Math.sin(a) * 0.38);
        rock.rotation.y = a;
        g.add(rock);
      }
      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.70, 8), i % 2 ? corkMat : charMat);
        log.position.y = 0.18;
        log.rotation.set(Math.PI / 2, i * Math.PI / 4, 0.7);
        g.add(log);
      }
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), goldMat);
      ember.position.y = 0.22;
      for (let i = 0; i < 5; i++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025 + i * 0.004, 6, 4), goldMat);
        spark.position.set(Math.sin(i * 1.8) * 0.11, 0.34 + i * 0.08, Math.cos(i * 1.3) * 0.09);
        g.add(spark);
      }
      const smoke = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 9), shadowMat);
      smoke.position.y = 0.62;
      smoke.rotation.y = 0.4;
      g.add(ember, smoke);
      return g;
    }
    function makeVineSwing() {
      const g = new THREE.Group();
      addContactShadow(g, 0.62);
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.25, 8), corkMat);
      branch.position.y = 1.05;
      branch.rotation.z = Math.PI / 2;
      const vineA = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.05, 6), ropeTieMat);
      const vineB = vineA.clone();
      vineA.position.set(-0.32, 0.52, 0);
      vineB.position.set(0.32, 0.52, 0);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.22), corkMat);
      seat.position.y = 0.08;
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 5), leafMat);
        leaf.scale.set(1.7, 0.24, 0.75);
        leaf.position.set(-0.45 + i * 0.18, 0.95 + Math.sin(i) * 0.08, (i % 2 ? 0.08 : -0.08));
        leaf.rotation.set(0.1, i * 0.7, 0.35);
        g.add(leaf);
      }
      const knotA = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.007, 5, 12), ropeTieMat);
      const knotB = knotA.clone();
      knotA.position.set(-0.32, 0.15, 0);
      knotB.position.set(0.32, 0.15, 0);
      knotA.rotation.x = knotB.rotation.x = Math.PI / 2;
      g.add(branch, vineA, vineB, seat, knotA, knotB);
      return g;
    }
    function makeCoconutTarget() {
      const g = new THREE.Group();
      addContactShadow(g, 0.50);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 8), corkMat);
      pole.position.y = 0.48;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.025, 8, 24), shellMat);
      ring.position.y = 0.92;
      ring.rotation.y = Math.PI / 2;
      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 8, 24), goldMat);
      inner.position.y = 0.92;
      inner.rotation.y = Math.PI / 2;
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 5), goldMat);
      center.position.set(0.012, 0.92, 0);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), tideMat);
      shell.scale.y = 0.78;
      shell.position.set(0.32, 0.92, 0);
      const braceA = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.66, 6), corkMat);
      const braceB = braceA.clone();
      braceA.position.set(-0.17, 0.37, 0);
      braceB.position.set(0.17, 0.37, 0);
      braceA.rotation.z = 0.36;
      braceB.rotation.z = -0.36;
      g.add(pole, ring, inner, center, shell, braceA, braceB);
      return g;
    }
    function makeTideStone() {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.70, 9), tideMat);
      rock.position.y = 0.35;
      rock.rotation.y = Math.PI / 9;
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.045, 40), tideMat);
      face.position.set(0, 0.73, 0);
      face.rotation.x = Math.PI / 2;
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 6, 42), glowMat);
      outerRing.position.y = 0.756;
      outerRing.rotation.x = Math.PI / 2;
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.008, 6, 36), glowMat);
      innerRing.position.y = 0.762;
      innerRing.rotation.x = Math.PI / 2;
      g.add(rock, face, outerRing, innerRing);
      // 古人刻下的八段月相:圆月/缺月/新月用不同压扁比例表达,围成潮汐盘。
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const moon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), shellMat);
        moon.position.set(Math.cos(a) * 0.245, 0.782, Math.sin(a) * 0.245);
        const phase = Math.abs(i - 4) / 4;
        moon.scale.set(0.55 + phase * 0.75, 0.10, 0.42);
        moon.rotation.y = -a;
        g.add(moon);
      }
      // 细密刻度:像古导航石上的潮汐历,每 6 格加一根长刻痕。
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2;
        const long = i % 6 === 0;
        const notch = new THREE.Mesh(new THREE.BoxGeometry(long ? 0.014 : 0.008, 0.011, long ? 0.058 : 0.035), shellMat);
        notch.position.set(Math.cos(a) * 0.286, 0.787, Math.sin(a) * 0.286);
        notch.rotation.y = -a;
        g.add(notch);
      }
      // 三条潮汐波纹刻线,用发光小珠串成弧线;互动时就是这些线"亮起"。
      for (let band = 0; band < 3; band++) {
        const z0 = -0.095 + band * 0.095;
        for (let i = 0; i < 11; i++) {
          const u = i / 10;
          const x = (u - 0.5) * 0.38;
          const z = z0 + Math.sin(u * Math.PI * 2 + band * 0.8) * 0.025;
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.010, 6, 4), glowMat);
          bead.position.set(x, 0.796, z);
          g.add(bead);
        }
      }
      return g;
    }
    function makeWisdomPyramid(kind) {
      const g = new THREE.Group();
      const isMirror = kind === 'mirrorPyramid';
      const baseMat = isMirror ? obsidianMat : pyramidMat;
      for (let i = 0; i < 5; i++) {
        const s = 2.2 - i * 0.33;
        const h = 0.22 + i * 0.035;
        const step = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), baseMat);
        step.position.y = 0.10 + i * 0.20;
        g.add(step);
      }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.42, 4), isMirror ? glowMat : goldMat);
      cap.position.y = 1.18;
      cap.rotation.y = Math.PI / 4;
      g.add(cap);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.72), goldMat);
        slab.position.set(Math.cos(a) * 1.15, 0.36, Math.sin(a) * 1.15);
        slab.rotation.y = -a;
        g.add(slab);
      }
      if (isMirror) {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.10, 32), tideMat);
        basin.position.y = 0.24;
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.025, 32), glowMat);
        water.position.y = 0.31;
        g.add(basin, water);
      } else {
        const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.86, 8), obsidianMat);
        needle.position.y = 0.78;
        needle.rotation.z = 0.18;
        g.add(needle);
      }
      g.scale.setScalar(1.15);
      return g;
    }
    function placeRemoteWisdom(isle, heightFn, kind, label, ox, oz) {
      const x = isle.x + ox;
      const z = isle.z + oz;
      const y = heightFn(x, z);
      addCurio(kind, label, x, z, y + 0.05, makeWisdomPyramid(kind));
    }
    for (const item of [
      { isle: ISLAND, height: islandHeightAt },
      { isle: NEW_ISLAND, height: newIslandHeightAt },
      { isle: THIRD_ISLAND, height: (x, z) => remoteIslandHeightAt(THIRD_ISLAND, x, z) },
      { isle: FOURTH_ISLAND, height: (x, z) => remoteIslandHeightAt(FOURTH_ISLAND, x, z) },
    ]) {
      const sh = shoreSpot(item.isle, item.height);
      addCurio('shell', '贝壳号角', sh.x, sh.z, sh.y + 0.18, makeShell());
      const bo = shoreSpot(item.isle, item.height);
      addCurio('bottle', '漂流瓶', bo.x, bo.z, bo.y + 0.16, makeBottle());
      const ts = shoreSpot(item.isle, item.height);
      addCurio('tide', '潮汐石', ts.x, ts.z, ts.y, makeTideStone());
      const tp = shoreSpot(item.isle, item.height);
      addCurio('tidepool', '潮池', tp.x, tp.z, tp.y + 0.02, makeTidePool());
      const fv = shoreSpot(item.isle, item.height);
      addCurio('fishVane', '鱼骨风向标', fv.x, fv.z, fv.y + 0.02, makeFishboneVane());
      const sf = shoreSpot(item.isle, item.height);
      addCurio('signalFire', '信号火堆', sf.x, sf.z, sf.y + 0.02, makeSignalFire());
      const dr = jungleSpot(item.isle, item.height);
      addCurio('drum', '回声鼓', dr.x, dr.z, dr.y, makeDrum());
      const ca = jungleSpot(item.isle, item.height);
      addCurio('cairn', '求生石堆', ca.x, ca.z, ca.y, makeSurvivalCairn());
      const vs = jungleSpot(item.isle, item.height);
      addCurio('vineSwing', '藤蔓秋千', vs.x, vs.z, vs.y + 0.02, makeVineSwing());
      for (let i = 0; i < 3; i++) {
        const ct = shoreSpot(item.isle, item.height);
        addCurio('coconutTarget', '椰壳靶架', ct.x, ct.z, ct.y + 0.02, makeCoconutTarget());
      }
      if (item.isle === NEW_ISLAND) {
        for (let i = 0; i < 4; i++) {
          const cl = shoreSpot(item.isle, item.height);
          addCurio('triClam', '三角蚌', cl.x, cl.z, cl.y + 0.04, makeTriClam());
        }
      }
      const fl = jungleSpot(item.isle, item.height);
      addCurio('firefly', '萤火虫灯笼', fl.x, fl.z, fl.y + 0.05, makeFireflyLantern());
      for (let i = 0; i < 3; i++) {
        const mu = jungleSpot(item.isle, item.height);
        addCurio('mushroom', '夜光蘑菇', mu.x, mu.z, mu.y + 0.04, makeMushroom());
      }
    }
    placeRemoteWisdom(THIRD_ISLAND, (x, z) => remoteIslandHeightAt(THIRD_ISLAND, x, z), 'sunPyramid', '日影金字塔', -18, -10);
    placeRemoteWisdom(THIRD_ISLAND, (x, z) => remoteIslandHeightAt(THIRD_ISLAND, x, z), 'stoneAbacus', '石算盘遗迹', 44, 18);
    placeRemoteWisdom(FOURTH_ISLAND, (x, z) => remoteIslandHeightAt(FOURTH_ISLAND, x, z), 'mirrorPyramid', '水镜金字塔', 16, -24);
    placeRemoteWisdom(FOURTH_ISLAND, (x, z) => remoteIslandHeightAt(FOURTH_ISLAND, x, z), 'starDial', '星象石盘', -42, 28);
  }
  const traps = [];
  const trapGeo = (() => {
    const ring = new THREE.TorusGeometry(0.32, 0.03, 6, 14);
    ring.rotateX(Math.PI / 2);
    const stake = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6);
    stake.translate(0.30, 0.12, 0);
    const merged = mergeGeometries([ring, stake], false);
    merged.computeVertexNormals();
    return merged;
  })();
  const trapMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.35, 0.28, 0.18)); return m; })();
  function placeTrap() {
    if (walker.traps <= 0) { showToast('没有陷阱了'); return; }
    walker.traps--;
    const x = walker.x + Math.sin(walker.viewYaw) * 1.2;
    const z = walker.z + Math.cos(walker.viewYaw) * 1.2;
    const mesh = new THREE.Mesh(trapGeo, trapMat);
    mesh.position.set(x, islandHeightAt(x, z) + 0.06, z);
    scene.add(mesh);
    traps.push({ mesh, x, z, armed: true });
    showToast('陷阱已布设 · 猎物踩中 50% 概率捕获');
  }

  // ---- 砍柴:斧头劈树,倒伏得木柴(神力一斧倒) ----
  const fallingTrees = [];
  const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _te = new THREE.Euler();
  const _tv = new THREE.Vector3(), _ts = new THREE.Vector3();
  function nearestTree() {
    let best = null, bd = 1e9;
    palmData.forEach((pd, i) => {
      if (pd.gone || pd.falling) return;
      const d = Math.hypot(pd.x - walker.x, pd.z - walker.z);
      if (d < 3.4 && d < bd) { bd = d; best = { data: pd, idx: i, mesh: palms, kind: '棕榈' }; }
    });
    canopyData.forEach((cd, i) => {
      if (cd.gone || cd.falling) return;
      const d = Math.hypot(cd.x - walker.x, cd.z - walker.z);
      if (d < 3.8 && d < bd) { bd = d; best = { data: cd, idx: i, mesh: canopies, kind: '阔叶树' }; }
    });
    return best;
  }
  function nearestBuildSite(maxD = 4.6) {
    let best = null, bd = 1e9;
    for (const bs of buildSites) {
      const d = Math.hypot(bs.x - walker.x, bs.z - walker.z);
      if (d < maxD && d < bd) { bd = d; best = bs; }
    }
    return best;
  }
  function buildSiteNeed(bs) {
    return HOUSE_COSTS[Math.min(bs.stage, HOUSE_COSTS.length - 1)];
  }
  function houseLevelName(stage) {
    return stage >= 3 ? '雨林据点' : stage === 2 ? '加固木屋' : stage === 1 ? '小木屋' : '房基';
  }
  function houseEffectText(stage) {
    return stage >= 3
      ? '满级功能:强效避难 · 快速回血 · 净化中毒 · 大幅降低饥渴消耗'
      : stage === 2
        ? '功能:吊床休整 · 集雨补水 · 缓慢回血 · 降低饥渴消耗'
        : stage === 1
          ? '功能:遮风休息 · 快速回体力 · 小幅降低饥渴消耗'
          : '未建成';
  }
  function nearestCompletedHouse(maxD = 7.5) {
    let best = null, bd = 1e9;
    for (const bs of buildSites) {
      if (bs.stage <= 0) continue;
      const d = Math.hypot(bs.x - walker.x, bs.z - walker.z);
      if (d < maxD && d < bd) { bd = d; best = bs; }
    }
    return best;
  }
  function activeHouseBonus() {
    const h = nearestCompletedHouse(8.5);
    if (!h) return null;
    return {
      site: h,
      drainMul: h.stage >= 3 ? 0.40 : h.stage === 2 ? 0.62 : 0.80,
      stamina: h.stage >= 3 ? 18 : h.stage === 2 ? 12 : 8,
      hp: h.stage >= 3 ? 3.0 : h.stage === 2 ? 1.2 : 0,
      thirst: h.stage >= 2 ? (h.stage >= 3 ? 2.4 : 1.2) : 0,
      detox: h.stage >= 3 ? 1.9 : h.stage === 2 ? 0.7 : 0,
    };
  }
  function useHouse(bs) {
    if (bs.stage <= 0) return false;
    if (bs.useCd > 0) {
      showToast(houseLevelName(bs.stage) + '还在整理中(' + Math.ceil(bs.useCd) + 's)');
      return true;
    }
    const hpMax = walker.savageRole === 'shield' ? 260 : walker.savageRole === 'swordsman' ? 220 : walker.savageRole === 'poisoner' ? 180 : PLAYER_HP_MAX;
    const beforeHp = walker.hp, beforeThirst = walker.thirst;
    walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + (bs.stage >= 3 ? 75 : bs.stage === 2 ? 52 : 34));
    if (bs.stage >= 2) walker.thirst = Math.min(100, walker.thirst + (bs.stage >= 3 ? 34 : 20));
    if (bs.stage >= 2) walker.hp = Math.min(hpMax, walker.hp + (bs.stage >= 3 ? 45 : 18));
    if (bs.stage >= 3) {
      walker.poisonT = Math.max(0, walker.poisonT - 8);
      walker.poisonBlurT = Math.max(0, walker.poisonBlurT - 8);
    }
    bs.useCd = bs.stage >= 3 ? 12 : 16;
    startHandAction('pickup');
    showToast('🏠 ' + houseLevelName(bs.stage) + '休整完成 · 体力恢复'
      + (walker.thirst > beforeThirst ? ' · 集雨补水' : '')
      + (walker.hp > beforeHp ? ' · 生命恢复' : '')
      + (bs.stage >= 3 ? ' · 净化毒性' : ''));
    return true;
  }
  function bestRecallHouse() {
    let best = null, bd = 1e9;
    for (const bs of buildSites) {
      if (bs.stage <= 0) continue;
      const d = Math.hypot(bs.x - walker.x, bs.z - walker.z);
      if (d < bd) { bd = d; best = bs; }
    }
    return best;
  }
  function cancelRecall(reason) {
    if (!recall.active) return;
    recall.active = false;
    recall.t = 0;
    recall.target = null;
    recall.lastPing = -1;
    if (reason) showToast(reason);
  }
  function startRecall() {
    if (!walker.on || walker.inBunker || walker.swordTurret || riding) return;
    const target = bestRecallHouse();
    if (!target) { showToast('还没有建成的房子,无法回城'); return; }
    recall.active = true;
    recall.t = 0;
    recall.target = target;
    recall.lastPing = -1;
    showToast('按住 3 回城中:5 秒内不要松手,也不要受到攻击');
  }
  function finishRecall() {
    const target = recall.target;
    if (!target || target.stage <= 0) { cancelRecall('回城目标失效'); return; }
    const a = Math.atan2(walker.x - target.x, walker.z - target.z) || 0;
    walker.x = target.x + Math.sin(a) * 2.8;
    walker.z = target.z + Math.cos(a) * 2.8;
    walker.y = target.heightFn(walker.x, walker.z);
    walker.viewYaw = a + Math.PI;
    walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 35);
    recall.active = false;
    recall.t = 0;
    recall.target = null;
    recall.lastPing = -1;
    startHandAction('pickup');
    showToast('🏠 回城成功:已回到' + target.label + '旁');
  }
  function updateBuildSiteMesh(bs) {
    const k = bs.stage + (bs.paid ? bs.hits / Math.max(1, buildSiteNeed(bs).hits) : 0);
    bs.mesh.position.y = bs.heightFn(bs.x, bs.z);
    bs.parts.base.visible = true;
    bs.parts.base.scale.set(1, 1, 1);
    bs.parts.posts.forEach((p, i) => {
      p.visible = bs.stage > 0 || bs.paid || i < 4;
      p.scale.y = bs.stage === 0 ? 0.45 + Math.min(0.55, k * 0.18) : 1;
      p.position.y = p.scale.y;
    });
    bs.parts.walls.forEach((w, i) => {
      w.visible = bs.stage >= 1 || (bs.paid && bs.hits > 5 + i);
      w.scale.y = bs.stage >= 2 ? 1.12 : 1;
    });
    bs.parts.roof.visible = bs.stage >= 2 || (bs.stage === 1 && bs.paid && bs.hits > 4);
    bs.parts.roof.scale.setScalar(bs.stage >= 3 ? 1.18 : 1);
    bs.parts.loft.visible = bs.stage >= 3;
  }
  function workOnBuildSite(bs) {
    if (bs.stage >= HOUSE_COSTS.length) {
      showToast(bs.label + '已满级:可作为安全据点');
      return;
    }
    const need = buildSiteNeed(bs);
    if (!bs.paid) {
      if (walker.timber < need.timber || walker.rope < need.rope) {
        showToast(bs.label + '需要木材 ' + need.timber + ' + 绳子 ' + need.rope + ' 才能' + (bs.stage === 0 ? '开工' : '升级'));
        return;
      }
      walker.timber -= need.timber;
      walker.rope -= need.rope;
      bs.paid = true;
      bs.hits = 0;
      showToast('材料就位:' + bs.label + '开始' + (bs.stage === 0 ? '建房' : '升级') + ' · 按 X 斧子施工 ' + need.hits + ' 次');
    }
    startHandAction('chop');
    walker.shakeT = Math.max(walker.shakeT, 0.10);
    bs.hits++;
    if (bs.hits >= need.hits) {
      bs.stage++;
      bs.paid = false;
      bs.hits = 0;
      updateBuildSiteMesh(bs);
      showToast('🏠 ' + bs.label + '完成:' + need.name + ' · ' + houseEffectText(bs.stage) + (bs.stage >= HOUSE_COSTS.length ? '' : ' · 可继续升级'));
    } else {
      updateBuildSiteMesh(bs);
      showToast('🪓 ' + bs.label + '施工中 ' + bs.hits + '/' + need.hits);
    }
  }
  function chopWithAxe() {
    if (fishing.active) { showToast('正钓着鱼 —— 先按 H 收杆'); return; }
    const bs = nearestBuildSite();
    if (bs) { workOnBuildSite(bs); return; }
    const tox = toxicAnimals.find(an => !an.dead && Math.hypot(an.x - walker.x, an.z - walker.z) < 1.9);
    if (tox) {
      if (!walker.savage || !walker.spear) { showToast('毒物太危险 —— 变成野人并用长矛处理,才能安全提毒'); return; }
      startHandAction('chop');
      walker.shakeT = Math.max(walker.shakeT, 0.18);
      tox.dead = true;
      tox.mesh.visible = false;
      tox.respawnT = 120;
      walker.venom++;
      showToast((tox.kind === 'snake' ? '🐍' : '☠') + ' 你用长矛处理了毒物,提取毒液 +1(Q 可制作毒矛)');
      return;
    }
    // 贴身的螃蟹:一斧拍扁
    const crab = animals.find(an => an.kind === 'crab' && !an.dead
      && Math.hypot(an.x - walker.x, an.z - walker.z) < 1.8);
    if (crab) {
      startHandAction('chop');
      walker.shakeT = Math.max(walker.shakeT, 0.12);
      crab.dead = true;
      crab.respawnT = 60;
      crab.mesh.visible = false;
      walker.meat++;
      showToast('🪓 一斧拍扁了螃蟹 · 蟹肉 +1(按 T 食用)');
      return;
    }
    const tr = nearestTree();
    if (tr) {
      startHandAction('chop');
      walker.shakeT = Math.max(walker.shakeT, 0.12);
      tr.data.hp -= walker.buff ? 3 : 1;
      if (tr.data.hp <= 0) {
        tr.data.falling = true;
        tr.data.nuts = 0;
        tr.k = 0;
        fallingTrees.push(tr);
        const timberGain = tr.data.wood * 4;
        walker.wood += tr.data.wood;
        walker.timber += timberGain;
        showToast('🌲 ' + tr.kind + '轰然倒下 · 木柴 +' + tr.data.wood + ' · 木材 +' + timberGain);
      } else {
        showToast('🪓 木屑纷飞 · 再砍 ' + tr.data.hp + ' 下就倒');
      }
      return;
    }
    const st = nearestStone();
    if (st) {
      startHandAction('chop');
      walker.shakeT = Math.max(walker.shakeT, 0.12);
      st.taken = true;
      st.mesh.visible = false;
      st.respawnT = 45;
      walker.stone += 6;                          // 石块需求大,劈开后一次给足
      showToast('🪓 一斧劈开石头 · 石块 +6(Q 可打磨箭矢)');
      return;
    }
    // 岸边大礁石:凿下一批石块(每块 45 秒可凿一次)
    const rk = rockData.find(r => r.cd <= 0 && Math.hypot(r.x - walker.x, r.z - walker.z) < 2.8);
    if (rk) {
      startHandAction('chop');
      walker.shakeT = Math.max(walker.shakeT, 0.12);
      rk.cd = 45;
      walker.stone += 4;
      showToast('🪓 从礁石上凿下一批石头 · 石块 +4');
      return;
    }
    showToast('附近没有可砍的树、石头或螃蟹 —— 走近了再按 X');
  }
  function nearestRockForBoulders() {
    let best = null, bd = 1e9;
    for (const r of rockData) {
      const d = Math.hypot(r.x - walker.x, r.z - walker.z);
      if (d < 3.2 && d < bd) { bd = d; best = r; }
    }
    return best;
  }
  function startCutBoulders() {
    if (!walker.savage || !walker.catapult) {
      showToast('只有掌握投石机的野人,才懂得把海边礁石切成巨石弹');
      return;
    }
    if (walker.cuttingRock) {
      showToast('正在切割巨石弹…… 还剩 ' + Math.ceil(walker.cuttingRock.t) + ' 秒');
      return;
    }
    const rk = nearestRockForBoulders();
    if (!rk) { showToast('走到海边大块礁石旁,再按 N 切割投石机巨石弹'); return; }
    if (rk.cutCd > 0) { showToast('这块礁石刚被切过,还要冷却 ' + Math.ceil(rk.cutCd) + ' 秒'); return; }
    if (walker.coconut >= 10) {
      walker.coconut -= 10;
      showToast('🥥 你备下 10 个椰子,开始两分钟切割巨石弹……');
    } else if (walker.godMeat >= 1) {
      walker.godMeat--;
      showToast('⚡ 你吃下一块神肉撑住体能,开始两分钟切割巨石弹……');
    } else {
      showToast('切割巨石弹极耗体力:每 2 块至少需要 10 个椰子,或 1 块神肉');
      return;
    }
    walker.cuttingRock = { rock: rk, t: 120 };
    startHandAction('chop');
  }
  function makeCatapultMesh() {
    const mesh = new THREE.Mesh(catapultGeo, catapultMat);
    mesh.scale.set(1.7, 1.7, 1.7);
    mesh.visible = true;
    scene.add(mesh);
    return mesh;
  }
  function nearestPlacedCatapult(range = 5.0) {
    let best = null, bd = 1e9;
    for (const cp of placedCatapults) {
      if (cp.carried) continue;
      const d = Math.hypot(cp.x - walker.x, cp.z - walker.z);
      if (d < range && d < bd) { bd = d; best = cp; }
    }
    return best;
  }
  function createCatapultAt(x, z, dir) {
    const y = groundHeightAt(x, z);
    const cp = { x, z, y, dir, carried: false, mesh: makeCatapultMesh() };
    cp.mesh.position.set(x, y + 0.05, z);
    cp.mesh.rotation.y = dir;
    placedCatapults.push(cp);
    return cp;
  }
  function placeOrCarryCatapult() {
    if (!walker.catapult) return false;
    if (walker.carryingCatapult) {
      const cp = walker.carryingCatapult;
      const x = walker.x + Math.sin(walker.viewYaw) * 1.8;
      const z = walker.z + Math.cos(walker.viewYaw) * 1.8;
      const h = groundHeightAt(x, z);
      if (h < -0.6) { showToast('水太深,投石机不能放在这里'); return true; }
      cp.x = x; cp.z = z; cp.y = h; cp.dir = walker.viewYaw; cp.carried = false;
      cp.mesh.position.set(x, h + 0.05, z);
      cp.mesh.rotation.set(0, cp.dir, 0);
      cp.mesh.scale.set(1.7, 1.7, 1.7);
      walker.carryingCatapult = null;
      showToast('🪨 投石机已放稳:站在旁边按空格发射巨石弹');
      return true;
    }
    const near = nearestPlacedCatapult(3.2);
    if (near) {
      near.carried = true;
      walker.carryingCatapult = near;
      showToast('你扛起沉重的投石机,默认只能走路;吞下神肉后搬运也能疾跑');
      return true;
    }
    if (placedCatapults.length === 0) {
      const x = walker.x + Math.sin(walker.viewYaw) * 1.8;
      const z = walker.z + Math.cos(walker.viewYaw) * 1.8;
      if (groundHeightAt(x, z) < -0.6) { showToast('水太深,投石机不能放在这里'); return true; }
      createCatapultAt(x, z, walker.viewYaw);
      showToast('🪨 野人投石机架在地上了:靠近炮台按空格发射,E 可搬运');
      return true;
    }
    return false;
  }
  function nearestStone() {
    let best = null, bd = 1e9;
    for (const st of stones) {
      if (st.taken) continue;
      const d = Math.hypot(st.x - walker.x, st.z - walker.z);
      if (d < 2.8 && d < bd) { bd = d; best = st; }
    }
    return best;
  }
  // 水边捧水喝:面前 1.5m 内有水即可(海水能解一时之渴,椰子更管用)
  function drinkWater() {
    const px = walker.x + Math.sin(walker.viewYaw) * 1.5;
    const pz = walker.z + Math.cos(walker.viewYaw) * 1.5;
    if (islandHeightAt(px, pz) > 0.3) { showToast('面前没有水 —— 走到水边再按 Y'); return; }
    walker.thirst = Math.min(100, walker.thirst + 25);
    startHandAction('drink');
    showToast('💧 捧起海水喝了几口 · 口渴 +25(椰子汁更解渴)');
  }
  function updateTreeFalls(dt) {
    for (let i = fallingTrees.length - 1; i >= 0; i--) {
      const ft = fallingTrees[i];
      ft.k += dt / 2.4;
      const d = ft.data;
      const fall = Math.max(0, Math.min(1, ft.k / 0.5));   // k 可为负:碾压时错峰倒下
      const sink = ft.k > 0.55 ? (ft.k - 0.55) / 0.45 * 7 : 0;
      const sc = ft.k >= 1 ? 0.0001 : d.sc;
      _te.set(0, d.rotY, d.tiltZ + fall * 1.5);
      _tq.setFromEuler(_te);
      _tm.compose(_tv.set(d.x, d.y - 0.15 - sink, d.z), _tq, _ts.set(sc, sc, sc));
      ft.mesh.setMatrixAt(ft.idx, _tm);
      ft.mesh.instanceMatrix.needsUpdate = true;
      if (ft.k >= 1) { d.gone = true; d.falling = false; fallingTrees.splice(i, 1); }
    }
  }
  // 泰坦碾压:岛上树木压折、石块与普通散落收集品尽收(盗墓材料保留手动拾取)
  function crushIsland(isle = ISLAND) {
    let wood = 0, stone = 0;
    const loot = {};
    let lootTotal = 0;
    const isRemote = isle === THIRD_ISLAND || isle === FOURTH_ISLAND;
    const inCrushRange = (x, z, pad = 1.08) => Math.hypot(x - isle.x, z - isle.z) < isle.R * pad;
    const addLoot = (label, n = 1) => {
      loot[label] = (loot[label] || 0) + n;
      lootTotal += n;
    };
    palmData.forEach((pd, i) => {
      if (pd.gone || pd.falling) return;
      if (!inCrushRange(pd.x, pd.z)) return;
      pd.falling = true;
      pd.nuts = 0;
      wood += pd.wood;
      fallingTrees.push({ data: pd, idx: i, mesh: palms, kind: '棕榈', k: -Math.random() * 0.4 });
    });
    canopyData.forEach((cd, i) => {
      if (cd.gone || cd.falling) return;
      if (!inCrushRange(cd.x, cd.z)) return;
      cd.falling = true;
      wood += cd.wood;
      fallingTrees.push({ data: cd, idx: i, mesh: canopies, kind: '阔叶树', k: -Math.random() * 0.4 });
    });
    for (const st of stones) {
      if (!inCrushRange(st.x, st.z)) continue;
      if (!st.taken) { st.taken = true; st.mesh.visible = false; st.respawnT = 45; stone += 3; }
    }
    for (const rk of rockData) {
      if (!inCrushRange(rk.x, rk.z, 1.25)) continue;
      if (rk.cd <= 0) { rk.cd = 45; stone += 4; }
    }
    for (const dw of driftwoods) {
      if (!dw.taken && inCrushRange(dw.x, dw.z, 1.12)) {
        dw.taken = true;
        dw.mesh.visible = false;
        dw.respawnT = 90;
        wood += 1;
        addLoot('漂木');
      }
    }
    for (const rp of ropes) {
      if (!rp.taken && inCrushRange(rp.x, rp.z, 1.12)) {
        rp.taken = true;
        rp.mesh.visible = false;
        rp.respawnT = 120;
        walker.rope += 1;
        addLoot('绳子');
      }
    }
    for (const gp of gunParts) {
      if (!gp.taken && inCrushRange(gp.x, gp.z, 1.12)) {
        gp.taken = true;
        gp.mesh.visible = false;
        gp.respawnT = 90;
        walker[gp.kind] = (walker[gp.kind] || 0) + 1;
        addLoot(gp.name || gunPartNames[gp.kind] || gp.kind);
      }
    }
    if (isRemote) {
      wood += Math.round(isle.R * 1.6);
      stone += Math.round(isle.R * 1.25);
    }
    walker.wood += wood;
    walker.stone += stone;
    const featuredLoot = ['废铁', '铜壳', '铅块', '绳子']
      .filter(name => loot[name])
      .map(name => name + ' +' + loot[name])
      .join(' · ');
    showToast('💥 泰坦之躯碾过' + (isle.name || (isle === NEW_ISLAND ? '第二岛' : '旧岛'))
      + '!树林岩石和散落物被卷走 · 木柴 +' + wood + ' · 石块 +' + stone
      + (lootTotal ? ' · 散落物 +' + lootTotal + (featuredLoot ? '(' + featuredLoot + ')' : '') : ''));
  }

  // ---- 捕蟹笼:放进浅水,约 40 秒后有蟹,收获后笼子继续工作 ----
  const crabPots = [];
  const potGeo = createCrabPotGeometry();
  const potMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.42, 0.33, 0.20)); return m; })();
  const potBuoyGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const potBuoyMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.75, 0.20, 0.10)); return m; })();
  const potCrabGeo = createCrabGeometry();
  const potCrabMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.50, 0.20, 0.10)); return m; })();
  function placeCrabPot() {
    if (walker.pots <= 0) { showToast('捕蟹笼已经放下了 —— 蟹进来后按 E 收获'); return; }
    const px = walker.x + Math.sin(walker.viewYaw) * 2.2;
    const pz = walker.z + Math.cos(walker.viewYaw) * 2.2;
    const h = islandHeightAt(px, pz);
    if (h > 0.6 || h < -2.5) { showToast('捕蟹笼要放在齐膝的浅水里 —— 走到水边再按 C'); return; }
    walker.pots--;
    const mesh = new THREE.Mesh(potGeo, potMat);
    mesh.position.set(px, h + 0.04, pz);
    const buoy = new THREE.Mesh(potBuoyGeo, potBuoyMat);
    buoy.position.set(px + 0.35, 0, pz);
    const crab = new THREE.Mesh(potCrabGeo, potCrabMat);
    crab.position.set(px, h + 0.14, pz);
    crab.visible = false;
    scene.add(mesh, buoy, crab);
    crabPots.push({ mesh, buoy, crab, x: px, z: pz, timer: 40, ready: false });
    showToast('🦀 捕蟹笼已沉入浅水 · 约 40 秒后可能有蟹钻进去');
  }
  function harvestCrabPot(pot) {
    pot.ready = false;
    pot.timer = 40;
    pot.crab.visible = false;
    walker.meat += 2;
    startHandAction('pickup');
    showToast('🦀 笼里两只肥蟹!肉 +2(按 T 食用)· 笼子继续工作');
  }

  // ---- 钓鱼:H 抛竿/收杆;浮漂猛沉时空格收杆,12% 惊动万斤巨物 ----
  // 神秘密码:岛上按 0 输入「7777」后,每次收杆必中虚空泰坦
  const TITAN_CODE = '7777';
  const fishing = { active: false, phase: 'wait', t: 0, biteT: 0, x: 0, z: 0, lucky: false };
  function tryTitanCode() {
    const code = window.prompt('输入神秘密码(传说有一串数字能唤来深渊巨物):');
    if (code === null) return;
    if (code.trim() === TITAN_CODE) {
      fishing.lucky = true;
      showToast('🎰 密码正确!海神与你同在 —— 接下来每次收杆必中虚空泰坦');
    } else showToast('密码不对…… 海面依旧平静');
  }
  // 密语召唤(M 键):念出「河豚和黄瓜」→ 直接唤来一只已吞噬 3 只同类的驯服泰坦(差 1 只即终极)
  function tryFusionCode() {
    const code = window.prompt('');
    if (code === null) return;
    if (code.trim().replace(/\s+/g, '') !== '河豚和黄瓜') return;
    if (activeTitans().length >= TITAN_MAX) { showToast('海面上已有 5 只泰坦在游弋,容不下更多了'); return; }
    summonGiant();
    const g = titans[titans.length - 1];
    if (!g || g.state !== 'rage') return;      // 没召出来(满员)
    g.state = 'tamed';
    g.devours = 3;
    g.devouredTypes = new Set(TITAN_TYPES.slice(0, 3));
    g.fused = true;
    g.scaleBoost = 1 + 3 * 0.45;
    g.mesh.scale.setScalar(g.sp.scale * g.scaleBoost);
    g.maxHp = g.sp.hp * 4; g.hp = g.maxHp;
    titansTamed++;
    checkTitanEnding();
    showToast('🌊 密语生效!' + g.sp.name + '破水而出 —— 它已吞噬 3 种泰坦(3/4),对你俯首称臣!再吞 1 种不同泰坦即成终极形态 · 按 V 骑乘');
    autoDevourTamed();              // 若已有多只认主,最大的自动开吞(提示以此为准)
  }
  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.80, 0.15, 0.10)); return m; })());
  bobber.visible = false;
  scene.add(bobber);
  const fishLineGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4);
  fishLineGeo.translate(0, 0.5, 0);      // 原点在竿梢端,沿 +Y 拉伸到浮漂
  const fishLine = new THREE.Mesh(fishLineGeo,
    (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.75, 0.75, 0.72)); return m; })());
  fishLine.visible = false;
  scene.add(fishLine);
  const _rodTip = new THREE.Vector3(), _lineDir = new THREE.Vector3(), _upVec = new THREE.Vector3(0, 1, 0);
  function castRod() {
    if (fishing.active) {
      fishing.active = false;
      bobber.visible = fishLine.visible = false;
      showToast('收起了鱼竿');
      return;
    }
    const cp = Math.cos(walker.viewPitch);
    const tx = walker.x + Math.sin(walker.viewYaw) * 9 * cp;
    const tz = walker.z + Math.cos(walker.viewYaw) * 9 * cp;
    if (islandHeightAt(tx, tz) > -1.2) { showToast('这里水太浅 —— 面向深水再按 H 抛竿'); return; }
    fishing.active = true;
    fishing.phase = 'wait';
    fishing.t = 4 + Math.random() * 5;
    fishing.x = tx; fishing.z = tz;
    bobber.visible = fishLine.visible = true;
    showToast('🎣 抛竿!静候鱼儿咬钩……(H 收杆)');
  }
  function hookFish() {
    fishing.phase = 'wait';
    fishing.t = 5 + Math.random() * 5;
    const canSummon = activeTitans().length < TITAN_MAX;
    if (fishing.lucky) {
      // 神秘密码:必中(除非海面已有 5 只泰坦在游弋)
      if (canSummon) { summonGiant(); return; }
      showToast('海面上已有 5 只泰坦在游弋 —— 先处置它们再钓');
    }
    if (Math.random() < 0.10 && canSummon) { summonGiant(); return; }
    const roll = Math.random();
    let meat = 1, msg = '🐟 钓上一条肥美海鱼 · 肉 +1';
    if (roll < 0.18) {
      meat = 2;
      msg = '🐟 一杆双鱼!肉 +2';
    } else if (roll < 0.34) {
      meat = 1;
      msg = '🐠 钓上一群银鳞小鱼 · 肉 +1';
    } else if (roll < 0.50) {
      meat = 2;
      msg = '🐟 钓上海鲈鱼 · 肉 +2';
    } else if (roll < 0.64) {
      meat = 2;
      msg = '🐡 钓上礁边石斑鱼 · 肉 +2';
    } else if (roll < 0.76) {
      meat = 3;
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 15);
      msg = '🐟 钓上银背金枪鱼 · 肉 +3 · 体力 +15';
    } else if (roll < 0.88) {
      meat = 2;
      walker.thirst = Math.max(0, walker.thirst - 4);
      msg = '🐍 钓上深海海鳗 · 肉 +2 · 口渴 -4';
    } else if (roll < 0.96) {
      meat = 1;
      if (walker.savage) walker.venom++;
      msg = '☠ 钓上鼓胀河豚 · 肉 +1' + (walker.savage ? ' · 毒液 +1' : ' · 非野人不会取毒');
    } else if (roll < 0.985) {
      meat = 4;
      msg = '🦈 钓上幼年鲨鱼!肉 +4';
    } else {
      meat = 2;
      walker.stamina = Math.max(0, walker.stamina - 50);
      walker.shakeT = Math.max(walker.shakeT, 1.0);
      fishing.active = false;
      bobber.visible = fishLine.visible = false;
      damageWalker(30, '被成年鲨鱼拖入浪里');
      msg = '🦈 成年鲨鱼猛拽鱼线!破坏力仅次于虚空泰坦 · 生命 -30 · 体力 -50 · 鱼线断了 · 肉 +2';
    }
    walker.meat += meat;
    startHandAction('pickup');
    showToast(msg);
  }
  function updateFishing(t, dt) {
    if (!fishing.active) return;
    if (!walker.on) { fishing.active = false; bobber.visible = fishLine.visible = false; return; }
    const wy = waveHeightAt(fishing.x, fishing.z, t, seaStateEff);
    if (fishing.phase === 'wait') {
      fishing.t -= dt;
      bobber.position.set(fishing.x, wy + 0.03 + Math.sin(t * 2.2) * 0.02, fishing.z);
      if (fishing.t <= 0) {
        fishing.phase = 'bite';
        fishing.biteT = 1.6;
        showToast('❗ 浮漂猛沉 —— 有鱼咬钩!快按空格');
      }
    } else {
      fishing.biteT -= dt;
      bobber.position.set(fishing.x, wy - 0.16 + Math.sin(t * 18) * 0.05, fishing.z);
      if (fishing.biteT <= 0) {
        fishing.phase = 'wait';
        fishing.t = 3 + Math.random() * 4;
        showToast('鱼儿吐钩跑了…… 继续等待');
      }
    }
    // 鱼线:竿梢 → 浮漂
    _rodTip.set(0, 1.07, 0);
    rodProp.updateWorldMatrix(true, false);
    rodProp.localToWorld(_rodTip);
    _lineDir.copy(bobber.position).sub(_rodTip);
    const len = Math.max(0.001, _lineDir.length());
    fishLine.position.copy(_rodTip);
    fishLine.quaternion.setFromUnitVectors(_upVec, _lineDir.divideScalar(len));
    fishLine.scale.set(1, len, 1);
  }

  // ---- 虚空泰坦:五种,被鱼钩惊动后现身(体长数百米,足以覆盖全岛) ----
  // 驯服:近水按 E 抚摸,挣扎会震散驯服度;驯满认主,按 V 骑乘
  // 猎杀:弓箭/枪支皆可,卡莫星狙击枪每发 -15;杀死后翻肚漂向岸边,按 E 割神肉
  const TITAN_SPECIES = [
    { name: '深渊泰坦', color: [0.10, 0.12, 0.16], scale: 25, hp: 30, speed: 9,  thrash: 1.0, harvests: 3, tameMul: 1.0, w: 34 },
    { name: '幽蓝泰坦', color: [0.22, 0.40, 0.55], scale: 20, hp: 24, speed: 12, thrash: 1.2, harvests: 2, tameMul: 1.2, w: 24 },
    { name: '熔岩泰坦', color: [0.45, 0.14, 0.07], scale: 26, hp: 40, speed: 10, thrash: 1.0, harvests: 4, tameMul: 0.8, w: 20 },
    { name: '腐绿泰坦', color: [0.18, 0.30, 0.12], scale: 24, hp: 35, speed: 8,  thrash: 0.6, harvests: 3, tameMul: 0.9, w: 16 },
    { name: '黄金泰坦', color: [0.58, 0.42, 0.14], scale: 28, hp: 60, speed: 11, thrash: 0.8, harvests: 6, tameMul: 0.5, w: 6 },
  ];
  const TITAN_TYPES = TITAN_SPECIES.map(sp => sp.name);
  const titans = [];              // 同时在场的泰坦(最多 5 只)
  let riding = false;
  let riddenTitan = null;         // 当前骑的是哪一只
  const giantRide = { speed: 8 };
  const titanBattle = { on: false, hitT: 0, mount: null, wild: null };   // 驯服泰坦 vs 野生泰坦
  let titansTamed = 0, titansSlain = 0;   // 结局计数:驯服 5 只 / 猎杀 5 只
  let endingShown = null;                  // 'tame' | 'slay'
  const TITAN_MAX = 5;
  const activeTitans = () => titans.filter(g => g.state !== 'gone');
  const myTamedTitan = () => titans.find(g => g.state === 'tamed') || null;
  const titanBodyRadius = (g) => 7 * g.sp.scale * (g.scaleBoost || 1);   // 鲸体模型半长,用于“模型边缘”触岛判定
  const devouredUniqueCount = (g) => g.devouredTypes ? g.devouredTypes.size : 0;
  const canTitanReachSecond = (g) => !!g && (g.ultimate || titansTamed >= 3 || (g.devours || 0) >= 3 || devouredUniqueCount(g) >= 3);
  function recordDevouredTitan(mount, name) {
    if (!mount.devouredTypes) mount.devouredTypes = new Set();
    if (TITAN_TYPES.includes(name)) mount.devouredTypes.add(name);
    return devouredUniqueCount(mount);
  }
  function checkTitanEnding() {
    if (endingShown) return;
    if (titansTamed >= TITAN_MAX) {
      endingShown = 'tame';
      walker.buff = true;
      showToast('🌟 结局 · 海洋之主:五只虚空泰坦齐聚你麾下!它们绕岛欢腾,海神赐你永久异能');
      for (const g of titans) if (g.state === 'tamed') { g.breachK = 0; g.breachT = 99; }
    } else if (titansSlain >= TITAN_MAX) {
      endingShown = 'slay';
      walker.godMeat += 6;
      showToast('⚔ 结局 · 深渊猎手:五只虚空泰坦尽数伏诛!深渊为你献上最后的神肉 ×6');
    }
  }
  function summonGiant() {
    if (activeTitans().length >= TITAN_MAX) return;
    // 按权重随机一种泰坦(黄金最稀有)
    let roll = Math.random() * TITAN_SPECIES.reduce((s, sp) => s + sp.w, 0);
    let sp = TITAN_SPECIES[0];
    for (const cand of TITAN_SPECIES) { roll -= cand.w; if (roll <= 0) { sp = cand; break; } }
    const mesh = new THREE.Mesh(
      createWhaleGeometry(),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(sp.color[0], sp.color[1], sp.color[2])); return m; })());
    mesh.scale.setScalar(sp.scale);         // 鲸体 ~14 m × scale ≈ 280~390 m
    const sourceX = fishing.active ? fishing.x : walker.x;
    const sourceZ = fishing.active ? fishing.z : walker.z;
    const homeIsland = Math.hypot(sourceX - NEW_ISLAND.x, sourceZ - NEW_ISLAND.z) < NEW_ISLAND.R * 1.6 ? NEW_ISLAND : ISLAND;
    const a = Math.random() * Math.PI * 2;
    const R = homeIsland.R + 45;
    const g = {
      mesh, sp, homeIsland, x: homeIsland.x + Math.cos(a) * R, z: homeIsland.z + Math.sin(a) * R, y: -6,
      dir: -a, state: 'rage', hp: sp.hp, maxHp: sp.hp, tame: 0,
      thrashT: 6, breachT: 10 + Math.random() * 8, breachK: -1,
      harvests: sp.harvests, deadK: 0, sinkK: -1,
      attackT: 9, attackK: -1, atkX: 0, atkZ: 0, atkKind: '', crushed: false,
      fused: false, scaleBoost: 1, devours: 0, ultimate: false,
      ringR: 45 + activeTitans().length * 14,   // 各守一圈,互不重叠
    };
    titans.push(g);
    scene.add(mesh);
    fishing.active = false;
    bobber.visible = fishLine.visible = false;
    walker.shakeT = 1.2;
    showToast(myTamedTitan()
      ? '🌊 又一只虚空泰坦 · ' + sp.name + ' 被惊动了!按 E 指挥你的泰坦迎战,或亲自驯服(' + activeTitans().length + '/' + TITAN_MAX + ')'
      : '🌊 海面炸开!虚空泰坦 · ' + sp.name + ' 被你的鱼钩惊动了 —— 它正在' + (homeIsland === NEW_ISLAND ? '第二岛' : '旧岛') + '近海巡游,近水按 E 驯服或张弓猎杀(' + activeTitans().length + '/' + TITAN_MAX + ')');
  }
  function rideGiant(gt) {
    const g = gt || myTamedTitan();
    if (!g) return;
    riding = true;
    riddenTitan = g;
    walker.on = false;
    g.breachK = -1;
    g.mesh.rotation.x = 0;
    g.crushed = false;
    g.crushedIslands = new Set();
    handsGroup.visible = false;
    $('island-hud').classList.remove('show');
    $('xhair').classList.remove('show');
    controls.enabled = false;
    giantRide.speed = 10;
    showToast('🐋 你跃上' + g.sp.name + '之背!W/S 控速 · A/D 转向'
      + (canTitanReachSecond(g) ? ' · 可横渡深海前往第二岛!' : ' · 泰坦不足 3 只/吞噬不足 3 只,暂不能去第二岛')
      + ' · 岛边按 V 下来');
  }
  function dismountGiant() {
    const g = riddenTitan;
    if (!g) { riding = false; return; }
    const bodyR = titanBodyRadius(g);
    const islandInfo = (isle) => {
      const centerD = Math.hypot(g.x - isle.x, g.z - isle.z);
      return {
        isle,
        centerD,
        norm: centerD / Math.max(1, isle.R),
        edge: centerD - (isle.R * 1.35 + bodyR)
      };
    };
    const oldInfo = islandInfo(ISLAND);
    const newInfo = islandInfo(NEW_ISLAND);
    const thirdInfo = islandInfo(THIRD_ISLAND);
    const fourthInfo = islandInfo(FOURTH_ISLAND);
    const LOCK_DIST = Math.max(120, bodyR * 0.18);
    const hasRemoteCompass = !!relics.yinyangCompass;
    const remoteTouch = [thirdInfo, fourthInfo].some(v => v.edge <= LOCK_DIST);
    const candidates = [oldInfo, newInfo]
      .concat(hasRemoteCompass ? [thirdInfo, fourthInfo] : [])
      .filter(v => v.edge <= LOCK_DIST);
    if (!candidates.length) {
      if (remoteTouch && !hasRemoteCompass) {
        showToast('远岛边缘就在巨兽身下,但泰坦找不到上岸潮线 —— 先去墓穴取阴阳罗盘');
        return;
      }
      showToast('巨兽不肯在深海放你下来 —— 先游到某座岛附近');
      return;
    }
    // 巨兽很大时模型边缘可能同时“碰到”两座岛;优先锁定中心距离更近的岛,避免新岛边上误回旧岛。
    candidates.sort((a, b) => a.norm - b.norm);
    const targetIsland = candidates[0].isle;
    // 从巨兽位置向最近岛心找第一块干滩
    const cx = targetIsland.x;
    const cz = targetIsland.z;
    const hh = targetIsland === NEW_ISLAND ? newIslandHeightAt
      : targetIsland === ISLAND ? islandHeightAt
        : (x, z) => remoteIslandHeightAt(targetIsland, x, z);
    const dx = cx - g.x, dz = cz - g.z;
    const dd = Math.hypot(dx, dz) || 1;
    let lx = cx, lz = cz;
    for (let s = 0; s < 600; s += 2) {
      const x = g.x + (dx / dd) * s, z = g.z + (dz / dd) * s;
      if (hh(x, z) > 0.8) { lx = x; lz = z; break; }
    }
    riding = false;
    riddenTitan = null;
    walker.on = true;
    walker.x = lx; walker.z = lz; walker.y = hh(lx, lz);
    walker.viewYaw = walker.heading = Math.atan2(dx, dz);
    walker.viewPitch = -0.04;
    handsGroup.visible = true;
    $('island-hud').classList.add('show');
    $('xhair').classList.add('show');
    showToast('你顺着巨兽的鳍滑回了海滩');
  }
  // 骑乘驾驶:未融合的泰坦不敢远离家园海域
  function rideStep(g, t, dt, wx) {
    g.rideAtkCd = Math.max(0, (g.rideAtkCd || 0) - dt);
    const turnIn = (driveKeys.right ? 1 : 0) - (driveKeys.left ? 1 : 0);
    g.dir -= turnIn * dt * 0.35;
    const spIn = (driveKeys.throttle ? 1 : 0) - (driveKeys.brake ? 1 : 0);
    giantRide.speed = Math.max(5, Math.min(g.ultimate ? 46 : 34, giantRide.speed + spIn * dt * 12));
    g.x += Math.sin(g.dir) * giantRide.speed * dt;
    g.z += Math.cos(g.dir) * giantRide.speed * dt;
    const home = g.homeIsland || ISLAND;
    if (!canTitanReachSecond(g) && Math.hypot(g.x - home.x, g.z - home.z) > 700) {
      // 未融合:不敢离开家园海域,折返
      const bx = home.x - g.x, bz = home.z - g.z;
      const bd = Math.hypot(bx, bz) || 1;
      g.x += bx / bd * giantRide.speed * dt * 2;
      g.z += bz / bd * giantRide.speed * dt * 2;
      g.dir = Math.atan2(bx, bz);
      if (!rideStep.warned || t - rideStep.warned > 6) {
        rideStep.warned = t;
        showToast('🌊 泰坦不敢游出这片海域 —— 至少驯服 3 只泰坦,或让这只泰坦吞噬 3 只后,才能前往第二岛!');
      }
    }
    g.y = Math.max(wx - 4, groundHeightAt(g.x, g.z) + 2);   // 可碾上海岸陆地
    g.breachK = -1;
    // 碾压:巨兽之躯碾过任意岛屿,压碎树木岩石,尽收木石
    if (!g.crushedIslands) g.crushedIslands = new Set();
    const crushTargets = [
      ['old', ISLAND],
      ['second', NEW_ISLAND],
      ['third', THIRD_ISLAND],
      ['fourth', FOURTH_ISLAND],
    ];
    for (const [key, isle] of crushTargets) {
      if (!g.crushedIslands.has(key) && Math.hypot(g.x - isle.x, g.z - isle.z) < isle.R * 0.9) {
        g.crushedIslands.add(key);
        g.crushed = true;
        crushIsland(isle);
        break;
      }
    }
    // 相机:随机体实际长度缩放距离 —— 吞噬变大后也能看到完整鲸躯
    const bodyL = 14 * g.sp.scale * (g.scaleBoost || 1);      // 鲸体实际长度(米)
    const back = bodyL * 0.5 + 70, up = bodyL * 0.22 + 18;
    camera.position.set(
      g.x - Math.sin(g.dir) * back, g.y + up, g.z - Math.cos(g.dir) * back);
    camera.lookAt(g.x + Math.sin(g.dir) * bodyL * 0.4, g.y, g.z + Math.cos(g.dir) * bodyL * 0.4);
  }
  function titanRideAttack(kind) {
    const g = riddenTitan;
    if (!riding || !g || (g.rideAtkCd || 0) > 0) return;
    const fx = Math.sin(g.dir), fz = Math.cos(g.dir);
    const cx = g.x + fx * titanBodyRadius(g) * 0.35;
    const cz = g.z + fz * titanBodyRadius(g) * 0.35;
    const radius = kind === 'quake' ? 90 : kind === 'bite' ? 48 : 70;
    let hitSavage = 0;
    const titanHits = [];
    for (const sv of savages) {
      if (sv.dead) continue;
      if (Math.hypot(sv.x - cx, sv.z - cz) < radius) {
        sv.hp = 0;
        markSavageDead(sv, 90);
        hitSavage++;
      }
    }
    for (const wild of titans) {
      if (wild === g || wild.state !== 'rage') continue;
      if (Math.hypot(wild.x - cx, wild.z - cz) < radius + titanBodyRadius(wild) * 0.35) {
        const dmg = kind === 'bite' ? 8 : kind === 'quake' ? 3 : 5;
        wild.hp -= dmg;
        titanHits.push({ name: wild.sp.name, hp: Math.max(0, wild.hp), maxHp: wild.maxHp, dmg });
        if (kind === 'bite') g.hp = Math.min(g.maxHp, g.hp + 10);
        if (wild.hp <= 0) killTitan(wild);
      }
    }
    if (kind === 'bite') g.hp = Math.min(g.maxHp, g.hp + (hitSavage > 0 ? 4 : 0));
    g.rideAtkCd = kind === 'bite' ? 2.4 : kind === 'quake' ? 3.2 : 1.6;
    walker.shakeT = Math.max(walker.shakeT, kind === 'quake' ? 1.2 : 0.7);
    const action = kind === 'bite' ? '🐋 泰坦撕咬' : kind === 'quake' ? '💥 泰坦震地' : '🌊 泰坦巨尾横扫';
    if (hitSavage === 0 && titanHits.length === 0) {
      showToast(action + '落空了 —— 范围内没有野人或敌对泰坦');
    } else {
      const parts = [];
      if (hitSavage > 0) parts.push('击倒野人 ' + hitSavage + ' 名');
      if (titanHits.length > 0) {
        const first = titanHits[0];
        parts.push('命中泰坦 ' + titanHits.length + ' 只,' + first.name + ' 生命 ' + Math.ceil(first.hp) + '/' + first.maxHp);
      }
      if (kind === 'bite') parts.push('自身生命 ' + Math.ceil(g.hp) + '/' + g.maxHp);
      showToast(action + '命中!' + parts.join(' · '));
    }
  }
  // ---- 泰坦打斗 + 融合 ----
  // 有驯服泰坦时再钓起一只:按 E 指挥你的泰坦迎战;打斗中野生泰坦不攻击人,
  // 且驯服它成功率大增(见 islandInteract 的 guarded 分支)
  function startTitanBattle(auto) {
    const mount = myTamedTitan();
    const wild = titans.find(g => g.state === 'rage');
    if (!mount || !wild) return;
    titanBattle.on = true;
    titanBattle.hitT = 0;
    titanBattle.mount = mount;
    titanBattle.wild = wild;
    showToast(auto
      ? '⚔ 你的' + mount.sp.name + '发现有同类靠近,咆哮着自动迎战' + wild.sp.name + '!它无暇攻击你,趁机驯服(E)'
      : '⚔ 你的' + mount.sp.name + '咆哮着迎向' + wild.sp.name + '!两兽缠斗 —— 它无暇攻击你,趁机驯服(E)');
  }
  // 自动迎战:驯服泰坦发现野生泰坦靠近 → 自动开打;体型明显占优 → 碾压式直接吞噬
  const autoHunt = { cd: 0 };
  function autoHuntCheck(t) {
    if (titanBattle.on || t < autoHunt.cd) return;
    const mount = myTamedTitan();
    if (!mount) return;
    const wild = titans.find(g => g.state === 'rage'
      && Math.hypot(g.x - mount.x, g.z - mount.z) < 280);
    if (!wild) return;
    autoHunt.cd = t + 3;
    const mySize = mount.sp.scale * (mount.scaleBoost || 1);
    const itsSize = wild.sp.scale * (wild.scaleBoost || 1);
    if (mySize > itsSize * 1.15) {
      // 碾压:体型占优,一口吞下
      mount.devours = (mount.devours || 0) + 1;
      const uniqueDevours = recordDevouredTitan(mount, wild.sp.name);
      mount.scaleBoost = (mount.scaleBoost || 1) + 0.45;
      mount.fused = true;
      mount.maxHp += wild.sp.hp; mount.hp = mount.maxHp;
      scene.remove(wild.mesh);
      wild.state = 'gone';
      titansSlain++;
      checkTitanEnding();
      walker.shakeT = Math.max(walker.shakeT, 1.4);
      if (checkUltimate(mount)) {
        showToast('👑 碾压!你的泰坦一口吞下' + wild.sp.name + ' —— 已吞噬 ' + uniqueDevours + ' 种不同泰坦,白色终极形态觉醒!');
      } else {
        showToast('💥 碾压式吞噬!你的泰坦体型占优,一口吞下' + wild.sp.name + '(不同泰坦 ' + uniqueDevours + '/4)');
      }
    } else {
      startTitanBattle(true);
    }
  }
  function fuseTitans() {
    // 吞噬:打斗分出胜负后,驯服泰坦吞下对手,体型暴涨;连吞 4 只进化为终极虚空泰坦
    const mount = myTamedTitan();
    const dead = titans.find(g => g.state === 'dead');
    if (!mount || !dead) return;
    const eatenName = dead.sp.name;
    mount.devours = (mount.devours || 0) + 1;
    const uniqueDevours = recordDevouredTitan(mount, eatenName);
    mount.scaleBoost = (mount.scaleBoost || 1) + 0.45;
    mount.fused = true;
    mount.maxHp += dead.sp.hp; mount.hp = mount.maxHp;
    scene.remove(dead.mesh);
    dead.state = 'gone';
    if (titanBattle.wild === dead) { titanBattle.on = false; titanBattle.wild = null; titanBattle.mount = null; }
    walker.shakeT = 1.5;
    if (checkUltimate(mount)) {
      showToast('👑 终极虚空泰坦诞生!吞噬 4 种不同泰坦后,它化作白色巨兽并显现四色纹路 —— 全速横渡深海!(按 V 骑乘)');
    } else {
      showToast('🌀 吞噬完成!泰坦吞下' + eatenName + ',身躯暴涨(不同泰坦 ' + uniqueDevours + '/4)'
        + (mount.ultimate ? '' : ' —— 再吞 ' + Math.max(0, 4 - uniqueDevours) + ' 种不同泰坦即可进化')
        + ';它已能横渡深海,西南有新海域!');
    }
  }
  // 吞噬满 4 种不同泰坦 → 终极虚空泰坦(白化 + 四纹路);返回是否本次进化
  function checkUltimate(mount) {
    let justEvolved = false;
    if (devouredUniqueCount(mount) >= 4 && !mount.ultimate) {
      justEvolved = true;
      mount.ultimate = true;
      mount.sp = Object.assign({}, mount.sp, { name: '终极虚空泰坦', color: [0.92, 0.95, 0.94] });
      mount.scaleBoost += 0.6;
      mount.maxHp += 500; mount.hp = mount.maxHp;
      mount.mesh.material.colorNode = ultimateTitanSkin();
    }
    mount.mesh.scale.setScalar(mount.sp.scale * mount.scaleBoost);
    return justEvolved;
  }
  // 多只泰坦同时认主:最大的那只自动吞噬其他同伴(计入吞噬进度)
  function autoDevourTamed() {
    const tamed = titans.filter(g => g.state === 'tamed');
    if (tamed.length < 2) return;
    tamed.sort((a, b) => (b.sp.scale * (b.scaleBoost || 1)) - (a.sp.scale * (a.scaleBoost || 1)));
    const king = tamed[0];
    let eaten = 0;
    for (const g of tamed.slice(1)) {
      if (titanBattle.mount === g) { titanBattle.on = false; titanBattle.wild = null; titanBattle.mount = null; }
      scene.remove(g.mesh);
      g.state = 'gone';
      king.devours = (king.devours || 0) + 1;
      recordDevouredTitan(king, g.sp.name);
      king.scaleBoost = (king.scaleBoost || 1) + 0.45;
      king.fused = true;
      king.maxHp += g.maxHp; king.hp = king.maxHp;
      eaten++;
    }
    if (riding && riddenTitan && riddenTitan.state === 'gone') riddenTitan = king;
    walker.shakeT = Math.max(walker.shakeT, 1.5);
    const uniqueDevours = devouredUniqueCount(king);
    if (checkUltimate(king)) {
      showToast('👑 强者为尊!最大的泰坦吞下 ' + eaten + ' 只同伴,集齐 4 种不同泰坦之力 —— 白色终极巨兽听凭你骑乘!');
    } else {
      showToast('🌊 强者为尊!最大的那只泰坦自动吞噬了 ' + eaten + ' 只同伴,身躯暴涨(不同泰坦 ' + uniqueDevours + '/4)'
        + (king.ultimate ? '' : ' —— 再吞 ' + Math.max(0, 4 - uniqueDevours) + ' 种不同泰坦即成终极形态'));
    }
  }
  function killTitan(g) {
    g.state = 'dead'; g.deadK = 0;
    if (titanBattle.wild === g) { titanBattle.on = false; titanBattle.wild = null; titanBattle.mount = null; }
    if (riding && riddenTitan === g) { riding = false; riddenTitan = null; }
    titansSlain++;
    checkTitanEnding();
  }
  function updateTitan(g, t, dt) {
    if (g.state === 'gone') return;
    const wx = waveHeightAt(g.x, g.z, t, seaStateEff);
    const isWildInBattle = titanBattle.on && titanBattle.wild === g && g.state === 'rage';
    const isMountInBattle = titanBattle.on && titanBattle.mount === g && g.state === 'tamed';
    if (riding && riddenTitan === g) {
      rideStep(g, t, dt, wx);
    } else if (isWildInBattle || isMountInBattle) {
      // 打斗:两兽互相逼近缠斗;野生泰坦不攻击人
      const other = isWildInBattle ? titanBattle.mount : titanBattle.wild;
      const dx = other.x - g.x, dz = other.z - g.z;
      const dd = Math.hypot(dx, dz) || 1;
      if (dd > 55) {
        g.x += dx / dd * g.sp.speed * 1.6 * dt;
        g.z += dz / dd * g.sp.speed * 1.6 * dt;
        g.dir = Math.atan2(dx, dz);
      }
      g.y = wx - 5 + Math.sin(t * 1.4 + (isWildInBattle ? 0 : 1.2)) * 2.4;
      if (isWildInBattle) {
        titanBattle.hitT -= dt;
        if (titanBattle.hitT <= 0 && dd < 130) {
          titanBattle.hitT = 2.2;
          g.hp -= Math.ceil(2 * (titanBattle.mount.scaleBoost || 1));     // 你的泰坦撕咬对手
          walker.shakeT = Math.max(walker.shakeT, 0.8);
          showToast('⚔ 巨浪滔天!你的泰坦狠狠撞向对手(' + g.sp.name + ' 生命 ' + Math.max(0, g.hp) + '/' + g.maxHp + ')');
          if (g.hp <= 0) {
            killTitan(g);
            showToast('☠ ' + g.sp.name + '被撞得翻了肚皮!游到它旁边按 E —— 让你的泰坦融合它,或割神肉');
          }
        }
      }
    } else if (g.state === 'rage' || g.state === 'tamed') {
      // 暴怒泰坦会主动攻击岸上的人;第二岛钓出的泰坦还会随机扫荡野人。
      const attacking = g.state === 'rage' && g.attackK >= 0;
      if (g.state === 'rage' && walker.on && !walker.inBunker) {
        if (attacking) {
          g.attackK += dt / 2.2;
          const dxA = g.atkX - g.x, dzA = g.atkZ - g.z;
          const dd = Math.hypot(dxA, dzA) || 1;
          if (dd > 30) {
            g.x += dxA / dd * 60 * dt;
            g.z += dzA / dd * 60 * dt;
            g.dir = Math.atan2(dxA, dzA);
          }
          if (g.attackK >= 1) {
            g.attackK = -1;
            g.attackT = 8 + Math.random() * 6;
            walker.shakeT = Math.max(walker.shakeT, 1.2);
            if (g.atkKind === 'savage') {
              let hitSavage = 0;
              for (const sv of savages) {
                if (sv.dead) continue;
                if (Math.hypot(sv.x - g.atkX, sv.z - g.atkZ) < 70) {
                  markSavageDead(sv, 90);
                  hitSavage++;
                }
              }
              showToast(hitSavage > 0
                ? '🐋 ' + g.sp.name + '巨尾扫过雨林边缘,拍碎了 ' + hitSavage + ' 名野人!'
                : '🐋 ' + g.sp.name + '砸向野人阵地,泥浪翻涌但目标四散躲开');
            } else if (Math.hypot(walker.x - g.atkX, walker.z - g.atkZ) < 28) {
              walker.stamina = Math.max(0, walker.stamina - 55);
              damageWalker(40, '被' + g.sp.name + '的巨尾拍成了肉泥', true);
              showToast('💥 ' + g.sp.name + '的巨尾拍碎了海岸!气浪把你掀飞(生命 -40)');
              if (walker.hp <= 0 || walker.stamina <= 0) {
                titanKnockout(g.sp.name + '的巨尾');
                return;
              }
            } else {
              showToast('💥 ' + g.sp.name + '拍击海岸,巨浪冲天 —— 你躲开了!');
            }
          }
        } else {
          g.attackT -= dt;
          const savageTarget = g.homeIsland === NEW_ISLAND && Math.random() < 0.65
            ? savages.filter(sv => !sv.dead && Math.hypot(sv.x - NEW_ISLAND.x, sv.z - NEW_ISLAND.z) < NEW_ISLAND.R * 1.15)
                .sort(() => Math.random() - 0.5)[0]
            : null;
          if (g.attackT <= 0 && savageTarget) {
            g.attackK = 0;
            g.atkKind = 'savage';
            g.atkX = savageTarget.x;
            g.atkZ = savageTarget.z;
            showToast('⚠ ' + g.sp.name + '锁定了一队野人,山一样的身躯正压向雨林边缘!');
          } else if (g.attackT <= 0 && Math.hypot(walker.x - g.x, walker.z - g.z) < 150) {
            g.attackK = 0;
            g.atkKind = 'walker';
            g.atkX = walker.x;                      // 锁定玩家当前位置,给 2.2 秒逃离
            g.atkZ = walker.z;
            showToast('⚠ ' + g.sp.name + '调转山头般的身躯朝你冲来了 —— 快离开这片海岸!');
          }
        }
      }
      // 环岛巡游(切向前进);冲撞时由攻击逻辑接管位置
      if (!attacking) {
        const home = g.homeIsland || ISLAND;
        const ang = Math.atan2(g.z - home.z, g.x - home.x);
        const R = home.R + (g.ringR || 45) + (g.state === 'tamed' ? 15 : 0);
        const w = (g.state === 'rage' ? g.sp.speed : g.sp.speed * 0.67) / R;
        const na = ang + w * dt;
        g.x = home.x + Math.cos(na) * R;
        g.z = home.z + Math.sin(na) * R;
        g.dir = -na;
      }
      // 偶尔跃出水面:山一样的身躯腾空再砸回海里
      g.breachT -= dt;
      if (g.breachT <= 0 && g.breachK < 0) { g.breachK = 0; g.breachT = 16 + Math.random() * 14; }
      if (g.breachK >= 0) {
        g.breachK = Math.min(1, g.breachK + dt / 3.5);
        const bk = Math.sin(g.breachK * Math.PI);
        g.y = wx - 5 + bk * 26;
        g.mesh.rotation.x = (0.5 - g.breachK) * 1.1;
        if (walker.on && g.breachK > 0.5 && g.breachK - dt / 3.5 <= 0.5) walker.shakeT = Math.max(walker.shakeT, 0.8);
        if (g.breachK >= 1) { g.breachK = -1; g.mesh.rotation.x = 0; }
      } else {
        g.y = wx - 5 + Math.sin(t * 0.5) * 1.2;
      }
      // 挣扎:震散驯服度 + 镜头震颤
      if (g.state === 'rage') {
        g.thrashT -= dt;
        if (g.thrashT <= 0) {
          g.thrashT = (5 + Math.random() * 4) * g.sp.thrash;
          if (walker.on) walker.shakeT = Math.max(walker.shakeT, 0.7);
          if (g.tame > 0) {
            g.tame = Math.max(0, g.tame - 15);
            showToast('💢 虚空泰坦剧烈挣扎!驯服度被震散到 ' + Math.round(g.tame) + '%');
          }
        }
      }
    } else if (g.state === 'dead') {
      // 翻肚,缓缓漂向岸边
      g.deadK = Math.min(1, g.deadK + dt * 0.5);
      g.mesh.rotation.z = g.deadK * 2.6;
      const home = g.homeIsland || ISLAND;
      const dc = Math.hypot(g.x - home.x, g.z - home.z);
      const near = home.R * 0.95;
      if (dc > near) {
        g.x += (home.x - g.x) / dc * 5 * dt;
        g.z += (home.z - g.z) / dc * 5 * dt;
      }
      g.y = wx - 2;
      if (g.sinkK >= 0) {
        g.sinkK += dt / 6;
        g.y -= g.sinkK * 60;
        if (g.sinkK >= 1) { g.state = 'gone'; scene.remove(g.mesh); return; }
      }
    }
    if (spoutState.strength > 0.05 && g.state !== 'dead') {
      const dxS = spoutState.x - g.x, dzS = spoutState.z - g.z;
      const dS = Math.hypot(dxS, dzS) || 1;
      if (dS < spoutState.radius) {
        const pull = spoutState.strength * (1 - dS / spoutState.radius) * (spoutState.target === g ? 1.8 : 0.8);
        g.x += ((dxS / dS) * 9.0 + (-dzS / dS) * 4.5) * pull * dt;
        g.z += ((dzS / dS) * 9.0 + (dxS / dS) * 4.5) * pull * dt;
        g.dir += pull * dt * 0.8;
        walker.shakeT = Math.max(walker.shakeT, pull * 0.45);
      }
    }
    g.mesh.position.set(g.x, g.y, g.z);
    g.mesh.rotation.y = g.dir;
  }
  function updateGiant(t, dt) {
    for (const g of titans) updateTitan(g, t, dt);
    autoHuntCheck(t);                 // 驯服泰坦发现同类靠近:自动迎战 / 碾压吞噬
  }

  // ---- 野人 AI:游荡;玩家靠近则持矛追击,近身戳刺(低伤害但高频)----
  function updateSavages(t, dt) {
    relics.altarCd = Math.max(0, relics.altarCd - dt);
    relics.altarUsed = Math.max(0, relics.altarUsed - dt);
    const outsiderOnNew = walker.on && !walker.savage && !relics.tribeAlly && newIslandHeightAt(walker.x, walker.z) > 0.5;
    if (outsiderOnNew) newIsland.landedT = Math.min(999, newIsland.landedT + dt);
    else newIsland.landedT = 0;
    const playerAttackAllowed = outsiderOnNew && newIsland.landedT >= 20;
    const warAllowed = playerAttackAllowed;
    const tamedGuard = myTamedTitan();
    if (warAllowed) {
      if (relics.war.mode === 'none') {
        relics.war.next -= dt;
        if (relics.war.sent >= relics.war.max) {
          relics.war.next = 1e9;
          if (!relics.war.exhausted) {
            relics.war.exhausted = true;
            showToast('野人围剿累计 500 人后终于停歇 —— 两村损失惨重,暂时无力再战');
          }
        } else if (relics.war.next <= 0) {
          relics.war.mode = Math.random() < 0.36 ? 'assault' : 'guerrilla';
          relics.war.t = relics.war.mode === 'assault' ? 58 : 22;
          relics.war.waveT = 0;
          showToast(relics.war.mode === 'assault'
            ? '⚠ 野人总攻!两村暂时放下仇怨,集结战士围攻外来者 —— 快用武器库或泰坦防线抵御'
            : '⚠ 野人游击战开始!每波 10 名野人,累计最多 500 名围剿者会轮番上岛');
        }
      } else {
        relics.war.t -= dt;
        relics.war.waveT -= dt;
        if (relics.war.waveT <= 0) {
          relics.war.waveT = relics.war.mode === 'assault' ? 7 : 3.2;
          const remaining = Math.max(0, relics.war.max - relics.war.sent);
          const waveSize = Math.min(remaining, relics.war.mode === 'guerrilla' ? 10 : 16);
          let dispatched = 0;
          for (const sv of savages.slice().sort((a, b) => (a.dead === b.dead ? 0 : a.dead ? 1 : -1))) {
            if (dispatched >= waveSize) continue;
            if (sv.warActive && !sv.dead) continue;
            if (sv.dead) continue;
            sv.warUnit = true; sv.warActive = true; sv.warCounted = false;
            sv.mesh.visible = true;
            sv.mesh.rotation.x = 0;
            sv.dir = Math.atan2(walker.x - sv.x, walker.z - sv.z);
            sv.state = relics.war.mode;
            sv.speed = (relics.war.mode === 'assault' ? 4.6 : 4.0)
              * (sv.job === 'swordsman' ? 1.12 : sv.job === 'shield' ? 0.82 : sv.job === 'poisoner' ? 0.95 : 1.0);
            dispatched++;
          }
          relics.war.sent += dispatched;
          if (dispatched > 0) showToast((relics.war.mode === 'assault' ? '🛡 总攻队 ' : '🌿 游击小队 ')
            + dispatched + ' 人从雨林和村落方向压过来(累计 ' + relics.war.sent + '/' + relics.war.max + ')');
        }
        if (relics.war.t <= 0) {
          const endedMode = relics.war.mode;
          relics.war.mode = 'none';
          relics.war.next = relics.tribeAlly ? 1e9 : (endedMode === 'assault' ? 24 : 10);
          showToast('野人暂时退回雨林,但只要你没取得信任,他们还会再来');
        }
      }
    } else {
      relics.war.mode = 'none';
      if (relics.tribeAlly) relics.war.next = 1e9;
    }
    for (const sv of savages) {
      if (sv.dead) {
        if (sv.fallK < 1) {
          sv.fallK = Math.min(1, sv.fallK + dt * 2.4);
          sv.mesh.rotation.x = sv.fallK * 1.5;
        }
        sv.respawnT -= dt;
        if (sv.respawnT <= 0) {
          const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 9;
          const hx = sv.homeX || NEW_ISLAND.x, hz = sv.homeZ || NEW_ISLAND.z;
          sv.x = hx + Math.cos(a) * r; sv.z = hz + Math.sin(a) * r;
          sv.dead = false; sv.hp = sv.maxHp || 2; sv.fallK = 0;
          sv.mesh.rotation.x = 0;
          sv.mesh.scale.setScalar(1);
          clearSavageRankVisual(sv.mesh);
          sv.elder = false; sv.guard = false; sv.aggroT = 0;
          sv.state = 'wander';
        }
        continue;
      }
      const onNew = walker.on && !walker.savage && newIslandHeightAt(walker.x, walker.z) > -1;
      const dP = (onNew && relics.altarUsed <= 0) ? Math.hypot(walker.x - sv.x, walker.z - sv.z) : 1e9;
      sv.hitCd = Math.max(0, sv.hitCd - dt);
      if (sv.aggroT > 0) sv.aggroT -= dt;
      const enemy = savages.find(o => !o.dead && o.faction !== sv.faction
        && Math.hypot(o.x - sv.x, o.z - sv.z) < 18);
      const warActive = warAllowed && relics.war.mode !== 'none';
      const dTitan = tamedGuard ? Math.hypot(tamedGuard.x - sv.x, tamedGuard.z - sv.z) : 1e9;
      const wildTitanThreat = titans.find(g => g.state === 'rage' && g.homeIsland === NEW_ISLAND
        && (g.atkKind === 'savage' || Math.hypot(g.x - sv.x, g.z - sv.z) < 180));
      if (wildTitanThreat) {
        sv.state = 'titanCounter';
        sv.dir = Math.atan2(wildTitanThreat.x - sv.x, wildTitanThreat.z - sv.z);
        sv.speed = Math.hypot(wildTitanThreat.x - sv.x, wildTitanThreat.z - sv.z) > 70 ? 2.2 : 0;
        if (Math.hypot(wildTitanThreat.x - sv.x, wildTitanThreat.z - sv.z) < 150 && sv.hitCd <= 0) {
          sv.hitCd = sv.job === 'poisoner' ? 1.2 : 1.6;
          const dmg = sv.job === 'poisoner' ? 2.2 : sv.job === 'swordsman' ? 1.6 : sv.job === 'spearman' ? 1.8 : 1.1;
          wildTitanThreat.hp = Math.max(0, wildTitanThreat.hp - dmg);
          wildTitanThreat.mesh.rotation.z += 0.012;
          if (!sv.wildTitanWarnT || t - sv.wildTitanWarnT > 5) {
            sv.wildTitanWarnT = t;
            showToast('🛡 野人反击' + wildTitanThreat.sp.name + '!毒矛和投索持续削它的生命('
              + Math.ceil(wildTitanThreat.hp) + '/' + wildTitanThreat.maxHp + ')');
          }
          if (wildTitanThreat.hp <= 0) {
            killTitan(wildTitanThreat);
            showToast('☠ 野人把' + wildTitanThreat.sp.name + '拖垮了!现在正是你坐收渔翁之利的时候');
          }
        }
      } else if ((sv.elder || sv.guard) && playerAttackAllowed && sv.aggroT > 0) {
        sv.state = sv.elder ? 'elderHunt' : 'elderGuard';
        sv.dir = Math.atan2(walker.x - sv.x, walker.z - sv.z);
        sv.speed = sv.elder ? 5.1 : 4.4;
        const strikeRange = walker.swordTurret ? (sv.elder ? 62 : 52) : (sv.elder ? 3.0 : 2.2);
        if (dP < strikeRange && sv.hitCd <= 0) {
          sv.hitCd = sv.elder ? 1.35 : 1.0;
          const dmg = sv.elder ? 20 : 9;
          damageWalker(dmg, sv.elder ? '被野人长老的毒矛钉死在炮台上' : '被长老警卫射杀');
          applyPoison(sv.elder ? 8 : 5, 0, '被长老队毒矛毒死了');
          showToast((sv.elder ? '☠ 野人长老' : '🛡 长老警卫')
            + (walker.swordTurret ? '的投矛打上了炮台!' : '贴身击中了你!')
            + '生命 -' + dmg + ' · 中毒');
          if (walker.hp <= 0) return;
        }
      } else if (warActive && (dP < 90 || dTitan < 120)) {
        const targetTitan = tamedGuard && dTitan < dP + 30;
        const tx = targetTitan ? tamedGuard.x : walker.x;
        const tz = targetTitan ? tamedGuard.z : walker.z;
        const ty = targetTitan ? tamedGuard.y : walker.y;
        sv.state = relics.war.mode;
        sv.dir = Math.atan2(tx - sv.x, tz - sv.z);
        sv.speed = (relics.war.mode === 'assault' ? 4.4 : 3.8)
          * (sv.job === 'swordsman' ? 1.12 : sv.job === 'shield' ? 0.82 : sv.job === 'poisoner' ? 0.95 : 1.0);
        if (Math.hypot(tx - sv.x, tz - sv.z) < (targetTitan ? 18 : 1.7) && sv.hitCd <= 0) {
          sv.hitCd = targetTitan ? 1.8 : 0.9;
          if (targetTitan) {
            const dmg = relics.war.mode === 'assault' ? 3 : 1;
            tamedGuard.hp = Math.max(0, tamedGuard.hp - dmg);
            tamedGuard.mesh.rotation.z += 0.02;
            if (!sv.titanWarnT || t - sv.titanWarnT > 5) {
              sv.titanWarnT = t;
              showToast('⚔ 野人用毒矛和投索围攻你的泰坦!泰坦生命 ' + Math.ceil(tamedGuard.hp) + '/' + tamedGuard.maxHp
                + ' —— 让它继续吞噬同类可恢复并变强');
            }
            if (tamedGuard.hp <= 0) {
              killTitan(tamedGuard);
              showToast('☠ 你的泰坦被野人战争拖垮了…… 需要重新驯服或让其他泰坦吞噬恢复');
            }
          } else {
            const baseDmg = sv.job === 'shield' ? 4 : sv.job === 'poisoner' ? 3 : sv.job === 'swordsman' ? 6 : 5;
            damageWalker(baseDmg + (relics.war.mode === 'assault' ? 2 : 0), '被野人战争淹没了');
            if (sv.job === 'poisoner' || relics.war.mode === 'assault') applyPoison(sv.job === 'poisoner' ? 6 : 4, 0, '被野人毒矛毒死了');
            showToast((relics.war.mode === 'assault' ? '🛡 总攻' : '🌿 游击')
              + sv.jobName + '击中了你!' + (sv.job === 'poisoner' ? '视野开始发糊,毒性持续侵蚀' : ''));
            if (walker.hp <= 0) return;
          }
        }
      } else if (!warActive && enemy) {
        sv.state = 'tribeWar';
        sv.dir = Math.atan2(enemy.x - sv.x, enemy.z - sv.z);
        sv.speed = 2.4;
        if (Math.hypot(enemy.x - sv.x, enemy.z - sv.z) < 1.4 && sv.hitCd <= 0) {
          sv.hitCd = 1.4;
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            markSavageDead(enemy, 80);
            if (walker.on && Math.hypot(walker.x - sv.x, walker.z - sv.z) < 45) {
              showToast((sv.faction === 'stone' ? '石牙' : '雾叶') + '野人击倒了敌对村落的一名战士');
            }
          }
        }
      } else if (playerAttackAllowed && dP < 26) {                     // 发现玩家:追击
        sv.state = 'chase';
        sv.dir = Math.atan2(walker.x - sv.x, walker.z - sv.z);
        sv.speed = 3.4;
        if (dP < 1.6 && sv.hitCd <= 0) {
          sv.hitCd = 1.1;
          damageWalker(5, '被野人的长矛戳死了');
          applyPoison(4, 0, '被野人毒矛毒死了');
          showToast('🗡 野人毒矛戳中了你!视野发糊,毒性持续掉血');
          if (walker.hp <= 0) return;
        }
      } else {
        sv.state = 'wander';
        sv.t -= dt;
        if (sv.t <= 0) {
          sv.dir += (Math.random() - 0.5) * 1.8;
          sv.speed = Math.random() < 0.6 ? 0.9 : 0;
          sv.t = 2 + Math.random() * 3;
        }
      }
      if (sv.speed > 0) {
        let nx = sv.x + Math.sin(sv.dir) * sv.speed * dt;
        let nz = sv.z + Math.cos(sv.dir) * sv.speed * dt;
        const kept = keepSavageOutOfGreatWall(nx, nz);
        nx = kept.x; nz = kept.z;
        const gh = newIslandHeightAt(nx, nz);
        if (gh > 0.4 && gh < 26) { sv.x = nx; sv.z = nz; } else sv.dir += Math.PI * 0.5;
        sv.mesh.rotation.y = sv.dir;
      }
      sv.mesh.position.set(sv.x, newIslandHeightAt(sv.x, sv.z), sv.z);
    }
  }

  function updateToxicAnimals(t, dt) {
    if (walker.poisonT > 0) {
      walker.poisonT -= dt;
      walker.poisonBlurT = Math.max(0, walker.poisonBlurT - dt);
      damageWalker(dt * 0.8, '毒发身亡');
      if (walker.poisonT <= 0 && walker.on) showToast('毒性终于退了');
    } else walker.poisonBlurT = Math.max(0, walker.poisonBlurT - dt);
    const pv = $('poison-veil');
    if (pv) pv.style.opacity = Math.max(0, Math.min(1, walker.poisonBlurT / 4)).toFixed(2);
    for (const an of toxicAnimals) {
      if (an.dead) {
        an.respawnT -= dt;
        if (an.respawnT <= 0) {
          an.dead = false;
          an.mesh.visible = true;
          an.x = NEW_ISLAND.x + (Math.random() - 0.5) * NEW_ISLAND.R * 1.1;
          an.z = NEW_ISLAND.z + (Math.random() - 0.5) * NEW_ISLAND.R * 1.1;
        }
        continue;
      }
      an.t -= dt;
      an.biteCd = Math.max(0, an.biteCd - dt);
      if (an.t <= 0) {
        an.dir += (Math.random() - 0.5) * 1.6;
        an.t = 1.5 + Math.random() * 2.5;
      }
      const spd = an.kind === 'snake' ? 0.7 : 0.35;
      const nx = an.x + Math.sin(an.dir) * spd * dt;
      const nz = an.z + Math.cos(an.dir) * spd * dt;
      const h = newIslandHeightAt(nx, nz);
      if (h > 0.7 && h < 24) { an.x = nx; an.z = nz; } else an.dir += Math.PI * 0.6;
      an.mesh.position.set(an.x, newIslandHeightAt(an.x, an.z) + (an.kind === 'snake' ? 0.08 : 0.14), an.z);
      an.mesh.rotation.y = an.dir + Math.sin(t * 5 + an.x) * 0.2;
      if (walker.on && !walker.inBunker && an.biteCd <= 0 && Math.hypot(walker.x - an.x, walker.z - an.z) < (an.kind === 'snake' ? 1.2 : 0.9)) {
        an.biteCd = 8;
        if (relics.antidote > 0) {
          relics.antidote--;
          showToast('☘ 雾叶解毒药生效,挡下了一次毒伤(剩 ' + relics.antidote + ' 份)');
        } else {
          applyPoison(7.2, 20, '被毒物毒死了');
          showToast((an.kind === 'snake' ? '🐍 毒蛇咬中了你!' : '☠ 毒蛙的毒液沾到皮肤!')
            + '生命 -20,随后毒性还会持续扣约 10 点血 —— 远离雨林毒物');
        }
      }
    }
  }

  // ---- 磁吸炸弹:库存用完后单颗充能;管理员模式无限无冷却 ----
  const BOMB_ADMIN_PASSWORD = '🧲💥';
  const magnetBombs = [];
  const bombGeo = new THREE.SphereGeometry(0.14, 10, 8);
  const bombMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.15, 0.55, 0.65)); return m; })();
  function applyMagnetBombAOE(x, z, radius = 13) {
    let hits = 0;
    for (const sv of savages) {
      if (sv.dead) continue;
      const d = Math.hypot(sv.x - x, sv.z - z);
      if (d > radius) continue;
      hits++;
      const core = d < radius * 0.45;
      sv.hp -= sv.elder ? (core ? 10 : 6) : sv.guard ? (core ? 8 : 5) : 999;
      sv.aggroT = Math.max(sv.aggroT || 0, 120);
      if (sv.hp <= 0) markSavageDead(sv, sv.elder ? 999 : 90);
    }
    if (mp.ws && mp.ws.readyState === 1) {
      for (const p of mp.peers.values()) {
        if ((p.mode === 'walk' || p.mode === 'ride') && Math.hypot(p.cx - x, p.cz - z) <= radius) {
          const d = Math.hypot(p.cx - x, p.cz - z);
          mp.ws.send(JSON.stringify({ t: 'hit', target: p.id, dmg: d < radius * 0.45 ? 70 : 42, kind: 'magnet-bomb' }));
        }
      }
    }
    spawnImpactRing(x, z, radius);
    walker.shakeT = Math.max(walker.shakeT, 0.9);
    showToast(hits > 0
      ? '💥 磁吸炸弹范围爆破!卷入 ' + hits + ' 名野人'
      : '💥 磁吸炸弹爆炸,冲击波扫过周围');
  }
  function tryBombAdmin() {
    const pwd = window.prompt('磁吸炸弹管理员密码(表情):');
    if (pwd === null) return;
    if (pwd.trim() !== BOMB_ADMIN_PASSWORD) {
      showToast('磁吸炸弹管理员密码错误');
      return;
    }
    walker.bombAdmin = true;
    walker.bombs = Math.max(walker.bombs, 5);
    walker.bombCd = 0;
    showToast('🧲 管理员模式开启:磁吸炸弹无限无冷却');
  }
  function throwMagnetBomb() {
    if (newIslandHeightAt(walker.x, walker.z) < 0.3) {
      showToast('磁吸炸弹只有在新荒岛上才能用');
      return;
    }
    const admin = !!walker.bombAdmin;
    if (!admin) {
      if (walker.bombs <= 0) {
        showToast(walker.bombCd > 0
          ? '🧲 磁吸炸弹正在充能,还剩 ' + Math.ceil(walker.bombCd) + 's 才能获得下一颗'
          : '🧲 磁吸炸弹正在重新装填');
        return;
      }
      walker.bombs--;
      if (walker.bombs <= 0) walker.bombCd = 30;
    }
    startHandAction('shoot');
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch) + 0.35, dz = Math.cos(walker.viewYaw) * cp;
    const mesh = new THREE.Mesh(bombGeo, bombMat);
    mesh.position.set(walker.x + dx * 0.6, walker.y + 1.5, walker.z + dz * 0.6);
    scene.add(mesh);
    magnetBombs.push({ mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 16, vy: dy * 16, vz: dz * 16, stuck: null, fuse: -1 });
    showToast(admin
      ? '🧲 管理员磁吸炸弹出手!无限无冷却'
      : '🧲 磁吸炸弹出手!'
        + (walker.bombs > 0 ? ' · 库存剩 ' + walker.bombs : ' · 库存用完,开始 30s 充能'));
  }
  function updateBombs(t, dt) {
    if (walker.bombAdmin) {
      walker.bombCd = 0;
    } else if (walker.bombs <= 0 && walker.bombCd > 0) {
      walker.bombCd = Math.max(0, walker.bombCd - dt);
      if (walker.bombCd <= 0) {
        walker.bombs = 1;
        if (walker.on && newIslandHeightAt(walker.x, walker.z) > 0.3) showToast('🧲 磁吸炸弹充能完成 · 获得 1 颗');
      }
    } else if (walker.bombs > 0) {
      walker.bombCd = 0;
    }
    for (let i = magnetBombs.length - 1; i >= 0; i--) {
      const b = magnetBombs[i];
      if (!b.stuck) {
        // 磁吸:向 40m 内最近野人拐弯
        let tgt = null, best = 40;
        for (const sv of savages) {
          if (sv.dead) continue;
          const d = Math.hypot(b.x - sv.x, b.z - sv.z);
          if (d < best) { best = d; tgt = sv; }
        }
        if (tgt) {
          const ty = newIslandHeightAt(tgt.x, tgt.z) + 1.0;
          const dx = tgt.x - b.x, dy = ty - b.y, dz = tgt.z - b.z;
          const dd = Math.hypot(dx, dy, dz) || 1;
          const sp = Math.max(14, Math.hypot(b.vx, b.vy, b.vz));
          b.vx += (dx / dd * sp - b.vx) * Math.min(1, dt * 6);
          b.vy += (dy / dd * sp - b.vy) * Math.min(1, dt * 6);
          b.vz += (dz / dd * sp - b.vz) * Math.min(1, dt * 6);
          if (dd < 0.9) { b.stuck = tgt; b.fuse = 1.2; showToast('🧲 嘀嘀嘀—— 炸弹吸在了野人身上!'); }
        } else b.vy -= 9.8 * dt;
        if (!b.stuck) {
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          const gh = newIslandHeightAt(b.x, b.z);
          if (b.y < gh + 0.1) { b.fuse = 1.5; b.stuck = 'ground'; }   // 落地哑弹
        }
        b.mesh.position.set(b.x, b.y, b.z);
      } else {
        if (b.stuck !== 'ground' && !b.stuck.dead) {
          b.x = b.stuck.x; b.z = b.stuck.z;
          b.y = newIslandHeightAt(b.x, b.z) + 1.0;
          b.mesh.position.set(b.x, b.y, b.z);
        }
        b.fuse -= dt;
        b.mesh.visible = Math.sin(t * 30) > 0;      // 爆炸前闪烁
        if (b.fuse <= 0) {
          applyMagnetBombAOE(b.x, b.z, 13);
          scene.remove(b.mesh);
          magnetBombs.splice(i, 1);
        }
      }
    }
  }
  // ---- 苏联老兵的避难所:林间半埋的木箱,藏着步枪、罐头与一本日记 ----
  const shelter = { x: 0, z: 0, y: 0, searched: false, diaryPage: 0 };
  {
    let placed = false, guard = 0;
    while (!placed && guard++ < 4000) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * ISLAND.R * 0.6;
      const x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
      const h = islandHeightAt(x, z);
      if (h < 5 || h > 14) continue;
      const slope = Math.abs(islandHeightAt(x + 2, z) - h) + Math.abs(islandHeightAt(x, z + 2) - h);
      if (slope > 1.8) continue;
      shelter.x = x; shelter.z = z; shelter.y = h;
      placed = true;
    }
    const crateMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.32, 0.24, 0.15)); return m; })();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), crateMat);
    crate.position.set(shelter.x, shelter.y + 0.20, shelter.z);
    crate.rotation.set(0.04, Math.random() * Math.PI * 2, 0.07);   // 半埋倾斜
    scene.add(crate);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.55), crateMat);
    lid.position.set(0, 0.27, -0.16);
    lid.rotation.x = -0.35;                                        // 箱盖半开
    crate.add(lid);
    const star = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.012, 12),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.50, 0.10, 0.08)); return m; })());
    star.position.set(0, 0.20, 0.29);                              // 箱面褪色的红五星
    star.rotation.x = Math.PI / 2;
    crate.add(star);
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.25, 0.28, 0.17)); return m; })());
    helmet.position.set(shelter.x + 0.7, shelter.y + 0.05, shelter.z + 0.3);
    helmet.rotation.z = 0.25;
    scene.add(helmet);
  }
  const SHELTER_DIARY = [
    '日记第 1 页:「1945 年 9 月。风暴把船撕碎了,我抱着一块舱门漂到这座岛。同志们一定以为我死了。」',
    '日记第 2 页:「第 412 天。鹿群已经不怕我了。我用最后一点油漆,在箱子上画了颗红星。」',
    '日记第 3 页:「如果有人找到这里——枪留给你,罐头也留给你。替我活下去。—— 伊万」',
  ];
  function searchShelter() {
    if (!shelter.searched) {
      shelter.searched = true;
      walker.rifle = true;
      walker.weapon = 'rifle';
      walker.bullets += 15;
      walker.meat += 2;
      $('ih-weapon-item').style.display = 'flex';
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('🔫 一支保养完好的莫辛纳甘步枪!子弹 15 发 + 军用罐头 ×2(空格射击 · 2 切换弓/枪)');
      return;
    }
    if (shelter.diaryPage < SHELTER_DIARY.length) {
      showToast('📖 ' + SHELTER_DIARY[shelter.diaryPage]);
      shelter.diaryPage++;
    } else if (!shelter.sniperFound) {
      shelter.sniperFound = true;
      walker.sniper = true;
      walker.weapon = 'sniper';
      walker.sniperAmmo += 6;
      startHandAction('pickup');
      showToast('🎯 箱底还有一层夹层 —— 一把卡莫星狙击枪!弹药 6 发,两发足以放倒虚空泰坦(2 切换武器)');
    } else {
      showToast('箱子空了,只剩箱面一颗褪色的红五星');
    }
  }
  // 步枪开火:栓动 1.2s 一发,一枪撂倒鹿/野猪,枪声惊起周围猎物
  const tracerGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.55, 4);
  tracerGeo.rotateX(Math.PI / 2);
  const tracerMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.98, 0.80, 0.35)); return m; })();
  function fireRifle() {
    if (walker.bullets <= 0) { showToast('子弹打光了 —— 按 2 换回弓箭'); return; }
    walker.bullets--;
    shootCooldown = 1.2;                                // 拉栓上膛
    startHandAction('shoot');
    walker.shakeT = Math.max(walker.shakeT, 0.22);      // 后坐力
    walker.viewPitch = Math.min(1.15, walker.viewPitch + 0.025);
    for (const h of huntables) {                        // 枪声惊扰 35m 内猎物
      if (h.state !== 'dead' && Math.hypot(h.x - walker.x, h.z - walker.z) < 35) {
        h.state = 'flee';
        h.t = 3 + Math.random();
        h.speed = h.spec.speed;
      }
    }
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch), dz = Math.cos(walker.viewYaw) * cp;
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    const eyeY = walker.y + 1.55;
    mesh.position.set(walker.x + dx * 0.8, eyeY + dy * 0.8, walker.z + dz * 0.8);
    scene.add(mesh);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 220, vy: dy * 220, vz: dz * 220,
      mesh, stuck: false, life: 0, bullet: true, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
    showToast('砰!! 子弹呼啸而出(剩 ' + walker.bullets + ' 发)');
  }
  function bulletHit(h) {
    h.hp = 0;
    killHuntable(h);
    showToast('🔫 一枪撂倒了' + h.spec.name + '!按 E 收割');
  }
  // 卡莫星狙击枪:2.0s 拉栓,弹速 300 m/s,对虚空泰坦每发 -15(两发猎杀)
  function fireSniper() {
    if (walker.sniperAmmo <= 0) { showToast('狙击弹药打光了 —— 按 2 换武器'); return; }
    walker.sniperAmmo--;
    shootCooldown = 2.0;
    startHandAction('shoot');
    walker.shakeT = Math.max(walker.shakeT, 0.35);      // 重型后坐力
    walker.viewPitch = Math.min(1.15, walker.viewPitch + 0.045);
    for (const h of huntables) {                        // 枪声惊扰 50m 内猎物
      if (h.state !== 'dead' && Math.hypot(h.x - walker.x, h.z - walker.z) < 50) {
        h.state = 'flee';
        h.t = 3 + Math.random();
        h.speed = h.spec.speed;
      }
    }
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch), dz = Math.cos(walker.viewYaw) * cp;
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    mesh.scale.set(1.6, 1.6, 1.6);
    const eyeY = walker.y + 1.55;
    mesh.position.set(walker.x + dx * 0.8, eyeY + dy * 0.8, walker.z + dz * 0.8);
    scene.add(mesh);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 300, vy: dy * 300, vz: dz * 300,
      mesh, stuck: false, life: 0, bullet: true, sniper: true, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
    showToast('轰!! 卡莫星的怒吼震彻全岛(剩 ' + walker.sniperAmmo + ' 发)');
  }
  // 波波沙冲锋枪:按住空格全自动,0.11s 一发,带散布
  function fireSMG() {
    if (shootCooldown > 0) return;
    if (walker.smgAmmo <= 0) { showToast('弹鼓空了 —— 军火库弹药箱可补充'); return; }
    walker.smgAmmo--;
    shootCooldown = 0.11;
    startHandAction('shoot');
    walker.shakeT = Math.max(walker.shakeT, 0.06);
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp + (Math.random() - 0.5) * 0.035;
    const dy = Math.sin(walker.viewPitch) + (Math.random() - 0.5) * 0.030;
    const dz = Math.cos(walker.viewYaw) * cp + (Math.random() - 0.5) * 0.035;
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    const eyeY = walker.y + 1.55;
    mesh.position.set(walker.x + dx * 0.8, eyeY + dy * 0.8, walker.z + dz * 0.8);
    scene.add(mesh);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 180, vy: dy * 180, vz: dz * 180,
      mesh, stuck: false, life: 0, bullet: true, smg: true, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
  }
  const boulderGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const boulderMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.26, 0.25, 0.23)); return m; })();
  const catapultLineMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.72 });
  const catapultRingMat = (() => {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    m.colorNode = marineSkin(vec3(1.0, 0.58, 0.18));
    m.opacityNode = float(0.55);
    return m;
  })();
  function spawnCatapultTrail(x, y, z, vx, vy, vz) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const tt = i / 24 * 1.55;
      pts.push(new THREE.Vector3(x + vx * tt, y + vy * tt - 4.9 * tt * tt, z + vz * tt));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), catapultLineMat.clone());
    line.frustumCulled = false;
    scene.add(line);
    catapultEffects.push({ mesh: line, life: 0, maxLife: 1.35, kind: 'trail' });
  }
  function spawnImpactRing(x, z, radius = 8) {
    const y = groundHeightAt(x, z) + 0.08;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 8, 64), catapultRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    ring.frustumCulled = false;
    scene.add(ring);
    catapultEffects.push({ mesh: ring, life: 0, maxLife: 0.95, kind: 'ring', radius });
  }
  function applyCatapultAOE(x, z, radius = 8) {
    let hitAny = false;
    for (const sv of savages) {
      if (sv.dead) continue;
      const d = Math.hypot(sv.x - x, sv.z - z);
      if (d <= radius) {
        sv.hp -= d < radius * 0.45 ? 8 : 4;
        hitAny = true;
        if (sv.hp <= 0) markSavageDead(sv, 90);
      }
    }
    for (const h of huntables) {
      if (h.state === 'dead' || h.state === 'gone') continue;
      const d = Math.hypot(h.x - x, h.z - z);
      if (d <= radius) { h.hp = 0; killHuntable(h); hitAny = true; }
    }
    if (mp.ws && mp.ws.readyState === 1) {
      for (const p of mp.peers.values()) {
        if ((p.mode === 'walk' || p.mode === 'ride') && Math.hypot(p.cx - x, p.cz - z) <= radius) {
          const d = Math.hypot(p.cx - x, p.cz - z);
          const dmg = d < radius * 0.45 ? 95 : 65;
          mp.ws.send(JSON.stringify({ t: 'hit', target: p.id, dmg, kind: 'catapult-aoe' }));
          hitAny = true;
        }
      }
    }
    showToast(hitAny ? '💥 巨石砸开一圈冲击波!范围内目标受到重创' : '💥 巨石落地,冲击波掀起尘浪');
  }
  function throwSpear() {
    shootCooldown = 0.9;
    startHandAction('shoot');
    const poisoned = walker.poisonSpear > 0;
    if (poisoned) walker.poisonSpear--;
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch), dz = Math.cos(walker.viewYaw) * cp;
    const mesh = new THREE.Mesh(createSpearGeometry(), arrowMat);
    const eyeY = walker.y + 1.55;
    mesh.position.set(walker.x + dx * 0.7, eyeY + dy * 0.7, walker.z + dz * 0.7);
    scene.add(mesh);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 38, vy: dy * 38 + 2.5, vz: dz * 38,
      mesh, stuck: false, life: 0, spear: true, poison: poisoned, savageRole: walker.savageRole,
      aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
    showToast(poisoned ? '☠ 毒矛掷出!命中会造成模糊视野和持续毒伤' : '🗡 长矛掷出!野人之矛命中好友可造成 35 伤害');
  }
  function fireCatapult(cp) {
    cp = cp || nearestPlacedCatapult();
    if (!cp) {
      showToast('投石机是固定炮台 —— 先在地上放置,再站到旁边按空格发射');
      return;
    }
    if (walker.catapultAmmo <= 0) {
      showToast('投石机需要巨石弹 —— 到海边大礁石旁按 N,花 2 分钟切割制作');
      return;
    }
    walker.catapultAmmo--;
    shootCooldown = 1.8;
    startHandAction('shoot');
    walker.shakeT = Math.max(walker.shakeT, 0.20);
    const cosPitch = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cosPitch, dy = Math.max(0.08, Math.sin(walker.viewPitch)), dz = Math.cos(walker.viewYaw) * cosPitch;
    const mesh = new THREE.Mesh(boulderGeo, boulderMat);
    const fireY = cp.y + 1.15;
    mesh.position.set(cp.x + dx * 1.15, fireY, cp.z + dz * 1.15);
    scene.add(mesh);
    const vx = dx * 58, vy = dy * 58 + 14, vz = dz * 58;
    spawnCatapultTrail(mesh.position.x, mesh.position.y, mesh.position.z, vx, vy, vz);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx, vy, vz,
      mesh, stuck: false, life: 0, catapult: true, bullet: true, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
    showToast('🪨 固定投石机抛出巨石!黄色虚拟弹道显示大致落线,落地有范围伤害');
  }
  // ---- 地下军火库(管理员彩蛋):二战老兵埋在岛心的武器库 ----
  // 岛上按 P 输入密码 1945 传送进入;梯子按 E 返回地面
  const ADMIN_PASSWORD = '1945';
  const BUNKER_PASSWORD2 = '1943';    // 第二层:枪架密码锁(线索在墙上老照片背面)
  const BUNKER = { x: ISLAND.x, z: ISLAND.z, floorY: -22.5 };
  const bunkerSpots = { ladder: { x: BUNKER.x + 5.2, z: BUNKER.z }, rack: { x: BUNKER.x - 3.6, z: BUNKER.z - 3.2 },
                        crates: { x: BUNKER.x + 3.8, z: BUNKER.z + 3.4 }, table: { x: BUNKER.x - 3.4, z: BUNKER.z + 3.2 },
                        photo: { x: BUNKER.x + 5.6, z: BUNKER.z - 2.4 } };
  {
    const concrete = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.side = THREE.BackSide; m.colorNode = marineSkin(vec3(0.30, 0.29, 0.27)); return m; })();
    const room = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 10), concrete);
    room.position.set(BUNKER.x, BUNKER.floorY + 2.5, BUNKER.z);
    scene.add(room);
    const woodMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.32, 0.22, 0.12)); return m; })();
    const steelMat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.24, 0.23, 0.22)); return m; })();
    // 枪架:三支步枪 + 两支狙击枪斜靠
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 0.24), woodMat);
    rack.position.set(bunkerSpots.rack.x, BUNKER.floorY + 0.75, bunkerSpots.rack.z);
    scene.add(rack);
    const rackRifleGeo = createRifleGeometry(), rackSniperGeo = createSniperGeometry(), rackSmgGeo = createSMGGeometry();
    for (let i = 0; i < 3; i++) {
      const gm = new THREE.Mesh(rackRifleGeo, woodMat);
      gm.position.set(bunkerSpots.rack.x - 0.8 + i * 0.5, BUNKER.floorY + 0.72, bunkerSpots.rack.z + 0.25);
      gm.rotation.set(-0.28, 0, 0.10);
      scene.add(gm);
    }
    for (let i = 0; i < 2; i++) {
      const gm = new THREE.Mesh(rackSniperGeo, steelMat);
      gm.position.set(bunkerSpots.rack.x + 0.7 + i * 0.5, BUNKER.floorY + 0.72, bunkerSpots.rack.z + 0.25);
      gm.rotation.set(-0.28, 0, -0.10);
      scene.add(gm);
    }
    const rackSmg = new THREE.Mesh(rackSmgGeo, woodMat);
    rackSmg.position.set(bunkerSpots.rack.x, BUNKER.floorY + 0.55, bunkerSpots.rack.z + 0.30);
    rackSmg.rotation.set(-0.28, 0, 0.05);
    scene.add(rackSmg);
    // 弹药箱堆
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), steelMat);
      crate.position.set(bunkerSpots.crates.x + (i % 2) * 0.8 - 0.4,
        BUNKER.floorY + 0.2 + Math.floor(i / 2) * 0.42, bunkerSpots.crates.z);
      crate.rotation.y = (Math.random() - 0.5) * 0.3;
      scene.add(crate);
    }
    // 桌子 + 作战地图 + 台灯(发光球)
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), woodMat);
    table.position.set(bunkerSpots.table.x, BUNKER.floorY + 0.75, bunkerSpots.table.z);
    scene.add(table);
    for (const [lx, lz] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodMat);
      leg.position.set(bunkerSpots.table.x + lx, BUNKER.floorY + 0.375, bunkerSpots.table.z + lz);
      scene.add(leg);
    }
    const map = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.62, 0.58, 0.44)); return m; })());
    map.rotation.x = -Math.PI / 2;
    map.position.set(bunkerSpots.table.x, BUNKER.floorY + 0.80, bunkerSpots.table.z);
    scene.add(map);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(1.8, 1.5, 0.9)); return m; })());
    lamp.position.set(BUNKER.x, BUNKER.floorY + 4.2, BUNKER.z);   // 顶灯
    scene.add(lamp);
    // 梯子(返回地面)
    const ladL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 6), steelMat);
    ladL.position.set(bunkerSpots.ladder.x, BUNKER.floorY + 2.3, bunkerSpots.ladder.z - 0.25);
    const ladR = ladL.clone();
    ladR.position.z = bunkerSpots.ladder.z + 0.25;
    scene.add(ladL, ladR);
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 5), steelMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(bunkerSpots.ladder.x, BUNKER.floorY + 0.4 + i * 0.6, bunkerSpots.ladder.z);
      scene.add(rung);
    }
    // 墙上褪色的红五星
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 16),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.48, 0.10, 0.08)); return m; })());
    star.rotation.z = Math.PI / 2;
    star.position.set(BUNKER.x - 5.9, BUNKER.floorY + 3.0, BUNKER.z);
    scene.add(star);
    // 东墙上的老照片(第二层密码的线索)
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.42, 0.36, 0.26)); return m; })());
    photo.rotation.y = -Math.PI / 2;
    photo.position.set(bunkerSpots.photo.x + 0.32, BUNKER.floorY + 2.6, bunkerSpots.photo.z);
    scene.add(photo);
  }
  function tryEnterBunker() {
    const pwd = window.prompt('输入管理员密码(彩蛋传送门):');
    if (pwd === null) return;
    if (pwd !== ADMIN_PASSWORD) { showToast('✗ 密码错误'); return; }
    walker.inBunker = true;
    walker.x = BUNKER.x + 4.4;
    walker.z = BUNKER.z;
    walker.y = BUNKER.floorY;
    walker.viewYaw = Math.PI / 2 * 3;         // 面向枪架一侧
    walker.viewPitch = 0;
    showToast('✓ 密码正确 · 欢迎来到二战老兵的地下军火库 —— 梯子按 E 返回地面');
  }
  function exitBunker() {
    walker.inBunker = false;
    walker.x = shelter.x + 1.5;
    walker.z = shelter.z + 1.5;
    walker.y = islandHeightAt(walker.x, walker.z);
    showToast('你攀着铁梯爬回地面,阳光有些刺眼');
  }
  function eatGodMeat() {
    if (walker.godMeat <= 0) { showToast('没有神肉 —— 猎杀虚空泰坦才能割取'); return; }
    walker.godMeat--;
    walker.hunger = 100;
    walker.thirst = 100;
    walker.stamina = walker.buff ? 200 : 100;
    startHandAction('eat');
    if (!walker.buff) {
      walker.buff = true;
      $('ih-buff').style.display = 'flex';
      showToast('⚡ 神肉入喉,异能觉醒!一斧倒树 · 箭箭致命 · 疾行如风 · 海之眷顾(消耗减半)');
    } else {
      showToast('神肉下肚,通体舒泰 · 状态全满');
    }
  }

  const flyingArrows = [];
  let shootCooldown = 0;
  function distPointToSegment(px, py, pz, ax, ay, az, bx, by, bz) {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const apx = px - ax, apy = py - ay, apz = pz - az;
    const ab2 = abx * abx + aby * aby + abz * abz || 1;
    const u = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / ab2));
    const qx = ax + abx * u, qy = ay + aby * u, qz = az + abz * u;
    return Math.hypot(px - qx, py - qy, pz - qz);
  }

  const tombShot = { count: 0, x: 0, z: 0, yaw: 0, pitch: 0, lastMsg: 0 };
  function angleDelta(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }
  function createTombEntrance(x, z) {
    const y = groundHeightAt(x, z);
    const stoneMat = makeNodeMat(vec3(0.20, 0.19, 0.17));
    const darkMat = makeNodeMat(vec3(0.035, 0.030, 0.026));
    const bronzeMat = makeNodeMat(vec3(0.42, 0.31, 0.15));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.18, 8, 48), stoneMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.08, z);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.16, 32), darkMat);
    hole.position.set(x, y + 0.03, z);
    scene.add(ring, hole);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI * 0.5 + 0.3;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 1.15), stoneMat);
      p.position.set(x + Math.cos(a) * 2.0, y + 0.18, z + Math.sin(a) * 2.0);
      p.rotation.y = -a;
      scene.add(p);
    }

    const floorY = y - 32;
    const room = new THREE.Group();
    const hintMeshes = [];
    const wallMat = makeNodeMat(vec3(0.16, 0.14, 0.12));
    const trapMat = makeNodeMat(vec3(0.52, 0.10, 0.08));
    const hintMat = makeNodeMat(vec3(1.0, 0.22, 0.12));
    const runeMat = makeNodeMat(vec3(0.72, 0.06, 0.05));
    const waterMat = makeNodeMat(vec3(0.06, 0.32, 0.38));
    const roomBox = new THREE.Mesh(new THREE.BoxGeometry(13, 5.2, 26), (() => {
      const m = new THREE.MeshBasicNodeMaterial();
      m.side = THREE.BackSide;
      m.colorNode = marineSkin(vec3(0.12, 0.105, 0.09));
      return m;
    })());
    roomBox.position.set(0, 2.6, -6);
    room.add(roomBox);
    const bendA = new THREE.Mesh(new THREE.BoxGeometry(15, 4.4, 4.2), roomBox.material);
    bendA.position.set(7.2, 2.2, -18.2);
    room.add(bendA);
    const bendB = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.4, 13), roomBox.material);
    bendB.position.set(14.2, 2.2, -12.0);
    room.add(bendB);
    const waterRoom = new THREE.Mesh(new THREE.BoxGeometry(14, 5.6, 11), roomBox.material);
    waterRoom.position.set(14.2, 2.8, -2.5);
    room.add(waterRoom);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 5.8), waterMat);
    pool.position.set(14.2, 0.08, -2.5);
    room.add(pool);
    for (const px of [-4.4, 0, 4.4]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 4.2, 10), wallMat);
      pillar.position.set(px, 2.1, -16.5);
      room.add(pillar);
    }
    const baguaOuter = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.045, 8, 64), bronzeMat);
    baguaOuter.rotation.x = -Math.PI / 2;
    baguaOuter.position.set(0, 0.09, -14.7);
    room.add(baguaOuter);
    const baguaInner = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.035, 8, 48), bronzeMat);
    baguaInner.rotation.x = -Math.PI / 2;
    baguaInner.position.set(0, 0.10, -14.7);
    room.add(baguaInner);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.92), bronzeMat);
      bar.position.set(Math.cos(a) * 1.65, 0.13, -14.7 + Math.sin(a) * 1.65);
      bar.rotation.y = -a;
      room.add(bar);
    }
    for (const [rx, rz, sc] of [[-4.4, -4.1, 1.0], [4.1, -8.3, 0.8], [-3.2, -12.2, 0.9], [3.8, -16.7, 0.75]]) {
      const sig = new THREE.Mesh(new THREE.BoxGeometry(1.2 * sc, 0.025, 0.10), runeMat);
      sig.position.set(rx, 0.11, rz);
      sig.rotation.y = Math.PI * 0.25;
      const sig2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.9 * sc), runeMat);
      sig2.position.set(rx, 0.115, rz);
      sig2.rotation.y = -Math.PI * 0.15;
      room.add(sig, sig2);
    }
    function addBronzeDing(lx, lz, s = 1) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.55 * s, 0.55 * s, 12), bronzeMat);
      body.position.y = 0.45 * s;
      g.add(body);
      for (const ox of [-0.30, 0.30]) for (const oz of [-0.25, 0.25]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.045 * s, 0.45 * s, 6), bronzeMat);
        leg.position.set(ox * s, 0.12 * s, oz * s);
        g.add(leg);
      }
      const earL = new THREE.Mesh(new THREE.TorusGeometry(0.13 * s, 0.018 * s, 6, 14), bronzeMat);
      earL.position.set(-0.34 * s, 0.78 * s, 0);
      earL.rotation.z = Math.PI / 2;
      const earR = earL.clone();
      earR.position.x = 0.34 * s;
      g.add(earL, earR);
      g.position.set(lx, 0, lz);
      room.add(g);
    }
    function addBronzeBell(lx, lz, s = 1) {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 0.85 * s, 12, 1, true), bronzeMat);
      bell.position.set(lx, 0.55 * s, lz);
      bell.rotation.z = Math.PI;
      room.add(bell);
      const top = new THREE.Mesh(new THREE.TorusGeometry(0.12 * s, 0.018 * s, 6, 14), bronzeMat);
      top.position.set(lx, 1.02 * s, lz);
      room.add(top);
    }
    addBronzeDing(-4.8, -15.3, 0.9);
    addBronzeDing(4.7, -18.1, 0.75);
    addBronzeBell(11.5, -18.2, 0.85);
    addBronzeBell(16.7, -6.4, 0.72);
    for (const zc of [-2.0, -6.5, -11.0]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.035, 1.35), trapMat);
      slab.position.set(zc === -6.5 ? -1.65 : 1.65, 0.035, zc);
      room.add(slab);
      const hint = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 6, 32), hintMat);
      hint.rotation.x = -Math.PI / 2;
      hint.position.set(slab.position.x, 0.08, zc);
      hint.visible = false;
      room.add(hint);
      hintMeshes.push(hint);
      const safe = zc === -6.5 ? 1.65 : -1.65;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.48), bronzeMat);
      mark.position.set(safe, 0.07, zc);
      mark.rotation.y = Math.PI * 0.25;
      room.add(mark);
    }
    const sarcBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.58, 1.25), stoneMat);
    sarcBase.position.set(-3.4, 0.38, -18.2);
    room.add(sarcBase);
    const sarcLid = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.18, 1.38), stoneMat);
    sarcLid.position.set(-3.4, 0.80, -18.2);
    room.add(sarcLid);
    const rewardMat = {
      bronze: bronzeMat,
      peach: makeNodeMat(vec3(0.46, 0.22, 0.11)),
      red: makeNodeMat(vec3(0.72, 0.08, 0.06)),
      jade: makeNodeMat(vec3(0.22, 0.72, 0.50)),
    };
    const tombRewards = [];
    function addTombReward(kind, name, mesh, lx, lz, y0 = 0.94) {
      mesh.position.set(lx, y0, lz);
      mesh.visible = false;
      room.add(mesh);
      tombRewards.push({ kind, name, mesh, x: x + lx, z: z + lz, taken: false });
    }
    const peach = new THREE.Group();
    const peachBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.92), rewardMat.peach);
    peachBlade.position.z = 0.12;
    const peachGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 8), rewardMat.peach);
    peachGrip.rotation.x = Math.PI / 2;
    peachGrip.position.z = -0.48;
    peach.add(peachBlade, peachGrip);
    peach.rotation.set(0.12, 0.2, -0.8);
    addTombReward('peachSword', '桃木剑', peach, -3.85, -18.1);
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.045, 32), rewardMat.bronze);
    mirror.rotation.x = Math.PI / 2;
    addTombReward('bronze', '青铜镜', mirror, -3.35, -18.45);
    const tally = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22), rewardMat.bronze);
    tally.rotation.y = 0.35;
    addTombReward('bronze', '青铜虎符', tally, -2.85, -18.12);
    const redBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.46, 16), rewardMat.red);
    addTombReward('redBottle', '红釉小瓶', redBottle, -3.05, -18.62);
    const jadeDuck = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 8), rewardMat.jade);
    jadeDuck.scale.set(1.35, 0.62, 0.82);
    addTombReward('jadeDuck', '碎玉鸭', jadeDuck, -3.75, -18.62);
    const compass = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 24), rewardMat.bronze);
    compass.rotation.x = Math.PI / 2;
    addTombReward('yinyangCompass', '阴阳罗盘', compass, -3.35, -17.88);
    const exitMark = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), bronzeMat);
    exitMark.position.set(5.3, 0.04, 0);
    room.add(exitMark);
    const crawlMark = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.10, 0.42), darkMat);
    crawlMark.position.set(3.8, 0.08, -18.2);
    room.add(crawlMark);
    const ladderMat = makeNodeMat(vec3(0.46, 0.31, 0.16));
    const waterLadder = new THREE.Group();
    for (const lx of [-0.24, 0.24]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.65, 8), ladderMat);
      rail.position.set(lx, 1.22, 0);
      rail.rotation.x = 0.22;
      waterLadder.add(rail);
    }
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 8), ladderMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.24 + i * 0.34, Math.sin(i * 0.7) * 0.025);
      waterLadder.add(rung);
    }
    const wetGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), bronzeMat);
    wetGlow.position.set(0, 2.55, 0.03);
    waterLadder.add(wetGlow);
    waterLadder.position.set(13.25, 0.02, -4.75);
    waterLadder.rotation.y = Math.PI / 2;
    room.add(waterLadder);
    const letterMat = makeNodeMat(vec3(0.58, 0.42, 0.20));
    const inkMat = makeNodeMat(vec3(0.08, 0.055, 0.035));
    const sealMat = makeNodeMat(vec3(0.74, 0.06, 0.04));
    const letter = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const slip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.035, 0.72), letterMat);
      slip.position.set((i - 4) * 0.115, 0.035, 0);
      letter.add(slip);
      if (i % 2 === 0) {
        const ink = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.48), inkMat);
        ink.position.set((i - 4) * 0.115, 0.065, 0.02);
        letter.add(ink);
      }
    }
    const cordA = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.035), inkMat);
    cordA.position.set(0, 0.09, -0.22);
    const cordB = cordA.clone();
    cordB.position.z = 0.22;
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 16), sealMat);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0.46, 0.12, 0);
    letter.add(cordA, cordB, seal);
    letter.position.set(14.2, 0.18, 1.8);
    letter.rotation.y = -0.35;
    room.add(letter);
    room.position.set(x, floorY, z);
    scene.add(room);
    relicSpots.tomb = {
      x, z, y, floorY, room,
      traps: [
        { x: x + 1.65, z: z - 2.0, r: 1.35, safe: '左侧半格' },
        { x: x - 1.65, z: z - 6.5, r: 1.35, safe: '右侧半格' },
        { x: x + 1.65, z: z - 11.0, r: 1.35, safe: '左侧半格' },
      ],
      hintMeshes, sarcLid, tombRewards,
      crawl: { x: x + 3.8, z: z - 18.2 },
      water: { x: x + 14.2, z: z - 2.5 },
      waterLadder: { x: x + 13.25, z: z - 4.75, mesh: waterLadder },
      historian: { x: x + 14.2, z: z + 1.8, mesh: letter },
    };
  }
  function trackTombShot(x, z, shot) {
    if (relics.tombFound || !walker.on || walker.inBunker || walker.inTomb) return;
    const gh = groundHeightAt(x, z);
    if (gh < 0.25) return;
    const yaw = shot.aimYaw ?? walker.viewYaw;
    const pitch = shot.aimPitch ?? walker.viewPitch;
    const sameSpot = tombShot.count > 0 && Math.hypot(x - tombShot.x, z - tombShot.z) < 4.5;
    const sameView = tombShot.count > 0 && angleDelta(yaw, tombShot.yaw) < 0.018 && Math.abs(pitch - tombShot.pitch) < 0.018;
    if (!sameSpot || !sameView) {
      tombShot.count = 1;
      tombShot.x = x; tombShot.z = z; tombShot.yaw = yaw; tombShot.pitch = pitch;
      return;
    }
    tombShot.count++;
    if ([25, 50, 75, 95].includes(tombShot.count)) {
      showToast('地面裂纹越来越明显…… 连续同点射击 ' + tombShot.count + '/100');
    }
    if (tombShot.count >= 100) {
      relics.tombFound = true;
      const tx = x + Math.sin(yaw + Math.PI * 0.5) * 3.2;
      const tz = z + Math.cos(yaw + Math.PI * 0.5) * 3.2;
      createTombEntrance(tx, tz);
      eggNavTarget = relicSpots.tomb;
      showToast('🕳 地面塌开一道古墓盗洞!先收集铁锭/灯油/硬木柄,带上绳子和木材,在墓口按 E 制作盗墓装备');
    }
  }

  function fireSwordTurret() {
    const turret = walker.swordTurret;
    if (!turret || shootCooldown > 0) return;
    if (turret.ammo <= 0) { showToast('长剑炮台箭匣空了'); return; }
    turret.ammo--;
    shootCooldown = 0.22;
    walker.shakeT = Math.max(walker.shakeT, 0.10);
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch), dz = Math.cos(walker.viewYaw) * cp;
    turret.dir = walker.viewYaw;
    turret.mesh.rotation.y = walker.viewYaw;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 1.35), arrowMat);
    const oy = turret.y + SWORD_TURRET_EYE_LIFT;
    blade.position.set(turret.x + dx * 1.2, oy + dy * 1.2, turret.z + dz * 1.2);
    scene.add(blade);
    flyingArrows.push({
      x: blade.position.x, y: blade.position.y, z: blade.position.z,
      px: blade.position.x, py: blade.position.y, pz: blade.position.z,
      vx: dx * 155, vy: dy * 155, vz: dz * 155,
      mesh: blade, stuck: false, life: 0, swordTurret: true, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
    if (turret.ammo % 100 === 0 || turret.ammo < 20) showToast('⚔ 长剑炮台齐射!剩余箭矢 ' + turret.ammo + '/1000');
  }

  function shootArrow() {
    if (!walker.on || shootCooldown > 0) return;
    if (walker.swordTurret) { fireSwordTurret(); return; }
    if (fishing.active) {
      if (fishing.phase === 'bite') hookFish();
      else showToast('正钓着鱼 —— 咬钩时按空格收杆,H 收起鱼竿');
      return;
    }
    if (walker.weapon === 'sniper' && walker.sniper) { fireSniper(); return; }
    if (walker.weapon === 'smg' && walker.smg) { fireSMG(); return; }
    if (walker.weapon === 'rifle' && walker.rifle) { fireRifle(); return; }
    if (walker.catapult && nearestPlacedCatapult(5.0)) { fireCatapult(); return; }
    if (walker.weapon === 'spear' && walker.spear) { throwSpear(); return; }
    if (walker.arrows <= 0) {
      showToast('没箭了 —— 按 Q 用 1 木柴 + 1 石块打磨 3 支');
      return;
    }
    walker.arrows--;
    shootCooldown = 0.8;
    startHandAction('shoot');
    const cp = Math.cos(walker.viewPitch);
    const dx = Math.sin(walker.viewYaw) * cp, dy = Math.sin(walker.viewPitch), dz = Math.cos(walker.viewYaw) * cp;
    const mesh = new THREE.Mesh(arrowGeo, arrowMat);
    const eyeY = walker.y + 1.55;
    mesh.position.set(walker.x + dx * 0.6, eyeY + dy * 0.6, walker.z + dz * 0.6);
    scene.add(mesh);
    flyingArrows.push({
      x: mesh.position.x, y: mesh.position.y, z: mesh.position.z,
      vx: dx * 46, vy: dy * 46, vz: dz * 46,
      sx: walker.x, sz: walker.z,
      mesh, stuck: false, life: 0, aimYaw: walker.viewYaw, aimPitch: walker.viewPitch,
    });
  }

  const _av = new THREE.Vector3();
  function updateHunt(t, dt) {
    shootCooldown = Math.max(0, shootCooldown - dt);
    // 冲锋枪:按住空格全自动泼洒
    if (walker.on && spaceHeld && !fishing.active) {
      if (walker.swordTurret) fireSwordTurret();
      else if (walker.weapon === 'smg' && walker.smg) fireSMG();
    }
    const threat = walker.on ? walker : null;
    // 猎物 AI
    for (const h of huntables) {
      if (h.state === 'dead') {
        if (h.fallK < 1) {
          h.fallK = Math.min(1, h.fallK + dt * 2.2);
          h.mesh.rotation.z = h.fallK * 1.35;
          h.mesh.position.y = islandHeightAt(h.x, h.z) + h.spec.bodyR * (0.4 + h.fallK * 0.2);
        }
        continue;
      }
      const dThreat = threat ? Math.hypot(threat.x - h.x, threat.z - h.z) : 1e9;
      if (h.kind === 'deer') {
        if (h.state === 'graze') {
          if (threat && dThreat < 10) { h.state = 'alert'; h.t = 0.5; h.speed = 0; }
          else if (h.t <= 0) {
            h.dir += (Math.random() - 0.5) * 1.4;
            h.speed = Math.random() < 0.5 ? 0 : 0.7;
            h.t = 2 + Math.random() * 3;
          }
        } else if (h.state === 'alert') {
          h.dir = threat ? Math.atan2(threat.x - h.x, threat.z - h.z) : h.dir;
          if (h.t <= 0) {
            if (threat && dThreat < 12) { h.state = 'flee'; h.t = 2.5 + Math.random(); h.speed = h.spec.speed; }
            else { h.state = 'graze'; h.t = 1; }
          }
        } else if (h.state === 'flee') {
          if (threat) h.dir = Math.atan2(h.x - threat.x, h.z - threat.z) + Math.sin(t * 2) * 0.2;
          h.speed = h.spec.speed;
          if (h.t <= 0 || !threat) { h.state = 'graze'; h.t = 2; h.speed = 0; }
        }
      } else {  // 野猪
        if (h.state === 'charge') {
          if (!threat) { h.state = 'graze'; h.t = 1; h.speed = 0; }
          else {
            h.dir = Math.atan2(threat.x - h.x, threat.z - h.z);
            h.speed = h.spec.speed;
            if (dThreat < 1.4) {         // 撞上了!
              walker.stamina = Math.max(0, walker.stamina - 35);
              walker.shakeT = 0.6;
              showToast('⚠ 被野猪撞了个趔趄!体力 -35');
              h.state = 'flee'; h.t = 3;
              h.dir = Math.atan2(h.x - threat.x, h.z - threat.z);
            } else if (h.t <= 0) { h.state = 'graze'; h.t = 1; h.speed = 0; }
          }
        } else if (h.state === 'flee') {
          h.speed = h.spec.speed * 0.8;
          if (h.t <= 0 || !threat) { h.state = 'graze'; h.t = 2; h.speed = 0; }
        } else {
          if (threat && dThreat < 5) {    // 未激怒时避开人
            h.dir = Math.atan2(h.x - threat.x, h.z - threat.z);
            h.speed = 1.6;
          } else if (h.t <= 0) {
            h.dir += (Math.random() - 0.5) * 1.6;
            h.speed = Math.random() < 0.6 ? 0 : 0.5;
            h.t = 2 + Math.random() * 3.5;
          }
        }
      }
      if (h.speed > 0) {
        const nx = h.x + Math.sin(h.dir) * h.speed * dt;
        const nz = h.z + Math.cos(h.dir) * h.speed * dt;
        const gh = islandHeightAt(nx, nz);
        if (gh > 0.4 && gh < 20) { h.x = nx; h.z = nz; } else { h.dir += Math.PI * 0.5; }
        h.mesh.rotation.y = h.dir;
      }
      h.mesh.position.set(h.x, islandHeightAt(h.x, h.z), h.z);
      h.t -= dt;
    }
    // 箭矢飞行 + 命中判定(头优先)
    for (let i = flyingArrows.length - 1; i >= 0; i--) {
      const a = flyingArrows[i];
      a.life += dt;
      if (!a.stuck) {
        a.px = a.x; a.py = a.y; a.pz = a.z;
        if (!a.swordTurret) a.vy -= 9.8 * dt;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
        a.mesh.position.set(a.x, a.y, a.z);
        _av.set(a.vx, a.vy, a.vz).normalize();
        a.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _av);
        let hit = false;
        for (const h of huntables) {
          if (h.state === 'dead') continue;
          const hy = islandHeightAt(h.x, h.z);
          const hx = h.x + Math.sin(h.dir) * h.spec.headZ;
          const hz = h.z + Math.cos(h.dir) * h.spec.headZ;
          const dh = Math.hypot(a.x - hx, a.y - (hy + h.spec.headY), a.z - hz);
          const db = Math.hypot(a.x - h.x, a.y - (hy + h.spec.bodyY), a.z - h.z);
          if (dh < h.spec.headR) { a.bullet ? bulletHit(h) : hitHuntable(h, true); hit = true; break; }
          if (db < h.spec.bodyR) { a.bullet ? bulletHit(h) : hitHuntable(h, false); hit = true; break; }
        }
        // 白鹭:小目标,箭/子弹都能打落
        if (!hit) {
          for (const tox of toxicAnimals) {
            if (tox.dead) continue;
            const ty = newIslandHeightAt(tox.x, tox.z) + 0.18;
            if (Math.hypot(a.x - tox.x, a.y - ty, a.z - tox.z) < 0.45) {
              hit = true;
              tox.dead = true;
              tox.mesh.visible = false;
              tox.respawnT = 120;
              if (a.spear && walker.savage) {
                walker.venom++;
                showToast((tox.kind === 'snake' ? '🐍' : '☠') + ' 长矛刺中毒物,提取毒液 +1(Q 可制作毒矛)');
              } else showToast('击中了毒物,但没有野人手法,毒液浪费了');
              break;
            }
          }
        }
        if (!hit) {
          for (const an of animals) {
            if (an.kind !== 'egret' || an.state === 'dead' || an.harvested) continue;
            const ey = an.mesh.position.y + 0.42;
            if (Math.hypot(a.x - an.x, a.y - ey, a.z - an.z) < 0.34) {
              hit = true;
              an.state = 'dead';
              an.deadK = 0;
              showToast((a.bullet ? '🔫 一枪' : '🏹 一箭') + '射落一只白鹭!按 E 捡拾(肉 +1)');
              break;
            }
          }
        }
        // 椰壳靶架:普通弓箭可射击练准头,命中后加靶分并给小奖励
        if (!hit && !a.bullet && !a.spear && !a.catapult && !a.swordTurret) {
          for (const ct of curios) {
            if (ct.kind !== 'coconutTarget' || ct.taken) continue;
            const cy = ct.y + 0.92;
            const d = distPointToSegment(ct.x, cy, ct.z, a.px, a.py, a.pz, a.x, a.y, a.z);
            if (d < 0.42) {
              hit = true;
              if ((ct.challengeT || 0) <= 0) {
                showToast('🥥 靶架命中了,但没开限时挑战 —— 先靠近按 E 开始');
                break;
              }
              const shotD = Math.hypot((a.sx ?? walker.x) - ct.x, (a.sz ?? walker.z) - ct.z);
              if (shotD < 8 || shotD > 28) {
                showToast('🥥 靶架命中了,但距离不算数 · 有效距离 8-28 米,本箭 ' + Math.round(shotD) + ' 米');
                break;
              }
              const bullseye = d < 0.16;
              const pts = bullseye ? 10 : 4;
              ct.score = (ct.score || 0) + pts;
              ct.hitT = 0.8;
              ct.challengeT = 0;
              ct.cd = 42;
              walker.targetScore = (walker.targetScore || 0) + pts;
              walker.arrows += bullseye ? 2 : 1;
              let bonus = '';
              if (bullseye) {
                const roll = Math.random();
                if (roll < 0.40) { walker.seaGlass++; bonus = ' · 海玻璃 +1'; }
                else if (roll < 0.72) { walker.seaPearl++; bonus = ' · 海珠 +1'; }
                else { walker.shellCharm++; bonus = ' · 贝壳护符 +1'; }
              } else if (Math.random() < 0.35) {
                walker.casing++;
                bonus = ' · 铜壳 +1';
              }
              walker.shakeT = Math.max(walker.shakeT, 0.18);
              showToast((bullseye ? '🎯 椰壳靶架正中靶心!' : '🥥 椰壳靶架命中外环!')
                + ' +' + pts + ' 分 · 靶分累计 ' + walker.targetScore
                + ' · 回收箭 +' + (bullseye ? 2 : 1) + bonus);
              break;
            }
          }
        }
        // 万斤巨物:庞大的身躯是最好中的靶子(所有在场泰坦)
        for (const gt of titans) {
          if (hit || gt.state !== 'rage') continue;
          const gd = Math.hypot(a.x - gt.x, a.y - (gt.y + 10), a.z - gt.z);
          if (gd < 45) {
            hit = true;
            gt.hp -= a.swordTurret ? 18 : a.sniper ? 15 : (a.smg ? 2 : (a.bullet ? (walker.buff ? 6 : 3) : (walker.buff ? 5 : 1)));
            if (gt.hp <= 0) {
              killTitan(gt);
              showToast('☠ 虚空泰坦 · ' + gt.sp.name + ' 翻起了雪白的肚皮…… 漂到岸边后按 E '
                + (myTamedTitan() ? '让泰坦融合它' : '割取神肉') + '(已猎杀 ' + titansSlain + '/' + TITAN_MAX + ')');
            } else {
              showToast((a.swordTurret ? '⚔ 长剑炮台贯入泰坦皮肉!' : a.sniper ? '🎯 狙击弹撕开泰坦皮肉!' : a.bullet ? '🔫 子弹钻进泰坦皮肉!' : '🏹 射中泰坦!')
                + '(' + gt.sp.name + ' 生命 ' + gt.hp + '/' + gt.maxHp + ')');
            }
          }
        }
        // 野人:新岛上的活靶子
        if (!hit) {
          for (const sv of savages) {
            if (sv.dead) continue;
            const sy = newIslandHeightAt(sv.x, sv.z);
            const savageHit = a.swordTurret
              ? distPointToSegment(sv.x, sy + 0.95, sv.z, a.px, a.py, a.pz, a.x, a.y, a.z) < 1.85
              : Math.hypot(a.x - sv.x, a.y - (sy + 0.9), a.z - sv.z) < 0.65;
            if (savageHit) {
              hit = true;
              if (a.swordTurret) {
                sv.hp -= sv.elder ? 7 : 999;
                if (sv.hp <= 0) {
                  markSavageDead(sv, sv.elder ? 999 : 90);
                  showToast(sv.elder ? '⚔ 长剑炮台刺穿野人长老!长老队崩溃了' : '⚔ 长剑炮台一剑贯穿野人!');
                } else {
                  sv.aggroT = Math.max(sv.aggroT || 0, 180);
                  showToast('⚔ 长剑炮台命中野人长老!他还剩 ' + sv.hp + '/' + sv.maxHp + ' 生命,仇恨已锁定你');
                }
                break;
              }
              const savageDmg = a.swordTurret ? 55
                : a.catapult ? 95
                  : a.sniper ? 100
                    : a.smg ? 60
                      : a.bullet ? 50
                        : a.spear ? (a.savageRole === 'swordsman' ? 70 : a.savageRole === 'shield' ? 45 : 55)
                          : 50;
              sv.hp -= savageDmg;
              if (!a.bullet && !a.spear && !a.catapult && !a.swordTurret) {
                const pts = sv.hp <= 0 ? 8 : 3;
                walker.bowFightScore = (walker.bowFightScore || 0) + pts;
                if (sv.hp > 0) {
                  sv.aggroT = Math.max(sv.aggroT || 0, 120);
                  showToast('🏹 弓箭命中野人 +' + pts + ' 战斗分 · 弓战累计 ' + walker.bowFightScore + ' · 对方生命 ' + sv.hp + '/' + sv.maxHp);
                  break;
                }
              }
              if (sv.hp <= 0) {
                markSavageDead(sv, 90);
                showToast((a.swordTurret ? '⚔ 长剑炮台' : a.catapult ? '🪨 一发巨石' : a.sniper ? '🎯 狙击弹' : a.smg ? '🔫 冲锋枪' : a.bullet ? '🔫 步枪' : a.spear ? '🗡 一矛' : '🏹 一箭') + '放倒了野人!'
                  + (!a.bullet && !a.spear && !a.catapult && !a.swordTurret ? ' +8 战斗分 · 弓战累计 ' + walker.bowFightScore : ''));
              } else showToast((a.sniper ? '🎯 狙击弹' : a.smg ? '🔫 冲锋枪' : a.bullet ? '🔫 步枪子弹' : '野人') + '命中野人 · 伤害 ' + savageDmg + ' · 剩余生命 ' + sv.hp + '/' + sv.maxHp);
              break;
            }
          }
        }
        // 联机:命中好友本人 → 定向伤害;命中好友的驯服泰坦 → 转发给主人家
        if (!hit && mp.ws && mp.ws.readyState === 1) {
          for (const p of mp.peers.values()) {
            if (hit) break;
            if ((p.mode === 'walk' || p.mode === 'ride')
                && Math.hypot(a.x - p.cx, a.y - (p.cy + 0.9), a.z - p.cz) < 0.8) {
              hit = true;
              const spearDmg = a.savageRole === 'swordsman' ? 48 : a.savageRole === 'shield' ? 28 : a.savageRole === 'poisoner' ? 32 : 38;
              const dmg = a.catapult ? 95 : (a.swordTurret ? 55 : (a.spear ? spearDmg : (a.sniper ? 45 : (a.smg ? 8 : (a.bullet ? 30 : 15)))));
              mp.ws.send(JSON.stringify({ t: 'hit', target: p.id, dmg, kind: a.poison ? 'poison-spear' : a.catapult ? 'catapult' : a.swordTurret ? 'sword-turret' : a.spear ? 'spear' : a.bullet ? 'bullet' : 'arrow', poison: !!a.poison }));
              showToast(a.poison ? '☠ 毒矛命中好友!对方会视野模糊并持续掉血' : '🎯 命中好友!对方生命 -' + dmg);
            } else if (p.tg && Math.hypot(a.x - p.tgx, a.y - (p.tgy + 10), a.z - p.tgz) < 40) {
              hit = true;
              const dmg = a.catapult ? 8 : (a.swordTurret ? 5 : (a.sniper ? 15 : (a.smg ? 2 : (a.bullet ? 3 : a.spear ? 2 : 1))));
              mp.ws.send(JSON.stringify({ t: 'thit', target: p.id, dmg }));
              showToast('🎯 射中了好友的泰坦!');
            }
          }
        }
        if (hit) {
          if (a.catapult) { spawnImpactRing(a.x, a.z, 8); applyCatapultAOE(a.x, a.z, 8); }
          scene.remove(a.mesh); flyingArrows.splice(i, 1); continue;
        }
        const gh = groundHeightAt(a.x, a.z);
        if (a.y <= gh + 0.03) {           // 箭插进地里可回收;子弹直接没入土中
          trackTombShot(a.x, a.z, a);
          if (a.catapult) {
            spawnImpactRing(a.x, a.z, 8);
            applyCatapultAOE(a.x, a.z, 8);
            scene.remove(a.mesh); flyingArrows.splice(i, 1); continue;
          }
          if (a.bullet) { scene.remove(a.mesh); flyingArrows.splice(i, 1); continue; }
          a.stuck = true;
          a.y = gh + 0.03;
        } else if (a.y < waveHeightAt(a.x, a.z, t, seaStateEff) && gh < -0.5) {
          if (a.catapult) { spawnImpactRing(a.x, a.z, 8); applyCatapultAOE(a.x, a.z, 8); }
          scene.remove(a.mesh); flyingArrows.splice(i, 1); continue;   // 落水
        }
      }
      if (a.life > 30) { scene.remove(a.mesh); flyingArrows.splice(i, 1); }
    }
    // 陷阱:猎物踩中 → 50% 捕获
    for (let i = traps.length - 1; i >= 0; i--) {
      const tp = traps[i];
      if (!tp.armed) continue;
      for (const h of huntables) {
        if (h.state === 'dead') continue;
        if (Math.hypot(h.x - tp.x, h.z - tp.z) < 1.1) {
          tp.armed = false;
          scene.remove(tp.mesh);
          traps.splice(i, 1);
          if (Math.random() < 0.5) {
            killHuntable(h);
            showToast('✓ 陷阱捕获了' + h.spec.name + '!按 E 收割');
          } else {
            h.state = 'flee'; h.t = 3; h.speed = h.spec.speed;
            showToast('猎物挣脱了陷阱……夹子报废了');
          }
          break;
        }
      }
    }
    // 石块重生
    for (const st of stones) {
      if (st.taken) {
        st.respawnT -= dt;
        if (st.respawnT <= 0) { st.taken = false; st.mesh.visible = true; }
      }
    }
  }

  function updateAnimals(t, dt) {
    const threat = walker.on ? walker : null;
    for (const an of animals) {
      an.t -= dt;
      const dThreat = threat ? Math.hypot(threat.x - an.x, threat.z - an.z) : 1e9;
      if (an.kind === 'crab') {
        if (an.dead) {                                  // 被斧头拍扁:60 秒后沙滩重生
          an.respawnT -= dt;
          if (an.respawnT <= 0) {
            for (let tries = 0; tries < 20; tries++) {
              const a2 = Math.random() * Math.PI * 2;
              const r2 = ISLAND.R * (0.55 + Math.random() * 0.4);
              const nx = ISLAND.x + Math.cos(a2) * r2, nz = ISLAND.z + Math.sin(a2) * r2;
              const h2 = islandHeightAt(nx, nz);
              if (h2 > 0.2 && h2 < 1.4) {
                an.x = nx; an.z = nz;
                an.dead = false;
                an.mesh.visible = true;
                an.state = 'idle';
                break;
              }
            }
          }
          continue;
        }
        if (dThreat < 4 && an.state !== 'flee') {
          an.state = 'flee'; an.t = 1.0;
          an.dir = Math.atan2(an.x - threat.x, an.z - threat.z);
        }
        if (an.state === 'flee') {
          an.speed = 2.4;
          if (an.t <= 0) { an.state = 'idle'; an.t = 1 + Math.random() * 2; an.speed = 0; }
        } else if (an.state === 'idle' && an.t <= 0) {
          an.state = 'walk'; an.t = 1 + Math.random() * 1.5;
          an.dir += (Math.random() - 0.5) * 1.5; an.speed = 0.5;
        } else if (an.state === 'walk' && an.t <= 0) {
          an.state = 'idle'; an.t = 1 + Math.random() * 2.5; an.speed = 0;
        }
        if (an.speed > 0) {
          const nx = an.x + Math.sin(an.dir) * an.speed * dt;
          const nz = an.z + Math.cos(an.dir) * an.speed * dt;
          const h = islandHeightAt(nx, nz);
          if (h > 0.1 && h < 1.8) { an.x = nx; an.z = nz; } else { an.dir += Math.PI * 0.6; }
          an.mesh.rotation.y = an.dir + Math.PI / 2;          // 蟹:面朝侧向横行
          an.mesh.rotation.z = Math.sin(t * 30) * 0.06;
        } else an.mesh.rotation.z = 0;
        an.mesh.position.set(an.x, islandHeightAt(an.x, an.z) + 0.09, an.z);
      } else if (an.kind === 'lizard') {
        if (dThreat < 3 && an.state !== 'dart') {
          an.state = 'dart'; an.t = 0.9;
          an.dir = Math.atan2(an.x - threat.x, an.z - threat.z) + (Math.random() - 0.5) * 0.8;
        }
        if (an.state === 'dart') {
          an.speed = 3.2;
          const nx = an.x + Math.sin(an.dir) * an.speed * dt;
          const nz = an.z + Math.cos(an.dir) * an.speed * dt;
          const h = islandHeightAt(nx, nz);
          if (h > 0.8) { an.x = nx; an.z = nz; } else { an.dir += 1.2; }
          an.mesh.rotation.y = an.dir + Math.sin(t * 25) * 0.25;   // 窜逃时摆尾
          if (an.t <= 0) { an.state = 'bask'; an.t = 2 + Math.random() * 4; an.speed = 0; an.mesh.rotation.y = an.dir; }
        } else {
          an.mesh.rotation.x = Math.sin(t * 0.8 + an.dir * 10) * 0.03;  // 晒阳时偶尔抬头
        }
        an.mesh.position.set(an.x, islandHeightAt(an.x, an.z) + 0.05, an.z);
      } else if (an.kind === 'egret') {
        if (an.state === 'dead') {
          // 中箭坠地:侧倒;被收割后 90 秒在另一处水线重生
          an.deadK = Math.min(1, (an.deadK || 0) + dt * 3);
          an.mesh.rotation.z = an.deadK * 1.5;
          an.mesh.position.set(an.x, islandHeightAt(an.x, an.z) + 0.12, an.z);
          an.wingL.rotation.z = 0.08; an.wingR.rotation.z = -0.08;
          if (an.harvested) {
            an.mesh.visible = false;
            an.wingL.visible = an.wingR.visible = false;
            an.respawnT -= dt;
            if (an.respawnT <= 0) {
              for (let tries = 0; tries < 20; tries++) {
                const a2 = Math.random() * Math.PI * 2;
                const r2 = ISLAND.R * (0.62 + Math.random() * 0.35);
                const nx = ISLAND.x + Math.cos(a2) * r2, nz = ISLAND.z + Math.sin(a2) * r2;
                const h2 = islandHeightAt(nx, nz);
                if (h2 > -0.3 && h2 < 0.5) {
                  an.x = nx; an.z = nz;
                  an.state = 'stand'; an.t = 2;
                  an.harvested = false; an.deadK = 0;
                  an.mesh.rotation.z = 0;
                  an.mesh.visible = true;
                  an.wingL.visible = an.wingR.visible = true;
                  break;
                }
              }
            }
          }
        } else if (an.state === 'stand') {
          if (dThreat < 6) {
            // 找 15~28m 外另一处水线落点
            for (let tries = 0; tries < 12; tries++) {
              const a = Math.random() * Math.PI * 2;
              const d = 15 + Math.random() * 13;
              const nx = an.x + Math.cos(a) * d, nz = an.z + Math.sin(a) * d;
              const h = islandHeightAt(nx, nz);
              if (h > -0.3 && h < 0.5) {
                an.state = 'fly'; an.fx = an.x; an.fz = an.z;
                an.tx = nx; an.tz = nz;
                an.flyDur = d / 8; an.t = an.flyDur;
                an.dir = Math.atan2(nx - an.x, nz - an.z);
                break;
              }
            }
          }
          an.wingL.rotation.z = 0.08; an.wingR.rotation.z = -0.08;   // 收翅
        } else {
          const k = 1 - Math.max(0, an.t / an.flyDur);
          an.x = an.fx + (an.tx - an.fx) * k;
          an.z = an.fz + (an.tz - an.fz) * k;
          const flyY = islandHeightAt(an.x, an.z) + Math.sin(k * Math.PI) * 5;
          an.mesh.position.set(an.x, flyY, an.z);
          an.mesh.rotation.y = an.dir;
          const flap = Math.sin(t * 22) * 0.85;
          an.wingL.rotation.z = 0.2 + flap;
          an.wingR.rotation.z = -0.2 - flap;
          if (an.t <= 0) { an.state = 'stand'; an.t = 2; }
        }
        if (an.state === 'stand') {
          an.mesh.position.set(an.x, islandHeightAt(an.x, an.z), an.z);
          an.mesh.rotation.y = an.dir + Math.sin(t * 0.5 + an.x) * 0.3;
        }
      }
    }
  }


  const speedBoat = boats[1];
  const walker = {
    on: false, x: 0, z: 0, y: 0, heading: 0, phase: 0, viewYaw: 0, viewPitch: 0,
    stamina: 100, hunger: 100, thirst: 100, wood: 0, timber: 0, rope: 0, coconut: 0, faintT: 0,
    hp: PLAYER_HP_MAX, godMode: false, bombs: 5, bombCd: 0, bombAdmin: false, savage: false, savageRole: '', // 生命;无敌;磁吸炸弹;野人形态/职业
    spear: false, catapult: false, villageLooted: false, // 野人专属:长矛/投石机/村落智慧
    catapultAmmo: 0, cuttingRock: null, carryingCatapult: null, // 投石机巨石弹;切割任务;搬运中的炮台
    arrows: 10, traps: 3, stone: 0, meat: 0, shakeT: 0, jumpT: 0,   // 开局:10 支箭 + 3 个陷阱
    pots: 1, godMeat: 0, buff: false,                    // 1 个捕蟹笼;神肉与异能
    scrap: 0, gear: 0, powder: 0, lead: 0, casing: 0, primer: 0, // 枪械/弹药材料
    tombIron: 0, tombLamp: 0, tombHandle: 0, inTomb: false, // 盗墓装备材料/墓室状态
    rifle: false, bullets: 0, weapon: 'bow',             // 老兵的步枪(找到后按 2 切换)
    sniper: false, sniperAmmo: 0,                        // 卡莫星狙击枪(箱底夹层,两发放倒虚空泰坦)
    smg: false, smgAmmo: 0, inBunker: false, poisonT: 0, poisonBlurT: 0, venom: 0, poisonSpear: 0, // 冲锋枪;中毒/毒液/毒矛
    peachSword: false, tombBronze: 0, tombJade: 0, tombBottle: 0, tombDigT: 0, tombDigTotal: 0, tombCrawlT: 0, tombCrawlBack: false,
    seaPearl: 0, seaGlass: 0, shellCharm: 0, driftToken: 0, oceanTear: 0, targetScore: 0, bowFightScore: 0, // 荒岛奇物收藏
    swordTurret: null,                          // 长城最高烽火台固定长剑炮台
  };
  let shiftDown = false;
  let spaceHeld = false;        // 冲锋枪全自动要用
  const recall = { active: false, t: 0, target: null, lastPing: -1 };
  const GOD_MODE_PASSWORD = '123456789';

  function walkerMaxHp() {
    return walker.savageRole === 'shield' ? 260
      : walker.savageRole === 'swordsman' ? 220
        : walker.savageRole === 'poisoner' ? 180 : PLAYER_HP_MAX;
  }

  function toggleGodMode() {
    const pwd = window.prompt('无敌之身密码:');
    if (pwd === null) return;
    if (pwd.trim() !== GOD_MODE_PASSWORD) {
      showToast('无敌之身密码错误');
      return;
    }
    walker.godMode = !walker.godMode;
    if (walker.godMode) {
      walker.hp = walkerMaxHp();
      walker.stamina = walker.buff ? 200 : 100;
      walker.hunger = 100;
      walker.thirst = 100;
      walker.poisonT = 0;
      walker.poisonBlurT = 0;
      walker.faintT = 0;
      walker.shakeT = 0;
    }
    $('ih-godmode').style.display = walker.godMode ? 'flex' : 'none';
    showToast(walker.godMode
      ? '👑 无敌之身已开启 · 任何攻击、毒伤和机关都无法伤害你'
      : '无敌之身已关闭');
  }

  function isNearSecondIslandByBoat() {
    if (!driving || Math.abs(driveTarget.u) >= 3) return false;
    const centerD = Math.hypot(driveTarget.x - NEW_ISLAND.x, driveTarget.z - NEW_ISLAND.z);
    if (centerD > NEW_ISLAND.R * 1.55) return false;
    const here = newIslandHeightAt(driveTarget.x, driveTarget.z);
    if (here > -9) return true;
    const dx = NEW_ISLAND.x - driveTarget.x, dz = NEW_ISLAND.z - driveTarget.z;
    const dd = Math.hypot(dx, dz) || 1;
    for (let s = 0; s < Math.min(260, NEW_ISLAND.R * 0.95); s += 5) {
      if (newIslandHeightAt(driveTarget.x + dx / dd * s, driveTarget.z + dz / dd * s) > 0.8) return true;
    }
    return false;
  }

  function disembarkInfo() {
    if (!driving || Math.abs(driveTarget.u) >= 3) return null;
    const islandList = [
      { isle: ISLAND, height: islandHeightAt },
    ];
    if (relics.yinyangCompass) {
      islandList.push({ isle: THIRD_ISLAND, height: (x, z) => remoteIslandHeightAt(THIRD_ISLAND, x, z) });
      islandList.push({ isle: FOURTH_ISLAND, height: (x, z) => remoteIslandHeightAt(FOURTH_ISLAND, x, z) });
    }
    const candidates = [];
    for (const item of islandList) {
      const centerD = Math.hypot(driveTarget.x - item.isle.x, driveTarget.z - item.isle.z);
      if (centerD > item.isle.R * 1.55) continue;
      const here = item.height(driveTarget.x, driveTarget.z);
      if (here > -9) {
        candidates.push({ ...item, centerD, here, edge: Math.abs(centerD - item.isle.R * 1.35) });
        continue;
      }
      const dx = item.isle.x - driveTarget.x, dz = item.isle.z - driveTarget.z;
      const dd = Math.hypot(dx, dz) || 1;
      for (let s = 0; s < Math.min(260, item.isle.R * 0.95); s += 5) {
        if (item.height(driveTarget.x + dx / dd * s, driveTarget.z + dz / dd * s) > 0.8) {
          candidates.push({ ...item, centerD, here, edge: Math.abs(centerD - item.isle.R * 1.35) });
          break;
        }
      }
    }
    candidates.sort((a, b) => a.edge - b.edge);
    return candidates[0] || null;
  }

  function canDisembark() {
    return !!disembarkInfo();
  }

  function isOnSecondIsland() {
    return walker.on && newIslandHeightAt(walker.x, walker.z) > 0.5;
  }

  function updateKeysHelpPanel() {
    $('keys-help').classList.toggle('show-second', isOnSecondIsland());
  }

  function enterIsland() {
    // 从船位向最近可登岛屿的岛心推进,找到第一块干滩作为登陆点
    const target = disembarkInfo();
    if (!target) { showToast('这里离海滩还太远或船速太快 —— 靠近浅滩减速再按 V'); return; }
    const dx = target.isle.x - driveTarget.x, dz = target.isle.z - driveTarget.z;
    const dd = Math.hypot(dx, dz) || 1;
    let lx = target.isle.x, lz = target.isle.z;
    for (let s = 0; s < Math.min(720, target.isle.R * 1.7); s += 2) {
      const x = driveTarget.x + (dx / dd) * s, z = driveTarget.z + (dz / dd) * s;
      if (target.height(x, z) > 0.8) { lx = x; lz = z; break; }
    }
    setDriving(false);
    walker.on = true;
    walker.x = lx; walker.z = lz; walker.y = target.height(lx, lz);
    walker.heading = walker.viewYaw = Math.atan2(dx, dz);
    walker.viewPitch = -0.04;
    avatar.visible = false;                 // 第一人称:只有一双手
    handsGroup.visible = true;
    controls.enabled = false;               // 第一人称:自管视角
    controls.target.set(lx, walker.y + 1.4, lz);
    camera.position.set(lx, walker.y + 1.62, lz);
    camera.lookAt(lx + Math.sin(walker.viewYaw), walker.y + 1.55, lz + Math.cos(walker.viewYaw));
    $('island-hud').classList.add('show');
    $('xhair').classList.add('show');
    updateKeysHelpPanel();
    $('keys-help').classList.add('show');     // 登岛显示一遍全部键位(K 键随时开关)
    showToast('WASD 移动 · Shift 疾跑 · 1 跳跃/攀爬 · 空格射击 · 4 开镜 · E 互动 · K 键位面板');
  }

  let island2TestMode = false;
  let island2TestRespawn = null;
  function isIsland2TestRoute() {
    const path = window.location.pathname || '';
    const qs = window.location.search || '';
    return path.includes('ocean-island2-test') || qs.includes('island2-test');
  }
  function restoreIsland2TestWalker(reason) {
    const spot = island2TestRespawn || relicSpots.greatWall || relicSpots.camp || { x: NEW_ISLAND.x, z: NEW_ISLAND.z };
    let lx = spot.x, lz = spot.z, ly = groundHeightAt(lx, lz);
    for (let r = 0; r < 80; r += 4) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const x = spot.x + Math.cos(a) * r;
        const z = spot.z + Math.sin(a) * r;
        const y = groundHeightAt(x, z);
        if (newIslandHeightAt(x, z) > 1.2 && y > 1.2 && y < 38) {
          lx = x; lz = z; ly = y;
          r = 999;
          break;
        }
      }
    }
    setDriving(false);
    pilotSub = false;
    riding = false;
    walker.on = true;
    walker.inBunker = false;
    walker.inTomb = false;
    walker.swordTurret = null;
    walker.hp = Math.max(80, walker.hp || PLAYER_HP_MAX);
    walker.hunger = 65;
    walker.thirst = 65;
    walker.stamina = 60;
    walker.faintT = 0;
    walker.x = lx; walker.z = lz; walker.y = ly;
    walker.heading = walker.viewYaw = Math.atan2(NEW_ISLAND.x - lx, NEW_ISLAND.z - lz);
    walker.viewPitch = -0.06;
    avatar.visible = false;
    handsGroup.visible = true;
    controls.enabled = false;
    controls.target.set(lx, ly + 1.4, lz);
    camera.position.set(lx, ly + 1.62, lz);
    camera.lookAt(lx + Math.sin(walker.viewYaw), ly + 1.55, lz + Math.cos(walker.viewYaw));
    setAim(false);
    $('island-hud').classList.add('show');
    $('xhair').classList.add('show');
    updateKeysHelpPanel();
    showToast(reason || '第二岛测试版:你在雨林营地边醒来,没有被传回船上');
  }
  function startIsland2TestIfNeeded() {
    if (!isIsland2TestRoute()) return;
    island2TestMode = true;
    let lx = NEW_ISLAND.x, lz = NEW_ISLAND.z, ly = newIslandHeightAt(lx, lz);
    const base = relicSpots.greatWall || relicSpots.camp || { x: NEW_ISLAND.x, z: NEW_ISLAND.z };
    for (let r = 18; r < 120; r += 4) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = base.x + Math.cos(a) * r;
        const z = base.z + Math.sin(a) * r;
        const y = groundHeightAt(x, z);
        if (newIslandHeightAt(x, z) > 1.2 && y > 1.2 && y < 38) {
          lx = x; lz = z; ly = y;
          r = 999;
          break;
        }
      }
    }
    island2TestRespawn = { x: lx, z: lz };
    setDriving(false);
    pilotSub = false;
    riding = false;
    newIsland.unlocked = true;
    newIsland.landedT = 0;
    walker.on = true;
    walker.inBunker = false;
    walker.swordTurret = null;
    walker.x = lx; walker.z = lz; walker.y = ly;
    walker.heading = walker.viewYaw = Math.atan2(NEW_ISLAND.x - lx, NEW_ISLAND.z - lz);
    walker.viewPitch = -0.06;
    avatar.visible = false;
    handsGroup.visible = true;
    controls.enabled = false;
    controls.target.set(lx, ly + 1.4, lz);
    camera.position.set(lx, ly + 1.62, lz);
    camera.lookAt(lx + Math.sin(walker.viewYaw), ly + 1.55, lz + Math.cos(walker.viewYaw));
    $('island-hud').classList.add('show');
    $('xhair').classList.add('show');
    updateKeysHelpPanel();
    $('keys-help').classList.add('show');
    showToast('第二岛测试版:已直接出生在迷雾雨林岛 · 野人 30 秒后才会行动 · E 互动/K 键位');
  }

  function exitIsland(fainted) {
    if (fainted && island2TestMode) {
      restoreIsland2TestWalker('第二岛测试版:你昏倒后在雨林营地边醒来,不会再被传回快艇');
      return;
    }
    walker.on = false;
    walker.swordTurret = null;
    avatar.visible = false;
    handsGroup.visible = false;
    setAim(false);                            // 离岛收镜
    $('keys-help').classList.remove('show');
    $('keys-help').classList.remove('show-second');
    $('island-hud').classList.remove('show');
    $('xhair').classList.remove('show');
    controls.enabled = true;
    if (fainted) {
      walker.hunger = 65; walker.thirst = 65; walker.stamina = 60; walker.faintT = 0;
      setDriving(true, speedBoat);
    } else {
      controls.target.set(walker.x, walker.y + 1, walker.z);
      controls.update();
    }
  }

  // ---- 生命值:受击扣血;归零 → 死亡重生 ----
  // 到了新岛后死亡可选择:回旧岛重来,或变成野人在新岛重生
  function damageWalker(dmg, cause, noDeath = false) {
    if (!walker.on || walker.hp <= 0) return;
    if (walker.godMode) {
      walker.hp = walkerMaxHp();
      return;
    }
    cancelRecall('受到攻击,回城中断');
    if (walker.savageRole === 'shield') dmg = Math.max(1, Math.round(dmg * 0.65));
    walker.hp = Math.max(0, walker.hp - dmg);
    walker.shakeT = Math.max(walker.shakeT, 0.5);
    if (walker.hp <= 0 && !noDeath) dieAndRespawn(cause);
  }
  function titanKnockout(source) {
    if (walker.godMode) {
      walker.hp = walkerMaxHp();
      walker.stamina = walker.buff ? 200 : 100;
      return;
    }
    walker.hp = Math.max(1, walker.hp);
    walker.faintT = 0;
    showToast('你被' + source + '拍晕了……同伴把你拖回了快艇');
    exitIsland(true);
  }
  function applyPoison(seconds, initialDmg, source) {
    if (walker.godMode) {
      walker.poisonT = 0;
      walker.poisonBlurT = 0;
      return;
    }
    walker.poisonT = Math.max(walker.poisonT, seconds);
    walker.poisonBlurT = Math.max(walker.poisonBlurT, Math.min(6, seconds * 0.45));
    if (initialDmg > 0) damageWalker(initialDmg, source || '中毒身亡');
  }
  function dieAndRespawn(cause) {
    showToast('☠ ' + cause + ' —— 你嗝屁了……');
    if (riding) { riding = false; }
    const reachedNew = newIsland.unlocked;             // 是否已解锁新岛
    let toNew = false, asSavage = false;
    let role = '';
    if (reachedNew) {
      const c = window.prompt('你死了!选择重生方式:\n输入 1 —— 回到旧的荒岛重来\n输入 2 —— 变成野人,在新的荒岛上重生', '1');
      if (c !== null && c.trim() === '2') {
        toNew = true; asSavage = true;
        const r = window.prompt('选择野人职业:\n1 野人剑士:生命 220,近战更猛\n2 长矛战士:生命 200,投矛标准型\n3 盾兵:生命 260,承伤 -35%,移动慢\n4 炼毒师:生命 180,初始毒液和毒矛', '2');
        role = r && r.trim() === '1' ? 'swordsman'
          : r && r.trim() === '3' ? 'shield'
            : r && r.trim() === '4' ? 'poisoner' : 'spearman';
      }
    }
    // 重置状态(保留武器,物资清零)
    walker.hp = PLAYER_HP_MAX; walker.stamina = 100; walker.hunger = 80; walker.thirst = 80;
    walker.faintT = 0; walker.shakeT = 0; walker.inBunker = false;
    walker.swordTurret = null;
    walker.savage = asSavage;
    walker.savageRole = asSavage ? role : '';
    if (asSavage) {
      walker.spear = true;
      walker.weapon = 'spear';
      walker.hp = role === 'shield' ? 260 : role === 'swordsman' ? 220 : role === 'poisoner' ? 180 : PLAYER_HP_MAX;
      if (role === 'poisoner') { walker.venom += 3; walker.poisonSpear += 4; }
      if (role === 'shield') walker.stamina = 80;
      $('ih-weapon-item').style.display = 'flex';
      $('ih-bullets-item').style.display = 'none';
    }
    const cx = toNew ? NEW_ISLAND.x : ISLAND.x, cz = toNew ? NEW_ISLAND.z : ISLAND.z;
    const hh = toNew ? newIslandHeightAt : islandHeightAt;
    let lx = cx, lz = cz;
    for (let s = (toNew ? NEW_ISLAND.R : ISLAND.R) + 40; s > 0; s -= 2) {
      if (hh(cx + s, cz) > 1.2) { lx = cx + s; lz = cz; break; }
    }
    if (!walker.on) { walker.on = true; setDriving(false); controls.enabled = false; }
    walker.x = lx; walker.z = lz; walker.y = hh(lx, lz);
    walker.viewYaw = walker.heading = Math.atan2(cx - lx, cz - lz);
    walker.viewPitch = -0.04;
    handsGroup.visible = true; avatar.visible = false;
    $('island-hud').classList.add('show');
    $('xhair').classList.add('show');
    $('keys-help').classList.add('show');     // 重生也显示一遍键位
    showToast(asSavage
      ? '🧟 你重生为' + (role === 'shield' ? '盾兵' : role === 'swordsman' ? '野人剑士' : role === 'poisoner' ? '炼毒师' : '长矛战士')
        + '!生命 ' + walker.hp + ' · 去野人村落探索智慧武器'
      : '🌅 你在海滩上醒来,决定东山再起');
  }

  function nearestWorkbench(maxD = 4.2) {
    let best = null;
    for (const wb of workbenches) {
      const d = Math.hypot(wb.x - walker.x, wb.z - walker.z);
      if (d < maxD && (!best || d < best.d)) best = { ...wb, d };
    }
    return best;
  }
  function nearestGunPart(maxD = 2.7) {
    let best = null;
    for (const gp of gunParts) {
      if (gp.taken) continue;
      const d = Math.hypot(gp.x - walker.x, gp.z - walker.z);
      if (d < maxD && (!best || d < best.d)) best = { ...gp, d };
    }
    return best;
  }
  function nearestTombMaterial(maxD = 2.7) {
    let best = null;
    for (const tm of tombMaterials) {
      if (tm.taken) continue;
      const d = Math.hypot(tm.x - walker.x, tm.z - walker.z);
      if (d < maxD && (!best || d < best.d)) best = { ...tm, d };
    }
    return best;
  }
  function tombMaterialLine() {
    return '盗墓材料:铁锭 ' + walker.tombIron + '/6 · 灯油 ' + walker.tombLamp + '/2 · 硬木柄 '
      + walker.tombHandle + '/2 · 绳子 ' + walker.rope + '/2 · 木材 ' + walker.timber + '/4';
  }
  function spendTombMaterials() {
    if (walker.tombIron < 6 || walker.tombLamp < 2 || walker.tombHandle < 2 || walker.rope < 2 || walker.timber < 4) {
      showToast('盗墓装备还缺材料 —— ' + tombMaterialLine());
      return false;
    }
    walker.tombIron -= 6;
    walker.tombLamp -= 2;
    walker.tombHandle -= 2;
    walker.rope -= 2;
    walker.timber -= 4;
    relics.tombKit = true;
    startTombDig();
    showToast('⛏ 装备备齐:洛阳铲、探灯、绳梯和支护木梁已经做好 —— 开始打盗洞');
    return true;
  }
  const tombDigClods = [];
  const tombDigMat = makeNodeMat(vec3(0.36, 0.24, 0.14));
  const tombDigGeo = new THREE.IcosahedronGeometry(0.06, 0);
  function spawnTombDirt() {
    if (!relicSpots.tomb) return;
    const a = Math.random() * Math.PI * 2;
    const r = 0.25 + Math.random() * 0.8;
    const mesh = new THREE.Mesh(tombDigGeo, tombDigMat);
    mesh.position.set(relicSpots.tomb.x + Math.cos(a) * r, relicSpots.tomb.y + 0.18, relicSpots.tomb.z + Math.sin(a) * r);
    scene.add(mesh);
    tombDigClods.push({ mesh, t: 0, vx: Math.cos(a) * (1.1 + Math.random()), vy: 1.4 + Math.random() * 1.2, vz: Math.sin(a) * (1.1 + Math.random()) });
  }
  function startTombDig() {
    if (!relics.tombKit || relics.tombDug || !relicSpots.tomb) return false;
    if (walker.tombDigT > 0) { showToast('正在用洛阳铲打盗洞…… ' + Math.ceil(walker.tombDigT) + 's'); return true; }
    walker.tombDigT = 5.2;
    walker.tombDigTotal = 5.2;
    walker.x = relicSpots.tomb.x + 2.4;
    walker.z = relicSpots.tomb.z + 1.4;
    walker.y = groundHeightAt(walker.x, walker.z);
    walker.viewYaw = Math.atan2(relicSpots.tomb.x - walker.x, relicSpots.tomb.z - walker.z);
    walker.viewPitch = -0.48;
    startHandAction('dig');
    showToast('⛏ 洛阳铲入土!正在刨开盗洞口,别乱动');
    return true;
  }
  function updateTombDig(dt) {
    for (let i = tombDigClods.length - 1; i >= 0; i--) {
      const c = tombDigClods[i];
      c.t += dt;
      c.vy -= 4.8 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.scale.setScalar(Math.max(0.1, 1 - c.t * 1.8));
      if (c.t > 0.65) { scene.remove(c.mesh); tombDigClods.splice(i, 1); }
    }
    if (walker.tombDigT <= 0) return;
    walker.tombDigT = Math.max(0, walker.tombDigT - dt);
    if (!hands.action) startHandAction('dig');
    if (Math.random() < dt * 12) spawnTombDirt();
    if (relicSpots.tomb) {
      walker.x = relicSpots.tomb.x + 2.4;
      walker.z = relicSpots.tomb.z + 1.4;
      walker.y = groundHeightAt(walker.x, walker.z);
      walker.viewYaw = Math.atan2(relicSpots.tomb.x - walker.x, relicSpots.tomb.z - walker.z);
      walker.viewPitch = -0.48 + Math.sin((walker.tombDigTotal - walker.tombDigT) * 8) * 0.07;
    }
    if (walker.tombDigT <= 0) {
      relics.tombDug = true;
      startHandAction('pickup');
      showToast('🕳 盗洞打通了!土层塌出一个能下人的口子 —— 现在按 E 顺绳梯下墓');
    }
  }
  function enterTomb() {
    if (!relics.tombFound || !relicSpots.tomb) return false;
    if (!relics.tombKit) return spendTombMaterials();
    if (!relics.tombDug) return startTombDig();
    walker.inTomb = true;
    walker.x = relicSpots.tomb.x + 3.6;
    walker.z = relicSpots.tomb.z;
    walker.y = relicSpots.tomb.floorY;
    walker.viewYaw = -Math.PI / 2;
    walker.viewPitch = -0.02;
    showToast('🕯 你顺着绳梯滑入墓道。石壁潮冷,前方是一间可探索的海蚀古墓');
    return true;
  }

  const TOMB_AUTHOR_SKIP_PASSWORD = '🕳️⛏️';
  function tryTombAuthorSkip() {
    const pwd = window.prompt('作者盗墓测试密码(表情):');
    if (pwd === null) return;
    if (pwd.trim() !== TOMB_AUTHOR_SKIP_PASSWORD) { showToast('盗墓测试密码错误'); return; }
    if (!walker.on) {
      showToast('先上岛进入第一人称,再用作者盗墓测试');
      return;
    }
    if (!relics.tombFound || !relicSpots.tomb) {
      const x = walker.x + Math.sin(walker.viewYaw) * 4.0;
      const z = walker.z + Math.cos(walker.viewYaw) * 4.0;
      relics.tombFound = true;
      createTombEntrance(x, z);
    }
    relics.tombKit = true;
    relics.tombDug = true;
    relics.tombGuide = false;
    walker.tombDigT = 0;
    enterTomb();
    showToast('🕳️ 作者盗墓测试:材料/工具/盗洞已跳过,直接进入墓室');
  }
  function exitTomb() {
    walker.inTomb = false;
    walker.x = relicSpots.tomb.x + 1.2;
    walker.z = relicSpots.tomb.z + 1.2;
    walker.y = groundHeightAt(walker.x, walker.z);
    showToast('你攀着绳梯回到地面,海风把墓里的潮气吹散了');
  }
  function exitTombWaterLadder() {
    if (!relicSpots.tomb?.waterLadder) return false;
    walker.inTomb = false;
    walker.tombCrawlT = 0;
    walker.tombCrawlBack = false;
    walker.x = relicSpots.tomb.x + 1.2;
    walker.z = relicSpots.tomb.z + 1.2;
    walker.y = groundHeightAt(walker.x, walker.z);
    walker.viewYaw = Math.atan2(relicSpots.tomb.x - walker.x, relicSpots.tomb.z - walker.z);
    walker.viewPitch = -0.03;
    walker.shakeT = Math.max(walker.shakeT, 0.35);
    showToast('🪜 你抓住暗河边的湿木梯,一路爬回墓口,终于脱离地下水池');
    return true;
  }
  function tombDeath(reason) {
    if (walker.godMode) return;
    relics.tombDeaths++;
    walker.hp = PLAYER_HP_MAX;
    walker.stamina = Math.max(60, walker.stamina);
    walker.poisonT = 0;
    walker.poisonBlurT = 0;
    walker.x = relicSpots.tomb.x + 3.6;
    walker.z = relicSpots.tomb.z;
    walker.y = relicSpots.tomb.floorY;
    walker.viewYaw = -Math.PI / 2;
    walker.viewPitch = -0.02;
    walker.shakeT = 1.0;
    showToast('☠ ' + reason + ' —— 第 ' + relics.tombDeaths + ' 次死在墓里,又被绳梯拖回入口');
  }
  function updateTombTraps() {
    if (!walker.inTomb || !relicSpots.tomb) return;
    for (const hm of relicSpots.tomb.hintMeshes || []) hm.visible = relics.authorMode;
    if (relics.authorMode) return;
    for (const tr of relicSpots.tomb.traps) {
      if (Math.hypot(walker.x - tr.x, walker.z - tr.z) < tr.r) {
        tombDeath('踩中翻板机关');
        return;
      }
    }
  }
  function tryAuthorMode() {
    const pwd = window.prompt('作者权限密码:');
    if (pwd === null) return;
    if (pwd.trim() !== AUTHOR_PASSWORD) { showToast('作者权限密码错误'); return; }
    relics.authorMode = !relics.authorMode;
    if (relics.authorMode && walker.inTomb && relicSpots.tomb) {
      walker.x = relicSpots.tomb.x - 3.4;
      walker.z = relicSpots.tomb.z - 16.2;
      walker.y = relicSpots.tomb.floorY;
      showToast('作者权限开启:红圈显示机关,已跳到主墓室前');
    } else {
      showToast(relics.authorMode ? '作者权限开启:进入墓穴可看到机关套路' : '作者权限关闭');
    }
  }
  function nearestTombReward(maxD = 2.0) {
    if (!relics.tombOpened || !relicSpots.tomb) return null;
    let best = null, bd = 1e9;
    for (const rw of relicSpots.tomb.tombRewards || []) {
      if (rw.taken) continue;
      const d = Math.hypot(rw.x - walker.x, rw.z - walker.z);
      if (d < maxD && d < bd) { bd = d; best = rw; }
    }
    return best;
  }
  function startTombOpen() {
    if (!relicSpots.tomb || relics.tombOpeningT > 0) return false;
    if (relics.tombOpened) return false;
    relics.tombOpeningT = 3.4;
    walker.x = relicSpots.tomb.x - 2.35;
    walker.z = relicSpots.tomb.z - 17.3;
    walker.y = relicSpots.tomb.floorY;
    walker.viewYaw = Math.atan2((relicSpots.tomb.x - 3.4) - walker.x, (relicSpots.tomb.z - 18.2) - walker.z);
    walker.viewPitch = -0.28;
    startHandAction('shake');
    showToast('🪦 你双手抵住棺材板,小心翼翼地往旁边掀……');
    return true;
  }
  function updateTombOpen(dt) {
    if (!relicSpots.tomb || relics.tombOpeningT <= 0) return;
    relics.tombOpeningT = Math.max(0, relics.tombOpeningT - dt);
    const p = 1 - relics.tombOpeningT / 3.4;
    const e = p * p * (3 - 2 * p);
    const lid = relicSpots.tomb.sarcLid;
    if (lid) {
      lid.rotation.z = -0.12 - e * 0.9;
      lid.position.x = -3.4 + e * 1.35;
      lid.position.y = 0.80 + Math.sin(e * Math.PI) * 0.25;
    }
    walker.viewPitch = -0.38 + Math.sin(p * Math.PI) * 0.22;
    walker.shakeT = Math.max(walker.shakeT, 0.08);
    if (!hands.action) startHandAction('shake');
    if (relics.tombOpeningT <= 0) {
      relics.tombOpened = true;
      for (const rw of relicSpots.tomb.tombRewards || []) rw.mesh.visible = !rw.taken;
      showToast('👁 棺盖轰地错开。你探头一看:桃木剑、青铜镜、青铜虎符、阴阳罗盘、红釉小瓶和碎玉鸭都躺在里面,按 E 一件件拿');
    }
  }
  function takeTombReward(rw) {
    rw.taken = true;
    rw.mesh.visible = false;
    startHandAction('pickup');
    if (rw.kind === 'peachSword') walker.peachSword = true;
    else if (rw.kind === 'yinyangCompass') {
      relics.yinyangCompass = true;
      relics.thirdUnlocked = true;
      relics.fourthUnlocked = true;
    }
    else if (rw.kind === 'redBottle') walker.tombBottle++;
    else if (rw.kind === 'jadeDuck') walker.tombJade++;
    else walker.tombBronze++;
    const left = (relicSpots.tomb.tombRewards || []).filter(o => !o.taken).length;
    showToast('🏺 收起' + rw.name
      + (rw.kind === 'yinyangCompass' ? ' · 泰坦现在能循阴阳潮线前往石崖岛和物业/雾叶岛' : '')
      + (left > 0 ? ' · 棺内还剩 ' + left + ' 件' : ' · 棺内墓藏已取完'));
    if (left === 0 && !relics.tombLooted) {
      relics.tombLooted = true;
      relics.tombWaterOpen = true;
      walker.godMeat += 1;
      walker.bombs += 3;
      showToast('💧 最后一件墓藏离棺,暗格弹开:神肉 ×1、磁吸炸弹 +3。右侧暗孔传来水声,可以钻进去看看');
    }
  }
  function startTombCrawl(back = false) {
    if (!relics.tombWaterOpen || !relicSpots.tomb || walker.tombCrawlT > 0) return false;
    walker.tombCrawlBack = back;
    walker.tombCrawlT = 3.2;
    walker.x = back ? relicSpots.tomb.water.x : relicSpots.tomb.crawl.x;
    walker.z = back ? relicSpots.tomb.water.z - 2.2 : relicSpots.tomb.crawl.z;
    walker.y = relicSpots.tomb.floorY;
    walker.viewYaw = back ? -Math.PI / 2 : Math.PI / 2;
    walker.viewPitch = -0.35;
    startHandAction('pickup');
    showToast(back ? '🕳 你从地下水池边钻回暗孔,往主墓室爬去……' : '🕳 你伏低身体钻进暗孔,潮气和水声从前方涌来……');
    return true;
  }
  function updateTombCrawl(dt) {
    if (walker.tombCrawlT <= 0) return;
    walker.tombCrawlT = Math.max(0, walker.tombCrawlT - dt);
    if (relicSpots.tomb) {
      const p = 1 - walker.tombCrawlT / 3.2;
      const ax = walker.tombCrawlBack ? relicSpots.tomb.water.x : relicSpots.tomb.crawl.x;
      const az = walker.tombCrawlBack ? relicSpots.tomb.water.z - 2.2 : relicSpots.tomb.crawl.z;
      const bx = walker.tombCrawlBack ? relicSpots.tomb.crawl.x : relicSpots.tomb.water.x;
      const bz = walker.tombCrawlBack ? relicSpots.tomb.crawl.z : relicSpots.tomb.water.z - 2.2;
      walker.x = ax + (bx - ax) * p;
      walker.z = az + (bz - az) * p;
      walker.y = relicSpots.tomb.floorY - 0.45 + Math.sin(p * Math.PI) * 0.18;
      walker.viewYaw = walker.tombCrawlBack ? -Math.PI / 2 : Math.PI / 2;
      walker.viewPitch = -0.18 + Math.sin(p * Math.PI * 2) * 0.05;
      if (!hands.action) startHandAction('pickup');
    }
    if (walker.tombCrawlT <= 0 && relicSpots.tomb) {
      if (walker.tombCrawlBack) {
        walker.x = relicSpots.tomb.crawl.x - 1.4;
        walker.z = relicSpots.tomb.crawl.z;
        walker.viewYaw = -Math.PI / 2;
      } else {
        walker.x = relicSpots.tomb.water.x;
        walker.z = relicSpots.tomb.water.z - 2.2;
        walker.viewYaw = 0;
      }
      walker.y = relicSpots.tomb.floorY;
      walker.viewPitch = -0.08;
      showToast(walker.tombCrawlBack
        ? '你从暗孔爬回主墓室旁,沿原路可到绳梯出口'
        : '💧 你钻出暗道,看见地下水池。水声来自一条被青铜八卦阵锁住的暗河,像通往另一个地方');
      walker.tombCrawlBack = false;
    }
  }
  const HISTORIAN_LETTER = [
    '竹简遗书一:「吾乃南溟史官裴玄。王师舟毁于黑潮,余率残民循暗河入此岛,以青铜八卦镇水门。」',
    '竹简遗书二:「后来者分为二支:石牙主攻,愿以器械夺生路;雾叶主隐,愿以药毒守山林。二者同源,不该永世相杀。」',
    '竹简遗书三:「若外来人能读到此书,当知野人并非蛮荒之物,乃失国遗民之后。助哪一村,便会改写两岛之后路。」',
  ];
  function readHistorianLetter() {
    const page = Math.min(relics.tombLetterPage, HISTORIAN_LETTER.length - 1);
    showToast('📜 ' + HISTORIAN_LETTER[page]);
    if (relics.tombLetterPage < HISTORIAN_LETTER.length) relics.tombLetterPage++;
    if (relics.tombLetterPage === HISTORIAN_LETTER.length) {
      showToast('🥚 彩蛋发现:史官遗书揭开石牙与雾叶同源之谜。以后选择阵营时,你知道自己不是在帮陌生人');
      relics.tombLetterPage++;
    }
  }
  function isMushroomNight() {
    return timeOfDay >= 20 || timeOfDay < 4;
  }
  function nearestCurio(maxD = 3.4) {
    let best = null;
    for (const c of curios) {
      if (c.taken) continue;
      if ((c.kind === 'mushroom' || c.kind === 'firefly') && !isMushroomNight()) continue;
      const d = Math.hypot(c.x - walker.x, c.z - walker.z);
      if (d < maxD && (!best || d < best.d)) best = { ...c, d };
    }
    return best;
  }
  function useCurio(c) {
    const src = curios.find(o => o.mesh === c.mesh);
    if (!src) return false;
    if (src.kind === 'shell') {
      if (src.cd > 0) { showToast('贝壳号角里还回荡着刚才的声音'); return true; }
      src.cd = 35;
      let scared = 0;
      for (const sv of savages) {
        if (sv.dead || sv.elder) continue;
        if (Math.hypot(sv.x - walker.x, sv.z - walker.z) < 52) {
          sv.dir = Math.atan2(sv.x - walker.x, sv.z - walker.z);
          sv.speed = Math.max(sv.speed, 5.2);
          sv.t = 3.5;
          sv.state = 'flee';
          scared++;
        }
      }
      startHandAction('shake');
      showToast(scared > 0 ? '🐚 你吹响贝壳号角,附近 ' + scared + ' 名普通野人惊慌后退' : '🐚 低沉号角声穿过树林,远处像有东西回应');
      return true;
    }
    if (src.kind === 'drum') {
      if (src.cd > 0) { showToast('回声鼓还在震动,过一会儿再敲'); return true; }
      src.cd = 45;
      const near = gunParts.filter(gp => !gp.taken)
        .map(gp => ({ gp, d: Math.hypot(gp.x - walker.x, gp.z - walker.z) }))
        .sort((a, b) => a.d - b.d)[0];
      startHandAction('fire');
      if (near) {
        const dx = near.gp.x - walker.x, dz = near.gp.z - walker.z;
        const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
        const dir = dirs[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360 / 45) % 8];
        showToast('🥁 回声鼓传回空洞回响:最近的' + near.gp.name + '在' + dir + '方约 ' + Math.round(near.d) + ' 米');
      } else showToast('🥁 鼓声沉进雨林,附近暂时没有可拾取材料');
      return true;
    }
    if (src.kind === 'bottle') {
      src.taken = true;
      src.mesh.visible = false;
      src.respawnT = 240;
      const roll = Math.random();
      if (roll < 0.24) {
        walker.casing += 2;
        walker.primer += 1;
        showToast('🍾 漂流瓶里塞着潮湿纸条和几枚旧弹壳 · 铜壳 +2 · 引火帽 +1');
      } else if (roll < 0.48) {
        walker.rope += 2;
        walker.wood += 2;
        showToast('🍾 漂流瓶被绳结和软木塞缠住 · 绳子 +2 · 木柴 +2');
      } else if (roll < 0.72) {
        walker.scrap += 1;
        walker.gear += 1;
        showToast('🍾 纸条写着「雾后还有岛」,瓶底藏着废铁 +1 · 机件 +1');
      } else if (roll < 0.88) {
        walker.seaGlass++;
        walker.thirst = Math.min(100, walker.thirst + 12);
        showToast('🍾 瓶里有一枚被海水磨圆的蓝海玻璃 · 海玻璃 +1 · 口渴 +12');
      } else {
        walker.driftToken++;
        walker.powder += 1;
        showToast('🍾 捡到一枚刻着浪纹的漂流铜片 · 漂流铜片 +1 · 火药 +1');
      }
      startHandAction('pickup');
      return true;
    }
    if (src.kind === 'firefly') {
      if (src.cd > 0) { showToast('萤火虫还绕着玻璃瓶打转,等它们重新聚亮'); return true; }
      src.cd = 50;
      walker.stamina = Math.min(100, walker.stamina + 45);
      walker.thirst = Math.min(100, walker.thirst + 6);
      startHandAction('shake');
      showToast('✨ 你摇亮萤火虫灯笼,雨林小径短暂清晰 · 体力 +45 · 口渴 +6');
      return true;
    }
    if (src.kind === 'tidepool') {
      if (src.cd > 0) { showToast('潮池刚被翻过,等下一轮浪把贝类带回来'); return true; }
      src.cd = 70;
      const roll = Math.random();
      startHandAction('pickup');
      if (roll < 0.42) {
        walker.meat += 1;
        walker.thirst = Math.min(100, walker.thirst + 10);
        showToast('🦪 你在潮池里摸到贝肉和淡淡积水 · 肉 +1 · 口渴 +10');
      } else if (roll < 0.68) {
        walker.seaPearl++;
        walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 18);
        showToast('🦪 贝壳里藏着一颗小海珠 · 海珠 +1 · 体力 +18');
      } else if (roll < 0.86) {
        walker.seaGlass++;
        walker.primer += 1;
        showToast('🌊 潮池底闪着一片绿海玻璃 · 海玻璃 +1 · 引火帽 +1');
      } else {
        walker.shellCharm++;
        walker.hp = Math.min(PLAYER_HP_MAX, walker.hp + 16);
        showToast('🐚 你找到一个天然孔洞贝壳护符 · 贝壳护符 +1 · 生命 +16');
      }
      return true;
    }
    if (src.kind === 'triClam') {
      if (src.cd > 0) { showToast('三角蚌刚合上壳,等潮水再拍一阵'); return true; }
      src.cd = 110;
      const roll = Math.random();
      startHandAction('pickup');
      walker.shakeT = Math.max(walker.shakeT, 0.18);
      if (roll < 0.52) {
        walker.seaPearl++;
        walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 20);
        showToast('🦪 你小心掰开三角蚌,摸出一颗温润珍珠 · 珍珠 +1 · 体力 +20');
      } else if (roll < 0.82) {
        walker.seaPearl += 2;
        walker.thirst = Math.min(100, walker.thirst + 12);
        showToast('🦪 蚌肉下藏着两颗小珍珠 · 珍珠 +2 · 口渴 +12');
      } else {
        walker.oceanTear++;
        walker.hp = Math.min(PLAYER_HP_MAX, walker.hp + 30);
        walker.thirst = Math.min(100, walker.thirst + 18);
        showToast('💧 三角蚌壳心凝着一滴蓝光,像海洋之泪 · 海洋之泪 +1 · 生命 +30 · 口渴 +18');
      }
      return true;
    }
    if (src.kind === 'fishVane') {
      if (src.cd > 0) { showToast('鱼骨风向标还在吱呀转动'); return true; }
      src.cd = 55;
      const wind = seaStateEff > 0.72 ? '浪高风急,别离岸太远' : seaStateEff > 0.42 ? '海风正好,适合钓鱼和近岸采集' : '海面太平,鱼汛会慢一些';
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 18);
      startHandAction('shake');
      showToast('🐟 鱼骨风向标指向潮口:' + wind + ' · 体力 +18');
      return true;
    }
    if (src.kind === 'cairn') {
      if (src.cd > 0) { showToast('求生石堆已经被你重新摆正,过会儿再看'); return true; }
      src.cd = 80;
      const roll = Math.random();
      if (roll < 0.45) {
        walker.wood += 2;
        walker.rope += 1;
      } else if (roll < 0.75) {
        walker.shellCharm++;
        walker.rope += 1;
      } else {
        walker.driftToken++;
        walker.casing += 1;
      }
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 25);
      startHandAction('shake');
      showToast('🪨 你按旧标记重摆求生石堆 · 体力 +25'
        + (roll < 0.45 ? ' · 木柴 +2 · 绳子 +1'
          : roll < 0.75 ? ' · 贝壳护符 +1 · 绳子 +1'
            : ' · 漂流铜片 +1 · 铜壳 +1'));
      return true;
    }
    if (src.kind === 'signalFire') {
      if (src.cd > 0) { showToast('信号火堆的烟还没散,暂时不用再点'); return true; }
      if (walker.wood < 2) { showToast('点信号火堆需要木柴 2'); return true; }
      walker.wood -= 2;
      src.cd = 95;
      let scared = 0;
      for (const sv of savages) {
        if (sv.dead || sv.elder) continue;
        const d = Math.hypot(sv.x - walker.x, sv.z - walker.z);
        if (d < 70) {
          sv.state = 'flee';
          sv.t = 5.5;
          sv.speed = Math.max(sv.speed, 5.6);
          sv.dir = Math.atan2(sv.x - walker.x, sv.z - walker.z);
          scared++;
        }
      }
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 20);
      walker.shakeT = Math.max(walker.shakeT, 0.25);
      startHandAction('fire');
      showToast('🔥 你点燃信号火堆,浓烟直上椰林 · 木柴 -2 · 体力 +20'
        + (scared ? ' · 吓退 ' + scared + ' 名普通野人' : ' · 远处海鸟被惊起'));
      return true;
    }
    if (src.kind === 'vineSwing') {
      if (src.cd > 0) { showToast('藤蔓还在晃,等它停下来再荡'); return true; }
      src.cd = 36;
      const fx = Math.sin(walker.viewYaw), fz = Math.cos(walker.viewYaw);
      const nx = walker.x + fx * 6.2, nz = walker.z + fz * 6.2;
      if (groundHeightAt(nx, nz) > -1.1) {
        walker.x = nx;
        walker.z = nz;
        walker.y = groundHeightAt(walker.x, walker.z);
      }
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 32);
      walker.shakeT = Math.max(walker.shakeT, 0.55);
      startHandAction('shake');
      showToast('🌿 你抓住藤蔓荡过一段林间空地 · 体力 +32 · 向前跃出一截');
      return true;
    }
    if (src.kind === 'coconutTarget') {
      if (src.cd > 0) { showToast('椰壳靶架还在摇,下一轮再投 · ' + Math.ceil(src.cd) + 's'); return true; }
      if (src.challengeT > 0) {
        const d = Math.hypot(walker.x - src.x, walker.z - src.z);
        showToast('🥥 限时挑战进行中:' + Math.ceil(src.challengeT) + 's · 有效射击距离 8-28 米 · 当前 ' + Math.round(d) + ' 米');
        return true;
      }
      src.challengeT = 12;
      src.hitT = 0.45;
      startHandAction('shake');
      walker.shakeT = Math.max(walker.shakeT, 0.16);
      showToast('🥥 椰壳靶架挑战开始:12 秒内站到 8-28 米外,用弓箭射中才计分给奖励');
      return true;
    }
    if (src.kind === 'tide') {
      if (src.cd > 0) { showToast('潮汐石纹路还没退潮,稍后再读'); return true; }
      src.cd = 65;
      const targets = [
        { name: '第二岛雨林', icon: '②', x: NEW_ISLAND.x, z: NEW_ISLAND.z },
        { name: '石崖岛', icon: '③', x: THIRD_ISLAND.x, z: THIRD_ISLAND.z },
        { name: '物业/雾叶岛', icon: '④', x: FOURTH_ISLAND.x, z: FOURTH_ISLAND.z },
      ];
      const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
      const lines = targets.map(tg => {
        const dx = tg.x - walker.x, dz = tg.z - walker.z;
        const dir = dirs[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360 / 45) % 8];
        return { ...tg, d: Math.hypot(dx, dz), dir };
      });
      tideNav.targets = lines;
      tideNav.until = simTime + 90;
      eggNavTarget = [...lines].sort((a, b) => a.d - b.d)[0];
      startHandAction('shake');
      showToast('🪨 潮汐月相图亮起:'
        + lines.map(tg => tg.icon + tg.name + tg.dir + '方' + Math.round(tg.d) + 'm').join(' · ')
        + ' · 三岛标记显示 90 秒');
      return true;
    }
    if (src.kind === 'sunPyramid') {
      if (src.cd > 0) { showToast('日影金字塔的光路还在复位'); return true; }
      src.cd = 80;
      walker.stone += 12;
      walker.shakeT = Math.max(walker.shakeT, 0.35);
      startHandAction('shake');
      showToast('🔺 日影金字塔把影子投到断崖刻度上:古人用午时影长测海路 · 石块 +12 · 石崖岛裂湾方向已记下');
      return true;
    }
    if (src.kind === 'stoneAbacus') {
      if (src.cd > 0) { showToast('石算盘珠还停在上一卦,稍后再拨'); return true; }
      src.cd = 75;
      const woodSpend = Math.min(walker.wood, 18);
      const stoneSpend = Math.min(walker.stone, 18);
      walker.wood -= woodSpend;
      walker.stone -= stoneSpend;
      walker.timber += Math.floor(woodSpend / 3);
      walker.catapultAmmo += Math.floor(stoneSpend / 6);
      startHandAction('shake');
      showToast('🧮 你拨动古人石算盘:木柴 ' + woodSpend + ' 折成木料 +' + Math.floor(woodSpend / 3)
        + ' · 石块 ' + stoneSpend + ' 刻成巨石弹 +' + Math.floor(stoneSpend / 6));
      return true;
    }
    if (src.kind === 'mirrorPyramid') {
      if (src.cd > 0) { showToast('水镜金字塔的倒影还没平静'); return true; }
      src.cd = 80;
      walker.thirst = Math.min(100, walker.thirst + 35);
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + 35);
      tideNav.targets = [
        { name: '石崖岛', icon: '③', x: THIRD_ISLAND.x, z: THIRD_ISLAND.z, d: Math.hypot(THIRD_ISLAND.x - walker.x, THIRD_ISLAND.z - walker.z), dir: '回望' },
        { name: '物业/雾叶岛', icon: '④', x: FOURTH_ISLAND.x, z: FOURTH_ISLAND.z, d: Math.hypot(FOURTH_ISLAND.x - walker.x, FOURTH_ISLAND.z - walker.z), dir: '本岛' },
      ];
      tideNav.until = simTime + 60;
      startHandAction('shake');
      showToast('💧 水镜金字塔映出两座远岛的潮线 · 口渴 +35 · 体力 +35 · 远岛标记显示 60 秒');
      return true;
    }
    if (src.kind === 'starDial') {
      if (src.cd > 0) { showToast('星象石盘的铜星还在缓慢转动'); return true; }
      src.cd = 90;
      const night = isMushroomNight();
      walker.primer += night ? 3 : 1;
      walker.powder += night ? 3 : 1;
      if (night) walker.venom += walker.savage ? 1 : 0;
      startHandAction('shake');
      showToast('✦ 星象石盘排出潮汐星图:' + (night ? '夜里星位最清楚 · ' : '白天只能读到残影 · ')
        + '引火帽 +' + (night ? 3 : 1) + ' · 火药 +' + (night ? 3 : 1)
        + (night && walker.savage ? ' · 毒液 +1' : ''));
      return true;
    }
    if (src.kind === 'mushroom') {
      src.taken = true;
      src.mesh.visible = false;
      src.respawnT = 180;
      walker.hp = Math.min(PLAYER_HP_MAX, walker.hp + 18);
      walker.thirst = Math.min(100, walker.thirst + 8);
      startHandAction('eat');
      if (Math.random() < 0.22) {
        applyPoison(3, 0, '误食毒蘑菇身亡');
        showToast('🍄 夜光蘑菇让伤口发热愈合,但带着一点毒性 · 生命 +18');
      } else showToast('🍄 夜光蘑菇清凉发甜 · 生命 +18 口渴 +8');
      return true;
    }
    return false;
  }
  function materialLine() {
    return '库存:木柴 ' + walker.wood + ' / 废铁 ' + walker.scrap
      + ' / 机件 ' + walker.gear + ' / 火药 ' + walker.powder
      + ' / 铅 ' + walker.lead + ' / 铜壳 ' + walker.casing + ' / 引火帽 ' + walker.primer;
  }
  function spendGunMaterials(cost) {
    if (walker.wood < (cost.wood || 0) || walker.scrap < (cost.scrap || 0) || walker.gear < (cost.gear || 0)
        || walker.powder < (cost.powder || 0) || walker.lead < (cost.lead || 0)
        || walker.casing < (cost.casing || 0) || walker.primer < (cost.primer || 0)) {
      showToast('材料不足 —— ' + materialLine());
      return false;
    }
    walker.wood -= cost.wood || 0;
    walker.scrap -= cost.scrap || 0;
    walker.gear -= cost.gear || 0;
    walker.powder -= cost.powder || 0;
    walker.lead -= cost.lead || 0;
    walker.casing -= cost.casing || 0;
    walker.primer -= cost.primer || 0;
    return true;
  }
  function craftFirearm() {
    const choice = window.prompt(
      '工作台:输入数字制作枪械/弹药\n'
      + '1 步枪:木柴3 废铁3 机件1 火药2 → 步枪弹+24\n'
      + '2 狙击枪:木柴4 废铁5 机件3 火药4 → 狙击弹+8\n'
      + '3 冲锋枪:木柴5 废铁6 机件4 火药5 → 冲锋弹+90\n'
      + '4 步枪弹:铅2 铜壳2 火药1 引火帽1 → +18\n'
      + '5 狙击弹:铅3 铜壳2 火药2 引火帽2 → +6\n'
      + '6 冲锋弹:铅4 铜壳5 火药2 引火帽2 → +60\n\n'
      + materialLine(), '1');
    if (choice === null) return;
    const c = choice.trim();
    if (c === '1') {
      if (!spendGunMaterials({ wood: 3, scrap: 3, gear: 1, powder: 2 })) return;
      walker.rifle = true;
      walker.weapon = 'rifle';
      walker.bullets += 24;
      $('ih-weapon-item').style.display = 'flex';
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('🔫 工作台造出一支简易步枪 · 步枪弹 +24(按 2 切换)');
      return;
    }
    if (c === '2') {
      if (!spendGunMaterials({ wood: 4, scrap: 5, gear: 3, powder: 4 })) return;
      walker.sniper = true;
      walker.weapon = 'sniper';
      walker.sniperAmmo += 8;
      $('ih-weapon-item').style.display = 'flex';
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('🎯 工作台调出一支长管狙击枪 · 狙击弹 +8(按 4 开镜)');
      return;
    }
    if (c === '3') {
      if (!spendGunMaterials({ wood: 5, scrap: 6, gear: 4, powder: 5 })) return;
      walker.smg = true;
      walker.weapon = 'smg';
      walker.smgAmmo += 90;
      $('ih-weapon-item').style.display = 'flex';
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('🔫 工作台拼出一支冲锋枪 · 冲锋弹 +90(按住空格连发)');
      return;
    }
    if (c === '4') {
      if (!spendGunMaterials({ lead: 2, casing: 2, powder: 1, primer: 1 })) return;
      walker.bullets += 18;
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('📦 压装步枪弹 +18 · 必要原料:铅块/铜壳/火药/引火帽');
      return;
    }
    if (c === '5') {
      if (!spendGunMaterials({ lead: 3, casing: 2, powder: 2, primer: 2 })) return;
      walker.sniperAmmo += 6;
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('🎯 手工装配狙击弹 +6 · 弹头要铅,底火要引火帽');
      return;
    }
    if (c === '6') {
      if (!spendGunMaterials({ lead: 4, casing: 5, powder: 2, primer: 2 })) return;
      walker.smgAmmo += 60;
      $('ih-bullets-item').style.display = 'flex';
      startHandAction('pickup');
      showToast('📦 压装冲锋枪弹 +60 · 多收集铜壳和铅块才能持续扫射');
      return;
    }
    showToast('工作台没有这个配方');
  }

  function islandHint() {
    if (walker.inTomb) {
      if (walker.tombCrawlT > 0) return '正在伏身钻过暗孔…… ' + Math.ceil(walker.tombCrawlT) + 's';
      if (relics.tombOpeningT > 0) return '正在掀开棺材板…… ' + Math.ceil(relics.tombOpeningT) + 's';
      if (relicSpots.tomb && Math.hypot((relicSpots.tomb.x + 5.3) - walker.x, relicSpots.tomb.z - walker.z) < 1.8) return '按 E 顺绳梯返回地面';
      const trw = nearestTombReward();
      if (trw) return '按 E 小心取出' + trw.name;
      if (relicSpots.tomb?.waterLadder && Math.hypot(relicSpots.tomb.waterLadder.x - walker.x, relicSpots.tomb.waterLadder.z - walker.z) < 2.4)
        return '按 E 爬湿木梯直接回到墓口';
      if (relics.tombWaterOpen && relicSpots.tomb && Math.hypot(relicSpots.tomb.crawl.x - walker.x, relicSpots.tomb.crawl.z - walker.z) < 2.4)
        return '按 E 伏身钻进右侧暗孔,去看水声从哪里来';
      if (relics.tombWaterOpen && relicSpots.tomb?.water && Math.hypot(relicSpots.tomb.water.x - walker.x, (relicSpots.tomb.water.z - 2.2) - walker.z) < 2.8)
        return '按 E 钻回主墓室暗孔,再沿绳梯返回地面';
      if (relicSpots.tomb?.historian && Math.hypot(relicSpots.tomb.historian.x - walker.x, relicSpots.tomb.historian.z - walker.z) < 2.5)
        return relics.tombLetterPage > HISTORIAN_LETTER.length ? '史官遗书已读完 · 石牙与雾叶原来同源' : '按 E 阅读暗河边的史官竹简遗书';
      if (relicSpots.tomb && Math.hypot((relicSpots.tomb.x - 3.4) - walker.x, (relicSpots.tomb.z - 18.2) - walker.z) < 2.4)
        return relics.tombOpened
          ? (relics.tombLooted ? '空石棺:潮湿青砖上只剩刮痕' : '棺材板已掀开,靠近里面的墓藏按 E 一件件拿')
          : '按 E 慢慢掀开棺材板,先探头看看里面有什么';
      if (relicSpots.tomb && relicSpots.tomb.water && Math.hypot(relicSpots.tomb.water.x - walker.x, relicSpots.tomb.water.z - walker.z) < 5.5)
        return '地下水池 · 青铜八卦阵镇着暗河,水声像从更深处传来';
      return relics.authorMode
        ? '作者权限:红圈是机关,可直接看套路;石棺在深处左侧'
        : '海蚀古墓 · 青铜器、八卦阵和符号都可能暗示机关走法';
    }
    if (walker.inBunker) {
      if (Math.hypot(bunkerSpots.ladder.x - walker.x, bunkerSpots.ladder.z - walker.z) < 1.8) return '按 E 攀梯返回地面';
      if (Math.hypot(bunkerSpots.rack.x - walker.x, bunkerSpots.rack.z - walker.z) < 2.4) {
        return walker.smg ? '老兵的收藏枪,别动' : '按 E 试试枪架上的密码锁(第二层密码)';
      }
      if (Math.hypot(bunkerSpots.crates.x - walker.x, bunkerSpots.crates.z - walker.z) < 2.4) return '按 E 补充弹药(步枪/狙击/冲锋)';
      if (Math.hypot(bunkerSpots.table.x - walker.x, bunkerSpots.table.z - walker.z) < 2.0) return '按 E 查看老兵的作战地图';
      if (Math.hypot(bunkerSpots.photo.x - walker.x, bunkerSpots.photo.z - walker.z) < 2.0) return '按 E 端详墙上的老照片';
      return '地下军火库 · 武器弹药管够,打五种虚空泰坦去';
    }
    const nearTamed = titans.find(g => g.state === 'tamed'
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 130);
    if (nearTamed) {
      const wildNear = titans.find(g => g.state === 'rage'
        && Math.hypot(g.x - walker.x, g.z - walker.z) < 130);
      const deadNear = titans.find(g => g.state === 'dead'
        && Math.hypot(g.x - walker.x, g.z - walker.z) < 130);
      if (wildNear && !titanBattle.on)
        return '按 E 指挥你的泰坦迎战' + wildNear.sp.name + '(打斗中驯服它更易)';
      if (deadNear)
        return '按 E 让你的泰坦吞噬' + deadNear.sp.name + '的躯体 · 不同泰坦 ' + devouredUniqueCount(nearTamed) + '/4'
          + (nearTamed.ultimate ? ' · 终极形态!' : ',吞满 4 种进化为终极形态');
      return '按 V 骑乘' + nearTamed.sp.name + (canTitanReachSecond(nearTamed) ? ' · 可横渡深海前往第二岛' : ' · 泰坦不足 3 只/吞噬不足 3 只,暂不能去第二岛')
        + '(已驯服 ' + titansTamed + '/' + TITAN_MAX + ')';
    }
    const nearRage = titans.find(g => g.state === 'rage'
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 110);
    if (nearRage) {
      return (titanBattle.on && titanBattle.wild === nearRage ? '🛡 打斗中!按 E 趁机驯服' : '按 E 抚摸驯服') + nearRage.sp.name
        + '(' + Math.round(nearRage.tame) + '%)· 或空格张弓猎杀';
    }
    const nearDeadTitan = titans.find(g => g.state === 'dead' && g.harvests > 0
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 50);
    if (nearDeadTitan && !myTamedTitan()) return '按 E 割取虚空泰坦的神肉';
    const wb = nearestWorkbench();
    if (wb) return wb.label + ':按 E 制作枪械/弹药 · 弹药需铅块+铜壳+火药+引火帽 · ' + materialLine();
    const gp = nearestGunPart();
    if (gp) return '按 E 拾取' + gp.name + '(枪械制作材料)';
    const tm = nearestTombMaterial();
    if (tm) return '按 E 拾取' + tm.name + '(盗墓装备材料) · ' + tombMaterialLine();
    const curio = nearestCurio();
    if (curio) return curio.kind === 'shell'
      ? '按 E 吹响贝壳号角(吓退附近普通野人)'
      : curio.kind === 'drum'
        ? '按 E 敲回声鼓(听附近材料的大致方向)'
        : curio.kind === 'bottle'
          ? '按 E 打开漂流瓶(材料或线索)'
          : curio.kind === 'firefly'
            ? '按 E 摇亮萤火虫灯笼(夜里恢复体力)'
            : curio.kind === 'tide'
              ? '按 E 读取潮汐月相图(标出第二/三/四岛)'
              : curio.kind === 'tidepool'
                ? '按 E 翻潮池摸贝肉(补食物和口渴)'
                : curio.kind === 'triClam'
                  ? '按 E 摸三角蚌(可能出珍珠或海洋之泪)'
                  : curio.kind === 'fishVane'
                    ? '按 E 看鱼骨风向标(判断风浪和鱼汛)'
                    : curio.kind === 'cairn'
                      ? '按 E 重摆求生石堆(取备用绳结)'
                      : curio.kind === 'signalFire'
                        ? '按 E 点燃信号火堆(木柴 -2,吓退附近野人)'
                        : curio.kind === 'vineSwing'
                          ? '按 E 抓藤蔓秋千向前荡出一截'
                          : curio.kind === 'coconutTarget'
                          ? '椰壳靶架:按 E 开 12s 挑战,8-28 米外弓箭命中才加分'
                            : curio.kind === 'sunPyramid'
                              ? '按 E 读取日影金字塔(古人用影长测海路)'
                              : curio.kind === 'stoneAbacus'
                                ? '按 E 拨动石算盘遗迹(木石折算成远征物资)'
                                : curio.kind === 'mirrorPyramid'
                                  ? '按 E 触碰水镜金字塔(恢复并显示远岛潮线)'
                                  : curio.kind === 'starDial'
                                    ? '按 E 转动星象石盘(夜里收益更高)'
                                    : '按 E 采食夜光蘑菇(回血,但可能带毒)';
    const bs = nearestBuildSite();
    if (bs) {
      if (bs.stage > 0) return bs.label + ':' + houseLevelName(bs.stage) + ' · 按 E 休整 · ' + houseEffectText(bs.stage)
        + (bs.stage >= HOUSE_COSTS.length ? '' : ' · 按 X 继续升级');
      const need = buildSiteNeed(bs);
      return bs.label + ':' + (bs.paid
        ? '按 X 继续斧子施工(' + bs.hits + '/' + need.hits + ')'
        : '需要木材 ' + need.timber + ' + 绳子 ' + need.rope + ',备齐后按 X ' + (bs.stage === 0 ? '建房' : '升级'));
    }
    for (const rp of ropes) {
      if (!rp.taken && Math.hypot(rp.x - walker.x, rp.z - walker.z) < 3) return '按 E 拾取绳子(建房/升级材料)';
    }
    if (newIslandHeightAt(walker.x, walker.z) > 0.5) {
      if (walker.swordTurret) return '长剑炮台:' + (aim.on ? '7×镜' : '腰射') + ' · 4 切换瞄具 · 空格连射 · E 离开 · 箭矢 ' + swordTurret.ammo + '/1000';
      if (swordTurret && Math.hypot(swordTurret.x - walker.x, swordTurret.z - walker.z) < 18)
        return '按 E 操控高架长剑炮台(俯瞰野人村落 · 腰射/7×镜可切换)';
      if (relicSpots.greatWall && Math.hypot(relicSpots.greatWall.x - walker.x, relicSpots.greatWall.z - walker.z) < 28)
        return '废弃长城制高点:靠近柱基按 E 进入高架炮位,俯瞰雨林与野人村落';
      if (newIsland.landedT < 20 && !walker.savage && !relics.tribeAlly)
        return '野人还在雨林里按路线巡逻(' + Math.ceil(20 - newIsland.landedT) + 's 后才会攻击)';
      if (walker.carryingCatapult) return '按 E 放下投石机 · 搬运时默认走路' + (walker.buff ? '(神力可疾跑)' : '(吃神肉可疾跑)');
      const nearCatapult = nearestPlacedCatapult(5.0);
      if (nearCatapult) return '固定投石机:空格发射巨石弹(剩 ' + walker.catapultAmmo + ' 发) · E 搬运';
      if (walker.catapult && placedCatapults.length === 0) return '按 E 把投石机架在地上 · 固定炮台才能发射';
      if (Math.hypot(relicSpots.altar.x - walker.x, relicSpots.altar.z - walker.z) < 4.5) return '按 E 祭拜古老祭坛(野人好感 · 生命+20)';
      if (relicSpots.stoneAltar && Math.hypot(relicSpots.stoneAltar.x - walker.x, relicSpots.stoneAltar.z - walker.z) < 4.5)
        return '石牙信任祭坛:按 E 治疗并累计信任(' + relics.stoneMercy + '/5)';
      if (relicSpots.mistAltar && Math.hypot(relicSpots.mistAltar.x - walker.x, relicSpots.mistAltar.z - walker.z) < 4.5)
        return '雾叶信任祭坛:按 E 治疗并累计信任(' + relics.mistMercy + '/5)';
      if (Math.hypot(relicSpots.totem.x - walker.x, relicSpots.totem.z - walker.z) < 3.5) return '按 E 端详图腾柱(刻着先民的歌谣)';
      if (Math.hypot(relicSpots.chest.x - walker.x, relicSpots.chest.z - walker.z) < 3.0) return relics.chestOpen ? '宝箱已空' : '按 E 撬鎏金宝箱的密码锁';
      if (Math.hypot(relicSpots.memorial.x - walker.x, relicSpots.memorial.z - walker.z) < 3.5) return relics.memorialOpen ? '墓碑的暗格已空' : relics.memorialRead ? '按 E 开启墓碑暗格(墓志铭里有答案)' : '按 E 瞻仰红五星墓碑';
      if (Math.hypot(relicSpots.village.x - walker.x, relicSpots.village.z - walker.z) < 15) return walker.savage
          ? (relics.tribeAlly === 'stone' ? '石牙村盟友:剑士/长矛/盾兵/炼毒师分工 · 石牙远岛已解锁' : '按 E 帮助石牙村(强攻派)· 获得固定投石机与第三岛结局')
        : '石牙村只有野人能进 —— 村里已有剑士、长矛战士、盾兵和炼毒师';
      if (relicSpots.village2 && Math.hypot(relicSpots.village2.x - walker.x, relicSpots.village2.z - walker.z) < 15) return walker.savage
          ? (relics.tribeAlly === 'mist' ? '雾叶村盟友:剑士/长矛/盾兵/炼毒师分工 · 雾叶远岛已解锁' : '按 E 帮助雾叶村(避战派)· 获得解毒药与第四岛结局')
        : '雾叶村只有野人能进 —— 村里已有剑士、长矛战士、盾兵和炼毒师';
      if (relicSpots.stream && Math.hypot(relicSpots.stream.x - walker.x, relicSpots.stream.z - walker.z) < 4) return '一条清澈的小溪,从岛心蜿蜒入海';
      if (relics.tombFound && relicSpots.tomb && Math.hypot(relicSpots.tomb.x - walker.x, relicSpots.tomb.z - walker.z) < 3.4)
        return walker.tombDigT > 0 ? '正在用洛阳铲打盗洞…… ' + Math.ceil(walker.tombDigT) + 's'
          : relics.tombKit && relics.tombDug ? '按 E 顺绳梯下墓 · 小心墓道机关'
            : relics.tombKit ? '按 E 用洛阳铲刨土打盗洞'
              : '古墓盗洞:缺材料会自动拉导航线 · 按 E 制作装备 · ' + tombMaterialLine();
      if (Math.hypot(relicSpots.wreck.x - walker.x, relicSpots.wreck.z - walker.z) < 5.0) return '一艘古代沉船的残骸…… 船头插着根断桅';
      if (Math.hypot(relicSpots.camp.x - walker.x, relicSpots.camp.z - walker.z) < 6.0) return '野人营地:三座茅草屋围着熄灭的篝火';
      const sv = savages.find(s => !s.dead && Math.hypot(s.x - walker.x, s.z - walker.z) < 60);
      if (sv) return '野人出没!'
        + (walker.bombAdmin ? '按 U 管理员磁吸炸弹'
          : walker.bombs > 0 ? '按 U 投掷磁吸炸弹(库存 ' + walker.bombs + ')'
            : '磁吸炸弹充能 ' + Math.ceil(walker.bombCd) + 's')
        + ' · 空格射击';
      return relics.war.mode !== 'none'
        ? (relics.war.mode === 'assault' ? '野人总攻中!用枪械/投石机/泰坦抵御 · 泰坦受伤后靠吞噬恢复' : '野人游击战中!袭扰频繁,别恋战')
        : '新荒岛 · 外来者会让两村暂时联合 · 去阵营祭坛治疗 5 次可获信任';
    }
    if (fishing.active) return fishing.phase === 'bite' ? '❗ 按空格收杆!' : '浮漂静立…… H 收杆';
    for (const pot of crabPots) {
      if (pot.ready && Math.hypot(pot.x - walker.x, pot.z - walker.z) < 3.5) return '按 E 收蟹笼(有蟹!)';
    }
    const sd = Math.hypot(shelter.x - walker.x, shelter.z - walker.z);
    if (sd < 3.5) {
      if (!shelter.searched) return '一只半埋的旧木箱,箱面有颗褪色的红五星…… 按 E 搜查';
      if (shelter.diaryPage < SHELTER_DIARY.length) return '按 E 翻看老兵留下的日记';
    } else if (!shelter.searched && sd < 14) return '林间好像有什么人造的东西…… 走近看看';
    const tr = nearestTree();
    if (tr) return '按 X 砍' + tr.kind + '(木柴 +' + tr.data.wood + ' · 木材 +' + (tr.data.wood * 4) + ')· E 仍优先互动';
    if (animals.some(an => an.kind === 'crab' && !an.dead
        && Math.hypot(an.x - walker.x, an.z - walker.z) < 1.8)) return '按 X 劈蟹(蟹肉 +1)';
    if (animals.some(an => an.kind === 'egret' && an.state === 'dead' && !an.harvested
        && Math.hypot(an.x - walker.x, an.z - walker.z) < 2.5)) return '按 E 捡拾白鹭(肉 +1)';
    const ns = nearestStone();
    if (ns) return '按 X 劈开石头(石块 +6)· 按 E 直接拾取(+3)';
      if (rockData.some(r => Math.hypot(r.x - walker.x, r.z - walker.z) < 3.2)) {
      return walker.catapult
        ? '海边大礁石:按 N 切割投石机巨石弹(2 分钟,需 10 椰子或 1 神肉)'
        : '按 X 凿礁石(石块 +4)';
    }
    if (islandHeightAt(walker.x + Math.sin(walker.viewYaw) * 1.5,
        walker.z + Math.cos(walker.viewYaw) * 1.5) < 0.3 && walker.thirst < 95) {
      return '按 Y 捧水喝 · 口渴 +25';
    }
    if (Math.hypot(speedBoat.x - walker.x, speedBoat.z - walker.z) < 8) return '按 E 登上超级快艇';
    for (const h of huntables) {
      if (h.state === 'dead' && Math.hypot(h.x - walker.x, h.z - walker.z) < 2.5) {
        return '按 E 收割' + h.spec.name + '肉';
      }
    }
    for (const a of flyingArrows) {
      if (a.stuck && Math.hypot(a.x - walker.x, a.z - walker.z) < 2) return '按 E 回收箭矢';
    }
    if (Math.hypot(fire.x - walker.x, fire.z - walker.z) < 3.2) {
      return walker.wood > 0 ? '按 E 添柴生火(木柴 -1)' : '篝火需要木柴 —— 沙滩上有漂木';
    }
    for (const p of palmData) {
      if (p.nuts > 0 && Math.hypot(p.x - walker.x, p.z - walker.z) < 4.2) return '按 E 摇树摘椰子';
    }
    for (const dw of driftwoods) {
      if (!dw.taken && Math.hypot(dw.x - walker.x, dw.z - walker.z) < 3) return '按 E 拾取木柴';
    }
    for (const st of stones) {
      if (!st.taken && Math.hypot(st.x - walker.x, st.z - walker.z) < 2.5) return '按 E 拾取石块(+3)';
    }
    const nearCatapultOld = walker.catapult && nearestPlacedCatapult(5.0);
    if (walker.savage && (walker.venom > 0 || walker.poisonSpear > 0)) {
      return '毒液 ' + walker.venom + ' · 毒矛 ' + walker.poisonSpear + ' · Q 涂毒 · 空格投矛';
    }
    return '空格 ' + (nearCatapultOld ? '投石机'
      : walker.weapon === 'spear' ? '投矛'
        : walker.weapon === 'rifle' || walker.weapon === 'sniper' || walker.weapon === 'smg' ? '射击' : '射箭')
      + (walker.rifle || walker.sniper || walker.smg || walker.spear ? ' · 2 切换武器' : '')
      + ' · X 砍柴/劈石 · C 蟹笼 · H 钓鱼 · Y 喝水 · F 陷阱 · Q 打磨箭 · T 吃肉 · R 神肉 · 0 神秘密码';
  }

  function islandInteract() {
    if (walker.swordTurret) {
      walker.swordTurret = null;
      setAim(false);
      showToast('离开长剑炮台');
      return;
    }
    if (swordTurret && Math.hypot(swordTurret.x - walker.x, swordTurret.z - walker.z) < 18) {
      walker.swordTurret = swordTurret;
      walker.x = swordTurret.x;
      walker.z = swordTurret.z;
      walker.y = swordTurret.y + SWORD_TURRET_EYE_LIFT - 1.62;
      walker.viewYaw = swordTurret.dir;
      walker.viewPitch = -0.32;
      setAim(false);
      showToast('⚔ 高架长剑炮台就位:腰射模式 · 俯瞰下方野人 · 按 4 切换 7×镜 · 空格发射 · E 离开');
      return;
    }
    if (walker.inTomb) {
      if (walker.tombCrawlT > 0) { showToast('正在钻过暗孔……'); return; }
      if (relics.tombOpeningT > 0) { showToast('正在掀棺材板……'); return; }
      if (relicSpots.tomb && Math.hypot((relicSpots.tomb.x + 5.3) - walker.x, relicSpots.tomb.z - walker.z) < 1.8) {
        exitTomb();
        return;
      }
      const trw = nearestTombReward();
      if (trw) { takeTombReward(trw); return; }
      if (relicSpots.tomb?.waterLadder && Math.hypot(relicSpots.tomb.waterLadder.x - walker.x, relicSpots.tomb.waterLadder.z - walker.z) < 2.4) {
        exitTombWaterLadder();
        return;
      }
      if (relicSpots.tomb?.historian && Math.hypot(relicSpots.tomb.historian.x - walker.x, relicSpots.tomb.historian.z - walker.z) < 2.5) {
        readHistorianLetter();
        return;
      }
      if (relics.tombWaterOpen && relicSpots.tomb?.water && Math.hypot(relicSpots.tomb.water.x - walker.x, (relicSpots.tomb.water.z - 2.2) - walker.z) < 2.8) {
        startTombCrawl(true);
        return;
      }
      if (relics.tombWaterOpen && relicSpots.tomb && Math.hypot(relicSpots.tomb.crawl.x - walker.x, relicSpots.tomb.crawl.z - walker.z) < 2.4) {
        startTombCrawl();
        return;
      }
      if (relicSpots.tomb && Math.hypot((relicSpots.tomb.x - 3.4) - walker.x, (relicSpots.tomb.z - 18.2) - walker.z) < 2.4) {
        if (!relics.tombOpened) startTombOpen();
        else showToast(relics.tombLooted ? '石棺已经空了' : '棺内还有东西,靠近物件按 E 一件件拿');
        return;
      }
      showToast(relics.authorMode ? '作者视角下,红圈就是翻板机关' : '墓道潮湿阴冷。机关廊会惩罚走错的一侧');
      return;
    }
    // 地下军火库:梯子返回 / 取冲锋枪 / 补弹药 / 看地图
    if (walker.inBunker) {
      if (Math.hypot(bunkerSpots.ladder.x - walker.x, bunkerSpots.ladder.z - walker.z) < 1.8) {
        exitBunker();
        return;
      }
      if (Math.hypot(bunkerSpots.rack.x - walker.x, bunkerSpots.rack.z - walker.z) < 2.4) {
        if (!walker.smg) {
          const pwd2 = window.prompt('老兵的收藏枪上着一把老式密码锁 —— 输入第二层密码:');
          if (pwd2 === null) return;
          if (pwd2 !== BUNKER_PASSWORD2) {
            showToast('✗ 密码锁纹丝不动 —— 提示:去看看墙上那张老照片');
            return;
          }
          walker.smg = true;
          walker.weapon = 'smg';
          walker.smgAmmo += 90;
          walker.rifle = walker.rifle || true;
          $('ih-weapon-item').style.display = 'flex';
          $('ih-bullets-item').style.display = 'flex';
          startHandAction('pickup');
          showToast('✓ 密码锁咔哒一声弹开!取下波波沙冲锋枪 · 弹鼓 90 发 —— 按住空格全自动扫射(2 切换武器)');
        } else showToast('密码锁敞开着,枪架上只剩老兵不肯动的纪念品');
        return;
      }
      if (Math.hypot(bunkerSpots.crates.x - walker.x, bunkerSpots.crates.z - walker.z) < 2.4) {
        walker.bullets = Math.min(60, walker.bullets + 30);
        walker.sniperAmmo = Math.min(24, walker.sniperAmmo + 12);
        if (walker.smg) walker.smgAmmo = Math.min(180, walker.smgAmmo + 90);
        startHandAction('pickup');
        showToast('📦 弹药箱满满当当!步枪弹 +30 · 狙击弹 +12' + (walker.smg ? ' · 冲锋枪弹 +90' : ''));
        return;
      }
      if (Math.hypot(bunkerSpots.table.x - walker.x, bunkerSpots.table.z - walker.z) < 2.0) {
        showToast('🗺 桌上的作战地图标注着五种虚空泰坦的洄游路线…… 原来老兵监视它们一辈子了');
        return;
      }
      if (Math.hypot(bunkerSpots.photo.x - walker.x, bunkerSpots.photo.z - walker.z) < 2.0) {
        showToast('🖼 一群士兵在废墟前的合影,背面写着一行小字:「斯大林格勒 · 1943」');
        return;
      }
      showToast('混凝土墙壁上挂着 1943 年的照片,灯泡还在嗡嗡作响');
      return;
    }
    const house = nearestCompletedHouse();
    if (house && useHouse(house)) return;
    if (placeOrCarryCatapult()) return;
    const wb = nearestWorkbench();
    if (wb) {
      craftFirearm();
      return;
    }
    const gp = nearestGunPart();
    if (gp) {
      const src = gunParts.find(p => p.mesh === gp.mesh);
      if (src) {
        src.taken = true;
        src.mesh.visible = false;
        src.respawnT = 150;
      }
      walker[gp.kind]++;
      startHandAction('pickup');
      showToast('拾取' + gp.name + ' ×1 · ' + materialLine());
      return;
    }
    const tm = nearestTombMaterial();
    if (tm) {
      const src = tombMaterials.find(p => p.mesh === tm.mesh);
      if (src) {
        src.taken = true;
        src.mesh.visible = false;
      }
      walker[tm.kind]++;
      startHandAction('pickup');
      showToast('拾取' + tm.name + ' ×1 · ' + tombMaterialLine());
      return;
    }
    const curio = nearestCurio();
    if (curio && useCurio(curio)) return;
    if (relics.tombFound && relicSpots.tomb && Math.hypot(relicSpots.tomb.x - walker.x, relicSpots.tomb.z - walker.z) < 3.4) {
      enterTomb();
      return;
    }
    // 新岛遗物互动
    if (Math.hypot(relicSpots.altar.x - walker.x, relicSpots.altar.z - walker.z) < 4.5) { useAltar(); return; }
    if (relicSpots.stoneAltar && Math.hypot(relicSpots.stoneAltar.x - walker.x, relicSpots.stoneAltar.z - walker.z) < 4.5) {
      if (trustByMercy('stone')) return;
    }
    if (relicSpots.mistAltar && Math.hypot(relicSpots.mistAltar.x - walker.x, relicSpots.mistAltar.z - walker.z) < 4.5) {
      if (trustByMercy('mist')) return;
    }
    if (Math.hypot(relicSpots.totem.x - walker.x, relicSpots.totem.z - walker.z) < 3.5) { readTotem(); return; }
    if (Math.hypot(relicSpots.chest.x - walker.x, relicSpots.chest.z - walker.z) < 3.0) { openRelicChest(); return; }
    if (Math.hypot(relicSpots.memorial.x - walker.x, relicSpots.memorial.z - walker.z) < 3.5) { openMemorial(); return; }
    if (Math.hypot(relicSpots.village.x - walker.x, relicSpots.village.z - walker.z) < 15) {
      if (!walker.savage) {
        showToast('🗿 石牙村图腾低鸣,只有野人一族能进入这个村落');
        return;
      }
      allyStoneVillage();
      return;
    }
    if (relicSpots.village2 && Math.hypot(relicSpots.village2.x - walker.x, relicSpots.village2.z - walker.z) < 15) {
      if (!walker.savage) {
        showToast('🌫 雾叶村的迷雾图腾挡住了你,只有野人一族能进入');
        return;
      }
      allyMistVillage();
      return;
    }
    if (Math.hypot(relicSpots.wreck.x - walker.x, relicSpots.wreck.z - walker.z) < 5.0) {
      showToast('⚓ 船骨上长满藤壶,船名依稀可辨:「西比里亚科夫」—— 岛上那座红五星墓碑,纪念的就是她的锅炉工帕维尔');
      return;
    }
    // 万斤巨物:指挥打斗 / 融合 / 驯服 / 割神肉(对任意在场泰坦)
    const myTamed = myTamedTitan();
    const wildNear = titans.find(g => g.state === 'rage'
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 130);
    const deadNear = titans.find(g => g.state === 'dead'
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 130);
    // 指挥驯服泰坦迎战野生泰坦
    if (myTamed && wildNear && !titanBattle.on
        && Math.hypot(myTamed.x - walker.x, myTamed.z - walker.z) < 130) {
      startTitanBattle();
      return;
    }
    // 融合:打斗胜利后,驯服泰坦吞噬对手躯体
    if (myTamed && deadNear
        && Math.hypot(myTamed.x - walker.x, myTamed.z - walker.z) < 130) {
      fuseTitans();
      return;
    }
    const rageTitan = titans.find(g => g.state === 'rage'
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 110);
    if (rageTitan) {
      const gt = rageTitan;
      // 有驯服泰坦正在与它打斗:它无暇攻击你,驯服成功率大幅提升
      const guarded = titanBattle.on && titanBattle.wild === gt;
      // 25% 概率反击:甩头把你掀翻,掉生命值,驯服度倒退
      if (!guarded && Math.random() < 0.25) {
        gt.tame = Math.max(0, gt.tame - 10);
        walker.stamina = Math.max(0, walker.stamina - 30);
        damageWalker(25, '被' + gt.sp.name + '甩头反击,当场毙命', true);
        walker.shakeT = Math.max(walker.shakeT, 1.2);
        // 击退:往岛心方向推开 3.5m(不推进深水)
        const kdx = walker.x - gt.x, kdz = walker.z - gt.z;
        const kd = Math.hypot(kdx, kdz) || 1;
        const nx = walker.x + (kdx / kd) * 3.5, nz = walker.z + (kdz / kd) * 3.5;
        if (groundHeightAt(nx, nz) > -1.1) { walker.x = nx; walker.z = nz; }
        showToast('💥 ' + gt.sp.name + '猛然甩头反击!你被掀翻在地(生命 -25 · 驯服度 -10)');
        if (walker.hp <= 0 || walker.stamina <= 0) {
          titanKnockout(gt.sp.name + '甩头反击');
        }
        return;
      }
      gt.tame = Math.min(100, gt.tame + (walker.buff ? 20 : 12) * gt.sp.tameMul * (guarded ? 2.5 : 1));
      startHandAction('shake');
      walker.shakeT = Math.max(walker.shakeT, 0.3);
      if (guarded) showToast('🛡 你的泰坦缠住了它!它完全没空理你 —— 驯服进度暴涨!');
      if (gt.tame >= 100) {
        gt.state = 'tamed';
        if (titanBattle.wild === gt) { titanBattle.on = false; titanBattle.wild = null; titanBattle.mount = null; }
        titansTamed++;
        showToast('🤝 奇迹!虚空泰坦 · ' + gt.sp.name + ' 认你为主(已驯服 ' + titansTamed + '/' + TITAN_MAX + ')—— 到岸边按 V 骑乘它');
        checkTitanEnding();
        autoDevourTamed();          // 多只认主:最大的自动吞噬其他同伴
      } else {
        showToast('🖐 你把手贴上' + gt.sp.name + '冰冷的皮肤…… 驯服度 ' + Math.round(gt.tame) + '%');
      }
      return;
    }
    // 死泰坦:有驯服泰坦时优先融合(上面已拦截);否则割肉
    const deadTitan = titans.find(g => g.state === 'dead' && g.harvests > 0
      && Math.hypot(g.x - walker.x, g.z - walker.z) < 50);
    if (deadTitan) {
      deadTitan.harvests--;
      walker.godMeat += 2;
      startHandAction('pickup');
      showToast('🥩 割下神肉 ×2 —— 按 R 食用,可获得异能');
      if (deadTitan.harvests <= 0) {
        deadTitan.sinkK = 0;
        showToast('巨物残骸缓缓沉入深渊……');
      }
      return;
    }
    // 捕蟹笼收获
    for (const pot of crabPots) {
      if (pot.ready && Math.hypot(pot.x - walker.x, pot.z - walker.z) < 3.5) {
        harvestCrabPot(pot);
        return;
      }
    }
    // 老兵避难所
    if (Math.hypot(shelter.x - walker.x, shelter.z - walker.z) < 3.5) {
      searchShelter();
      return;
    }
    // 被射落的白鹭
    for (const an of animals) {
      if (an.kind === 'egret' && an.state === 'dead' && !an.harvested
          && Math.hypot(an.x - walker.x, an.z - walker.z) < 2.5) {
        an.harvested = true;
        an.respawnT = 90;
        walker.meat++;
        startHandAction('pickup');
        showToast('捡到白鹭肉 ×1(按 T 食用)');
        return;
      }
    }
    if (Math.hypot(speedBoat.x - walker.x, speedBoat.z - walker.z) < 8) {
      exitIsland(false);
      setDriving(true, speedBoat);
      return;
    }
    for (const h of huntables) {
      if (h.state === 'dead' && Math.hypot(h.x - walker.x, h.z - walker.z) < 2.5) {
        walker.meat += h.spec.meat;
        h.state = 'gone';
        h.mesh.visible = false;
        startHandAction('pickup');
        showToast('收割 ' + h.spec.name + '肉 ×' + h.spec.meat + '(按 T 食用)');
        return;
      }
    }
    for (let i = flyingArrows.length - 1; i >= 0; i--) {
      const a = flyingArrows[i];
      if (a.stuck && Math.hypot(a.x - walker.x, a.z - walker.z) < 2) {
        walker.arrows++;
        scene.remove(a.mesh);
        flyingArrows.splice(i, 1);
        startHandAction('pickup');
        showToast('回收箭矢(现有 ' + walker.arrows + ' 支)');
        return;
      }
    }
    if (Math.hypot(fire.x - walker.x, fire.z - walker.z) < 3.2) {
      if (walker.wood > 0) {
        walker.wood--;
        fire.fuel = Math.min(240, fire.fuel + 150);
        startHandAction('fire');
        showToast('篝火燃起来了 · 夜里取暖照明');
      } else showToast('没有木柴 —— 去沙滩捡漂木');
      return;
    }
    for (const p of palmData) {
      if (p.nuts > 0 && Math.hypot(p.x - walker.x, p.z - walker.z) < 4.2) {
        p.nuts--;
        walker.coconut++;
        startHandAction('shake');
        showToast('摘到一只椰子(按 G 食用)');
        return;
      }
    }
    for (const dw of driftwoods) {
      if (!dw.taken && Math.hypot(dw.x - walker.x, dw.z - walker.z) < 3) {
        dw.taken = true;
        dw.mesh.visible = false;
        dw.respawnT = 90;
        walker.wood++;
        startHandAction('pickup');
        showToast('拾取木柴 ×1');
        return;
      }
    }
    for (const st of stones) {
      if (!st.taken && Math.hypot(st.x - walker.x, st.z - walker.z) < 2.5) {
        st.taken = true;
        st.mesh.visible = false;
        st.respawnT = 45;
        walker.stone += 3;
        startHandAction('pickup');
        showToast('拾取石块 ×3(Q 打磨箭矢)');
        return;
      }
    }
    for (const rp of ropes) {
      if (!rp.taken && Math.hypot(rp.x - walker.x, rp.z - walker.z) < 3) {
        rp.taken = true;
        rp.mesh.visible = false;
        rp.respawnT = 120;
        walker.rope++;
        startHandAction('pickup');
        showToast('拾取绳子 ×1 · 建房和升级都要用');
        return;
      }
    }
  }

  function updateSurvival(t, dt) {
    // 篝火燃料与光影
    if (fire.fuel > 0) fire.fuel -= dt;
    const fireI = Math.min(1, Math.max(0, fire.fuel) / 15);
    uCampfire.value.set(fire.x, fire.z, fireI, 0);
    flame.visible = fireI > 0.02;
    smoke.visible = fireI > 0.02;
    updateTombDig(dt);
    updateTombOpen(dt);
    updateTombCrawl(dt);
    // 漂木重生 / 椰子再生
    for (const dw of driftwoods) {
      if (dw.taken) {
        dw.respawnT -= dt;
        if (dw.respawnT <= 0) { dw.taken = false; dw.mesh.visible = true; }
      }
    }
    for (const rp of ropes) {
      if (rp.taken) {
        rp.respawnT -= dt;
        if (rp.respawnT <= 0) { rp.taken = false; rp.mesh.visible = true; }
      }
    }
    for (const gp of gunParts) {
      if (gp.taken) {
        gp.respawnT -= dt;
        if (gp.respawnT <= 0) { gp.taken = false; gp.mesh.visible = true; }
      }
    }
    for (const c of curios) {
      c.cd = Math.max(0, c.cd - dt);
      c.challengeT = Math.max(0, (c.challengeT || 0) - dt);
      c.hitT = Math.max(0, (c.hitT || 0) - dt);
      if (c.taken) {
        c.respawnT -= dt;
        if (c.respawnT <= 0) {
          c.taken = false;
          c.mesh.visible = (c.kind !== 'mushroom' && c.kind !== 'firefly') || isMushroomNight();
        }
      } else {
        if (c.kind === 'mushroom' || c.kind === 'firefly') {
          const night = isMushroomNight();
          c.mesh.visible = night;
          if (!night) continue;
          const flicker = (c.kind === 'firefly' ? 0.88 : 0.75)
            + 0.20 * Math.sin(t * 5.5 + c.x * 0.07) + 0.08 * Math.sin(t * 13.0 + c.z * 0.11);
          c.mesh.scale.setScalar(Math.max(0.72, flicker));
          c.mesh.position.y = c.baseY + Math.sin(t * (c.kind === 'firefly' ? 3.3 : 2.4) + c.x) * (c.kind === 'firefly' ? 0.08 : 0.045);
        } else {
          c.mesh.position.y = c.baseY;
        }
        if (c.kind === 'coconutTarget' && c.hitT > 0) {
          c.mesh.rotation.z = Math.sin(t * 28) * 0.12 * c.hitT;
          c.mesh.position.y = c.baseY + Math.sin(t * 18) * 0.035 * c.hitT;
        } else if (c.kind === 'coconutTarget') {
          c.mesh.rotation.z *= Math.max(0, 1 - dt * 8);
        }
        c.mesh.rotation.y += (c.kind === 'drum' ? 0.08 : c.kind === 'tide' ? 0.04 : 0.18) * dt;
      }
    }
    for (const p of palmData) {
      if (p.nuts < 3 && !p.gone && !p.falling) {
        p.regrowT += dt;
        if (p.regrowT > 120) { p.nuts++; p.regrowT = 0; }
      }
    }
    // 捕蟹笼:计时出蟹,浮标随浪
    for (const pot of crabPots) {
      pot.buoy.position.y = waveHeightAt(pot.x, pot.z, t, seaStateEff) + 0.06;
      if (!pot.ready) {
        pot.timer -= dt;
        if (pot.timer <= 0) {
          pot.ready = true;
          pot.crab.visible = true;
          if (walker.on) showToast('🦀 捕蟹笼里一阵扑腾 —— 去按 E 收获');
        }
      }
    }
    updateTreeFalls(dt);
    for (const rk of rockData) {
      if (rk.cd > 0) rk.cd -= dt;       // 礁石凿击冷却
      if (rk.cutCd > 0) rk.cutCd -= dt; // 投石机巨石弹切割冷却
    }
    if (!walker.on) {
      uSurvival.value += (0 - uSurvival.value) * Math.min(1, dt * 2);
      return;
    }
    for (const bs of buildSites) bs.useCd = Math.max(0, (bs.useCd || 0) - dt);
    for (let i = catapultEffects.length - 1; i >= 0; i--) {
      const ef = catapultEffects[i];
      ef.life += dt;
      const k = Math.max(0, 1 - ef.life / ef.maxLife);
      if (ef.mesh.material) {
        ef.mesh.material.opacity = ef.kind === 'trail' ? 0.72 * k : 0.55 * k;
        ef.mesh.material.transparent = true;
      }
      if (ef.kind === 'ring') ef.mesh.scale.setScalar(1 + ef.life * 0.75);
      if (ef.life >= ef.maxLife) {
        scene.remove(ef.mesh);
        if (ef.mesh.geometry) ef.mesh.geometry.dispose();
        catapultEffects.splice(i, 1);
      }
    }
    if (walker.carryingCatapult) {
      const cp = walker.carryingCatapult;
      cp.x = walker.x - Math.sin(walker.viewYaw) * 0.9;
      cp.z = walker.z - Math.cos(walker.viewYaw) * 0.9;
      cp.y = walker.y;
      cp.dir = walker.viewYaw + Math.PI;
      cp.mesh.position.set(cp.x, cp.y + 0.62, cp.z);
      cp.mesh.rotation.set(-0.18, cp.dir, 0.10);
      cp.mesh.scale.set(1.15, 1.15, 1.15);
    }
    const thirstSunMul = () => {
      const sun = Math.max(0, uSunDir.value.y);
      const day = Math.min(1, sun / 0.56);
      return 0.22 + day * 1.58;          // 夜里很慢,正午接近 1.8 倍
    };
    if (walker.cuttingRock) {
      const job = walker.cuttingRock;
      job.t -= dt;
      walker.hunger = Math.max(0, walker.hunger - dt * 0.55);
      walker.thirst = Math.max(0, walker.thirst - dt * 0.70 * thirstSunMul());
      if (Math.hypot(job.rock.x - walker.x, job.rock.z - walker.z) > 5.2) {
        walker.cuttingRock = null;
        showToast('你离开了礁石,巨石弹切割中断');
      } else if (job.t <= 0) {
        job.rock.cutCd = 240;
        walker.catapultAmmo += 2;
        walker.cuttingRock = null;
        startHandAction('pickup');
        showToast('🪨 海边礁石被切成 2 块投石机巨石弹(现有 ' + walker.catapultAmmo + ' 发)');
      } else if (Math.floor(job.t) % 30 === 0 && (!job.ping || Math.abs(job.ping - job.t) > 2)) {
        job.ping = job.t;
        startHandAction('chop');
      }
    }
    // 三围衰减:饥饿约 6 分钟见底;口渴受太阳高度影响,夜里很慢、烈日下更快。
    const houseBonus = activeHouseBonus();
    let drainK = walker.buff ? 0.5 : 1;
    if (houseBonus) {
      drainK *= houseBonus.drainMul;
      walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + dt * houseBonus.stamina);
      if (houseBonus.thirst > 0) walker.thirst = Math.min(100, walker.thirst + dt * houseBonus.thirst);
      if (houseBonus.detox > 0) {
        walker.poisonT = Math.max(0, walker.poisonT - dt * houseBonus.detox);
        walker.poisonBlurT = Math.max(0, walker.poisonBlurT - dt * houseBonus.detox);
      }
    }
    walker.hunger = Math.max(0, walker.hunger - dt * (100 / 360) * drainK);
    walker.thirst = Math.max(0, walker.thirst - dt * (100 / 240) * drainK * thirstSunMul());
    // 生命缓慢回复(吃饱喝足时;神力翻倍)
    const hpMax = walker.savageRole === 'shield' ? 260 : walker.savageRole === 'swordsman' ? 220 : walker.savageRole === 'poisoner' ? 180 : PLAYER_HP_MAX;
    if (walker.hp > 0 && walker.hp < hpMax && walker.hunger > 30 && walker.thirst > 30) {
      walker.hp = Math.min(hpMax, walker.hp + dt * (walker.buff ? 4 : 1.5));
    }
    if (houseBonus && houseBonus.hp > 0 && walker.hp > 0) {
      walker.hp = Math.min(hpMax, walker.hp + dt * houseBonus.hp);
    }
    // 第一人称:视角朝向决定 WASD 方向,Shift 切换疾跑(耗体力)
    let ix = 0, iz = 0;
    if (driveKeys.throttle) iz += 1;
    if (driveKeys.brake) iz -= 1;
    if (driveKeys.left) ix -= 1;
    if (driveKeys.right) ix += 1;
    const moving = (ix !== 0 || iz !== 0) && !walker.swordTurret && walker.tombDigT <= 0 && walker.tombCrawlT <= 0 && relics.tombOpeningT <= 0;
    if (recall.active) {
      if (!recall.target || recall.target.stage <= 0 || walker.inBunker || walker.inTomb || walker.swordTurret || riding) {
        cancelRecall('回城中断');
      } else if (moving) {
        cancelRecall('移动了,回城中断');
      } else {
        recall.t += dt;
        const sec = Math.ceil(5 - recall.t);
        if (sec !== recall.lastPing && recall.t < 5) {
          recall.lastPing = sec;
          showToast('回城中 ' + Math.max(1, sec) + 's · 受到攻击会中断');
        }
        walker.stamina = Math.min(walker.buff ? 200 : 100, walker.stamina + dt * 10);
        if (recall.t >= 5) {
          finishRecall();
          return;
        }
      }
    }
    const maxSt = walker.buff ? 200 : 100;
    const sprintLockedByCatapult = walker.carryingCatapult && !walker.buff;
    const sprint = shiftDown && moving && walker.stamina > 4 && !sprintLockedByCatapult;
    if (sprintLockedByCatapult && moving && (!walker.carryWarnT || t - walker.carryWarnT > 3)) {
      walker.carryWarnT = t;
      showToast('投石机太沉,搬运时只能走路;吞下神肉后才可扛着疾跑');
    }
    const roleSpeed = walker.savageRole === 'shield' ? 0.82
      : walker.savageRole === 'swordsman' ? 1.16
        : walker.savageRole === 'poisoner' ? 1.04 : 1.0;
    const spd = (sprint ? 6.4 : 3.3) * (walker.buff ? 1.5 : 1) * (walker.savage ? 1.3 * roleSpeed : 1);   // 异能:疾行如风;野人矫健
    if (sprint) walker.stamina = Math.max(0, walker.stamina - dt * (walker.buff ? 5.5 : 11));
    else walker.stamina = Math.min(maxSt, walker.stamina + dt * 7);
    if (moving) {
      const il = Math.hypot(ix, iz); ix /= il; iz /= il;
      const fx = Math.sin(walker.viewYaw), fz = Math.cos(walker.viewYaw);
      const rx = -fz, rz = fx;                          // 屏幕右方
      const dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
      const nx = walker.x + dx * spd * dt, nz = walker.z + dz * spd * dt;
      if (walker.inBunker) {                            // 军火库:混凝土墙内活动
        if (Math.abs(nx - BUNKER.x) < 5.4 && Math.abs(nz - BUNKER.z) < 4.4) { walker.x = nx; walker.z = nz; }
      } else if (walker.inTomb && relicSpots.tomb) {     // 古墓:石室内活动
        const lx = nx - relicSpots.tomb.x, lz = nz - relicSpots.tomb.z;
        const inMain = Math.abs(lx) < 6.0 && lz < 3.8 && lz > -20.8;
        const inBendA = lx > 2.4 && lx < 14.4 && lz < -16.0 && lz > -20.4;
        const inBendB = lx > 11.8 && lx < 16.6 && lz < -17.6 && lz > 3.2;
        const inWater = lx > 7.2 && lx < 21.2 && lz < 3.0 && lz > -8.0;
        if (inMain || inBendA || inBendB || inWater) { walker.x = nx; walker.z = nz; }
      } else if (groundHeightAt(nx, nz) > -1.1) {
        const nearVillage = relicSpots.village
          && newIslandHeightAt(nx, nz) > 0.5
          && (Math.hypot(nx - relicSpots.village.x, nz - relicSpots.village.z) < 13.5
            || (relicSpots.village2 && Math.hypot(nx - relicSpots.village2.x, nz - relicSpots.village2.z) < 13.5));
        if (!nearVillage || walker.savage) {
          walker.x = nx; walker.z = nz;
        } else if (!walker.villageBlockT || simTime - walker.villageBlockT > 2.5) {
          walker.villageBlockT = simTime;
          showToast('🗿 野人村落的图腾挡住了你 —— 只有选择 2 重生为野人才能进去');
        }
      }  // 及腰深水禁足
      walker.phase += spd * dt * 2.0;
    }
    if (walker.swordTurret) {
      walker.x = walker.swordTurret.x;
      walker.z = walker.swordTurret.z;
      walker.y = walker.swordTurret.y + SWORD_TURRET_EYE_LIFT - 1.62;
      walker.swordTurret.mesh.rotation.y = walker.viewYaw;
    } else {
      walker.y = walker.inBunker ? BUNKER.floorY
        : walker.inTomb && relicSpots.tomb ? (walker.tombCrawlT > 0 ? walker.y : relicSpots.tomb.floorY)
          : groundHeightAt(walker.x, walker.z);
    }
    updateTombTraps();
    updateTurretHipCross();
    // 踏上新岛:解锁死亡重生选项
    if (!newIsland.unlocked && newIslandHeightAt(walker.x, walker.z) > 0.5) {
      newIsland.unlocked = true;
      newIsland.landedT = 0;
      showToast('🏝 你踏上了更远更大的迷雾雨林岛!野人会先观望 30 秒,山脊上还有一座废弃长城制高点');
    }
    if (relics.thirdUnlocked && !relics.thirdReached && remoteIslandHeightAt(THIRD_ISLAND, walker.x, walker.z) > 0.8) {
      relics.thirdReached = true;
      showToast('🪨 结局 · 石牙远征:你带着强攻派的投石机关来到第三岛,石牙村把你尊为攻城先祖');
    }
    if (relics.fourthUnlocked && !relics.fourthReached && remoteIslandHeightAt(FOURTH_ISLAND, walker.x, walker.z) > 0.8) {
      relics.fourthReached = true;
      showToast('🌫 结局 · 雾叶迁徙:你护送避战派穿过迷雾来到第四岛,雾叶村从此远离战争');
    }
    // 第一人称相机:头部高度 + 步伐/呼吸浮沉(+ 被撞时的晃动)
    walker.jumpT = Math.max(0, walker.jumpT - dt);
    let eyeY = walker.y + 1.62
      + (moving ? Math.sin(walker.phase * 2) * 0.045 : Math.sin(t * 1.6) * 0.012)
      + Math.sin(Math.min(1, walker.jumpT / 0.42) * Math.PI) * 0.55;
    let shakeX = 0, shakeZ = 0;
    if (walker.shakeT > 0) {
      walker.shakeT -= dt;
      const sh = walker.shakeT * 0.12;
      eyeY += Math.sin(t * 40) * sh;
      shakeX = Math.sin(t * 47) * sh;
      shakeZ = Math.cos(t * 53) * sh;
    }
    camera.position.set(walker.x + shakeX, eyeY, walker.z + shakeZ);
    const cp = Math.cos(walker.viewPitch);
    camera.lookAt(
      walker.x + Math.sin(walker.viewYaw) * cp,
      eyeY + Math.sin(walker.viewPitch),
      walker.z + Math.cos(walker.viewYaw) * cp);
    // 开镜:狙击按倍率收窄 FOV;炮台使用独立 7×瞄准镜,不受炮身/脚下遮挡限制。
    const targetFov = aim.on
      ? (walker.swordTurret ? 55 / 7 : walker.weapon === 'sniper' ? 55 / aim.zoom : 55 / 1.6)
      : 55;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
      camera.updateProjectionMatrix();
    }
    // 无敌之身:持续清除所有负面状态,并把生存数值维持在角色上限。
    // 放在本帧生存消耗与移动结算之后,避免疾跑、炎热或持续毒伤留下残余扣减。
    if (walker.godMode) {
      walker.hp = walkerMaxHp();
      walker.stamina = walker.buff ? 200 : 100;
      walker.hunger = 100;
      walker.thirst = 100;
      walker.poisonT = 0;
      walker.poisonBlurT = 0;
      walker.faintT = 0;
      walker.shakeT = 0;
    }
    // 虚脱:只保留画面四周变暗;正常生存状态不会再触发昏倒
    const worst = Math.min(walker.hunger, walker.thirst);
    const distressT = worst <= 0 ? 1 : Math.max(0, 1 - worst / 30) * 0.7;
    uSurvival.value += (distressT - uSurvival.value) * Math.min(1, dt * 2);
    walker.faintT = 0;
    // 求生 HUD
    $('ih-hp').style.width = Math.min(100, walker.hp / hpMax * 100) + '%';
    $('ih-hunger').style.width = walker.hunger + '%';
    $('ih-thirst').style.width = walker.thirst + '%';
    $('ih-stamina').style.width = (walker.stamina / (walker.buff ? 200 : 100) * 100) + '%';
    $('ih-coconut').textContent = walker.coconut;
    $('ih-wood').textContent = walker.wood;
    $('ih-timber').textContent = walker.timber;
    $('ih-rope').textContent = walker.rope;
    $('ih-arrows').textContent = walker.arrows;
    $('ih-traps').textContent = walker.traps;
    $('ih-stone').textContent = walker.stone;
    $('ih-meat').textContent = walker.meat;
    $('ih-pots').textContent = walker.pots;
    $('ih-godmeat').textContent = walker.godMeat;
    const onNewIsle = newIslandHeightAt(walker.x, walker.z) > 0.3;
    $('ih-bombs-item').style.display = onNewIsle ? 'flex' : 'none';
    if (onNewIsle) $('ih-bombs').textContent = walker.bombAdmin
      ? '∞ 无冷却'
      : (walker.bombs > 0 ? walker.bombs + ' 库存' : '充能中')
        + (walker.bombCd > 0 ? '(' + Math.ceil(walker.bombCd) + 's)' : '');
    if (walker.rifle || walker.sniper || walker.smg || walker.spear || walker.catapult || walker.swordTurret) {
      $('ih-weapon-item').style.display = 'flex';
      $('ih-weapon').textContent = walker.swordTurret ? '长剑炮台'
        : walker.weapon === 'sniper' ? '狙击枪'
        : walker.weapon === 'smg' ? '冲锋枪'
          : walker.weapon === 'rifle' ? '步枪'
            : walker.weapon === 'spear' ? '长矛' : '弓箭';
      const hasAmmo = walker.swordTurret || walker.weapon === 'smg' || walker.weapon === 'sniper' || walker.weapon === 'rifle' || walker.catapult;
      $('ih-bullets-item').style.display = hasAmmo ? 'flex' : 'none';
      if (hasAmmo) $('ih-bullets').textContent = walker.swordTurret ? walker.swordTurret.ammo + '/1000'
        : walker.weapon === 'smg' ? walker.smgAmmo
        : walker.weapon === 'sniper' ? walker.sniperAmmo
          : walker.weapon === 'rifle' ? walker.bullets
            : walker.catapult
              ? '巨石' + walker.catapultAmmo + (walker.cuttingRock ? '(' + Math.ceil(walker.cuttingRock.t) + 's)' : '')
              : walker.bullets;
    }
    $('ih-hint').textContent = islandHint();
  }

  function capsizeBoat(b) {
    if (b.capsizeT > 0) return;
    b.capsizeT = 5;
    b.u *= 0.2;
    if (b === playerBoat) showToast('⚠ 船被掀翻了!正在回正…');
  }

  function updateBoats(t, dt) {
    for (const b of boats) {
      b.px = b.x; b.pz = b.z;                       // 搁浅回退用
      if (b.ai) {
        // AI 舵手:缓慢游荡 + 偶尔转向;风暴/海啸时抛锚减速
        const wander = Math.sin(t * 0.05 + b.aiPhase) * 0.6;
        const anchor = tsunamiState.amp > 10 || uStorm.value > 0.6;
        b.aiThrottle += (((anchor ? 0.12 : 0.45) ) - b.aiThrottle) * Math.min(1, dt * 0.3);
        stepBoatDynamics(b, { throttle: b.aiThrottle, rudder: wander * 0.4 }, dt);
      } else if (driving && b === driveTarget) {
        // 玩家油门:W 增 S 减,松开保持(真实船用油门杆,非回中式)
        if (driveKeys.throttle) b.throttle = Math.min(1, b.throttle + dt * 0.45);
        if (driveKeys.brake) b.throttle = Math.max(-0.3, b.throttle - dt * 0.55);
        // 舵:A 左 D 右,松开自动回中(舵轮有回正力)
        const rudIn = (driveKeys.right ? 1 : 0) - (driveKeys.left ? 1 : 0);
        b.rudder += (rudIn - b.rudder * (rudIn === 0 ? 2.2 : 0)) * Math.min(1, dt * 3.5);
        b.rudder = Math.max(-1, Math.min(1, b.rudder));
        const inp = b.capsizeT > 0 ? { throttle: 0, rudder: 0 } : b;   // 倾覆时失控
        stepBoatDynamics(b, inp, dt);
      } else {
        stepBoatDynamics(b, { throttle: 0, rudder: 0 }, dt);   // 玩家离船:漂航
      }
      // 岛礁搁浅:地形高于 -1.3m 即挡住(玩家船给提示)
      if (islandHeightAt(b.x, b.z) > -1.3) {
        b.x = b.px; b.z = b.pz;
        b.u *= 0.05; b.v = 0;
        if (b === driveTarget && driving && (!b.groundT || t - b.groundT > 4)) {
          b.groundT = t;
          showToast('⚠ 搁浅了!按 S 倒车退回深水');
        }
      }
      // 水龙卷拖拽:漏斗附近船只被拉向中心并绕旋,太近直接掀翻
      if (spoutState.strength > 0.05) {
        const dx = spoutState.x - b.x, dz = spoutState.z - b.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < spoutState.radius) {
          const pull = spoutState.strength * (1 - d / spoutState.radius) * (spoutState.target === b ? 1.6 : 1);
          b.x += ((dx / d) * 6.0 + (-dz / d) * 3.0) * pull * dt;
          b.z += ((dz / d) * 6.0 + (dx / d) * 3.0) * pull * dt;
          if (d < Math.max(22, spoutState.radius * 0.14)) capsizeBoat(b);
        }
      }
      // 海啸波前扫过:巨浪可能掀翻船只
      if (tsunamiState.amp > 30 && b.capsizeT <= 0) {
        const td = b.x * 0.940 + b.z * 0.342 - tsunamiState.front;
        if (Math.abs(td) < 60 && Math.random() < dt * 0.8) capsizeBoat(b);
      }
      // 浮力姿态平滑跟随(倾覆时翻到倒扣)
      const att = boatAttitude(b, t, seaStateEff);
      if (b.capsizeT > 0) {
        b.capsizeT -= dt;
        att.roll = 2.6;
        att.pitch = 0;
        att.y -= 0.5;
        if (b.capsizeT <= 0 && b === playerBoat) showToast('船已回正,可以继续航行');
      }
      const k = Math.min(1, dt * 3.5);
      b.shown.y += (att.y - b.shown.y) * k;
      b.shown.pitch += (att.pitch - b.shown.pitch) * k;
      b.shown.roll += (att.roll - b.shown.roll) * k;
      b.mesh.position.set(b.x, b.shown.y, b.z);
      b.mesh.rotation.set(b.shown.pitch, b.heading, b.shown.roll);
    }
  }

  // --- 轨道控制 + 自动漂移 ---
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 18;
  controls.maxDistance = 260;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.60; // 允许下潜穿过水面进入水下
  controls.update();

  // --- 电影机位预设 ---
  const CAM_PRESETS = {
    low: { pos: new THREE.Vector3(20, 4.5, 26), tgt: new THREE.Vector3(0, 3.5, 0) },
    cruise: { pos: new THREE.Vector3(46, 14, 62), tgt: new THREE.Vector3(0, 4, 0) },
    high: { pos: new THREE.Vector3(-30, 110, 90), tgt: new THREE.Vector3(0, 0, 0) },
  };
  let camAnim = null;
  function flyTo(name) {
    if (walker.on) return;    // 岛上第一人称不做机位过渡
    const p = CAM_PRESETS[name];
    if (!p) return;
    camAnim = {
      t: 0, dur: 1.8,
      fromPos: camera.position.clone(), toPos: p.pos.clone(),
      fromTgt: controls.target.clone(), toTgt: p.tgt.clone(),
    };
  }

  /* ------------------- 驾驶:追尾相机与上下船 ------------------- */
  function setDriving(on, boat) {
    if (on && boat) driveTarget = boat;
    if (on && pilotSub) setPilotSub(false);      // 上船/进舱/登岛互斥
    if (on && walker.on) exitIsland(false);
    driving = on;
    controls.enabled = !on && !pilotSub;         // 驾驶时接管相机
    controls.autoRotate = false;
    $('btn-drive').classList.toggle('active', on && driveTarget === playerBoat);
    $('btn-drive').textContent = (on && driveTarget === playerBoat) ? '下船' : '上船';
    $('btn-speed').classList.toggle('active', on && driveTarget === speedBoat);
    $('btn-speed').textContent = (on && driveTarget === speedBoat) ? '下船' : '快艇';
    $('drive-hud').classList.toggle('show', on);
    if (on) {
      showToast(driveTarget.kind === 'speed'
        ? '超级快艇:51 节级 · W/S 油门 · A/D 舵 · 旧岛浅滩可下船,第二岛只能骑泰坦登陆'
        : 'W/S 油门 · A/D 舵 · 滚轮视距 · B 下船');
      camAnim = null;
    } else {
      // 还回轨道相机:目标点对准船当前位置,避免视角跳走
      controls.target.set(driveTarget.x, driveTarget.shown.y, driveTarget.z);
      controls.update();
    }
  }

  function toggleDrive(boat) {
    if (driving && driveTarget === boat) {
      if (canDisembark()) enterIsland();        // 浅滩下船 = 登岛
      else if (isNearSecondIslandByBoat()) showToast('第二岛的迷雾拒绝船只靠岸 —— 只能骑满足条件的泰坦登陆');
      else setDriving(false);
    } else setDriving(true, boat);
  }

  /* ------------------- 潜航:进入/离开蛟龙号 ------------------- */
  function setPilotSub(on) {
    if (on && driving) setDriving(false);
    pilotSub = on;
    controls.enabled = !on && !driving;
    controls.autoRotate = false;
    $('btn-sub').classList.toggle('active', on);
    $('btn-sub').textContent = on ? '离舱' : '蛟龙';
    $('sub-hud').classList.toggle('show', on);
    if (on) {
      showToast('W/S 推进 · A/D 转向 · R/F 上浮下潜 · C 悬停 · X 抛载 · J 离舱');
      camAnim = null;
    } else {
      // 离舱:蛟龙号留在原地自动悬停保深
      sub.hover = true;
      sub.holdY = sub.y;
      controls.target.set(sub.x, sub.y, sub.z);
      controls.update();
    }
  }

  function updateSubCamera(dt) {
    const fx = Math.sin(sub.heading), fz = Math.cos(sub.heading);
    const cx = sub.x - fx * 15;
    const cz = sub.z - fz * 15;
    const cy = Math.min(Math.max(sub.y + 4.0, -23.5), 40);
    const k = Math.min(1, dt * 3.0);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (cy - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    controls.target.set(sub.x + fx * 8, sub.y, sub.z + fz * 8);
    camera.lookAt(controls.target);
    // 潜航 HUD:深度 / 航速 / 垂速 / 模式
    const depth = Math.max(0, waveHeightAt(sub.x, sub.z, simTime, seaStateEff) - sub.y);
    $('sh-depth').textContent = depth.toFixed(1) + ' m';
    $('sh-speed').textContent = (Math.abs(sub.u) * 1.944).toFixed(1) + ' kn';
    $('sh-vert').textContent = (sub.vy > 0.05 ? '上浮 ' : sub.vy < -0.05 ? '下潜 ' : '')
      + Math.round(Math.abs(sub.vy) * 60) + ' m/min';
    $('sh-mode').textContent = sub.ballastDropped ? '压载已抛' : (sub.hover ? '悬停定深' : '手动');
  }

  function updateChaseCamera(dt) {
    const fx = Math.sin(driveTarget.heading), fz = Math.cos(driveTarget.heading);
    const cx = driveTarget.x - fx * chaseDist;
    const cz = driveTarget.z - fz * chaseDist;
    const cy = driveTarget.shown.y + 2.6 + chaseDist * 0.22;
    const k = Math.min(1, dt * 3.0);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (cy - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    controls.target.set(
      driveTarget.x + fx * 6, driveTarget.shown.y + 1.2, driveTarget.z + fz * 6);
    camera.lookAt(controls.target);
    // 驾驶 HUD:航速(节)油门%舵角
    $('dh-speed').textContent = (Math.abs(driveTarget.u) * 1.944).toFixed(1) + ' kn';
    $('dh-throttle').textContent = Math.round(driveTarget.throttle * 100) + '%';
    $('dh-rudder').textContent = (driveTarget.rudder < 0 ? '左 ' : driveTarget.rudder > 0 ? '右 ' : '')
      + Math.round(Math.abs(driveTarget.rudder) * 35) + '°';
    // 靠近岛滩且低速:旧岛可登;第二岛只允许泰坦登陆
    if (canDisembark()) {
      $('dh-hint').textContent = '按 V 下船登岛';
      $('dh-hint').style.display = '';
    } else if (isNearSecondIslandByBoat()) {
      $('dh-hint').textContent = '第二岛只能骑泰坦登陆';
      $('dh-hint').style.display = '';
    } else {
      $('dh-hint').style.display = 'none';
    }
  }

  /* ------------------- 荒岛导航标记 ------------------- */
  /* 每帧把岛/船的世界坐标投影到屏幕,画图标 + 虚线 + 剩余米数。
     岛在屏幕外(或背后)时,标记按比例收缩贴到屏幕边缘指示方向。 */
  const navSvg = $('nav-svg'), navLine = $('nav-line');
  const navMarker = $('nav-marker'), navDist = $('nav-dist'), navLabel = $('nav-label'), navIcon = $('nav-icon');
  const _navV = new THREE.Vector3();
  const _navSrc = { x: 0, y: 0 }, _navDst = { x: 0, y: 0 };
  function navProject(wx, wy, wz, out) {
    _navV.set(wx, wy, wz).project(camera);
    let x = _navV.x, y = _navV.y;
    if (_navV.z > 1) { x = -x; y = -y; }          // 相机背后:翻到对面
    const s = Math.min(1, 0.94 / Math.max(Math.abs(x), 1e-6), 0.90 / Math.max(Math.abs(y), 1e-6));
    x *= s; y *= s;
    out.x = (x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-y * 0.5 + 0.5) * window.innerHeight;
  }
  let navDistShown = -1;
  let eggNavTarget = null;
  const tideNav = { until: 0, targets: [], markers: [] };
  function currentNavSource() {
    return {
      x: (walker.on || riding) ? camera.position.x : driving ? driveTarget.x : pilotSub ? sub.x : speedBoat.x,
      y: (walker.on || riding) ? camera.position.y
        : driving ? (driveTarget.shown?.y ?? driveTarget.y) + 2.5
          : pilotSub ? sub.y + 2.5 : (speedBoat.shown?.y ?? speedBoat.y) + 2.5,
      z: (walker.on || riding) ? camera.position.z : driving ? driveTarget.z : pilotSub ? sub.z : speedBoat.z,
    };
  }
  function ensureTideMarkers() {
    while (tideNav.markers.length < 3) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:0;top:0;z-index:16;pointer-events:none;opacity:0;'
        + 'transform:translate(-50%,-135%);padding:5px 9px;border:1px solid rgba(150,230,235,.42);'
        + 'border-radius:999px;background:rgba(5,18,24,.70);backdrop-filter:blur(8px);'
        + 'color:#d8ffff;font:600 11px ui-monospace,Menlo,monospace;white-space:nowrap;'
        + 'box-shadow:0 0 18px rgba(80,220,230,.18);transition:opacity .18s ease;';
      document.body.appendChild(el);
      tideNav.markers.push(el);
    }
  }
  function updateTideMarkers() {
    ensureTideMarkers();
    if (simTime > tideNav.until || tideNav.targets.length === 0) {
      for (const el of tideNav.markers) el.style.opacity = '0';
      return;
    }
    const src = currentNavSource();
    tideNav.targets.forEach((tg, i) => {
      const el = tideNav.markers[i];
      const ty = groundHeightAt(tg.x, tg.z) + 8;
      const out = { x: 0, y: 0 };
      navProject(tg.x, ty, tg.z, out);
      const d = Math.hypot(tg.x - src.x, tg.z - src.z);
      el.textContent = (tg.icon || '🏝') + ' ' + tg.name + ' · ' + Math.round(d) + 'm';
      el.style.transform = 'translate(' + Math.round(out.x) + 'px,' + Math.round(out.y) + 'px) translate(-50%,-135%)';
      el.style.opacity = '1';
    });
    for (let i = tideNav.targets.length; i < tideNav.markers.length; i++) tideNav.markers[i].style.opacity = '0';
  }
  function nearestAnyTreeTarget() {
    let best = null, bd = 1e9;
    const scan = (data, kind) => {
      data.forEach((tr) => {
        if (tr.gone || tr.falling) return;
        const d = Math.hypot(tr.x - walker.x, tr.z - walker.z);
        if (d < bd) { bd = d; best = { name: kind + '(砍树得木材)', icon: '🌲', x: tr.x, z: tr.z }; }
      });
    };
    scan(palmData, '棕榈');
    scan(canopyData, '阔叶树');
    return best;
  }
  function tombMaterialNavTarget() {
    if (!walker.on || !relics.tombFound || relics.tombKit || walker.inTomb || !relicSpots.tomb) return null;
    if (Math.hypot(walker.x - relicSpots.tomb.x, walker.z - relicSpots.tomb.z) <= 10) relics.tombGuide = true;
    if (!relics.tombGuide) return null;
    const needs = [
      { kind: 'tombIron', need: 6, have: walker.tombIron, name: '铁锭', icon: '⛓' },
      { kind: 'tombLamp', need: 2, have: walker.tombLamp, name: '灯油罐', icon: '🕯' },
      { kind: 'tombHandle', need: 2, have: walker.tombHandle, name: '硬木柄', icon: '🪵' },
    ];
    let best = null, bd = 1e9;
    for (const nd of needs) {
      if (nd.have >= nd.need) continue;
      for (const tm of tombMaterials) {
        if (tm.taken || tm.kind !== nd.kind) continue;
        const d = Math.hypot(tm.x - walker.x, tm.z - walker.z);
        if (d < bd) { bd = d; best = { name: nd.name + ' ' + nd.have + '/' + nd.need, icon: nd.icon, x: tm.x, z: tm.z }; }
      }
    }
    if (walker.rope < 2) {
      for (const rp of ropes) {
        if (rp.taken) continue;
        const d = Math.hypot(rp.x - walker.x, rp.z - walker.z);
        if (d < bd) { bd = d; best = { name: '绳子 ' + walker.rope + '/2', icon: '🪢', x: rp.x, z: rp.z }; }
      }
    }
    if (walker.timber < 4) {
      const tr = nearestAnyTreeTarget();
      if (tr) {
        const d = Math.hypot(tr.x - walker.x, tr.z - walker.z);
        if (d < bd) best = { ...tr, name: '木材 ' + walker.timber + '/4' };
      }
    }
    return best;
  }
  function updateNavMarker() {
    updateTideMarkers();
    const autoTombTarget = tombMaterialNavTarget();
    const navTarget = autoTombTarget || eggNavTarget;
    if (navTarget) {
      const src = currentNavSource();
      const sx = src.x, sy = src.y, sz = src.z;
      const ty = groundHeightAt(navTarget.x, navTarget.z) + 2.8;
      const dist = Math.hypot(navTarget.x - sx, navTarget.z - sz);
      navProject(sx, sy, sz, _navSrc);
      navProject(navTarget.x, ty, navTarget.z, _navDst);
      navLine.setAttribute('x1', _navSrc.x.toFixed(1));
      navLine.setAttribute('y1', _navSrc.y.toFixed(1));
      navLine.setAttribute('x2', _navDst.x.toFixed(1));
      navLine.setAttribute('y2', _navDst.y.toFixed(1));
      navLine.style.display = '';
      navMarker.style.transform =
        'translate(' + Math.round(_navDst.x) + 'px,' + Math.round(_navDst.y) + 'px) translate(-50%,-130%)';
      navIcon.textContent = navTarget.icon || '🥚';
      navLabel.textContent = navTarget.name;
      navDist.textContent = dist < 8 ? '就在附近' : Math.round(dist) + ' m';
      navSvg.classList.add('show');
      navMarker.classList.add('show');
      if (eggNavTarget && dist < 5) eggNavTarget = null;
      return;
    }
    if (walker.on || riding) {                   // 人已在岛上/骑着巨兽,不需要导航
      navSvg.classList.remove('show');
      navMarker.classList.remove('show');
      return;
    }
    const src = driving ? driveTarget : (pilotSub ? sub : speedBoat);
    const srcY = src.shown ? src.shown.y : src.y;
    const dist = Math.max(0, Math.hypot(ISLAND.x - src.x, ISLAND.z - src.z) - BEACH_R);  // 到干滩边缘
    navProject(src.x, srcY + 2.5, src.z, _navSrc);
    navProject(ISLAND.x, 18, ISLAND.z, _navDst);
    navLine.setAttribute('x1', _navSrc.x.toFixed(1));
    navLine.setAttribute('y1', _navSrc.y.toFixed(1));
    navLine.setAttribute('x2', _navDst.x.toFixed(1));
    navLine.setAttribute('y2', _navDst.y.toFixed(1));
    navLine.style.display = dist < 50 ? 'none' : '';   // 快到了就收线,只留标记
    navMarker.style.transform =
      'translate(' + Math.round(_navDst.x) + 'px,' + Math.round(_navDst.y) + 'px) translate(-50%,-130%)';
    navIcon.textContent = '🏝';
    navLabel.textContent = '荒岛';
    const dm = Math.round(dist);
    if (dm !== navDistShown) {
      navDistShown = dm;
      navDist.textContent = dm > 0 ? dm + ' m' : '已到岛滩';
    }
    navSvg.classList.add('show');
    navMarker.classList.add('show');
  }

  // ---- 瞄准镜:按 4 开镜/关镜;狙击「灵眼 3-7×」滚轮调倍率;冲锋枪/步枪红点 ----
  const aim = { on: false, zoom: 4 };        // 灵眼默认 4×
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  function updateTurretHipCross() {
    if (swordTurret?.mesh) swordTurret.mesh.visible = !(walker.on && walker.swordTurret === swordTurret);
    const hip = !!(walker.on && walker.swordTurret);
    $('turret-cross').classList.toggle('show', hip);
    $('xhair').classList.toggle('hide', !!walker.swordTurret);
    if (walker.on) handsGroup.visible = !walker.swordTurret;
  }
  function setAim(on) {
    if (!on) {
      aim.on = false;
      $('scope-mask').classList.remove('show');
      $('reddot').classList.remove('show');
      updateTurretHipCross();
      return;
    }
    const gun = walker.weapon === 'sniper' ? walker.sniper
      : walker.weapon === 'rifle' ? walker.rifle
      : walker.weapon === 'smg' ? walker.smg : false;
    if (!walker.on || (!gun && !walker.swordTurret)) { showToast('手里没有枪械/炮台 —— 按 2 换出枪械,或到长城烽火台操控炮台'); return; }
    aim.on = true;
    updateTurretHipCross();
    if (walker.swordTurret) {
      $('scope-mask').classList.add('show');
      $('scope-zoom').textContent = '长剑 7.0×';
    } else if (walker.weapon === 'sniper') {
      $('scope-mask').classList.add('show');
      $('scope-zoom').textContent = '灵眼 ' + aim.zoom.toFixed(1) + '×';
    } else $('reddot').classList.add('show');
  }
  window.addEventListener('wheel', (e) => {
    if (aim.on && walker.on && walker.weapon === 'sniper') {
      aim.zoom = Math.max(3, Math.min(7, aim.zoom - Math.sign(e.deltaY) * 0.5));
      $('scope-zoom').textContent = '灵眼 ' + aim.zoom.toFixed(1) + '×';
    }
  }, { passive: true });

  // ---- 彩蛋图鉴(L):五位密码解锁;点条目给出方位与距离 ----
  const EGGS_PASSWORD = '41942';         // 图鉴锁密码(五位)
  const AUTHOR_PASSWORD = '92741';       // 作者权限密码(9 键)
  let eggsUnlocked = false;
  const EGG_SPOTS = () => {
    const spots = {
      altar:      { name: '古老祭坛',     icon: '🗿', x: relicSpots.altar.x,      z: relicSpots.altar.z },
      stonealtar: { name: '石牙信任祭坛', icon: '🪨', x: relicSpots.stoneAltar.x, z: relicSpots.stoneAltar.z },
      mistaltar:  { name: '雾叶信任祭坛', icon: '🌫', x: relicSpots.mistAltar.x,  z: relicSpots.mistAltar.z },
      totem:      { name: '图腾柱',       icon: '🗿', x: relicSpots.totem.x,      z: relicSpots.totem.z },
      chest:      { name: '鎏金宝箱',     icon: '⚔', x: relicSpots.chest.x,      z: relicSpots.chest.z },
      memorial:   { name: '红五星墓碑',   icon: '🪦', x: relicSpots.memorial.x,   z: relicSpots.memorial.z },
      wreck:      { name: '沉船残骸',     icon: '⚓', x: relicSpots.wreck.x,      z: relicSpots.wreck.z },
      stonev:     { name: '石牙村',       icon: '🪨', x: relicSpots.village.x,    z: relicSpots.village.z },
      mistv:      { name: '雾叶村',       icon: '🌫', x: relicSpots.village2.x,   z: relicSpots.village2.z },
      third:      { name: THIRD_ISLAND.name,  icon: '🏝', x: THIRD_ISLAND.x,  z: THIRD_ISLAND.z },
      fourth:     { name: FOURTH_ISLAND.name, icon: '🏝', x: FOURTH_ISLAND.x, z: FOURTH_ISLAND.z },
      shelter:    { name: '旧岛避难所',   icon: '🏚', x: shelter.x,              z: shelter.z },
    };
    if (relics.tombFound && relicSpots.tomb) spots.tomb = { name: '百发盗洞古墓', icon: '🕳', x: relicSpots.tomb.x, z: relicSpots.tomb.z };
    if (relicSpots.tomb?.historian) spots.historian = { name: '史官遗书', icon: '📜', x: relicSpots.tomb.historian.x, z: relicSpots.tomb.historian.z };
    return spots;
  };
  $('eggs-panel').addEventListener('click', (e) => {
    const el = e.target.closest('[data-egg]');
    if (!el) return;
    const spot = EGG_SPOTS()[el.dataset.egg];
    if (!spot) { showToast('🥚 这个彩蛋没有固定位置 —— 它藏在这片海的机制里,等你触发'); return; }
    const dx = spot.x - camera.position.x, dz = spot.z - camera.position.z;
    const d = Math.hypot(dx, dz);
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const dir = dirs[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360 / 45) % 8];
    eggNavTarget = spot;
    showToast('🧭 ' + spot.name + ':在你' + dir + '方约 ' + Math.round(d) + ' 米'
      + (d < 8 ? ' —— 就在脚边!' : d < 60 ? ' —— 很近了!' : '') + '，已用导航线标出');
  });

  /* ------------------- 海洋小地图 ------------------- */
  const mmCanvas = $('minimap-canvas');
  const mmCtx = mmCanvas.getContext('2d');
  const mmSize = mmCanvas.width;
  const mmWorldR = 1500;                 // 覆盖四岛与主航线,不是全 24km 海啸范围
  const mmCenter = {
    x: (ISLAND.x + NEW_ISLAND.x + THIRD_ISLAND.x + FOURTH_ISLAND.x) * 0.25,
    z: (ISLAND.z + NEW_ISLAND.z + THIRD_ISLAND.z + FOURTH_ISLAND.z) * 0.25,
  };
  $('mm-scale').textContent = '3 km';
  function mmPoint(x, z) {
    return {
      x: (x - mmCenter.x) / (mmWorldR * 2) * mmSize + mmSize * 0.5,
      y: (z - mmCenter.z) / (mmWorldR * 2) * mmSize + mmSize * 0.5,
    };
  }
  function drawMmIcon(x, z, heading, color, shape, size = 5) {
    const p = mmPoint(x, z);
    if (p.x < -20 || p.y < -20 || p.x > mmSize + 20 || p.y > mmSize + 20) return;
    mmCtx.save();
    mmCtx.translate(p.x, p.y);
    mmCtx.rotate(heading || 0);
    mmCtx.fillStyle = color;
    mmCtx.strokeStyle = 'rgba(2,8,12,.75)';
    mmCtx.lineWidth = 2;
    mmCtx.beginPath();
    if (shape === 'tri') {
      mmCtx.moveTo(0, -size * 1.35);
      mmCtx.lineTo(size, size);
      mmCtx.lineTo(-size, size);
      mmCtx.closePath();
    } else if (shape === 'diamond') {
      mmCtx.moveTo(0, -size);
      mmCtx.lineTo(size, 0);
      mmCtx.lineTo(0, size);
      mmCtx.lineTo(-size, 0);
      mmCtx.closePath();
    } else {
      mmCtx.arc(0, 0, size, 0, Math.PI * 2);
    }
    mmCtx.fill();
    mmCtx.stroke();
    mmCtx.restore();
  }
  function updateMinimap() {
    if (!mmCtx) return;
    mmCtx.clearRect(0, 0, mmSize, mmSize);
    const grd = mmCtx.createRadialGradient(mmSize * 0.48, mmSize * 0.45, 20, mmSize * 0.5, mmSize * 0.5, mmSize * 0.72);
    grd.addColorStop(0, 'rgba(14,70,82,.88)');
    grd.addColorStop(1, 'rgba(3,18,30,.94)');
    mmCtx.fillStyle = grd;
    mmCtx.fillRect(0, 0, mmSize, mmSize);
    mmCtx.strokeStyle = 'rgba(150,230,235,.10)';
    mmCtx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const k = i / 4 * mmSize;
      mmCtx.beginPath(); mmCtx.moveTo(k, 0); mmCtx.lineTo(k, mmSize); mmCtx.stroke();
      mmCtx.beginPath(); mmCtx.moveTo(0, k); mmCtx.lineTo(mmSize, k); mmCtx.stroke();
    }
    const drawIsland = (isle, label, color) => {
      const p = mmPoint(isle.x, isle.z);
      const r = Math.max(4, isle.R / (mmWorldR * 2) * mmSize);
      mmCtx.beginPath();
      mmCtx.fillStyle = color;
      mmCtx.strokeStyle = 'rgba(240,255,240,.45)';
      mmCtx.lineWidth = 1.4;
      mmCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      mmCtx.fill(); mmCtx.stroke();
      mmCtx.fillStyle = 'rgba(235,255,250,.78)';
      mmCtx.font = '600 11px ui-monospace,Menlo,monospace';
      mmCtx.fillText(label, p.x + r + 3, p.y + 4);
    };
    drawIsland(ISLAND, '1', 'rgba(212,192,122,.88)');
    drawIsland(NEW_ISLAND, '2', 'rgba(70,154,96,.90)');
    drawIsland(THIRD_ISLAND, '3', 'rgba(150,150,145,.88)');
    drawIsland(FOURTH_ISLAND, '4', 'rgba(78,128,106,.88)');
    for (const b of boats) drawMmIcon(b.x, b.z, b.heading, b.kind === 'speed' ? '#ffd85d' : '#e65c50', 'tri', b.kind === 'speed' ? 6 : 5);
    if (pilotSub) drawMmIcon(sub.x, sub.z, sub.heading, '#8fe8ff', 'diamond', 5);
    for (const g of titans) {
      if (g.state === 'gone') continue;
      drawMmIcon(g.x, g.z, g.dir, g.state === 'tamed' ? '#d8f7ff' : '#b68cff', 'diamond', g.ultimate ? 8 : 6);
    }
    let px = camera.position.x, pz = camera.position.z, ph = 0;
    if (walker.on) { px = walker.x; pz = walker.z; ph = walker.viewYaw; }
    else if (riding && riddenTitan) { px = riddenTitan.x; pz = riddenTitan.z; ph = riddenTitan.dir; }
    else if (driving) { px = driveTarget.x; pz = driveTarget.z; ph = driveTarget.heading; }
    else if (pilotSub) { px = sub.x; pz = sub.z; ph = sub.heading; }
    drawMmIcon(px, pz, ph, '#ffffff', 'circle', 5);
    const p = mmPoint(px, pz);
    mmCtx.strokeStyle = 'rgba(255,255,255,.28)';
    mmCtx.beginPath();
    mmCtx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    mmCtx.stroke();
  }

  function tryWallClimb() {
    if (!walker.on || walker.swordTurret || newIslandHeightAt(walker.x, walker.z) < 0.2) return false;
    const fx = Math.sin(walker.viewYaw), fz = Math.cos(walker.viewYaw);
    const samples = [
      { x: walker.x, z: walker.z, reach: 18 },
      { x: walker.x + fx * 6, z: walker.z + fz * 6, reach: 18 },
      { x: walker.x + fx * 10, z: walker.z + fz * 10, reach: 14 }
    ];
    let best = null;
    const consider = (x, z, y, label, score) => {
      if (y < walker.y + 1.8) return;
      if (!best || score < best.score) best = { x, z, y, label, score };
    };
    const high = newIslandGreatWallHighPoint();
    const hd = Math.hypot(walker.x - high.x, walker.z - high.z);
    if (hd < 30) {
      const tx = high.x + Math.sin(walker.viewYaw) * 2.5;
      const tz = high.z + Math.cos(walker.viewYaw) * 2.5;
      consider(tx, tz, groundHeightAt(tx, tz), '烽火台平台', hd);
    }
    for (const s of samples) {
      for (let i = 0; i < 33; i++) {
        if (i === 11 || i === 12 || i === 23) continue;
        const a = newIslandWallPoint(i), b = newIslandWallPoint(i + 1);
        const hit = distToSegment2D(s.x, s.z, a.x, a.z, b.x, b.z);
        if (hit.d > s.reach) continue;
        const x = a.x + (b.x - a.x) * hit.t;
        const z = a.z + (b.z - a.z) * hit.t;
        consider(x, z, groundHeightAt(x, z), '长城墙顶', hit.d + Math.hypot(s.x - walker.x, s.z - walker.z) * 0.2);
      }
    }
    if (!best) return false;
    walker.x = best.x;
    walker.z = best.z;
    walker.y = best.y;
    walker.jumpT = 0.42;
    walker.stamina = Math.max(0, walker.stamina - 8);
    startHandAction('pickup');
    showToast('🧗 你抓住石缝爬上了' + best.label + ' · 继续靠近最高烽火台按 E 操控长剑炮台');
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'tab') {
      e.preventDefault();
      toggleGodMode();
      return;
    }
    if (k === 'w' || k === 'arrowup') driveKeys.throttle = true;
    if (k === 's' || k === 'arrowdown') driveKeys.brake = true;
    if (k === 'a' || k === 'arrowleft') driveKeys.left = true;
    if (k === 'd' || k === 'arrowright') driveKeys.right = true;
    if (k === 'b') toggleDrive(playerBoat);
    if (riding && k === ' ') { titanRideAttack('tail'); e.preventDefault(); return; }
    if (riding && k === 'f') { titanRideAttack('bite'); return; }
    if (riding && k === 'x') { titanRideAttack('quake'); return; }
    if (k === 'v') {
      if (riding) dismountGiant();
      else if (walker.on) {
        const tamed = myTamedTitan();     // 已驯服泰坦:无论多远,按 V 优先骑上它
        if (tamed) rideGiant(tamed);
        else toggleDrive(speedBoat);
      } else toggleDrive(speedBoat);
    }
    if (k === 'x' && walker.on) chopWithAxe();
    if (k === 'y' && walker.on) drinkWater();
    if (k === 'c' && walker.on) {
      const pot = crabPots.find(p => p.ready && Math.hypot(p.x - walker.x, p.z - walker.z) < 3.5);
      if (pot) harvestCrabPot(pot); else placeCrabPot();
    }
    if (k === 'h' && walker.on) castRod();
    if (k === 'n' && walker.on) startCutBoulders();
    if (k === 'r' && walker.on) eatGodMeat();
    if (k === '3' && walker.on) { startRecall(); e.preventDefault(); return; }
    if (k === '2' && walker.on && (walker.rifle || walker.sniper || walker.smg || walker.spear)) {
      const order = ['bow'];
      if (walker.spear) order.push('spear');
      if (walker.rifle) order.push('rifle');
      if (walker.sniper) order.push('sniper');
      if (walker.smg) order.push('smg');
      walker.weapon = order[(order.indexOf(walker.weapon) + 1) % order.length];
      showToast(walker.weapon === 'sniper'
        ? '端起卡莫星狙击枪(弹药 ' + walker.sniperAmmo + ' 发)'
        : walker.weapon === 'smg'
          ? '端起波波沙冲锋枪(弹鼓 ' + walker.smgAmmo + ' 发 · 按住空格连发)'
          : walker.weapon === 'spear'
              ? '握紧野人长矛(空格投掷 · 对好友 35 伤害)'
          : walker.weapon === 'rifle'
            ? '端起莫辛纳甘步枪(子弹 ' + walker.bullets + ' 发)'
            : '换回弓箭(箭 ' + walker.arrows + ' 支)');
    }
    if (k === 'p' && walker.on && !walker.inBunker) tryEnterBunker();
    if (k === '0' && walker.on) tryTitanCode();
    if (k === '8' && walker.on) tryTombAuthorSkip();
    if (k === '9' && walker.on) tryAuthorMode();
    if (k === '6' && walker.on) tryBombAdmin();
    if (k === 'm' && walker.on) tryFusionCode();
    if (k === 'u' && walker.on && newIslandHeightAt(walker.x, walker.z) > 0.3) { throwMagnetBomb(); return; }
    if (k === 'l') {                                        // 彩蛋图鉴:五位密码解锁后自由开关
      const p = $('eggs-panel');
      if (p.classList.contains('show')) { p.classList.remove('show'); return; }
      if (!eggsUnlocked) {
        const code = window.prompt('彩蛋图鉴上着锁 —— 输入五位密码:');
        if (code === null) return;
        if (code.trim() !== EGGS_PASSWORD) { showToast('密码不对…… 彩蛋只属于有心人'); return; }
        eggsUnlocked = true;
        showToast('🥚 彩蛋图鉴已解锁!点任意条目可看它的方位与距离(以后按 L 直接开关)');
      }
      p.classList.add('show');
    }
    if (k === '4' && walker.on) setAim(!aim.on);
    if (k === 'k' && walker.on) {
      updateKeysHelpPanel();
      $('keys-help').classList.toggle('show');
    }
    if (k === 'j') setPilotSub(!pilotSub);
    if (k === '1' && walker.on) {
      if (!tryWallClimb()) walker.jumpT = Math.max(walker.jumpT, 0.28);
      e.preventDefault();
      return;
    }
    if (k === 'e') {
      if (walker.on) islandInteract();
      else if (canDisembark()) enterIsland();
    }
    if (k === 'g' && walker.on) {
      if (walker.coconut > 0) {
        walker.coconut--;
        walker.hunger = Math.min(100, walker.hunger + 38);
        walker.thirst = Math.min(100, walker.thirst + 22);
        startHandAction('eat');
        showToast('吃掉一只椰子 · 饥饿 +38 口渴 +22');
      } else showToast('没有椰子 —— 找棵棕榈树摇一摇');
    }
    if (k === 'shift') {
      shiftDown = !shiftDown;               // 切换式疾跑:按一次疾跑,再按一次走路
      if (walker.on) showToast(shiftDown ? '🏃 疾跑模式(耗体力 · 再按 Shift 换回走路)' : '🚶 走路模式');
    }
    if (k === 'r') subKeys.up = true;
    if (k === 'f') subKeys.down = true;
    if (k === 'c' && pilotSub) {           // 悬停开关:切入时记住当前深度
      sub.hover = !sub.hover;
      if (sub.hover) sub.holdY = sub.y;
    }
    if (k === ' ' && walker.on) {
      shootArrow();
      e.preventDefault();
    }
    if (k === ' ') spaceHeld = true;
    if (k === 'q' && walker.on) {          // 打磨箭矢:1 木柴 + 1 石块 → 3 支
      if (walker.savage && walker.spear && walker.venom > 0) {
        walker.venom--;
        walker.poisonSpear += 2;
        startHandAction('pickup');
        showToast('☠ 你把毒液涂上矛头,制成毒矛 ×2(现有 ' + walker.poisonSpear + ' 支)');
        return;
      }
      if (walker.wood >= 1 && walker.stone >= 1) {
        walker.wood--; walker.stone--; walker.arrows += 3;
        startHandAction('pickup');
        showToast('打磨出 3 支新箭(现有 ' + walker.arrows + ' 支)');
      } else showToast('材料不足 —— 需要 1 木柴 + 1 石块');
    }
    if (k === 'f' && walker.on) placeTrap();
    if (k === 't' && walker.on) {          // 吃肉
      if (walker.meat > 0) {
        walker.meat--;
        walker.hunger = Math.min(100, walker.hunger + 45);
        startHandAction('eat');
        showToast('吃掉一块肉 · 饥饿 +45');
      } else showToast('没有肉 —— 去猎鹿或野猪');
    }
    if (k === 'x' && pilotSub && !sub.ballastDropped) {
      sub.ballastDropped = true;           // 抛弃压载:正浮力紧急上浮
      sub.throttle = 0;
      sub.hover = false;
      showToast('⚠ 压载已抛弃 · 正浮力紧急上浮中');
    }
    if ((driving || pilotSub) && ['w', 's', 'a', 'd', 'r', 'f'].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') driveKeys.throttle = false;
    if (k === 's' || k === 'arrowdown') driveKeys.brake = false;
    if (k === 'a' || k === 'arrowleft') driveKeys.left = false;
    if (k === 'd' || k === 'arrowright') driveKeys.right = false;
    if (k === 'r') subKeys.up = false;
    if (k === 'f') subKeys.down = false;
    if (k === '3') cancelRecall('松开 3,回城中断');
    if (k === ' ') spaceHeld = false;
  });
  window.addEventListener('wheel', (e) => {
    if (!driving) return;
    chaseDist = Math.max(8, Math.min(30, chaseDist + Math.sign(e.deltaY) * 1.5));
  }, { passive: true });

  // 岛上第一人称:拖动鼠标环顾(OrbitControls 此时已禁用);快速点按 = 射箭
  let lookDrag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;               // 只有左键进入视角拖动/射箭(开镜用 4 键)
    if (walker.on) lookDrag = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
  });
  window.addEventListener('pointermove', (e) => {
    if (!lookDrag || !walker.on) return;
    walker.viewYaw -= (e.clientX - lookDrag.x) * 0.0042;
    walker.viewPitch = Math.max(walker.swordTurret ? -1.52 : -1.15, Math.min(1.15,
      walker.viewPitch - (e.clientY - lookDrag.y) * 0.0042));
    lookDrag.moved += Math.abs(e.clientX - lookDrag.x) + Math.abs(e.clientY - lookDrag.y);
    lookDrag.x = e.clientX; lookDrag.y = e.clientY;
  });
  window.addEventListener('pointerup', (e) => {
    if (lookDrag && walker.on && e.timeStamp - lookDrag.t < 300 && lookDrag.moved < 8) shootArrow();
    lookDrag = null;
  });

  // --- 后期:Bloom(TSL)+ ACES + 水下整体色调 ---
  const postProcessing = new THREE.PostProcessing(renderer);
  const scenePass = pass(scene, camera, { samples: 4 });
  const scenePassColor = scenePass.getTextureNode('output');
  const bloomPass = bloom(scenePassColor, 0.45, 0.25, 0.85);
  const bloomed = scenePassColor.add(bloomPass);
  // 没入水下时,整个画面(天空/生物/水面)统一浸入蓝绿水色
  const underwaterMixed = mix(
    bloomed,
    bloomed.mul(vec3(0.32, 0.82, 0.88)).add(vec3(0.0, 0.025, 0.040)),
    uUnderwater.mul(0.85)
  );
  // 海啸波前扫过相机时,全屏泛起白沫(被巨浪吞没的瞬间)
  const withSplash = mix(
    underwaterMixed,
    bloomed.mul(0.35).add(vec3(0.62, 0.70, 0.74)),
    uSplash.mul(0.85)
  );
  // 血色恐怖模式:只做压暗和暗角;红色只来自血月与水面镜面反光。
  const horrorVig = smoothstep(1.35, 0.18, length(screenUV.sub(0.5).mul(2.0)));
  const horrorDark = withSplash.mul(vec3(0.34, 0.32, 0.35))
    .mul(horrorVig.mul(0.50).add(0.50));
  const horrorMixed = mix(withSplash, horrorDark, uHorror);
  // 求生虚脱:画面四周压暗(饥饿/口渴见底的体感)
  const vig = smoothstep(1.25, 0.35, length(screenUV.sub(0.5).mul(2.0)));
  postProcessing.outputNode = horrorMixed.mul(
    mix(float(1.0), vig.mul(0.55).add(0.35), uSurvival));

  // --- 海洋雪:水下漂浮微粒,缓慢沉降 + 潮流摆动 ---
  const SNOW_COUNT = 500;
  const snowPos = new Float32Array(SNOW_COUNT * 3);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 90;
    snowPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
  snowMat.sizeNode = float(0.09);
  snowMat.positionNode = Fn(() => {
    const driftY = mod(positionLocal.y.sub(uTime.mul(0.22)), 30.0).sub(15.0);
    const sway = vec3(
      sin(uTime.mul(0.35).add(positionLocal.y.mul(2.1))).mul(0.6),
      0.0,
      cos(uTime.mul(0.28).add(positionLocal.x.mul(1.7))).mul(0.6)
    );
    return vec3(positionLocal.x, driftY, positionLocal.z).add(sway);
  })();
  snowMat.colorNode = vec3(0.75, 0.90, 0.95);
  snowMat.opacityNode = uUnderwater.mul(0.55);
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // --- 海底:沙地 + 动态焦散,潜水时可见(水上被压暗成深渊) ---
  const floorGeo = new THREE.PlaneGeometry(OCEAN_SIZE * 1.6, OCEAN_SIZE * 1.6, 64, 64);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshBasicNodeMaterial();
  floorMat.colorNode = seafloorColor();
  const seafloor = new THREE.Mesh(floorGeo, floorMat);
  seafloor.position.y = -26;
  seafloor.frustumCulled = false;
  scene.add(seafloor);

  // --- 水下气泡:跟随相机上浮的微气泡群 ---
  const BUBBLE_COUNT = 260;
  const bubblePos = new Float32Array(BUBBLE_COUNT * 3);
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    bubblePos[i * 3] = (Math.random() - 0.5) * 26;
    bubblePos[i * 3 + 1] = Math.random();          // 相位种子
    bubblePos[i * 3 + 2] = (Math.random() - 0.5) * 26;
  }
  const bubbleGeo = new THREE.BufferGeometry();
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
  const bubbleMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
  bubbleMat.sizeNode = hash(positionLocal.x.mul(3.71).add(positionLocal.z.mul(1.93)).add(5.7)).mul(0.10).add(0.05);
  bubbleMat.positionNode = bubblePosition();
  bubbleMat.colorNode = vec3(0.85, 0.95, 1.0);
  bubbleMat.opacityNode = bubbleOpacity();
  const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
  bubbles.frustumCulled = false;
  scene.add(bubbles);

  // --- 水龙卷:旋转漏斗云,拖拽并掀翻靠近的船只 ---
  const tornadoGeo = new THREE.CylinderGeometry(9, 2.2, 130, 24, 20, true);
  const tornadoMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  tornadoMat.side = THREE.DoubleSide;
  tornadoMat.positionNode = tornadoTwist();
  tornadoMat.colorNode = tornadoColor();
  tornadoMat.opacityNode = tornadoOpacity();
  const tornadoMesh = new THREE.Mesh(tornadoGeo, tornadoMat);
  tornadoMesh.frustumCulled = false;
  tornadoMesh.visible = false;
  scene.add(tornadoMesh);

  const tornado = { active: false, t: 0, dir: 0, speed: 0, nextAuto: 25, retargetT: 0 };
  function findTornadoTarget() {
    const candidates = [];
    for (const b of boats) candidates.push({ obj: b, kind: 'boat', x: b.x, z: b.z, radius: 170, scoreBias: 0 });
    for (const g of activeTitans()) {
      if (g.state === 'dead') continue;
      const bodyR = titanBodyRadius(g);
      candidates.push({
        obj: g, kind: 'titan', x: g.x, z: g.z,
        radius: Math.min(1800, 260 + bodyR * 1.35),
        scoreBias: -bodyR * 0.85
      });
    }
    if (!candidates.length) return null;
    const cx = spoutState.x, cz = spoutState.z;
    candidates.sort((a, b) => (Math.hypot(a.x - cx, a.z - cz) + a.scoreBias)
      - (Math.hypot(b.x - cx, b.z - cz) + b.scoreBias));
    return candidates[0];
  }
  function triggerTornado() {
    if (tornado.active) return;
    tornado.active = true;
    tornado.t = 0;
    const target = findTornadoTarget();
    const az = Math.random() * Math.PI * 2;
    const R = target ? 280 + Math.random() * 180 : 220 + Math.random() * 120;
    spoutState.x = (target ? target.x : 0) + Math.cos(az) * R;
    spoutState.z = (target ? target.z : 0) + Math.sin(az) * R;
    spoutState.target = target ? target.obj : null;
    spoutState.targetKind = target ? target.kind : '';
    spoutState.radius = target ? target.radius : 170;
    tornado.dir = Math.random() * Math.PI * 2;
    tornado.speed = 4 + Math.random() * 3;
    tornado.retargetT = 0;
    tornadoMesh.visible = true;
    showToast(target && target.kind === 'titan'
      ? '🌪 水龙卷锁定泰坦巨兽,漏斗随巨兽体型暴涨!'
      : '🌪 水龙卷锁定船只 · 开船远离漏斗!');
  }
  function updateTornado(dt) {
    if (!tornado.active) {
      tornado.nextAuto -= dt;
      if (tornado.nextAuto <= 0) {
        if (uStorm.value > 0.65) triggerTornado();   // 风暴时自动生成
        tornado.nextAuto = 30 + Math.random() * 40;
      }
      spoutState.strength *= Math.max(0, 1 - dt * 1.5);
      spoutState.target = null;
      spoutState.targetKind = '';
      uTornado.value.set(spoutState.x, spoutState.z, spoutState.strength);
      tornadoMesh.visible = spoutState.strength > 0.01;
      return;
    }
    tornado.t += dt;
    tornado.retargetT -= dt;
    if (!spoutState.target || spoutState.target.state === 'gone' || tornado.retargetT <= 0) {
      const target = findTornadoTarget();
      spoutState.target = target ? target.obj : null;
      spoutState.targetKind = target ? target.kind : '';
      spoutState.radius = target ? target.radius : 170;
      tornado.retargetT = 1.4;
    }
    const targetBodyR = spoutState.targetKind === 'titan' && spoutState.target
      ? titanBodyRadius(spoutState.target) : 0;
    spoutState.strength = Math.min(1, tornado.t / 6) * (1 - sstep01(38, 48, tornado.t));
    if (spoutState.target) {
      const tx = spoutState.target.x, tz = spoutState.target.z;
      const dx = tx - spoutState.x, dz = tz - spoutState.z;
      const d = Math.hypot(dx, dz) || 1;
      tornado.dir = Math.atan2(dz, dx);
      const chase = spoutState.targetKind === 'titan' ? Math.min(120, 42 + targetBodyR * 0.08) : 24;
      spoutState.x += dx / d * Math.min(d, chase * dt);
      spoutState.z += dz / d * Math.min(d, chase * dt);
    } else {
      spoutState.x += Math.cos(tornado.dir) * tornado.speed * dt;
      spoutState.z += Math.sin(tornado.dir) * tornado.speed * dt;
    }
    uTornado.value.set(spoutState.x, spoutState.z, spoutState.strength);
    tornadoMesh.position.set(spoutState.x, 65, spoutState.z);
    const s = spoutState.radius / 170;
    tornadoMesh.scale.set(s, Math.max(s, 1), s);
    if (tornado.t >= 48) tornado.active = false;
  }

  // --- 船尾航迹:航行时拖出的泡沫带(环形缓冲,CPU 写入 GPU 扩散淡出) ---
  const WAKE_COUNT = 900;
  const wakePos = new Float32Array(WAKE_COUNT * 3);
  const wakeBirth = new Float32Array(WAKE_COUNT).fill(-100);
  for (let i = 0; i < WAKE_COUNT; i++) wakePos[i * 3 + 1] = -50;
  const wakeGeo = new THREE.BufferGeometry();
  const wakePosAttr = new THREE.BufferAttribute(wakePos, 3);
  const wakeBirthAttr = new THREE.BufferAttribute(wakeBirth, 1);
  wakeGeo.setAttribute('position', wakePosAttr);
  wakeGeo.setAttribute('aBirth', wakeBirthAttr);
  const wakeMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
  wakeMat.sizeNode = wakeSize();
  wakeMat.colorNode = vec3(0.88, 0.93, 0.95);
  wakeMat.opacityNode = wakeOpacity();
  const wakes = new THREE.Points(wakeGeo, wakeMat);
  wakes.frustumCulled = false;
  scene.add(wakes);

  let wakeCursor = 0, wakeAcc = 0;
  function spawnWakes(dt) {
    wakeAcc += dt * 30;
    const n = Math.floor(wakeAcc);
    wakeAcc -= n;
    if (n <= 0) return;
    let dirty = false;
    for (const b of boats) {
      if (Math.abs(b.u) < 0.8) continue;
      const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
      for (let i = 0; i < n; i++) {
        const jitter = (Math.random() - 0.5) * 1.6;
        const sx = b.x - fx * 3.2 + fz * jitter;
        const sz = b.z - fz * 3.2 - fx * jitter;
        wakePos[wakeCursor * 3] = sx;
        wakePos[wakeCursor * 3 + 1] = waveHeightAt(sx, sz, simTime, seaStateEff) + 0.12;
        wakePos[wakeCursor * 3 + 2] = sz;
        wakeBirth[wakeCursor] = simTime;
        wakeCursor = (wakeCursor + 1) % WAKE_COUNT;
        dirty = true;
      }
    }
    if (dirty) { wakePosAttr.needsUpdate = true; wakeBirthAttr.needsUpdate = true; }
  }

  // --- 虎鲸群(黄昏 + 大风浪,成对巡游,浮沉 + 偶尔跃身) ---
  const orcaGeo = createOrcaGeometry();
  const orcas = [];
  for (let i = 0; i < 2; i++) {
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.positionNode = spineFlex(uniform(i * 1.9 + 0.6), 2.6, 0.18, -1.0, 3.2);
    mat.colorNode = marineSkin(orcaBaseColor());
    const mesh = new THREE.Mesh(orcaGeo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    orcas.push({ mesh, off: i * 6.5, side: i === 0 ? 1 : -1 });
  }
  const orcaEvent = { active: false, t0: 0, dur: 34, nextAt: 55 };
  function updateOrcas(t, duskFjs, effSea) {
    if (!orcaEvent.active) {
      if (t >= orcaEvent.nextAt && duskFjs > 0.4 && effSea > 0.55 && bioOn) {
        orcaEvent.active = true;
        orcaEvent.t0 = t;
        for (const o of orcas) o.mesh.visible = true;
        unlockSpecies('orca');
      }
      return;
    }
    const k = (t - orcaEvent.t0) / orcaEvent.dur;
    if (k >= 1) {
      orcaEvent.active = false;
      orcaEvent.nextAt = t + 60 + Math.random() * 60;
      for (const o of orcas) o.mesh.visible = false;
      return;
    }
    for (const o of orcas) {
      const x = -120 + 240 * k + o.side * 14;
      const z = -30 + o.side * 18 + Math.sin(t * 0.2 + o.off) * 6;
      const porp = Math.max(0, Math.sin(t * 0.45 + o.off)) ** 2;      // 浮沉节律(背鳍切水)
      const breach = Math.max(0, Math.sin(t * 0.13 + o.off * 3)) ** 6; // 偶发跃身击浪
      const waveY = waveHeightAt(x, z, t, seaStateEff);
      o.mesh.position.set(x, waveY - 1.15 + porp * 1.1 + breach * 3.2, z);
      o.mesh.rotation.set(
        -(breach * 0.5 + porp * 0.12) * Math.cos(t * 0.45 + o.off),
        Math.PI / 2,
        o.side * breach * 0.4
      );
    }
  }

  // --- 海啸浪唇飞沫:水墙顶部向前上方喷溅的白色水雾 ---
  const SPRAY_COUNT = 1400;
  const sprayPos = new Float32Array(SPRAY_COUNT * 3);
  for (let i = 0; i < SPRAY_COUNT; i++) sprayPos[i * 3] = i + 0.5;   // 只编码索引
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false });
  sprayMat.sizeNode = hash(positionLocal.x.mul(9.31).add(63.9)).mul(2.4).add(0.9);
  sprayMat.positionNode = sprayPosition();
  sprayMat.colorNode = vec3(0.88, 0.94, 0.97);
  sprayMat.opacityNode = sprayOpacity();
  const spray = new THREE.Points(sprayGeo, sprayMat);
  spray.frustumCulled = false;
  scene.add(spray);

  // --- 交互控件:滑杆 ---
  updateSun();
  syncTodUI();

  /* ------------------- 海啸低频轰鸣(WebAudio) -------------------
     纯程序化合成,零音频文件:布朗噪声 → 低通滤波 → 增益包络。
     音量随波前距离(高斯衰减)与波幅包络变化;波前压顶时滤波器
     截止频率下移,轰鸣变得更闷更沉。首次点击页面时激活(浏览器
     自动播放策略要求用户手势)。 */
  let rumble = null;   // { ctx, gain, filter }
  function ensureRumble() {
    if (rumble) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {           // 布朗噪声(红噪声,能量集中在低频)
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        ch[i] = last * 3.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start();
      rumble = { ctx, gain, filter };
    } catch (_) { /* 无音频设备时静默降级 */ }
  }
  function updateRumble(camD) {
    if (!rumble) return;
    if (rumble.ctx.state === 'suspended') { rumble.ctx.resume().catch(() => {}); }
    const amp = tsunamiState.amp;
    // 距离衰减( sigma 420m,比镜头震颤范围大 —— 先闻其声,后见其浪)
    const prox = Math.exp(-((camD / 420) ** 2));
    let target = Math.min(0.85, (amp / 80) * (0.12 + prox * 0.95));
    // 水龙卷附加轰鸣(尖锐些:截止频率抬高)
    let spoutProx = 0;
    if (spoutState.strength > 0.02) {
      const sd = Math.hypot(camera.position.x - spoutState.x, camera.position.z - spoutState.z);
      spoutProx = Math.exp(-((sd / 220) ** 2)) * spoutState.strength;
      target = Math.min(0.85, target + spoutProx * 0.4);
    }
    rumble.gain.gain.setTargetAtTime(target, rumble.ctx.currentTime, 0.35);
    // 越近越闷:截止频率 240Hz → 70Hz(水龙卷反而抬高到 400Hz,风声尖啸)
    const cutoff = 240 - prox * 170 + spoutProx * 260;
    rumble.filter.frequency.setTargetAtTime(Math.min(500, cutoff), rumble.ctx.currentTime, 0.5);
  }
  window.addEventListener('pointerdown', ensureRumble, { once: true });
  window.addEventListener('keydown', ensureRumble, { once: true });

  // 雷声:滤波噪声爆点,按闪电距离延迟播放(光速瞬时 / 声速 340m/s)
  function playThunder(intensity, delaySec) {
    if (!rumble) return;
    try {
      const ctx = rumble.ctx;
      const dur = 1.6 + intensity * 2.2;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * (1.4 + (1 - intensity) * 2.0)) * Math.min(1, t * 30);
        last = (last + 0.05 * (Math.random() * 2 - 1)) / 1.05;
        ch[i] = last * 3.0 * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 90 + intensity * 260;   // 近雷更脆、含高频;远雷只剩闷响
      const g = ctx.createGain();
      g.gain.value = 0.25 + intensity * 0.65;
      src.connect(lp); lp.connect(g); g.connect(ctx.destination);
      src.start(ctx.currentTime + delaySec);
    } catch (_) { /* 音频不可用时静默 */ }
  }

  /* ------------------- 风暴:闪电调度 -------------------
     风暴开启后每 3~9s 随机方位一道闪电,uFlash 驱动天空闪光,
     雷声按虚拟距离(0.4~1.8km)延迟到达。双闪概率 35%。 */
  const stormState = { on: false, nextAt: 5, flash: 0, secondStrike: 0 };
  function updateStorm(dt) {
    uStorm.value += ((stormState.on ? 1 : 0) - uStorm.value) * Math.min(1, dt * 0.8);
    if (uStorm.value < 0.05) { uFlash.value *= Math.max(0, 1 - dt * 8); return; }
    stormState.nextAt -= dt;
    if (stormState.nextAt <= 0) {
      const az = Math.random() * Math.PI * 2;
      const el = 0.25 + Math.random() * 0.35;
      uFlashDir.value.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
      stormState.flash = 1;
      stormState.secondStrike = Math.random() < 0.35 ? 0.10 + Math.random() * 0.08 : 0;
      stormState.nextAt = 3 + Math.random() * 6;
      const dist = 400 + Math.random() * 1400;          // 虚拟距离(米)
      playThunder(1 - dist / 2200, dist / 340);          // 远闪远雷
    }
    // 闪光包络:急起缓落;双闪在 0.1s 后再来一次
    if (stormState.secondStrike > 0) {
      stormState.secondStrike -= dt;
      if (stormState.secondStrike <= 0) stormState.flash = Math.max(stormState.flash, 0.85);
    }
    stormState.flash *= Math.max(0, 1 - dt * 14);
    uFlash.value = stormState.flash * uStorm.value;
  }
  $('sea').addEventListener('input', (e) => {
    seaState = parseFloat(e.target.value);
    $('sea-out').textContent = seaState.toFixed(2);
  });
  $('tod').addEventListener('input', (e) => {
    timeOfDay = parseFloat(e.target.value);
    updateSun();
    syncTodUI();
  });
  $('drift').addEventListener('input', (e) => {
    drift = parseFloat(e.target.value);
    $('drift-out').textContent = drift.toFixed(2);
  });
  $('cloud').addEventListener('input', (e) => {
    cloudBase = parseFloat(e.target.value);
    uCloudCover.value = cloudBase;
    $('cloud-out').textContent = cloudBase.toFixed(2);
  });
  $('glow').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    uGlow.value = v;
    $('glow-out').textContent = v.toFixed(2);
  });

  /* ------------------- 巨型海啸事件 -------------------
     时间线:0s 触发 → 6s 预警(远处海平线隆起)→ 波前以 ~55m/s 横跨整片海域
     → 前导回撤(海水先退)+ 数百米级主水墙 + 两级尾随波 → 155s 退场。
     高海况(≥0.6)下每 5~9 分钟也可能自动来袭。 */
  let tsunami = null;            // { t } 事件时钟
  let nextAutoTsunami = 320 + Math.random() * 220;

  function triggerTsunami() {
    if (tsunami) return;         // 一场未落幕不叠加
    tsunami = { t: 0 };
    showToast('⚠ 海啸预警 · 巨型涌浪正在逼近');
  }

  function updateTsunami(dt) {
    if (!tsunami) {
      // 自动来袭倒计时(仅高海况)
      nextAutoTsunami -= dt;
      if (nextAutoTsunami <= 0) {
        if (seaStateEff >= 0.6) triggerTsunami();
        nextAutoTsunami = 320 + Math.random() * 220;
      }
      tsunamiState.front = -10000;
      tsunamiState.amp = 0;
      uTsunami.value.set(-10000, 0);
      return;
    }
    tsunami.t += dt;
    const tau = tsunami.t;
    const front = -12500 + 120 * Math.max(0, tau - 8);     // 波前推进:横扫 24km 级整片海域
    const H0 = 900 + 1100 * seaStateEff;                   // 满海况约 2km 包络,比普通风浪高数个量级
    const grow = sstep01(2, 24, tau);                      // 振幅包络:渐强
    const fade = 1 - sstep01(215, 245, tau);               // 扫过后渐弱
    tsunamiState.front = front;
    tsunamiState.amp = H0 * grow * fade;
    uTsunami.value.set(front, tsunamiState.amp);
    if (tau >= 250) {
      tsunami = null;
      tsunamiState.front = -10000;
      tsunamiState.amp = 0;
      uTsunami.value.set(-10000, 0);
    }
  }

  // --- 交互控件:按键 ---
  $('btn-cycle').addEventListener('click', () => {
    dayCycle = !dayCycle;
    $('btn-cycle').classList.toggle('active', dayCycle);
  });
  $('btn-bio').addEventListener('click', () => {
    bioOn = !bioOn;
    $('btn-bio').classList.toggle('active', bioOn);
  });
  $('btn-tsunami').addEventListener('click', () => triggerTsunami());
  $('btn-spout').addEventListener('click', () => triggerTornado());
  $('btn-horror').addEventListener('click', () => {
    const btn = $('btn-horror');
    const on = !btn.classList.contains('active');
    btn.classList.toggle('active', on);
    uHorror.value = on ? 1 : 0;
    if (on) {
      timeOfDay = 22.5;
      dayCycle = false;
      updateSun();
      syncTodUI();
      $('btn-cycle').classList.remove('active');
    }
    showToast(on ? '🩸 血色恐怖风格已开启' : '血色恐怖风格已关闭');
  });
  $('btn-drive').addEventListener('click', () => toggleDrive(playerBoat));
  $('btn-speed').addEventListener('click', () => toggleDrive(speedBoat));
  $('btn-sub').addEventListener('click', () => setPilotSub(!pilotSub));
  $('btn-storm').addEventListener('click', () => {
    stormState.on = !stormState.on;
    $('btn-storm').classList.toggle('active', stormState.on);
    if (stormState.on) {
      ensureRumble();   // 手势激活音频(雷声需要)
      showToast('⚡ 风暴来袭 · 海况加剧');
    }
  });
  // 拍照:把当前画布存成 PNG(文件名带日期时间)
  $('btn-shot').addEventListener('click', () => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        a.href = URL.createObjectURL(blob);
        a.download = '无尽之海-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
          + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        showToast('已保存截图');
      }, 'image/png');
    } catch (_) { showToast('当前浏览器不支持截图'); }
  });
  $('btn-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
  const setUiHidden = (hide) => document.body.classList.toggle('ui-hidden', hide);
  const joinRoom = () => {
    const code = window.prompt('输入房间号 —— 好友输入同一个号,就会和你出现在同一片海域与荒岛:', '');
    if (code && code.trim()) {
      const u = new URL(location.href);
      u.searchParams.set('room', code.trim());
      location.href = u.toString();
    }
  };
  $('btn-mp').addEventListener('click', joinRoom);
  if ($('btn-room')) $('btn-room').addEventListener('click', joinRoom);
  $('btn-hide').addEventListener('click', () => setUiHidden(true));
  $('ui-show').addEventListener('click', () => setUiHidden(false));
  window.addEventListener('keydown', (e) => {
    if (walker.on) return;                     // 岛上 H 是抛竿,别误触沉浸模式
    if (e.key === 'h' || e.key === 'H') setUiHidden(!document.body.classList.contains('ui-hidden'));
  });
  document.querySelectorAll('[data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cam]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      flyTo(btn.dataset.cam);
    });
  });

  // --- 响应式 ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- 着色器预编译 ---
  $('loading-status').textContent = '正在编译海洋与天空着色器';
  try {
    await renderer.compileAsync(scene, camera);
  } catch (err) {
    console.warn('WebGPU shader precompile failed; continuing with first-frame compilation.', err);
  }

  // --- 主循环 ---
  const clock = new THREE.Clock();
  let simTime = 0;
  let ready = false;

  let meteor = null;
  let nextMeteorAt = 6;

  let fpsFrames = 0;
  let fpsAccum = 0;
  let guardAccum = 0;
  let guardFrames = 0;
  const dprCapNow = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const dprSteps = [dprCapNow, 1.5, 1.25, 1.0]
    .filter((v, i, a) => a.indexOf(v) === i && v <= dprCapNow)
    .sort((a, b) => b - a);
  let dprIndex = 0;

  function applyDpr() {
    renderer.setPixelRatio(dprSteps[dprIndex]);
    renderer.setSize(window.innerWidth, window.innerHeight);
    $('dpr-note').textContent = dprIndex > 0 ? 'DPR×' + dprSteps[dprIndex].toFixed(2) + ' 性能保护' : '';
  }

  function updateMeteor() {
    if (!meteor) {
      if (simTime >= nextMeteorAt && uSunDir.value.y < -0.05) {
        const az = Math.random() * Math.PI * 2;
        const el = 0.35 + Math.random() * 0.35;
        const start = new THREE.Vector3(
          Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)
        );
        const vel = new THREE.Vector3(
          Math.cos(az + 0.9), -(0.25 + Math.random() * 0.2), Math.sin(az + 0.9)
        ).normalize().multiplyScalar(0.55 + Math.random() * 0.4);
        meteor = { t0: simTime, dur: 0.8 + Math.random() * 0.6, start, vel };
      }
      return;
    }
    const k = (simTime - meteor.t0) / meteor.dur;
    if (k >= 1) {
      meteor = null;
      uMeteorLife.value = 0;
      nextMeteorAt = simTime + 5 + Math.random() * 9;
      return;
    }
    const p = meteor.start.clone().addScaledVector(meteor.vel, k * meteor.dur).normalize();
    uMeteorPos.value.copy(p);
    uMeteorTail.value.copy(meteor.vel).normalize().multiplyScalar(-0.045);
    uMeteorLife.value = Math.pow(Math.sin(Math.PI * k), 0.7);
  }

  const bloodEyeDir = new THREE.Vector3();
  function updateBloodEyeTarget() {
    camera.getWorldDirection(bloodEyeDir);
    const seaFloorY = -26;
    let t = 75;
    if (bloodEyeDir.y < -0.04) {
      t = THREE.MathUtils.clamp((seaFloorY - camera.position.y) / bloodEyeDir.y, 24, 220);
    }
    const hx = bloodEyeDir.x;
    const hz = bloodEyeDir.z;
    const hLen = Math.hypot(hx, hz) || 1;
    const c = hx / hLen;
    const s = hz / hLen;
    uBloodEye.value.set(
      camera.position.x + bloodEyeDir.x * t,
      camera.position.z + bloodEyeDir.z * t,
      c, s
    );
  }

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    simTime += dt;
    uTime.value = simTime;
    stepChaos(dt);

    if (dayCycle) {
      timeOfDay = (timeOfDay + dt * 0.25) % 24;
      updateSun();
      syncTodUI();
    }

    // 风暴:海况额外加剧(平滑),闪电与雷声调度
    updateStorm(dt);
    const stormBoost = uStorm.value * 0.35;
    // 夜间风浪增强:有效海况 = 基准 + 夜风增益 + 风暴增益(平滑过渡)
    const elev = uSunDir.value.y;
    const nightFjs = 1 - sstep01(-0.22, -0.05, elev);
    const boost = NIGHT_SEA_BOOST * nightFjs;
    seaStateEff = Math.min(1, seaState + boost + stormBoost);
    uSeaState.value = seaStateEff;
    // 风暴时云量在用户基准上自动拉满(风暴结束平滑回落)
    uCloudCover.value = Math.max(cloudBase, uStorm.value * 0.9);
    // 彩虹:太阳低角度 + 有风雨(风暴中或高云量)时出现在太阳对侧
    const rainbowT = (uSunDir.value.y > 0.04 && uSunDir.value.y < 0.55
      && (stormState.on || cloudBase > 0.62)) ? 1 : 0;
    uRainbow.value += (rainbowT - uRainbow.value) * Math.min(1, dt * 0.5);
    $('sea-out').textContent = seaState.toFixed(2) + (boost > 0.005 ? ' +' + boost.toFixed(2) + ' 夜风' : '') + (stormBoost > 0.01 ? ' +风暴' : '');
    updateTsunami(dt);

    // 相机没入水下程度(平滑过渡)+ 深度钳制
    const camWaveY = waveHeightAt(camera.position.x, camera.position.z, simTime, seaStateEff);
    const camDepth = camWaveY - camera.position.y;
    const uwTarget = walker.inBunker ? 0 : Math.min(Math.max((camDepth + 0.25) * 1.4, 0), 1);
    uUnderwater.value += (uwTarget - uUnderwater.value) * Math.min(1, dt * 5);
    uCamDepth.value = Math.max(camDepth, 0);
    // 相机深度钳制:潜航放宽到海底上方;岛上再抬到地形上方(防穿山);军火库例外
    let camFloor = pilotSub ? -23.5 : (walker.inBunker ? -23.2 : -20);
    if (walker.on && !walker.inBunker) camFloor = Math.max(camFloor,
      islandHeightAt(camera.position.x, camera.position.z) + 0.5);
    if (camera.position.y < camFloor) camera.position.y = camFloor;

    // 机位过渡(驾驶/潜航/岛上步行/骑乘巨兽时禁用)
    if (camAnim && !driving && !pilotSub && !walker.on && !riding) {
      camAnim.t += dt;
      const raw = Math.min(camAnim.t / camAnim.dur, 1);
      const k = raw * raw * (3 - 2 * raw);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
      controls.target.lerpVectors(camAnim.fromTgt, camAnim.toTgt, k);
      if (raw >= 1) camAnim = null;
    }

    controls.autoRotate = drift > 0.001 && !camAnim && !driving && !pilotSub && !walker.on && !riding;
    controls.autoRotateSpeed = drift * 1.2;
    if (!driving && !pilotSub && !walker.on && !riding) controls.update();   // 第一人称/骑乘各自接管
    if (driving) updateChaseCamera(dt);
    if (pilotSub) updateSubCamera(dt);
    updateNavMarker();
    updateMinimap();

    // 海啸氛围组:预警条 + 镜头震颤 + 低频轰鸣 + 白沫冲击
    const camD = camera.position.x * 0.940 + camera.position.z * 0.342 - tsunamiState.front;
    updateRumble(camD);
    if (tsunami) {
      const warnEl = $('tsunami-warn');
      warnEl.classList.add('show');
      if (tsunamiState.front < -60) {
        const dist = Math.round(-tsunamiState.front);
        $('tsunami-warn-text').textContent =
          '海啸逼近 · 波前 ' + dist + ' m · 约 ' + Math.max(1, Math.round(dist / 120)) + ' s 后到达';
      } else if (tsunamiState.front < 12500) {
        $('tsunami-warn-text').textContent = '⚠ 海啸过境 · 抓稳了';
      } else {
        $('tsunami-warn-text').textContent = '余波未平 · 海况逐渐恢复中';
      }
    } else {
      $('tsunami-warn').classList.remove('show');
    }
    // 白沫冲击:波前扫过相机位置时全屏泛白( sigma 55m 的窄峰)
    const splashTarget = Math.exp(-((camD / 55) ** 2)) * Math.min(1, tsunamiState.amp / 45);
    uSplash.value += (splashTarget - uSplash.value) * Math.min(1, dt * 7);

    // 海啸逼近时镜头震颤(低频轰鸣的体感,越近越强)
    if (tsunamiState.amp > 1) {
      const prox = Math.exp(-((camD / 260) ** 2));
      const rum = (tsunamiState.amp / 80) * prox * 0.55;
      if (rum > 0.003) {
        camera.position.x += Math.sin(simTime * 31.7) * rum + Math.sin(simTime * 47.3) * rum * 0.6;
        camera.position.y += Math.sin(simTime * 39.1 + 1.3) * rum * 0.8;
        camera.position.z += Math.cos(simTime * 27.9) * rum + Math.cos(simTime * 53.7) * rum * 0.6;
      }
    }
    // 水龙卷临近时镜头震颤
    if (spoutState.strength > 0.05) {
      const sd = Math.hypot(camera.position.x - spoutState.x, camera.position.z - spoutState.z);
      const prox2 = Math.exp(-((sd / 180) ** 2)) * spoutState.strength * 0.4;
      if (prox2 > 0.004) {
        camera.position.x += Math.sin(simTime * 41.3) * prox2;
        camera.position.y += Math.sin(simTime * 53.9 + 0.7) * prox2 * 0.7;
        camera.position.z += Math.cos(simTime * 35.7) * prox2;
      }
    }
    updateBloodEyeTarget();

    // --- 生态更新与物种现身条件 ---
    const isDay = elev > -0.02;
    const isNight = nightFjs > 0.4;

    gulls.visible = bioOn;
    dolphins.visible = bioOn;
    turtle.visible = bioOn && isDay;
    jellies.visible = bioOn && isNight;
    mantas.visible = bioOn && isNight;

    if (bioOn) {
      updateGulls(simTime);
      updateDolphins(simTime, dt);
      unlockSpecies('gull');
      unlockSpecies('dolphin');
      if (turtle.visible) { updateTurtle(simTime); unlockSpecies('turtle'); }
      if (jellies.visible) { updateJellies(simTime); unlockSpecies('jelly'); }
      if (mantas.visible) { updateMantas(simTime); unlockSpecies('manta'); }
    }
    updateWhale(simTime, nightFjs, seaStateEff);
    updateMeteor();
    updateTornado(dt);
    updateBoats(simTime, dt);
    updateSub(simTime, dt);
    updateSurvival(simTime, dt);
    updateHands(simTime, dt);
    updateAnimals(simTime, dt);
    updateHunt(simTime, dt);
    updateFishing(simTime, dt);
    updateGiant(simTime, dt);
    updateSavages(simTime, dt);
    updateToxicAnimals(simTime, dt);
    updateBombs(simTime, dt);
    updateMultiplayer(dt);
    spawnWakes(dt);
    const duskFjs = Math.max(0, 1 - sstep01(0.0, 0.30, elev) - nightFjs);
    updateOrcas(simTime, duskFjs, seaStateEff);

    postProcessing.render();

    // FPS 统计
    fpsFrames++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      $('fps').textContent = String(Math.round(fpsFrames / fpsAccum));
      fpsFrames = 0;
      fpsAccum = 0;
    }

    // 性能保护
    guardFrames++;
    guardAccum += dt;
    if (guardAccum >= 2.5) {
      const avg = guardFrames / guardAccum;
      if (avg < 42 && dprIndex < dprSteps.length - 1) {
        dprIndex++;
        applyDpr();
      }
      guardFrames = 0;
      guardAccum = 0;
    }

    if (!ready) {
      ready = true;
      window.__oceanReady = true;
      $('loading').classList.add('hidden');
    }
  }

  // ---- 联机:同房间号 → 同一片海域与荒岛(世界种子同步)+ 位置互播 ----
  const mp = { ws: null, id: 0, peers: new Map(), sendT: 0 };
  const peerBoatGeo = createSpeedboatGeometry();
  const peerPersonGeo = (() => {
    const body = new THREE.CapsuleGeometry(0.17, 0.95, 4, 10);
    body.translate(0, 0.75, 0);
    const head = new THREE.SphereGeometry(0.14, 10, 8);
    head.translate(0, 1.45, 0);
    const g = mergeGeometries([body, head], false);
    g.computeVertexNormals();
    return g;
  })();
  const PEER_TINTS = [
    [0.55, 0.30, 0.16], [0.16, 0.35, 0.55], [0.20, 0.48, 0.28], [0.55, 0.45, 0.15],
    [0.45, 0.20, 0.45], [0.55, 0.20, 0.25], [0.25, 0.50, 0.50], [0.50, 0.35, 0.20],
  ];
  function makePeer(id) {
    const tint = PEER_TINTS[id % PEER_TINTS.length];
    const mat = (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(tint[0], tint[1], tint[2])); return m; })();
    const group = new THREE.Group();
    const person = new THREE.Mesh(peerPersonGeo, mat);
    const boat = new THREE.Mesh(peerBoatGeo, mat);
    // 好友驯服的泰坦(代理渲染,深灰色鲸体)
    const titan = new THREE.Mesh(
      createWhaleGeometry(),
      (() => { const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = marineSkin(vec3(0.30, 0.32, 0.38)); return m; })());
    titan.scale.setScalar(22);
    titan.visible = false;
    scene.add(titan);
    group.add(person, boat);
    group.visible = false;
    scene.add(group);
    return { id, group, person, boat, titan, mode: 'free', tx: 0, ty: 0, tz: 0, th: 0, cx: 0, cy: 0, cz: 0, ch: 0,
             tg: null, tgx: 0, tgy: 0, tgz: 0, tgh: 0 };
  }
  function connectRoom(code) {
    let ws;
    try {
      // 独立副本继续使用原游戏的联机房间服务，避免换域名后房间功能失效。
      const wsUrl = new URL('wss://project-ws-fwt-lygwy7.apps.zaowuyun.com/ws');
      ws = new WebSocket(wsUrl);
    } catch {
      showToast('联机服务器未连接 —— 静态分享链接只支持单人;点工作区「发布应用」正式发布后,房间号联机即可用');
      return;
    }
    mp.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'join', room: code }));
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'joined') {
        mp.id = m.id;
        showToast('🌐 已加入房间 ' + code + '(在线 ' + m.count + ' 人)· 同一片海域,荒岛见!');
      } else if (m.t === 'peer-join') {
        if (!mp.peers.has(m.id)) mp.peers.set(m.id, makePeer(m.id));
        showToast('👋 一位好友驶入了这片海域(在线 ' + m.count + ' 人)');
      } else if (m.t === 'state') {
        let p = mp.peers.get(m.id);
        if (!p) { p = makePeer(m.id); mp.peers.set(m.id, p); }
        p.mode = m.m; p.tx = m.x; p.ty = m.y; p.tz = m.z; p.th = m.h;
        p.tg = m.g || null;                    // 好友驯服的泰坦位置(若有)
      } else if (m.t === 'hit') {
        // 被好友击中
        if (m.poison || m.kind === 'poison-spear') applyPoison(10, 0, '被好友毒矛毒死了');
        damageWalker(m.dmg || 10, '被好友击毙');
        showToast('💢 好友的' + (m.kind === 'poison-spear' ? '毒矛' : m.kind === 'bullet' ? '子弹' : '箭矢') + '命中了你!生命 -' + (m.dmg || 10));
      } else if (m.t === 'thit') {
        // 好友攻击你的驯服泰坦
        const tgt = myTamedTitan();
        if (tgt) {
          tgt.hp -= m.dmg || 5;
          if (tgt.hp <= 0) {
            killTitan(tgt);
            showToast('☠ 你的' + tgt.sp.name + '被好友击杀,翻了肚皮……');
          } else showToast('⚠ 你的' + tgt.sp.name + '遭到好友攻击!(生命 ' + Math.max(0, tgt.hp) + '/' + tgt.maxHp + ')');
        }
      } else if (m.t === 'peer-leave') {
        const p = mp.peers.get(m.id);
        if (p) { scene.remove(p.group); scene.remove(p.titan); mp.peers.delete(m.id); }
        showToast('好友离开了海域');
      }
    };
    ws.onerror = () => showToast('联机服务器未连接 —— 静态分享链接只支持单人;点工作区「发布应用」正式发布后,房间号联机即可用');
    ws.onclose = () => { if (mp.id) showToast('与联机服务器断开了'); };
  }
  function updateMultiplayer(dt) {
    // 远端玩家平滑跟随
    for (const p of mp.peers.values()) {
      if (p.mode === 'free') { p.group.visible = false; continue; }
      const k = Math.min(1, dt * 6);
      p.cx += (p.tx - p.cx) * k;
      p.cy += (p.ty - p.cy) * k;
      p.cz += (p.tz - p.cz) * k;
      let dh = p.th - p.ch;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      p.ch += dh * k;
      p.group.visible = true;
      p.group.position.set(p.cx, p.cy, p.cz);
      p.group.rotation.y = p.ch;
      p.person.visible = p.mode === 'walk' || p.mode === 'ride';
      p.boat.visible = p.mode === 'boat';
      // 好友的驯服泰坦代理:平滑跟随
      if (p.tg) {
        p.tgx += (p.tg.x - p.tgx) * k;
        p.tgy += (p.tg.y - p.tgy) * k;
        p.tgz += (p.tg.z - p.tgz) * k;
        p.tgh += (p.tg.h - p.tgh) * k;
        p.titan.visible = true;
        p.titan.position.set(p.tgx, p.tgy, p.tgz);
        p.titan.rotation.y = p.tgh;
      } else p.titan.visible = false;
    }
    if (!mp.ws || mp.ws.readyState !== 1) return;
    mp.sendT += dt;
    if (mp.sendT < 0.125) return;        // 8Hz 足够平滑
    mp.sendT = 0;
    let m = 'free', x = camera.position.x, y = camera.position.y, z = camera.position.z, h = 0;
    if (riding && riddenTitan) { m = 'ride'; x = riddenTitan.x; y = riddenTitan.y + 38; z = riddenTitan.z; h = riddenTitan.dir; }
    else if (walker.on) { m = 'walk'; x = walker.x; y = walker.y; z = walker.z; h = walker.viewYaw; }
    else if (pilotSub) { m = 'sub'; x = sub.x; y = sub.y; z = sub.z; h = sub.heading; }
    else if (driving) { m = 'boat'; x = driveTarget.x; y = driveTarget.shown ? driveTarget.shown.y : 0; z = driveTarget.z; h = driveTarget.heading; }
    // 上报驯服泰坦位置(好友可以看到、也可以攻击它)
    let gInfo = null;
    const myTitan = myTamedTitan();
    if (myTitan) gInfo = { x: myTitan.x, y: myTitan.y, z: myTitan.z, h: myTitan.dir };
    mp.ws.send(JSON.stringify({ t: 'state', m, x, y, z, h, g: gInfo }));
  }

  if (restoreRandom) {
    restoreRandom();                   // 世界生成完毕,恢复真随机(钓鱼/AI 等)
    connectRoom(mpRoom);
    document.title += ' · 房间 ' + mpRoom;
  }

  startIsland2TestIfNeeded();

  renderer.setAnimationLoop(tick);

  // --- 标签页暂停 / 恢复 ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
      if (rumble) rumble.ctx.suspend().catch(() => {});
    } else {
      clock.getDelta();
      renderer.setAnimationLoop(tick);
      if (rumble) rumble.ctx.resume().catch(() => {});
    }
  });
}

boot().catch((err) => {
  window.__oceanError('初始化过程中发生未预期错误。', err && (err.stack || err.message));
});

// 导出纯着色器节点函数与几何工厂(页面不使用,供离线冒烟测试构建节点图)
export {
  skyColor, waterColor, gerstnerPosition, detailGradient, fbm3, gnoise, hash22,
  dayWeights, islandMask, gullFlap, gullColor,
  spineFlex, mantaFlex, marineSkin, mantaColor, jellyColor,
  createDolphinGeometry, createWhaleGeometry, createMantaGeometry, createGullGeometry,
  createMotorboatGeometry, createSailboatGeometry, createOrcaGeometry, stepBoatDynamics, boatAttitude,
  createJiaolongGeometry, jiaolongColor, stepSubDynamics,
  ISLAND, BEACH_R, islandHeightAt, islandTerrainColor, createPalmGeometry, palmColor, palmSway,
  createSpeedboatGeometry, createCanopyTreeGeometry, createButtressTreeGeometry, createBanyanTreeGeometry,
  createTreeFernGeometry, createCrabGeometry, createLizardGeometry,
  createEgretGeometry, createDeerGeometry, createBoarGeometry, createBowGeometry,
  createAxeGeometry, createCrabPotGeometry, createFishingRodGeometry, createRifleGeometry,
  createSniperGeometry, createSMGGeometry, createSpearGeometry, createCatapultGeometry,
  deerColor, boarColor, createHandGeometry, handSkin,
  waveHeightAt, hashJS, stepChaos, chaosState, tsunamiState, sprayPosition, sprayOpacity,
  seafloorColor, bubblePosition, bubbleOpacity,
  spoutState, tornadoTwist, tornadoColor, tornadoOpacity, orcaBaseColor, wakeSize, wakeOpacity
};

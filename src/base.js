"use strict";
/* ============================================================
   BASE: sorteio com semente, ruído e geometria 2D
   ============================================================ */
function criaSorteio(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) { h = Math.imul(h ^ texto.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  const r = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.entre = (min, max) => min + r() * (max - min);
  r.int = (min, max) => Math.floor(r.entre(min, max + 1));
  r.de = lista => lista[Math.floor(r() * lista.length)];
  r.pesado = pares => {
    let total = 0; for (const p of pares) total += p[1];
    let x = r() * total;
    for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; }
    return pares[0][0];
  };
  return r;
}

/* Ruído suave (value noise) com semente; devolve valores entre -1 e 1 */
function criaRuido(r) {
  const perm = new Uint16Array(512), g = new Float32Array(256), base = [];
  for (let i = 0; i < 256; i++) base.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  for (let i = 0; i < 256; i++) g[i] = r() * 2 - 1;
  return function (x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    const pi = perm[iz & 255], pj = perm[(iz + 1) & 255];
    const a = g[perm[(ix & 255) + pi]], b = g[perm[((ix + 1) & 255) + pi]];
    const c = g[perm[(ix & 255) + pj]], d = g[perm[((ix + 1) & 255) + pj]];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}
function fbm(n, x, z, oitavas) {
  let s = 0, amp = 1, tot = 0;
  for (let i = 0; i < oitavas; i++) { s += n(x, z) * amp; tot += amp; amp *= .5; x = x * 2.03 + 17.1; z = z * 2.03 - 9.3; }
  return s / tot;
}

function limita(x, a, b) { return x < a ? a : x > b ? b : x; }
function suave(a, b, x) { const t = limita((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function gira(u, v, a) { const c = Math.cos(a), s = Math.sin(a); return [u * c - v * s, u * s + v * c]; }
function difAng(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
function distPontoSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? limita(((px - ax) * dx + (pz - az) * dz) / L, 0, 1) : 0;
  const cx = ax + dx * t, cz = az + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), t, cx, cz };
}

/* Retângulo girado (OBB): centro, ângulo e meias-medidas. O eixo u aponta para (cos a, sin a). */
function criaObb(x, z, a, w, d) { return { x, z, a, hw: w / 2, hd: d / 2, c: Math.cos(a), s: Math.sin(a) }; }
function obbSobrepoe(A, B, m) {
  const tx = B.x - A.x, tz = B.z - A.z;
  const eixos = [A.c, A.s, -A.s, A.c, B.c, B.s, -B.s, B.c];
  for (let k = 0; k < 8; k += 2) {
    const lx = eixos[k], lz = eixos[k + 1];
    const dist = Math.abs(tx * lx + tz * lz);
    const ra = A.hw * Math.abs(A.c * lx + A.s * lz) + A.hd * Math.abs(-A.s * lx + A.c * lz);
    const rb = B.hw * Math.abs(B.c * lx + B.s * lz) + B.hd * Math.abs(-B.s * lx + B.c * lz);
    if (dist > ra + rb + m) return false;
  }
  return true;
}
function cantosObb(o, folga) {
  const f = folga || 0, l = [];
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [u, v] = gira(i * (o.hw + f), j * (o.hd + f), o.a); l.push([o.x + u, o.z + v]); }
  return l;
}
function pontoNoObb(o, x, z, folga) {
  const dx = x - o.x, dz = z - o.z, f = folga || 0;
  return Math.abs(dx * o.c + dz * o.s) <= o.hw + f && Math.abs(-dx * o.s + dz * o.c) <= o.hd + f;
}

/* Grade espacial para achar rápido o que está perto de um ponto */
function criaHash(cel) {
  const m = new Map(); let carimbo = 0;
  const ch = (i, j) => i * 100000 + j;
  return {
    add(obj, x0, z0, x1, z1) {
      for (let i = Math.floor(x0 / cel); i <= Math.floor(x1 / cel); i++)
        for (let j = Math.floor(z0 / cel); j <= Math.floor(z1 / cel); j++) {
          const k = ch(i, j); let l = m.get(k); if (!l) { l = []; m.set(k, l); } l.push(obj);
        }
    },
    busca(x0, z0, x1, z1, fn) {
      carimbo++;
      for (let i = Math.floor(x0 / cel); i <= Math.floor(x1 / cel); i++)
        for (let j = Math.floor(z0 / cel); j <= Math.floor(z1 / cel); j++) {
          const l = m.get(ch(i, j)); if (!l) continue;
          for (const o of l) { if (o._c === carimbo) continue; o._c = carimbo; if (fn(o) === false) return; }
        }
    }
  };
}

/* Linhas (vias, trilhas, contornos) */
function comprimentos(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return L;
}
function pontoEm(via, t) {   // ponto e direção a t metros do começo da via
  const P = via.pts, L = via.L;
  t = limita(t, 0, L[L.length - 1]);
  let i = 1; while (i < L.length - 1 && L[i] < t) i++;
  const a = P[i - 1], b = P[i], seg = (L[i] - L[i - 1]) || 1, f = (t - L[i - 1]) / seg;
  const tx = (b[0] - a[0]) / seg, tz = (b[1] - a[1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, tx, tz };
}
function chaikin(pts, it) {
  for (let k = 0; k < it; k++) {
    if (pts.length < 3) return pts;
    const n = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      n.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    n.push(pts[pts.length - 1]); pts = n;
  }
  return pts;
}
function simplifica(pts, tol) {   // Ramer–Douglas–Peucker
  if (pts.length < 3) return pts;
  const manter = new Uint8Array(pts.length); manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [i, j] = pilha.pop(); let maior = 0, k = -1;
    for (let m = i + 1; m < j; m++) {
      const d = distPontoSeg(pts[m][0], pts[m][1], pts[i][0], pts[i][1], pts[j][0], pts[j][1]).d;
      if (d > maior) { maior = d; k = m; }
    }
    if (maior > tol) { manter[k] = 1; pilha.push([i, k], [k, j]); }
  }
  return pts.filter((p, i) => manter[i]);
}

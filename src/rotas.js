"use strict";
/* ============================================================
   ROTAS: os esquadrões andam pelas ruas, becos, estradas e trilhas
   ============================================================ */
function criaRedeViaria(reg) {
  const nos = [], hash = criaHash(20);
  const liga = (a, b) => { if (a !== b && !a.viz.includes(b)) { a.viz.push(b); b.viz.push(a); } };
  const pega = (x, z) => {
    let achou = null;
    hash.busca(x - 3, z - 3, x + 3, z + 3, n => { if (Math.hypot(n.x - x, n.z - z) < 3) { achou = n; return false; } });
    if (achou) return achou;
    const n = { x, z, viz: [], i: nos.length }; nos.push(n); hash.add(n, x, z, x, z); return n;
  };
  for (const via of reg.vias) {
    const L = via.L[via.L.length - 1], passos = Math.max(1, Math.ceil(L / 12));
    let ant = null;
    for (let k = 0; k <= passos; k++) {
      const p = pontoEm(via, L * k / passos), n = pega(p.x, p.z);
      n.via = n.via || via;
      if (ant) liga(ant, n); ant = n;
    }
  }
  // cruzamentos: nós de vias diferentes a menos de 10 m viram ligados
  for (const n of nos) {
    const perto = [];
    hash.busca(n.x - 10, n.z - 10, n.x + 10, n.z + 10, m => { if (m !== n && Math.hypot(m.x - n.x, m.z - n.z) < 10) perto.push(m); });
    for (const m of perto) liga(n, m);
  }
  return { nos, hash };
}
function noMaisPerto(rede, x, z) {
  for (const R of [25, 80, 250, 900]) {
    let m = null, md = Infinity;
    rede.hash.busca(x - R, z - R, x + R, z + R, n => { const d = Math.hypot(n.x - x, n.z - z); if (d < md) { md = d; m = n; } });
    if (m) return m;
  }
  return null;
}
/* Caminho pelas vias de (ax, az) até (bx, bz); devolve uma lista de pontos */
const EVITA = { raio: 190, custo: 7 };   // ruas perto de inimigo parado custam 7x (quem só está passando dá a volta)
function rotaPelasRuas(reg, ax, az, bx, bz, evita) {
  const rede = reg.rede || (reg.rede = criaRedeViaria(reg));
  const a = noMaisPerto(rede, ax, az), b = noMaisPerto(rede, bx, bz);
  const direto = [[ax, az], [bx, bz]];
  if (!a || !b || Math.hypot(ax - bx, az - bz) < Math.hypot(ax - a.x, az - a.z) + Math.hypot(bx - b.x, bz - b.z)) return direto;
  const N = rede.nos.length, g = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), fechado = new Uint8Array(N);
  const hk = [], hp = [];
  const empurra = (k, p) => { hk.push(k); hp.push(p); let i = hk.length - 1; while (i > 0) { const pai = (i - 1) >> 1; if (hp[pai] <= hp[i]) break; [hk[pai], hk[i]] = [hk[i], hk[pai]]; [hp[pai], hp[i]] = [hp[i], hp[pai]]; i = pai; } };
  const tira = () => {
    const k = hk[0], uk = hk.pop(), up = hp.pop();
    if (hk.length) { hk[0] = uk; hp[0] = up; let i = 0; for (;;) { const l = 2 * i + 1, r2 = l + 1; let m = i; if (l < hk.length && hp[l] < hp[m]) m = l; if (r2 < hk.length && hp[r2] < hp[m]) m = r2; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } }
    return k;
  };
  g[a.i] = 0; empurra(a.i, Math.hypot(a.x - b.x, a.z - b.z));
  while (hk.length) {
    const k = tira(); if (fechado[k]) continue; fechado[k] = 1;
    if (k === b.i) break;
    const n = rede.nos[k];
    for (const m of n.viz) {
      if (fechado[m.i]) continue;
      let ng = g[k] + Math.hypot(m.x - n.x, m.z - n.z);
      if (evita && evita.some(([ex, ez]) => Math.abs(ex - m.x) < EVITA.raio && Math.abs(ez - m.z) < EVITA.raio && Math.hypot(ex - m.x, ez - m.z) < EVITA.raio)) ng += (EVITA.custo - 1) * Math.hypot(m.x - n.x, m.z - n.z);
      if (ng < g[m.i]) { g[m.i] = ng; de[m.i] = k; empurra(m.i, ng + Math.hypot(m.x - b.x, m.z - b.z)); }
    }
  }
  if (!fechado[b.i]) return direto;
  const pts = [[bx, bz]];
  for (let k = b.i; k >= 0; k = de[k]) { pts.push([rede.nos[k].x, rede.nos[k].z]); if (k === a.i) break; }
  pts.push([ax, az]);
  return pts.reverse();
}

/* ---------- a pé: corta caminho por fora da estrada ----------
   Parte do caminho pelas ruas e "puxa o barbante": liga direto dois pontos
   quando não há prédio ou muro no meio, o morro não é íngreme demais e não
   passa perto de inimigo que deve ser evitado. Veículos continuam nas ruas. */
const ATALHO = { declive: .45, passo: 8, max: 450, olhar: 40 };
function trechoLivre(reg, ax, az, bx, bz, evita) {
  const L = Math.hypot(bx - ax, bz - az); if (L > ATALHO.max) return false;
  if (L > 2 && reg.oc.linhaCortada(ax, az, bx, bz, 1)) return false;
  const n = Math.max(1, Math.ceil(L / ATALHO.passo)), d = L / n; let h0 = alturaEm(reg, ax, az);
  for (let k = 1; k <= n; k++) {
    const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, h = alturaEm(reg, x, z);
    if (Math.abs(h - h0) / d > ATALHO.declive) return false; h0 = h;
    if (evita && evita.some(([ex, ez]) => Math.abs(ex - x) < EVITA.raio && Math.abs(ez - z) < EVITA.raio && Math.hypot(ex - x, ez - z) < EVITA.raio)) return false;
  }
  return true;
}
function atalhos(reg, pts, evita) {
  if (pts.length < 3) return pts;
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + ATALHO.olhar);
    while (j > i + 1 && !trechoLivre(reg, pts[i][0], pts[i][1], pts[j][0], pts[j][1], evita)) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
/* grade do terreno para andar a pé (feita uma vez por região) */
const GRADE_PE = { cel: 8, declive: .45, custoVia: .85, custoMorro: 3 };
function gradeAPe(reg) {
  if (reg.gradePe) return reg.gradePe;
  const C = GRADE_PE.cel, N = Math.ceil(MUNDO / C), bloq = new Uint8Array(N * N), alt = new Float32Array(N * N), via = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -METADE + (i + .5) * C, z = -METADE + (j + .5) * C, k = j * N + i;
    alt[k] = alturaEm(reg, x, z);
    if (reg.oc.ocupado(x, z, 1)) bloq[k] = 1;
    else if (reg.oc.viaPerto(x, z, 1)) via[k] = 1;
  }
  return (reg.gradePe = { N, C, bloq, alt, via });
}
function rotaPelaGrade(reg, ax, az, bx, bz, evita) {
  const G = gradeAPe(reg), { N, C, bloq, alt, via } = G;
  const cel = (x, z) => [Math.max(0, Math.min(N - 1, Math.floor((x + METADE) / C))), Math.max(0, Math.min(N - 1, Math.floor((z + METADE) / C)))];
  const livreMaisPerto = (i, j) => { if (!bloq[j * N + i]) return j * N + i; for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && !bloq[jj * N + ii]) return jj * N + ii; } return -1; };
  const [ai, aj] = cel(ax, az), [bi, bj] = cel(bx, bz), A = livreMaisPerto(ai, aj), B = livreMaisPerto(bi, bj);
  if (A < 0 || B < 0) return null;
  let caro = null;
  if (evita && evita.length) { caro = new Uint8Array(N * N); const r = Math.ceil(EVITA.raio / C); for (const [ex, ez] of evita) { const [ci, cj] = cel(ex, ez); for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = ci + di, jj = cj + dj; if (ii >= 0 && jj >= 0 && ii < N && jj < N && di * di + dj * dj <= r * r) caro[jj * N + ii] = 1; } } }
  const g = new Float32Array(N * N).fill(Infinity), de = new Int32Array(N * N).fill(-1), fech = new Uint8Array(N * N);
  const hk = [], hp = [];
  const empurra = (k, p) => { hk.push(k); hp.push(p); let i = hk.length - 1; while (i > 0) { const pai = (i - 1) >> 1; if (hp[pai] <= hp[i]) break; [hk[pai], hk[i]] = [hk[i], hk[pai]]; [hp[pai], hp[i]] = [hp[i], hp[pai]]; i = pai; } };
  const tira = () => { const k = hk[0], uk = hk.pop(), up = hp.pop(); if (hk.length) { hk[0] = uk; hp[0] = up; let i = 0; for (;;) { const l = 2 * i + 1, r2 = l + 1; let m = i; if (l < hk.length && hp[l] < hp[m]) m = l; if (r2 < hk.length && hp[r2] < hp[m]) m = r2; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } } return k; };
  const bI = B % N, bJ = (B / N) | 0, h = k => { const i = k % N, j = (k / N) | 0; return Math.hypot(i - bI, j - bJ) * C * GRADE_PE.custoVia; };
  g[A] = 0; empurra(A, h(A)); let passos = 0;
  const viz = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (hk.length) {
    const k = tira(); if (fech[k]) continue; fech[k] = 1;
    if (k === B || ++passos > 60000) break;
    const i = k % N, j = (k / N) | 0;
    for (const [di, dj, L] of viz) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
      const m = jj * N + ii; if (bloq[m] || fech[m]) continue;
      if (di && dj && (bloq[j * N + ii] || bloq[jj * N + i])) continue;   // não corta quina de prédio
      const dist = L * C, inc = Math.abs(alt[m] - alt[k]) / dist; if (inc > GRADE_PE.declive) continue;
      let c = dist * (via[m] ? GRADE_PE.custoVia : 1) * (1 + inc * GRADE_PE.custoMorro);
      if (caro && caro[m]) c *= EVITA.custo;
      const ng = g[k] + c; if (ng < g[m]) { g[m] = ng; de[m] = k; empurra(m, ng + h(m)); }
    }
  }
  if (de[B] < 0 && B !== A) return null;
  const pts = []; for (let k = B; k >= 0; k = de[k]) { pts.push([-METADE + (k % N + .5) * C, -METADE + (((k / N) | 0) + .5) * C]); if (k === A) break; }
  pts.reverse(); pts[0] = [ax, az]; pts.push([bx, bz]);
  return pts;
}
function rotaAPe(reg, ax, az, bx, bz, evita) {
  if (trechoLivre(reg, ax, az, bx, bz, evita)) return [[ax, az], [bx, bz]];
  const pg = rotaPelaGrade(reg, ax, az, bx, bz, evita);
  return atalhos(reg, pg || rotaPelasRuas(reg, ax, az, bx, bz, evita), evita);
}

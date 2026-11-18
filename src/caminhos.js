"use strict";
/* ============================================================
   CAMINHOS: estradas que contornam morros e atravessam o rio
   o mínimo possível (A* numa grade de 20 m)
   ============================================================ */
function criaMalhaCaminhos(reg) {
  const C = 20, n = MUNDO / C, N = n * n;
  const M = { C, n, h: new Float32Array(N), rio: new Uint8Array(N), uso: new Uint8Array(N), evita: new Float32Array(N).fill(1) };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -METADE + (i + .5) * C, z = -METADE + (j + .5) * C, k = j * n + i;
    M.h[k] = alturaEm(reg, x, z);
    M.rio[k] = distRio(reg, x, z) < reg.rio.larg + 6 ? 1 : 0;
    const d = Math.hypot(x, z), a = Math.atan2(z, x);
    if (d < raioVelha(reg, a) + 4) M.evita[k] = 10;              // estradas não cortam a cidade velha
    if (Math.max(Math.abs(x), Math.abs(z)) > METADE - 30) M.evita[k] = 3;
  }
  return M;
}

function caminho(reg, M, ax, az, bx, bz) {
  const { C, n } = M, N = n * n;
  const cel = (x, z) => [limita(Math.floor((x + METADE) / C), 0, n - 1), limita(Math.floor((z + METADE) / C), 0, n - 1)];
  const [si, sj] = cel(ax, az), [gi, gj] = cel(bx, bz), alvo = gj * n + gi;
  const g = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), fechado = new Uint8Array(N);
  // fila de prioridade (heap binário)
  const hk = [], hp = [];
  const empurra = (k, p) => {
    hk.push(k); hp.push(p); let i = hk.length - 1;
    while (i > 0) { const pai = (i - 1) >> 1; if (hp[pai] <= hp[i]) break; [hk[pai], hk[i]] = [hk[i], hk[pai]]; [hp[pai], hp[i]] = [hp[i], hp[pai]]; i = pai; }
  };
  const tira = () => {
    const k = hk[0], ultK = hk.pop(), ultP = hp.pop();
    if (hk.length) {
      hk[0] = ultK; hp[0] = ultP; let i = 0;
      for (;;) {
        const a = 2 * i + 1, b = a + 1; let m = i;
        if (a < hk.length && hp[a] < hp[m]) m = a; if (b < hk.length && hp[b] < hp[m]) m = b;
        if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m;
      }
    }
    return k;
  };
  const heur = k => .45 * C * Math.hypot((k % n) - gi, Math.floor(k / n) - gj);
  const ini = sj * n + si; g[ini] = 0; empurra(ini, heur(ini));
  const viz = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  while (hk.length) {
    const a = tira(); if (fechado[a]) continue; fechado[a] = 1;
    if (a === alvo) break;
    const ai = a % n, aj = (a - ai) / n;
    for (const [di, dj, f] of viz) {
      const bi = ai + di, bj = aj + dj; if (bi < 0 || bj < 0 || bi >= n || bj >= n) continue;
      const b = bj * n + bi; if (fechado[b]) continue;
      const d = C * f, inc = Math.abs(M.h[b] - M.h[a]) / d;
      let c = d * (1 + 60 * inc * inc) * M.evita[b];
      if (inc > .2) c *= 4;
      if (M.rio[b] && !M.rio[a]) c += 900;
      if (M.uso[b]) c *= .3;
      const ng = g[a] + c;
      if (ng < g[b]) { g[b] = ng; de[b] = a; empurra(b, ng + heur(b)); }
    }
  }
  if (de[alvo] < 0 && alvo !== ini) return null;
  const cels = []; for (let k = alvo; k >= 0; k = de[k]) { cels.push(k); if (k === ini) break; }
  cels.reverse();
  for (const k of cels) M.uso[k] = 1;
  let pts = cels.filter((k, i) => i % 2 === 0 || i === cels.length - 1).map(k => [-METADE + ((k % n) + .5) * C, -METADE + (Math.floor(k / n) + .5) * C]);
  pts[0] = [ax, az]; pts[pts.length - 1] = [bx, bz];
  return simplifica(chaikin(pts, 3), .6);
}

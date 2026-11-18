"use strict";
/* ============================================================
   RELEVO E RIO
   Morros e serras em volta; a cidade fica num terreno mais plano perto
   do rio, e o rio corre num vale (como Mossul e Ramadi). Os bairros de
   fora sobem as encostas (como Nablus).
   ============================================================ */
function xDoRio(reg, z) { const R = reg.rio; return R.x0 + R.a1 * R.n(z / 900 + R.f1, 3.7) + R.a2 * Math.sin(z / R.o2 + R.fase); }
function nivelDoRio(z) { return 14 - z * .006; }
function distRio(reg, x, z) { return Math.abs(x - xDoRio(reg, z)); }
function raioVelha(reg, a) { return reg.Rv * (1 + .13 * reg.nVelha(Math.cos(a) * 1.3 + 5, Math.sin(a) * 1.3 + 5)); }

function geraRelevo(reg, r) {
  const n1 = criaRuido(r), n2 = criaRuido(r), n3 = criaRuido(r);
  const lado = r() < .5 ? -1 : 1;
  const R = reg.rio = { n: criaRuido(r), x0: lado * r.entre(190, 280), a1: r.entre(150, 230), f1: r.entre(0, 50),
    a2: r.entre(25, 45), o2: r.entre(140, 220), fase: r.entre(0, 6.28), larg: r.entre(14, 19) };
  // O rio passa longe da cidade velha
  let menor = Infinity;
  for (let z = -320; z <= 320; z += 10) menor = Math.min(menor, Math.abs(xDoRio(reg, z)));
  if (menor < reg.Rv + 80) R.x0 += lado * (reg.Rv + 80 - menor);

  const cid = reg.cidadela, hc = 32;
  const alt = (x, z) => {
    const a = fbm(n1, x / 850 + 11.3, z / 850 - 4.1, 5);
    const rid = 1 - Math.abs(fbm(n2, x / 520 + 3.1, z / 520 - 7.7, 4));
    let h = 62 + 105 * a + 80 * rid * rid * rid * (.6 + .4 * a) + 6 * fbm(n3, x / 90, z / 90, 3);
    const borda = suave(0, 260, METADE - Math.max(Math.abs(x), Math.abs(z)));
    h = 40 + (h - 40) * borda;
    const dc = Math.hypot(x, z);
    h += (hc - h) * Math.exp(-((dc / 360) ** 2)) * .82;
    const nivel = nivelDoRio(z), dr = distRio(reg, x, z);
    h += (nivel + 7 - h) * Math.exp(-((dr / 210) ** 2)) * .85;
    h += (nivel - 2.5 - h) * suave(R.larg + 8, R.larg - 3, dr);
    if (cid) h += 13 * suave(54, 32, Math.hypot(x - cid.x, z - cid.z));
    return Math.max(h, 3);
  };
  const N = Math.round(MUNDO / GRADE), L = N + 1, H = new Float32Array(L * L);
  for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) H[j * L + i] = alt(-METADE + i * GRADE, -METADE + j * GRADE);
  reg.H = H; reg.L = L; reg.N = N;
}

/* Altura do chão em qualquer ponto, igual ao desenho dos triângulos do terreno */
function alturaEm(reg, x, z) {
  const N = reg.N, L = reg.L, H = reg.H;
  let fx = limita((x + METADE) / GRADE, 0, N - 1e-6), fz = limita((z + METADE) / GRADE, 0, N - 1e-6);
  const i = Math.floor(fx), j = Math.floor(fz); fx -= i; fz -= j;
  const k = j * L + i, h00 = H[k], h10 = H[k + 1], h01 = H[k + L], h11 = H[k + L + 1];
  return fx + fz <= 1 ? h00 + (h10 - h00) * fx + (h01 - h00) * fz : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
}
function declive(reg, x, z) {
  const e = 6;
  const gx = (alturaEm(reg, x + e, z) - alturaEm(reg, x - e, z)) / (2 * e);
  const gz = (alturaEm(reg, x, z + e) - alturaEm(reg, x, z - e)) / (2 * e);
  return { gx, gz, m: Math.hypot(gx, gz) };
}
/* Diferença de altura dentro de um retângulo (para saber se cabe um edifício grande) */
function desnivel(reg, o) {
  let lo = Infinity, hi = -Infinity;
  for (let i = -1; i <= 1; i += .5) for (let j = -1; j <= 1; j += .5) {
    const [u, v] = gira(i * o.hw, j * o.hd, o.a), h = alturaEm(reg, o.x + u, o.z + v);
    if (h < lo) lo = h; if (h > hi) hi = h;
  }
  return hi - lo;
}

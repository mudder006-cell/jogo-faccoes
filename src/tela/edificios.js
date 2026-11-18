"use strict";
/* ============================================================
   EDIFÍCIOS EM 3D
   Cada edifício vira uma lista de peças (caixas, cilindros, cúpulas...).
   As peças de uma área de 200 x 200 m são juntadas numa malha só,
   para o navegador aguentar milhares de edifícios.
   ============================================================ */
const FORMAS = {};
function preparaFormas() {
  const prep = geo => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return { p: g.attributes.position.array, n: g.attributes.normal.array, v: g.attributes.position.count }; };
  const caixa = new THREE.BoxGeometry(1, 1, 1); caixa.translate(0, .5, 0); FORMAS.caixa = prep(caixa);
  const cil = new THREE.CylinderGeometry(.5, .5, 1, 8); cil.translate(0, .5, 0); FORMAS.cil = prep(cil);
  const cil6 = new THREE.CylinderGeometry(.5, .5, 1, 6); cil6.translate(0, .5, 0); FORMAS.cil6 = prep(cil6);
  const cone = new THREE.ConeGeometry(.5, 1, 8); cone.translate(0, .5, 0); FORMAS.cone = prep(cone);
  const pir = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); pir.rotateY(Math.PI / 4); pir.translate(0, .5, 0); FORMAS.piramide = prep(pir);
  const cup = new THREE.SphereGeometry(.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2); cup.scale(1, 2, 1); FORMAS.cupula = prep(cup);
  const pr = new THREE.CylinderGeometry(1, 1, 1, 3); pr.rotateZ(Math.PI / 2); pr.rotateX(-Math.PI / 2); pr.translate(0, .5, 0); pr.scale(1, 1 / 1.5, 1 / 1.7320508);
  FORMAS.prisma = prep(pr);
}

function criaLote() { return { p: new Float32Array(3 * 32768), n: new Float32Array(3 * 32768), c: new Float32Array(3 * 32768), v: 0, donos: [] }; }
function garante(L, extra) {
  if ((L.v + extra) * 3 <= L.p.length) return;
  let cap = L.p.length * 2; while (cap < (L.v + extra) * 3) cap *= 2;
  for (const k of ["p", "n", "c"]) { const a = new Float32Array(cap); a.set(L[k]); L[k] = a; }
}
function poeForma(L, F, x, y, z, sx, sy, sz, ang, cor, dono) {
  garante(L, F.v);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const cr = ((cor >> 16) & 255) / 255, cg = ((cor >> 8) & 255) / 255, cb = (cor & 255) / 255;
  let k = L.v * 3;
  for (let i = 0; i < F.v * 3; i += 3) {
    const X = F.p[i] * sx, Y = F.p[i + 1] * sy, Z = F.p[i + 2] * sz;
    L.p[k] = x + X * ca - Z * sa; L.p[k + 1] = y + Y; L.p[k + 2] = z + X * sa + Z * ca;
    let nx = F.n[i] / sx, ny = F.n[i + 1] / sy, nz = F.n[i + 2] / sz; const m = Math.hypot(nx, ny, nz) || 1; nx /= m; ny /= m; nz /= m;
    L.n[k] = nx * ca - nz * sa; L.n[k + 1] = ny; L.n[k + 2] = nx * sa + nz * ca;
    L.c[k] = cr; L.c[k + 1] = cg; L.c[k + 2] = cb;
    k += 3;
  }
  for (let t = 0; t < F.v / 3; t++) L.donos.push(dono);
  L.v += F.v;
}

function tom(cor, f) {
  const r = Math.min(255, ((cor >> 16) & 255) * f), g = Math.min(255, ((cor >> 8) & 255) * f), b = Math.min(255, (cor & 255) * f);
  return (r << 16) | (g << 8) | b;
}
const ANDAR = 3.1;
const CORES_TOLDO = [0xa8463f, 0x3f6f8f, 0x4f7f4a, 0xc58a2e, 0x7a4a7a];
const CORES_CUPULA = [0x6fa39b, 0xb9c0c4, 0xc9a548, 0x6fa39b, 0x8fa8b4];
const CORES_CARRO = [0xe8e6e0, 0x2f3338, 0x9a2f2a, 0xd8c890, 0x4a6a8a, 0xb8b8b4];

/* Peças de cada tipo de edifício. u: ao longo da largura (w); v: ao longo da profundidade (d); a frente é +v. */
function partesDe(e) {
  const P = [], w = e.w, d = e.d, q = e.var, q2 = e.var2, q3 = e.var3;
  const cx = (u, v, ww, dd, y, h, cor, o) => P.push(Object.assign({ f: "caixa", u, v, w: ww, d: dd, y, h, cor }, o));
  const fo = (f, u, v, ww, dd, y, h, cor, o) => P.push(Object.assign({ f, u, v, w: ww, d: dd, y, h, cor }, o));
  const muro = (W, D, h, cor, esp, portao, u0, v0) => {
    esp = esp || .4; portao = portao || 3.6; u0 = u0 || 0; v0 = v0 || 0;
    const lado = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 8)), ang = Math.atan2(bz - az, bx - ax);
      for (let i = 0; i < n; i++) {
        const f = (i + .5) / n;
        P.push({ f: "caixa", u: u0 + ax + (bx - ax) * f, v: v0 + az + (bz - az) * f, w: L / n + .05, d: esp, y: 0, h, cor, ra: ang, chao: true });
      }
    };
    const hw = W / 2, hd = D / 2;
    lado(-hw, -hd, hw, -hd); lado(-hw, -hd, -hw, hd); lado(hw, -hd, hw, hd);
    lado(-hw, hd, -portao / 2, hd); lado(portao / 2, hd, hw, hd);
  };
  const caixaDagua = (u, v, y) => fo("cil", u, v, 1.3, 1.3, y, 1.25, q3 < .5 ? 0x2f3338 : 0xe6e6e2);
  const telhadoPlano = (u, v, ww, dd, h, cor) => {     // mureta do terraço e coisas no teto
    cx(u, v, ww + .2, dd + .2, h, .45, tom(cor, .93));
    if (q2 < .55) caixaDagua(u + ww * .25, v - dd * .2, h);
    if (q3 > .5) cx(u - ww * .25, v + dd * .2, Math.min(2.4, ww * .3), Math.min(2.4, dd * .3), h, 2.2, cor);
  };
  const pedra = CORES_PEDRA[Math.floor(q * CORES_PEDRA.length)], concreto = CORES_CONCRETO[Math.floor(q * CORES_CONCRETO.length)];
  const cupula = CORES_CUPULA[Math.floor(q2 * CORES_CUPULA.length)];
  const minarete = (u, v, h, quadrado) => {
    fo(quadrado ? "caixa" : "cil6", u, v, 2.6, 2.6, 0, h * .78, 0xe9dfc8, { chao: true });
    fo("cil", u, v, 3.6, 3.6, h * .78, .6, 0xcdbf9f, { chao: true });
    fo(quadrado ? "caixa" : "cil6", u, v, 1.9, 1.9, h * .78 + .6, h * .2, 0xe9dfc8, { chao: true });
    fo("cone", u, v, 2.2, 2.2, h * .98 + .6, 3, cupula, { chao: true });
  };
  switch (e.tipo) {
    case "casa": {
      const cor = e.velha ? tom(pedra, .96 + q2 * .08) : (q3 < .5 ? concreto : pedra);
      const h = e.andares * ANDAR + .3;
      if (e.murada) {
        muro(w, d, 2, tom(cor, .9), .35);
        const hw = w * .56, hd = d * .48, u = (q - .5) * (w - hw) * .6, v = -d / 2 + hd / 2 + 1;
        cx(u, v, hw, hd, 0, h, cor); telhadoPlano(u, v, hw, hd, h, cor);
        cx(-u * .2 + (w / 2 - 2.6) * (q2 < .5 ? 1 : -1), d / 2 - 3, 3.2, 3.6, 0, 2.6, tom(cor, .88));
      } else if (e.patio) {
        const t = limita(Math.min(w, d) * .3, 3, 4.6), h2 = Math.max(ANDAR + .3, h - (q2 < .5 ? ANDAR : 0));
        cx(0, -d / 2 + t / 2, w, t, 0, h, cor);
        cx(0, d / 2 - t / 2, w, t, 0, h2, tom(cor, .97));
        cx(-w / 2 + t / 2, 0, t, d - 2 * t, 0, h2, tom(cor, 1.02));
        cx(w / 2 - t / 2, 0, t, d - 2 * t, 0, h, tom(cor, .99));
        cx(0, 0, w - 2 * t, d - 2 * t, 0, .25, 0xd8ccb0);
        if (q3 < .6) caixaDagua(-w / 2 + t / 2, -d / 2 + t / 2, h);
      } else {
        cx(0, 0, w, d, 0, h, cor); telhadoPlano(0, 0, w, d, h, cor);
        if (e.torre) { cx(0, 0, w + .15, d + .15, h - 1.4, .7, 0xf2efe6); cx(0, 0, w + .15, d + .15, h - 4.6, .5, 0xf2efe6); }
        else if (!e.velha) cx(0, d / 2 + .05, 1.1, .2, 0, 2, 0x5a4634);
      }
      break;
    }
    case "predio": {
      const cor = tom(concreto, .95 + q2 * .1), H = e.andares * ANDAR + .4;
      cx(0, 0, w, d, 0, H, cor);
      for (let f = 1; f <= e.andares; f++) cx(0, 0, w + .12, d + .12, f * ANDAR - 1.9, .95, 0x58544a);
      if (q3 < .35) { cx(0, d / 2 + .7, w * .9, 1.4, 2.8, .25, CORES_TOLDO[Math.floor(q2 * CORES_TOLDO.length)]); cx(0, d / 2 + .06, w * .9, .15, 0, 2.6, 0x3a3630); }
      cx(0, 0, w + .3, d + .3, H, .5, tom(cor, .9));
      caixaDagua(w * .25, -d * .2, H); if (w > 11) caixaDagua(-w * .2, d * .15, H);
      cx(-w / 2 + 1.8, -d / 2 + 1.8, 2.6, 2.6, H, 2.4, cor);
      if (e.inacabado) {
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]]) cx(a * (w / 2 - .4), b * (d / 2 - .4), .45, .45, H, 2.8, 0x9a948a);
        cx(0, -d / 2 + .2, w * .6, .3, H, 1.6, 0xa9a090);
      }
      break;
    }
    case "loja": {
      const cor = e.velha ? pedra : (q3 < .5 ? concreto : pedra), h = e.andares * 3.4 + .3;
      cx(0, 0, w, d, 0, h, cor); telhadoPlano(0, 0, w, d, h, cor);
      cx(0, d / 2 + .06, w * .9, .15, 0, 2.5, 0x3a3630);
      cx(0, d / 2 + .8, w * .92, 1.6, 2.7, .25, CORES_TOLDO[Math.floor(q2 * CORES_TOLDO.length)]);
      if (!e.velha) cx(0, d / 2 + .1, w * .6, .2, 3.2, .9, CORES_TOLDO[Math.floor(q3 * CORES_TOLDO.length)]);
      break;
    }
    case "mercado": {
      cx(0, 0, w, d, 0, 5, tom(pedra, .95));
      const n = Math.max(1, Math.floor(w / 4.6));
      for (let i = 0; i < n; i++) fo("cupula", -w / 2 + (i + .5) * w / n, 0, 3.8, 3.8, 5, 1.6, 0xd9cba6);
      cx(0, d / 2 + .8, w * .95, 1.6, 2.8, .25, CORES_TOLDO[Math.floor(q2 * CORES_TOLDO.length)]);
      break;
    }
    case "mesquita": {
      if (e.grande) {
        muro(w, d, 5.5, 0xdccfae, .9, 6);
        cx(0, 0, w - 2, d - 2, 0, .3, 0xe6dcc2, { chao: true });
        const hd = d * .36, vh = -d / 2 + hd / 2 + .9;
        cx(0, vh, w - 1.8, hd, 0, 11, 0xe2d5b5);
        fo("cil", 0, vh, 15, 15, 11, 2, 0xd9cba6); fo("cupula", 0, vh, 15, 15, 13, 7.5, cupula);
        fo("cupula", -w * .28, vh, 6, 6, 11, 3, cupula); fo("cupula", w * .28, vh, 6, 6, 11, 3, cupula);
        for (const s of [-1, 1]) cx(s * (w / 2 - 3), d * .1, 5, d * .5, 0, 5.2, 0xd4c6a4);
        cx(0, d / 2 - 3, w - 2, 5, 0, 5.2, 0xd4c6a4);
        fo("cil6", 0, d * .12, 4, 4, 0, 1.2, 0x8fb7cc, { chao: true });
        minarete(w / 2 - 3, d / 2 - 3, 42, true); minarete(-w / 2 + 3, -d / 2 + 3, 34, false);
      } else {
        muro(w, d, 3.2, 0xdccfae, .5, 3);
        cx(0, 0, w - 1, d - 1, 0, .25, 0xe6dcc2, { chao: true });
        const hd = d * .52, vh = -d / 2 + hd / 2 + .5, dm = Math.min(w, hd) * .62;
        cx(0, vh, w - 1, hd, 0, 7.5, 0xe2d5b5); cx(0, vh, w - .6, hd + .4, 7.5, .4, 0xcdbf9f);
        fo("cil", 0, vh, dm * 1.04, dm * 1.04, 7.5, 1.4, 0xd9cba6); fo("cupula", 0, vh, dm, dm, 8.9, dm * .55, cupula);
        minarete((w / 2 - 2) * (q3 < .5 ? 1 : -1), d / 2 - 2, 19 + q * 8, false);
      }
      break;
    }
    case "armazem": {
      const cor = [0xc5c9cc, 0xb8b2a2, 0x9fa9b0, 0xc9c0ac][Math.floor(q * 4)], h = 7 + q2 * 3;
      cx(0, 0, w, d, 0, h, cor);
      fo("prisma", 0, 0, w, d, h, 1.6, tom(cor, .9));
      for (let i = 0, n = Math.max(1, Math.floor(w / 12)); i < n; i++) cx(-w / 2 + (i + .5) * w / n, d / 2 + .05, 4, .2, 0, 4.2, 0x5f5a4e);
      break;
    }
    case "fabrica": {
      const cor = [0xb39f7e, 0xa59a88, 0xbfb6a2][Math.floor(q * 3)], h = 8;
      cx(0, 0, w, d, 0, h, cor);
      const n = Math.max(2, Math.round(w / 8));
      for (let i = 0; i < n; i++) fo("prisma", -w / 2 + (i + .5) * w / n, 0, d, w / n, h, 2.6, 0x7d776a, { ra: Math.PI / 2 });
      fo("cil", w / 2 - 3, -d / 2 + 3, 2.8, 2.8, 0, 26, 0x9a8468, { chao: true }); fo("cil", w / 2 - 3, -d / 2 + 3, 3.3, 3.3, 25, 1, 0x3c3c3c, { chao: true });
      if (q2 < .6) fo("cil", -w / 2 + 4, d / 2 - 4, 6, 6, 0, 8, 0xd8d8d4, { chao: true });
      break;
    }
    case "oficina": {
      const cor = tom(concreto, .9), dd = d * .72, v = -d / 2 + dd / 2;
      cx(0, v, w, dd, 0, 4.6, cor); cx(0, v, w + .2, dd + .2, 4.6, .4, tom(cor, .9));
      cx(0, v + dd / 2 + .05, w * .55, .2, 0, 3.6, 0x3a4048);
      cx(-w * .2, d / 2 - 2.6, 2, 4.2, 0, 1.5, CORES_CARRO[Math.floor(q2 * CORES_CARRO.length)], { ra: Math.PI / 2 * (q3 < .5 ? 0 : 1) });
      fo("cil", w * .32, d / 2 - 1.2, .8, .8, 0, 1.1, 0x2f5a8a, { chao: true });
      break;
    }
    case "posto": {
      const cor = [0xc0473f, 0x3f8f5a, 0x2f6fa8][Math.floor(q * 3)];
      cx(0, -d / 2 + 3.5, w * .4, 6, 0, 3.6, 0xeeeae0); cx(0, -d / 2 + 3.5, w * .4 + .2, 6.2, 3.6, .5, cor);
      cx(0, d * .12, w * .72, d * .5, 5, .9, 0xf2f2ee); cx(0, d * .12, w * .72 + .1, d * .5 + .1, 5.5, .5, cor);
      for (const a of [-1, 1]) for (const b of [-1, 1]) fo("cil", a * w * .26, d * .12 + b * d * .17, .5, .5, 0, 5, 0xe6e6e6);
      for (const a of [-1, 1]) cx(a * w * .14, d * .12, .9, .6, 0, 1.6, 0x44484d);
      fo("cil", w / 2 - 1.5, d / 2 - 1.5, .4, .4, 0, 9, 0xd6d6d6, { chao: true }); cx(w / 2 - 1.5, d / 2 - 1.5, 2.6, .3, 9, 2.2, cor, { chao: true });
      break;
    }
    case "delegacia": {
      muro(w, d, 2.6, 0xb9b3a4, .5, 4);
      const hd = d * .55, v = -d / 2 + hd / 2 + 1;
      cx(0, v, w * .72, hd, 0, 8.6, 0xd4cdbd); cx(0, v, w * .72 + .1, hd + .1, 3.4, 1, 0x27477a); cx(0, v, w * .72 + .3, hd + .3, 8.6, .5, 0x8d8573);
      cx(3, d / 2 - 2, 2.4, 2.4, 0, 2.8, 0xd4cdbd, { chao: true });
      fo("cil", -w * .3, v, .25, .25, 8.6, 5, 0xdddddd); cx(-w * .3 + .85, v, 1.6, .08, 12.4, 1, 0x3f8f5a);
      break;
    }
    case "hospital": {
      const v = -d / 2 + d * .31;
      cx(-w * .1, v, w * .72, d * .6, 0, 16, 0xefece4);
      for (let a = 0; a < 4; a++) cx(-w * .1, v, w * .72 + .12, d * .6 + .12, a * 3.8 + 1.5, 1.1, 0x8fb7a8);
      cx(-w * .1, v, w * .72 + .3, d * .6 + .3, 16, .5, 0xbfc5c9);
      cx(w * .16, d / 2 - d * .17, w * .52, d * .3, 0, 8, 0xe7e3d8); cx(w * .16, d / 2 - d * .17, w * .52 + .3, d * .3 + .3, 8, .5, 0xbfc5c9);
      cx(-w * .1, v + d * .3 + .1, 4, .2, 11, 1.2, 0xd9423c); cx(-w * .1, v + d * .3 + .1, 1.2, .2, 9.6, 4, 0xd9423c);
      cx(w * .3, d / 2 - 1.5, 2.2, 5, 0, 2.2, 0xf2f2ee, { chao: true, ra: Math.PI / 2 });
      break;
    }
    case "escola": {
      muro(w, d, 2.2, 0xc9b78f, .45, 4);
      const cor = [0xe0c98a, 0xe6d6a8, 0xd9c49a][Math.floor(q * 3)];
      cx(0, -d / 2 + 5.5, w * .9, 9, 0, 7.4, cor); cx(0, -d / 2 + 5.5, w * .9 + .15, 9.15, 3.2, .9, 0x8a6a4a); cx(0, -d / 2 + 5.5, w * .9 + .3, 9.3, 7.4, .5, 0x9c8f78);
      for (const s of [-1, 1]) { cx(s * (w * .45 - 4), 0, 8, d * .45, 0, 7.4, cor); cx(s * (w * .45 - 4), 0, 8.3, d * .45 + .3, 7.4, .5, 0x9c8f78); }
      fo("cil", 0, d / 2 - 3, .25, .25, 0, 9, 0xdddddd, { chao: true }); cx(.85, d / 2 - 3, 1.6, .08, 7.8, 1, 0x3f8f5a, { chao: true });
      break;
    }
    case "governo": {
      cx(0, 0, w, d, 0, .5, 0xd8cfba, { chao: true });
      const v = -d * .12;
      cx(0, v, w * .78, d * .56, 0, 13, 0xe2d5b5); cx(0, v, w * .78 + .4, d * .56 + .4, 13, .6, 0xa8997a);
      const vc = v + d * .28 + 2;
      for (let i = 0; i < 7; i++) fo("cil6", -w * .3 + i * w * .1, vc, 1.1, 1.1, 0, 11.5, 0xf1ead8);
      cx(0, vc, w * .66, 4.5, 11.5, 1.2, 0xe2d5b5);
      fo("cil", 0, v, 9, 9, 13.6, 2, 0xd9cba6); fo("cupula", 0, v, 8.6, 8.6, 15.6, 4.5, 0xcdbf9f);
      for (const s of [-1, 1]) { fo("cil", s * w * .42, d / 2 - 2, .25, .25, 0, 12, 0xdddddd, { chao: true }); cx(s * w * .42 + 1, d / 2 - 2, 2, .08, 10.6, 1.3, 0x3f8f5a, { chao: true }); }
      break;
    }
    case "quartel": {
      muro(w, d, 3.4, 0xa9a08a, .8, 8);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const u = a * (w / 2 - 2), v = b * (d / 2 - 2);
        for (const s of [-1, 1]) for (const t of [-1, 1]) cx(u + s * 1.3, v + t * 1.3, .35, .35, 0, 7, 0x6b6558, { chao: true });
        cx(u, v, 3.6, 3.6, 7, 2.4, 0x7c8060, { chao: true }); cx(u, v, 4.2, 4.2, 9.4, .35, 0x5f6348, { chao: true });
      }
      for (let i = 0; i < 6; i++) {
        const u = -w / 2 + 16 + (i % 3) * 30, v = -d / 2 + 14 + Math.floor(i / 3) * 18;
        cx(u, v, 26, 9, 0, 4.2, 0x8a8d70); fo("prisma", u, v, 26, 9.4, 4.2, 1.8, 0x5f6348);
      }
      cx(w / 2 - 22, d / 2 - 16, 28, 14, 0, 8.5, 0xbdb6a6); cx(w / 2 - 22, d / 2 - 16, 28.4, 14.4, 8.5, .5, 0x8d8573);
      cx(-w / 2 + 30, d / 2 - 18, 36, 14, 5, .5, 0x6b6e58);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) fo("cil", -w / 2 + 14 + i * 11, d / 2 - 18 + s * 6.5, .5, .5, 0, 5, 0x6b6558);
      for (let i = 0; i < 3; i++) { cx(-w / 2 + 20 + i * 10, d / 2 - 18, 2.6, 6.5, 0, 2.6, 0x5f6a3e); cx(-w / 2 + 20 + i * 10, d / 2 - 18 - 2.2, 2.5, 2, 2.6, .9, 0x5f6a3e); }
      cx(0, d * .12, w * .35, d * .22, 0, .2, 0x8a8574, { chao: true });
      fo("cil", 0, d * .12 - d * .11 - 3, .3, .3, 0, 12, 0xdddddd, { chao: true }); cx(1.1, d * .12 - d * .11 - 3, 2.2, .08, 10.4, 1.4, 0x3f8f5a, { chao: true });
      break;
    }
    case "cidadela": {
      const R = w / 2 * .9, n = 16;
      for (let i = 0; i < n; i++) {
        const a0 = i / n * 2 * Math.PI, a1 = (i + 1) / n * 2 * Math.PI;
        const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
        P.push({ f: "caixa", u: (x0 + x1) / 2, v: (z0 + z1) / 2, w: Math.hypot(x1 - x0, z1 - z0) + .6, d: 3, y: 0, h: 11, cor: 0xc9b58e, ra: Math.atan2(z1 - z0, x1 - x0), chao: true });
        if (i % 2 === 0) fo("cil6", x0, z0, 8, 8, 0, 15, 0xbfa982, { chao: true });
      }
      cx(0, R + 4, 10, 12, 0, 14, 0xbfa982, { chao: true });
      cx(-R * .2, -R * .15, 20, 15, 0, 12, 0xcbb890, { chao: true }); cx(-R * .2, -R * .15, 20.5, 15.5, 12, .6, 0xa8997a, { chao: true });
      cx(R * .3, R * .25, 13, 9, 0, 6, 0xe2d5b5, { chao: true }); fo("cupula", R * .3, R * .25, 6, 6, 6, 3, 0xb9c0c4, { chao: true });
      fo("cil6", R * .3 + 7, R * .25 - 4, 2.4, 2.4, 0, 18, 0xe9dfc8, { chao: true });
      break;
    }
    case "fazenda": {
      muro(w, d, 2, 0xc4b08a, .45, 4.5);
      const cor = q3 < .5 ? pedra : concreto, hw = w * .4, hd = d * .42, h = (q2 < .5 ? 1 : 2) * ANDAR + .3;
      cx(-w / 2 + hw / 2 + 1, -d / 2 + hd / 2 + 1, hw, hd, 0, h, cor); telhadoPlano(-w / 2 + hw / 2 + 1, -d / 2 + hd / 2 + 1, hw, hd, h, cor);
      cx(w / 2 - w * .2 - 1, -d / 2 + d * .2 + 1, w * .38, d * .38, 3.4, .35, 0x8a7a5c, { chao: true });
      for (const a of [-1, 1]) for (const b of [-1, 1]) fo("cil", w / 2 - w * .2 - 1 + a * w * .17, -d / 2 + d * .2 + 1 + b * d * .17, .3, .3, 0, 3.4, 0x6b5a40, { chao: true });
      fo("cil", -w / 2 + 3, d / 2 - 3.5, 2.6, 2.6, 0, 2.6, 0x2f3338, { chao: true });
      cx(w * .15, d / 2 - 5, 2, 3.4, 0, 1.6, 0x9a3f2a, { chao: true });
      break;
    }
    case "caixadagua": {
      const k = Math.min(w, d) / 10, cor = q < .5 ? 0xd2cbbb : 0xc8c1b2;
      fo("cil", 0, 0, 3 * k, 3 * k, 0, 17 * k, cor);
      fo("cil", 0, 0, 5.4 * k, 5.4 * k, 14.5 * k, 2.5 * k, cor);
      fo("cil", 0, 0, 9 * k, 9 * k, 17 * k, 4.6 * k, q2 < .5 ? 0xe6e1d4 : 0xd9e0e2);
      fo("cil", 0, 0, 9.2 * k, 9.2 * k, 19.6 * k, .7 * k, 0x6f8596);
      fo("cone", 0, 0, 9.4 * k, 9.4 * k, 21.6 * k, 1.4 * k, tom(cor, .92));
      cx(0, 1.7 * k, .25, .25, 0, 17 * k, 0x6b6558);
      break;
    }
    case "lider": {
      const pedraClara = tom(pedra, 1.04);
      if (e.patio) {
        const t = 5, h = 3 * ANDAR + .5;
        cx(0, -d / 2 + t / 2, w, t, 0, h, pedraClara); cx(0, d / 2 - t / 2, w, t, 0, h - ANDAR, pedraClara);
        cx(-w / 2 + t / 2, 0, t, d - 2 * t, 0, h, pedraClara); cx(w / 2 - t / 2, 0, t, d - 2 * t, 0, h - ANDAR, pedraClara);
        cx(0, 0, w + .2, d + .2, h - 1.2, .5, 0xf2efe6);
        cx(0, 0, w - 2 * t, d - 2 * t, 0, .25, 0xd8ccb0);
        fo("cil6", 0, 0, 2.2, 2.2, 0, 1, 0x8fb7cc);
        fo("cupula", -w / 2 + t / 2, -d / 2 + t / 2, 4.4, 4.4, h, 2.2, 0xb9c0c4);
      } else {
        muro(w, d, 3, tom(pedra, .92), .6, 5);
        for (const s2 of [-1, 1]) cx(s2 * 3, d / 2, 1.2, 1.2, 0, 4, 0xe9dfc8, { chao: true });
        const hw = w * .52, hd = d * .42, vh = -d / 2 + hd / 2 + 1.5, h = 2 * ANDAR + .6;
        cx(0, vh, hw, hd, 0, h, pedraClara); cx(0, vh, hw + .3, hd + .3, h, .6, tom(pedraClara, .9));
        cx(0, vh, hw + .15, hd + .15, ANDAR, .45, 0xf2efe6);
        for (let i = 0; i < 5; i++) fo("cil6", -hw * .4 + i * hw * .2, vh + hd / 2 + 1.6, .7, .7, 0, ANDAR, 0xf1ead8);
        cx(0, vh + hd / 2 + 1.6, hw * .9, 3.4, ANDAR, .5, pedraClara);
        cx(-w / 2 + w * .17 + 1.5, d / 2 - d * .2 - 1.5, w * .3, d * .3, 0, 4.6, tom(pedra, .98));
        cx(-w / 2 + w * .17 + 1.5, d / 2 - d * .2 - 1.5, w * .3 + .3, d * .3 + .3, 4.6, .4, tom(pedra, .88));
        for (let i = 0; i < 2; i++) cx(w * .2 + i * 3.2, d / 2 - 5, 2, 4.4, 0, 1.5, CORES_CARRO[(Math.floor(q3 * 6) + i * 2) % CORES_CARRO.length], { chao: true });
        caixaDagua(hw * .3, vh - hd * .2, h);
      }
      break;
    }
  }
  return P;
}

/* Monta as peças no lugar certo do terreno: corpos descem até o chão mais baixo embaixo deles */
function montaEdificio(reg, e, L) {
  const B = alturaEm(reg, e.x, e.z); e.base = B; let topo = B;
  e._lote = L; e._v0 = L.v;
  const minimo = (wx, wz, ww, dd, ang) => {
    let m = Infinity;
    for (const [i, j] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) { const [u, v] = gira(i * ww, j * dd, ang); m = Math.min(m, alturaEm(reg, wx + u, wz + v)); }
    return m;
  };
  for (const p of partesDe(e)) {
    const [ou, ov] = gira(p.u || 0, p.v || 0, e.a), wx = e.x + ou, wz = e.z + ov, ang = e.a + (p.ra || 0);
    let bot, top;
    if (p.chao) { const g = alturaEm(reg, wx, wz); bot = (p.y ? g + p.y : Math.min(g, minimo(wx, wz, p.w, p.d, ang)) - .4); top = g + p.y + p.h; }
    else if (!p.y) { bot = Math.min(B, minimo(wx, wz, p.w, p.d, ang)) - .4; top = B + p.h; }
    else { bot = B + p.y; top = bot + p.h; }
    poeForma(L, FORMAS[p.f], wx, bot, wz, p.w, top - bot, p.d, ang, p.cor, e.id);
    if (top > topo) topo = top;
  }
  e._v1 = L.v; e.topo = topo;
}

function malhasDosEdificios(reg) {
  const lotes = new Map(), TAM = 200;
  for (const e of reg.edificios) {
    const k = Math.floor((e.x + METADE) / TAM) * 1000 + Math.floor((e.z + METADE) / TAM);
    let L = lotes.get(k); if (!L) { L = criaLote(); lotes.set(k, L); }
    montaEdificio(reg, e, L);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const malhas = [];
  for (const L of lotes.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(L.p.slice(0, L.v * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(L.n.slice(0, L.v * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(L.c.slice(0, L.v * 3), 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
    m.userData.lote = L; L.malha = m; L.cores0 = L.c.slice(0, L.v * 3);
    L.p = L.n = L.c = null;   // libera a memória temporária
    malhas.push(m);
  }
  return malhas;
}

/* Pinta um edifício com a cor da facção (mistura com a cor original) */
/* cor final do prédio: cor original, puxada para a cor do dono, e escurecida pelo dano */
function repinta(e) {
  const d = e.dono;
  pintaEdificio(e, d ? d.cor : 0xffffff, d && !d.governo ? .45 : 0, e.destruido ? .78 : (e.dano || 0) * .5);
  if (e.destruido && !e._achatado) achata(e);
}
/* obra pronta: puxa a cor do prédio para verde (fazenda) ou marrom (armazém) */
function retingeObra(e) {
  const L = e._lote; if (!L || !L.cores0) return;
  const cor = e.tipo === "fazenda" ? [.42, .6, .3] : e.tipo === "armazem" ? [.6, .48, .32] : null;
  if (cor) for (let i = e._v0 * 3; i < e._v1 * 3; i += 3) for (let c = 0; c < 3; c++) L.cores0[i + c] = L.cores0[i + c] * .45 + cor[c] * .55;
  repinta(e);
}
function achata(e) {
  const L = e._lote; if (!L || !L.malha) return;
  e._achatado = true;
  const pos = L.malha.geometry.attributes.position, a = pos.array, base = e.base;
  for (let i = e._v0; i < e._v1; i++) { const y = a[i * 3 + 1]; a[i * 3 + 1] = base + (y - base) * .28; }
  pos.needsUpdate = true; L.malha.geometry.computeBoundingSphere();
}
function pintaEdificio(e, cor, k, escuro) {
  const m = 1 - (escuro || 0);
  const L = e._lote; if (!L || !L.malha) return;
  const at = L.malha.geometry.attributes.color, a = at.array, o = L.cores0;
  const cr = ((cor >> 16) & 255) / 255, cg = ((cor >> 8) & 255) / 255, cb = (cor & 255) / 255;
  for (let i = e._v0 * 3; i < e._v1 * 3; i += 3) {
    a[i] = (o[i] * (1 - k) + cr * k) * m; a[i + 1] = (o[i + 1] * (1 - k) + cg * k) * m; a[i + 2] = (o[i + 2] * (1 - k) + cb * k) * m;
  }
  at.needsUpdate = true;
}

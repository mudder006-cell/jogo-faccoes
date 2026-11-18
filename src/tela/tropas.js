"use strict";
/* ============================================================
   SOLDADOS E TIROS EM 3D
   Todos os soldados do mapa são desenhados de uma vez (instâncias).
   O corpo leva a cor da facção; feridos e mortos ficam deitados;
   um anel no chão marca cada esquadrão. Tiros viram traçantes e
   granadas viram explosões.
   ============================================================ */
const MAX_FUMACA = 240, MAX_SOLDADOS = 1200, ESCALA_SOLDADO = 2.1, MAX_TRACANTES = 300, MAX_EXPLOSOES = 40;
function criaTropas() {
  const grupo = new THREE.Group();
  const capacete = new THREE.SphereGeometry(.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); capacete.translate(0, 1.62, 0);
  const partes = [
    [new THREE.BoxGeometry(.42, .8, .26).translate(0, .4, 0), 0x4a4a3a, false],
    [new THREE.BoxGeometry(.52, .66, .32).translate(0, 1.13, 0), 0xffffff, true],
    [new THREE.IcosahedronGeometry(.16, 0).translate(0, 1.58, 0), 0xc89a72, false],
    [capacete, 0x55603f, false],
    [new THREE.BoxGeometry(.08, .08, .95).translate(.2, 1.12, .32), 0x2a2a2a, false]
  ];
  const malhas = partes.map(([g, cor, colorido]) => {
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: cor }), MAX_SOLDADOS);
    im.count = 0; im.castShadow = true; im.frustumCulled = false; im.userData.colorido = colorido;
    if (colorido) im.setColorAt(0, new THREE.Color(0xffffff));
    grupo.add(im); return im;
  });
  // disco na cor da facção embaixo de cada soldado: ajuda a achar quem é quem
  const discos = new THREE.InstancedMesh(new THREE.CircleGeometry(.75, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85, depthWrite: false }), MAX_SOLDADOS);
  discos.count = 0; discos.frustumCulled = false; discos.renderOrder = 2; discos.setColorAt(0, new THREE.Color(0xffffff)); grupo.add(discos);
  const geoAnel = new THREE.RingGeometry(4.2, 5, 28); geoAnel.rotateX(-Math.PI / 2);
  const aneis = new THREE.InstancedMesh(geoAnel, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }), 400);
  aneis.count = 0; aneis.frustumCulled = false; aneis.renderOrder = 2; aneis.setColorAt(0, new THREE.Color(0xffffff));
  grupo.add(aneis);
  // traçantes: segmentos curtos que somem rápido
  const tPos = new Float32Array(MAX_TRACANTES * 6), tCor = new Float32Array(MAX_TRACANTES * 6);
  const gT = new THREE.BufferGeometry();
  gT.setAttribute("position", new THREE.BufferAttribute(tPos, 3)); gT.setAttribute("color", new THREE.BufferAttribute(tCor, 3));
  const tracantes = new THREE.LineSegments(gT, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .95 }));
  tracantes.frustumCulled = false; grupo.add(tracantes);
  const explosoes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .75, depthWrite: false }), MAX_EXPLOSOES);
  explosoes.count = 0; explosoes.frustumCulled = false; grupo.add(explosoes);
  // clarão (núcleo claro) e fumaça (bolas cinza que sobem e somem devagar)
  const clarao = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: .95, depthWrite: false }), MAX_EXPLOSOES);
  clarao.count = 0; clarao.frustumCulled = false; grupo.add(clarao);
  const fumaca = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x8a847a, transparent: true, opacity: .55, depthWrite: false }), MAX_FUMACA);
  fumaca.count = 0; fumaca.frustumCulled = false; grupo.add(fumaca);
  // veículos de logística: carroceria na cor da facção + cabine escura (+ carga quando leva algo)
  const MAXV = 120;
  const vCorpo = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 1.2, 4.8).translate(0, 1.0, -.4), new THREE.MeshLambertMaterial({ color: 0xffffff }), MAXV);
  const vCab = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 1.1, 1.6).translate(0, 2.05, 1.3), new THREE.MeshLambertMaterial({ color: 0x2c3036 }), MAXV);
  const vCarga = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, .9, 2.6).translate(0, 2.05, -1.1), new THREE.MeshLambertMaterial({ color: 0x8a7350 }), MAXV);
  for (const m of [vCorpo, vCab, vCarga]) { m.count = 0; m.castShadow = true; m.frustumCulled = false; grupo.add(m); }
  vCorpo.setColorAt(0, new THREE.Color(0xffffff));
  return { grupo, malhas, aneis, discos, vCorpo, vCab, vCarga, D: new THREE.Matrix4(), Z: new THREE.Matrix4().makeScale(0, 0, 0), corpo: malhas[1], soldadoDe: [], M: new THREE.Matrix4(), R: new THREE.Matrix4(), C: new THREE.Color(),
    S: new THREE.Vector3(ESCALA_SOLDADO, ESCALA_SOLDADO, ESCALA_SOLDADO), vivos: [], tPos, tCor, gT, tracantes, explosoes, listaExp: [], clarao, fumaca, listaFum: [] };
}

function visivelNoMapa(s, P) {
  if (s.vida === "ok") return true;
  if (s.vida === "ferido") return true;
  if (s.vida === "morto") return P.tempo - s.caiuEm < 180;
  if (s.vida === "rendido") return P.tempo - s.caiuEm < 20;
  return false;
}

function atualizaTropas(T, P, reg, agora) {
  let n = 0, na = 0;
  T.soldadoDe.length = 0;
  for (const s of P.soldados) {
    if (n >= MAX_SOLDADOS || !visivelNoMapa(s, P)) continue;
    const y = alturaEm(reg, s.x, s.z), rot = Math.atan2(Math.cos(s.rumo), Math.sin(s.rumo));
    T.M.makeRotationY(rot);
    if (s.vida === "ferido" || s.vida === "morto") { T.R.makeRotationX(-Math.PI / 2); T.M.multiply(T.R); }
    T.M.scale(T.S); T.M.setPosition(s.x, y + (s.vida === "ok" || s.vida === "rendido" ? 0 : .3), s.z);
    T.C.setHex(s.vida === "morto" ? 0x6a6a64 : s.vida === "rendido" ? 0xf2f2ee : s.faccao.cor);
    for (const m of T.malhas) { m.setMatrixAt(n, m === T.malhas[4] && !s.arma ? T.Z : T.M); if (m.userData.colorido) m.setColorAt(n, T.C); }
    T.D.makeScale(ESCALA_SOLDADO, 1, ESCALA_SOLDADO); T.D.setPosition(s.x, y + .25, s.z); T.discos.setMatrixAt(n, T.D);
    if (s.vida === "ok") T.C.setHex(s.faccao.cor); T.discos.setColorAt(n, T.C);
    T.soldadoDe[n] = s; n++;
  }
  for (const sq of P.esquadroes) {
    if (na >= 400 || !ativos(sq).length) continue;
    const [cx, cz] = centroDoEsquadrao(sq);
    T.M.makeTranslation(cx, alturaEm(reg, cx, cz) + .3, cz);
    T.aneis.setMatrixAt(na, T.M); T.C.setHex(sq.combate ? 0xff5a3a : sq.faccao.cor); T.aneis.setColorAt(na, T.C); na++;
  }
  T.discos.count = n; T.discos.instanceMatrix.needsUpdate = true; if (T.discos.instanceColor) T.discos.instanceColor.needsUpdate = true;
  for (const m of T.malhas) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  T.aneis.count = na; T.aneis.instanceMatrix.needsUpdate = true; if (T.aneis.instanceColor) T.aneis.instanceColor.needsUpdate = true;
  // veículos (e destroços)
  let nv = 0, nc2 = 0; T.veiculoDe = [];
  const poeVeiculo = (x, z, rumo, nivel, cor, comCarga) => {
    if (nv >= 120) return;
    const esc = .9 + nivel * .15, rot = Math.atan2(Math.cos(rumo), Math.sin(rumo));
    T.M.makeRotationY(rot); T.M.scale(new THREE.Vector3(esc, esc, esc)); T.M.setPosition(x, alturaEm(reg, x, z), z);
    T.vCorpo.setMatrixAt(nv, T.M); T.vCab.setMatrixAt(nv, T.M); T.C.setHex(cor); T.vCorpo.setColorAt(nv, T.C);
    if (comCarga) T.vCarga.setMatrixAt(nc2++, T.M);
    nv++;
  };
  for (const f of P.faccoes) for (const v of f.veiculos || []) { T.veiculoDe[nv] = v; poeVeiculo(v.x, v.z, v.rumo, v.nivel, v.estado === "abandonado" ? 0x8a8a84 : f.cor, !cargaVazia(v.carga)); }
  for (const d of P.destrocos || []) poeVeiculo(d.x, d.z, d.rumo, d.nivel, 0x1e1e1c, false);
  T.vCorpo.count = nv; T.vCab.count = nv; T.vCarga.count = nc2;
  for (const m of [T.vCorpo, T.vCab, T.vCarga]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }

  // tiros novos da simulação
  for (const ef of P.efeitos) {
    const ya = alturaEm(reg, ef.ax, ef.az) + 2, yb = alturaEm(reg, ef.bx, ef.bz) + (ef.tipo === "granada" ? .5 : 1.4);
    T.vivos.push({ ef, ya, yb, nasce: agora, vida: ef.tipo === "granada" ? .35 : .12 });
    if (ef.tipo === "granada") {
      const g = ef.arma === "rpg" ? 1.4 : 1;
      T.listaExp.push({ x: ef.bx, y: yb, z: ef.bz, nasce: agora + .3, g });
      for (let i = 0; i < 4; i++) T.listaFum.push({ x: ef.bx + (Math.random() - .5) * 3 * g, y: yb, z: ef.bz + (Math.random() - .5) * 3 * g, nasce: agora + .35 + i * .08, vida: 4 + Math.random() * 2, g: g * (.8 + Math.random() * .5) });
    }
  }
  P.efeitos.length = 0;
  T.vivos = T.vivos.filter(t => agora - t.nasce < t.vida).slice(-MAX_TRACANTES);
  let k = 0;
  for (const t of T.vivos) {
    const f = limita((agora - t.nasce) / t.vida, 0, 1), e = t.ef;
    const ax = e.ax + (e.bx - e.ax) * f * .7, az = e.az + (e.bz - e.az) * f * .7, ay = t.ya + (t.yb - t.ya) * f * .7;
    const bx = e.ax + (e.bx - e.ax) * Math.min(1, f * .7 + .3), bz = e.az + (e.bz - e.az) * Math.min(1, f * .7 + .3), by = t.ya + (t.yb - t.ya) * Math.min(1, f * .7 + .3);
    T.tPos.set([ax, ay, az, bx, by, bz], k * 6);
    T.tCor.set([1, .85, .45, 1, .95, .7], k * 6);
    k++;
  }
  T.gT.setDrawRange(0, k * 2); T.gT.attributes.position.needsUpdate = true; T.gT.attributes.color.needsUpdate = true;
  T.listaExp = T.listaExp.filter(x => agora - x.nasce < .7).slice(-MAX_EXPLOSOES);
  const longe = Math.max(1, cam.dist / 500);   // de longe, a explosão aparece maior para dar para ver
  let ne = 0, nc = 0;
  for (const x of T.listaExp) {
    const f = (agora - x.nasce) / .7; if (f < 0) continue;
    const r = (2 + f * 6) * x.g * longe; T.M.makeScale(r, r * .8, r); T.M.setPosition(x.x, x.y + r * .3, x.z); T.explosoes.setMatrixAt(ne++, T.M);
    if (f < .35) { const c = (1.5 + f * 9) * x.g * longe; T.M.makeScale(c, c, c); T.M.setPosition(x.x, x.y + c * .4, x.z); T.clarao.setMatrixAt(nc++, T.M); }
  }
  T.clarao.count = nc; T.clarao.instanceMatrix.needsUpdate = true;
  T.listaFum = T.listaFum.filter(x => agora - x.nasce < x.vida).slice(-MAX_FUMACA);
  let nf = 0;
  for (const x of T.listaFum) {
    const f = (agora - x.nasce) / x.vida; if (f < 0) continue;
    const r = (1.5 + f * 4) * x.g * (1 - Math.max(0, f - .7) / .3) * Math.min(longe, 2);
    T.M.makeScale(r, r * .85, r); T.M.setPosition(x.x, x.y + 1.5 + f * 7 * x.g, x.z); T.fumaca.setMatrixAt(nf++, T.M);
  }
  T.fumaca.count = nf; T.fumaca.instanceMatrix.needsUpdate = true;
  T.explosoes.count = ne; T.explosoes.instanceMatrix.needsUpdate = true;
}

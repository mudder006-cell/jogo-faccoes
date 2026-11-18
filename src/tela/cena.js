"use strict";
/* ============================================================
   CENA 3D: mapa, câmera, seleção no mapa, rótulos e marcadores
   ============================================================ */
const $ = id => document.getElementById(id);
let renderer, cena, camera, sol, raio, anelFoco, anelEscolha, caixaFoco, caixaEscolha, linhaRota, linhaPrevia;
let regiao = null, partida = null, camada = null, tropas = null, geoTerreno = null;
let grupoMapa = null, alvosClique = [], rotulos = [], marcadores = [], vTmp, ponteiro, ultimaCamada = 0;
const cam = { x: 0, z: 0, y: 30, dist: 1500, giro: .5, incl: .9, ax: 0, az: 0, ad: 1500 };
const corCss = c => "#" + c.toString(16).padStart(6, "0");

/* ---------- ícones ---------- */
const ICONE_TIPO = { casa: "home", predio: "apartment", loja: "storefront", mercado: "store", mesquita: "mosque", armazem: "warehouse",
  fabrica: "factory", oficina: "build", posto: "local_gas_station", delegacia: "local_police", hospital: "local_hospital", escola: "school",
  governo: "account_balance", quartel: "military_tech", cidadela: "castle", fazenda: "agriculture", caixadagua: "water_drop", lider: "workspace_premium" };
const ICONE_ZONA = { velha: "castle", bairro: "location_city", vila: "cottage", rural: "landscape" };
const ICONE_RECURSO = { dinheiro: "payments", influencia: "campaign", comida: "grain" };
const ICONE_ATR = { pontaria: "my_location", reacao: "bolt", coragem: "favorite", disciplina: "rule", lideranca: "military_tech" };
/* ícones desenhados (embutidos na página em ICONES pelo montar.py) */
const icoFaltando = new Set();
function ico(nome, classe) {
  const s = document.createElement("span"); s.className = "ico" + (classe ? " " + classe : ""); s.setAttribute("aria-hidden", "true");
  const d = ICONES[nome];
  if (!d && !icoFaltando.has(nome)) { icoFaltando.add(nome); console.warn("ícone sem desenho: " + nome); }
  s.innerHTML = '<svg viewBox="0 0 24 24">' + (d || '<circle cx="12" cy="12" r="6"/>') + "</svg>";
  return s;
}

/* ---------- montagem do mapa ---------- */
function montaMapa(reg) {
  const g = new THREE.Group();
  const terreno = malhaTerreno(reg, renderer); geoTerreno = terreno.geometry; g.add(terreno);
  const matFora = new THREE.MeshLambertMaterial({ color: 0xc9b88f, side: THREE.DoubleSide });
  const F = MUNDO * 3;
  for (const [x, z, w, d] of [[0, -METADE - F / 2, MUNDO + 2 * F, F], [0, METADE + F / 2, MUNDO + 2 * F, F], [-METADE - F / 2, 0, F, MUNDO], [METADE + F / 2, 0, F, MUNDO]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), matFora); p.position.set(x, 39.4, z); g.add(p);
  }
  const L = reg.L, pos = [];
  const borda = (i0, j0, di, dj) => {
    for (let k = 0; k < reg.N; k++) {
      const a = [i0 + di * k, j0 + dj * k], b = [i0 + di * (k + 1), j0 + dj * (k + 1)];
      const pa = [-METADE + a[0] * GRADE, reg.H[a[1] * L + a[0]], -METADE + a[1] * GRADE], pb = [-METADE + b[0] * GRADE, reg.H[b[1] * L + b[0]], -METADE + b[1] * GRADE];
      pos.push(...pa, pa[0], 0, pa[2], ...pb, ...pb, pa[0], 0, pa[2], pb[0], 0, pb[2]);
    }
  };
  borda(0, 0, 1, 0); borda(0, reg.N, 1, 0); borda(0, 0, 0, 1); borda(reg.N, 0, 0, 1);
  const gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gp.computeVertexNormals();
  g.add(new THREE.Mesh(gp, new THREE.MeshLambertMaterial({ color: 0x9c8562, side: THREE.DoubleSide })));
  alvosClique = malhasDosEdificios(reg);
  for (const m of alvosClique) g.add(m);
  g.add(malhasDaVegetacao(reg));
  return g;
}
function descarta(obj) {
  obj.traverse(o => {
    if (o.geometry && o.geometry !== geoTerreno) o.geometry.dispose();
    if (o.material) { const l = Array.isArray(o.material) ? o.material : [o.material]; for (const m of l) { if (m.map) m.map.dispose(); m.dispose(); } }
  });
}

function criaAnel(cor) {
  const ga = new THREE.RingGeometry(.9, 1, 48); ga.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(ga, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: .95, depthTest: false, depthWrite: false }));
  m.visible = false; m.renderOrder = 3; return m;
}
function criaCaixaSel(cor) {
  const ge = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0));
  const m = new THREE.LineSegments(ge, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: .9, depthTest: false }));
  m.visible = false; m.renderOrder = 4; return m;
}
function marca(anel, caixa, e) {
  if (!e) { anel.visible = caixa.visible = false; return; }
  anel.visible = caixa.visible = true;
  anel.scale.setScalar(Math.max(e.w, e.d) * .62 + 1.5); anel.position.set(e.x, e.base + .6, e.z);
  caixa.scale.set(e.w + .6, e.topo - e.base + 1.4, e.d + .6); caixa.position.set(e.x, e.base - .6, e.z); caixa.rotation.y = -e.a;
}
function marcaBase(fac) {
  const e = fac.base, g = new THREE.Group();
  const [u, v] = gira(e.w * .3, e.d * .3, e.a);
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 14, 6), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
  mastro.position.set(e.x + u, e.topo + 7, e.z + v); g.add(mastro);
  const band = new THREE.Mesh(new THREE.BoxGeometry(5, 3, .15), new THREE.MeshLambertMaterial({ color: fac.cor }));
  band.position.set(e.x + u + 2.6, e.topo + 12.4, e.z + v); g.add(band);
  grupoMapa.add(g);
}
/* Linhas desenhadas no chão (rota do esquadrão, prévia da linha de frente) */
function poeLinha(linha, pts, altura) {
  const a = [];
  for (const [x, z] of pts) a.push(x, alturaEm(regiao, x, z) + (altura || 1.2), z);
  linha.geometry.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
  linha.geometry.computeBoundingSphere();
  linha.visible = pts.length > 1;
}

/* ---------- rótulos e marcadores em HTML que acompanham o mapa ---------- */
function criaRotulo(classe, conteudo, x, y, z, opcoes) {
  const d = document.createElement("div");
  d.className = "rot " + classe;
  if (typeof conteudo === "string") d.textContent = conteudo; else d.appendChild(conteudo);
  $("rotulos").appendChild(d);
  const r = Object.assign({ d, p: new THREE.Vector3(x, y, z), perto: 0 }, opcoes);
  if (r.clique) { d.classList.add("clicavel"); d.addEventListener("click", ev => { ev.stopPropagation(); r.clique(); }); }
  rotulos.push(r); return r;
}
function atualizaRotulos() {
  const W = window.innerWidth, H = window.innerHeight;
  for (const r of rotulos) {
    if (r.atualiza && r.atualiza(r) === false) { r.d.style.display = "none"; continue; }
    if (r.perto && cam.dist > r.perto && !r.sempre) { r.d.style.display = "none"; continue; }
    vTmp.copy(r.p).project(camera);
    if (vTmp.z > 1 || vTmp.z < -1 || Math.abs(vTmp.x) > 1.15 || Math.abs(vTmp.y) > 1.15) { r.d.style.display = "none"; continue; }
    r.d.style.display = "";
    r.d.style.left = ((vTmp.x + 1) / 2 * W) + "px";
    r.d.style.top = ((1 - vTmp.y) / 2 * H) + "px";
  }
}

/* ---------- câmera: segue o relevo e não entra no morro ---------- */
function atualizaCamera() {
  cam.x += (cam.ax - cam.x) * .14; cam.z += (cam.az - cam.z) * .14; cam.dist += (cam.ad - cam.dist) * .14;
  if (regiao) cam.y += (alturaEm(regiao, cam.x, cam.z) - cam.y) * .1;
  const h = Math.sin(cam.incl) * cam.dist, r = Math.cos(cam.incl) * cam.dist;
  let px = cam.x + Math.sin(cam.giro) * r, pz = cam.z + Math.cos(cam.giro) * r, py = cam.y + h;
  if (regiao) py = Math.max(py, alturaEm(regiao, px, pz) + 6);
  camera.position.set(px, py, pz);
  camera.lookAt(cam.x, cam.y, cam.z);
  const S = limita(cam.dist * .75, 140, 1100), sc = sol.shadow.camera;
  if (Math.abs(sc.right - S) > S * .08) { sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.far = S * 2 + 1600; sc.updateProjectionMatrix(); }
  sol.target.position.set(cam.x, cam.y, cam.z);
  sol.position.set(cam.x - 420, cam.y + 800, cam.z + 300);
  sol.target.updateMatrixWorld();
}
function moveCam(dxTela, dzTela) {
  const s = Math.sin(cam.giro), c = Math.cos(cam.giro);
  cam.ax += dxTela * c + dzTela * s; cam.az += -dxTela * s + dzTela * c;
  cam.ax = limita(cam.ax, -METADE, METADE); cam.az = limita(cam.az, -METADE, METADE);
}
function zoom(f) { cam.ad = limita(cam.ad * f, 22, 2700); }
function vaiPara(x, z, dist) { cam.ax = x; cam.az = z; if (dist) cam.ad = dist; }

/* ---------- o que está embaixo do cursor ---------- */
function raioDaTela(cx, cy) {
  ponteiro.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
}
function edificioSob(cx, cy) {
  if (!regiao || !alvosClique.length) return null;
  raioDaTela(cx, cy);
  const hit = raio.intersectObjects(alvosClique, false)[0];
  if (!hit) return null;
  return regiao.edificios[hit.object.userData.lote.donos[hit.faceIndex]] || null;
}
function soldadoSob(cx, cy) {
  if (!tropas || !tropas.corpo.count) return null;
  raioDaTela(cx, cy);
  const hit = raio.intersectObject(tropas.corpo, false)[0];
  return hit && hit.instanceId != null ? tropas.soldadoDe[hit.instanceId] : null;
}
/* Ponto do chão embaixo do cursor: anda pelo raio até entrar no relevo */
function chaoSob(cx, cy) {
  if (!regiao) return null;
  raioDaTela(cx, cy);
  const o = raio.ray.origin, d = raio.ray.direction;
  let t0 = 0, passo = 6;
  for (let t = passo; t < 9000; t += passo) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (Math.abs(x) > METADE + 200 || Math.abs(z) > METADE + 200) { if (d.y >= 0) return null; }
    if (y <= alturaEm(regiao, x, z)) {
      let a = t0, b = t;
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (o.y + d.y * m <= alturaEm(regiao, o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
      return [limita(o.x + d.x * b, -METADE, METADE), limita(o.z + d.z * b, -METADE, METADE)];
    }
    t0 = t; passo = Math.min(30, passo * 1.08);
  }
  return null;
}
function projetaNaTela(x, y, z) { vTmp.set(x, y, z).project(camera); return [(vTmp.x + 1) / 2 * window.innerWidth, (1 - vTmp.y) / 2 * window.innerHeight, vTmp.z]; }

// Teste sem navegador: imita o three.js e o canvas só o bastante para rodar a montagem e achar erros.
const fs = require('fs');
function geo() { const n = 36, p = new Float32Array(n * 3).map(() => Math.random() - .5);
  const g = { index: null, attributes: { position: { array: p, count: n }, normal: { array: new Float32Array(n * 3).fill(.5), count: n } } };
  for (const f of ['translate', 'rotateX', 'rotateY', 'rotateZ', 'scale']) g[f] = () => g;
  g.toNonIndexed = () => g; g.computeVertexNormals = () => {}; return g; }
class BG { constructor() { this.attributes = {}; } setAttribute(k, a) { this.attributes[k] = a; } setIndex(i) { this.index = i; } computeVertexNormals() {} computeBoundingSphere() {} }
const ctx = new Proxy({}, { get: (t, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
global.document = { createElement: () => ({ getContext: () => ctx }) };
const stub = class { constructor() { this.position = { set() {} }; this.rotation = {}; this.scale = { set() {}, setScalar() {} }; this.children = []; } add(o) { this.children.push(o); } };
global.THREE = { BoxGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, SphereGeometry: geo, IcosahedronGeometry: geo, PlaneGeometry: geo,
  BufferGeometry: BG, BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
  Mesh: class extends stub { constructor(g, m) { super(); this.geometry = g; this.material = m; this.userData = {}; } },
  InstancedMesh: class extends stub { constructor(g, m, n) { super(); this.n = n; this.set = 0; } setMatrixAt() { this.set++; } setColorAt() {} },
  Group: stub, MeshLambertMaterial: class {}, CanvasTexture: class {},
  Matrix4: class { makeScale() { return this; } setPosition() { return this; } }, Color: class { setHex() { return this; } multiplyScalar() { return this; } } };
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + '\nreturn { geraRegiao, preparaFormas, malhasDosEdificios, malhaTerreno, malhasDaVegetacao, partesDe, pintaEdificio };')();
G.preparaFormas();
for (const sd of (process.argv[2] || 'A,B2,K7,FUNDO').split(',')) {
  const t0 = Date.now(); const reg = G.geraRegiao(sd); const t1 = Date.now();
  const malhas = G.malhasDosEdificios(reg); const t2 = Date.now();
  let verts = 0, nan = 0; for (const m of malhas) { const a = m.geometry.attributes.position.array; verts += a.length / 3; for (const v of a) if (!isFinite(v)) nan++; }
  const ter = G.malhaTerreno(reg, { capabilities: { maxTextureSize: 4096, getMaxAnisotropy: () => 8 } }); const t3 = Date.now();
  const veg = G.malhasDaVegetacao(reg); const t4 = Date.now();
  const semTopo = reg.edificios.filter(e => !isFinite(e.topo) || e.topo <= e.base).length;
  G.pintaEdificio(reg.edificios[5], 0xff0000, .5);
  // peças por tipo
  const porTipo = {}; for (const e of reg.edificios) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + G.partesDe(e).length;
  console.log(sd, 'gerar', t1 - t0, 'ms, prédios', t2 - t1, 'ms, terreno', t3 - t2, 'ms, vegetação', t4 - t3, 'ms | malhas', malhas.length, 'vértices', verts, 'NaN', nan, 'sem topo', semTopo, '| árvores', reg.arvores.length);
}

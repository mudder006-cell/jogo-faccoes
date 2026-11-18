"use strict";
/* ============================================================
   TERRENO EM 3D
   O relevo é uma malha de 8 em 8 m. As cores (chão, campos, rio, ruas)
   são pintadas numa imagem grande, esticada por cima do relevo.
   ============================================================ */
function pintaTerreno(reg, T) {
  const cv = document.createElement("canvas"); cv.width = cv.height = T;
  const ctx = cv.getContext("2d");
  const s = T / MUNDO, X = x => (x + METADE) * s, Z = z => (z + METADE) * s;
  const nd = reg.nCor;

  // 1) chão: areia, terra, rocha nas encostas, verde perto do rio
  const B = 1024, base = document.createElement("canvas"); base.width = base.height = B;
  const bctx = base.getContext("2d"), img = bctx.createImageData(B, B), px = img.data;
  const mix = (c, alvo, t) => { c[0] += (alvo[0] - c[0]) * t; c[1] += (alvo[1] - c[1]) * t; c[2] += (alvo[2] - c[2]) * t; };
  const c = [0, 0, 0];
  for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) {
    const x = -METADE + (i + .5) * MUNDO / B, z = -METADE + (j + .5) * MUNDO / B;
    const h = alturaEm(reg, x, z), g = declive(reg, x, z), dr = distRio(reg, x, z);
    const n = fbm(nd, x / 60, z / 60, 3), n2 = nd(x / 420 + 50, z / 420 - 20);
    c[0] = 208; c[1] = 189; c[2] = 146;
    mix(c, [176, 150, 110], limita(.45 - n2, 0, 1) * .55);
    mix(c, [152, 128, 98], suave(.16, .5, g.m) * .85);
    mix(c, [218, 205, 172], suave(110, 175, h) * .5);
    mix(c, [124, 136, 82], (1 - suave(reg.rio.larg + 4, 150, dr)) * .7);
    const k = 1 + n * .13, o = (j * B + i) * 4;
    px[o] = c[0] * k; px[o + 1] = c[1] * k; px[o + 2] = c[2] * k; px[o + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(base, 0, 0, T, T);

  // pedrinhas e moitas secas
  const r = criaSorteio(reg.semente + "-chao");
  ctx.fillStyle = "rgba(105,90,66,.28)";
  for (let i = 0; i < 60000; i++) { const x = r.entre(-METADE, METADE), z = r.entre(-METADE, METADE), t = r.entre(.6, 1.8) * s; ctx.fillRect(X(x), Z(z), t, t); }
  ctx.fillStyle = "rgba(235,222,190,.25)";
  for (let i = 0; i < 30000; i++) { const x = r.entre(-METADE, METADE), z = r.entre(-METADE, METADE), t = r.entre(.6, 1.6) * s; ctx.fillRect(X(x), Z(z), t, t); }

  const retangulo = (o, folga) => {
    ctx.save(); ctx.translate(X(o.x), Z(o.z)); ctx.rotate(o.a);
    ctx.fillRect(-(o.hw + folga) * s, -(o.hd + folga) * s, (o.hw + folga) * 2 * s, (o.hd + folga) * 2 * s);
    ctx.restore();
  };
  // 2) campos, com sulcos
  for (const cp of reg.campos) {
    const o = cp.o;
    ctx.save(); ctx.translate(X(o.x), Z(o.z)); ctx.rotate(o.a);
    ctx.fillStyle = cp.cor; ctx.fillRect(-o.hw * s, -o.hd * s, o.hw * 2 * s, o.hd * 2 * s);
    if (cp.tipo !== "olival" && cp.tipo !== "pomar") {
      ctx.strokeStyle = "rgba(60,48,30,.18)"; ctx.lineWidth = Math.max(1, .8 * s); ctx.beginPath();
      const longo = o.hw >= o.hd;
      for (let t = -(longo ? o.hd : o.hw) + 1.5; t < (longo ? o.hd : o.hw) - .5; t += 2.4) {
        if (longo) { ctx.moveTo(-o.hw * s, t * s); ctx.lineTo(o.hw * s, t * s); } else { ctx.moveTo(t * s, -o.hd * s); ctx.lineTo(t * s, o.hd * s); }
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(95,78,52,.45)"; ctx.lineWidth = Math.max(1, .9 * s); ctx.strokeRect(-o.hw * s, -o.hd * s, o.hw * 2 * s, o.hd * 2 * s);
    ctx.restore();
  }

  // 3) chão de cidade: a cidade velha toda em pedra; em volta dos outros edifícios, chão batido
  ctx.fillStyle = "#a99a7d"; ctx.beginPath();
  for (let k = 0; k <= 72; k++) { const a = k / 72 * 2 * Math.PI, rr = raioVelha(reg, a) + 4; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; k ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z)); }
  ctx.fill();
  for (const e of reg.edificios) {
    if (e.velha && e.lugar === reg.cidade) continue;
    ctx.fillStyle = e.lugar && e.lugar.tipo === "vila" ? "#b4a17c" : e.tipo === "armazem" || e.tipo === "fabrica" ? "#a9a497" : "#b9ad93";
    retangulo(e.o, e.murada || e.tipo === "quartel" ? 1 : 3.5);
  }
  // cemitérios: chão claro com fileiras de lápides
  for (const o of reg.cemiterios) {
    ctx.fillStyle = "#c2b79e"; retangulo(o, 0);
    ctx.save(); ctx.translate(X(o.x), Z(o.z)); ctx.rotate(o.a); ctx.fillStyle = "#e2ddd0";
    for (let u = -o.hw + 3; u < o.hw - 2; u += 3) for (let v = -o.hd + 3; v < o.hd - 2; v += 2.4) if (r() < .8) ctx.fillRect(u * s, v * s, 1.2 * s, 1.8 * s);
    ctx.strokeStyle = "#8d8070"; ctx.lineWidth = .8 * s; ctx.strokeRect(-o.hw * s, -o.hd * s, o.hw * 2 * s, o.hd * 2 * s);
    ctx.restore();
  }
  // sombra suave no pé de cada edifício
  ctx.fillStyle = "rgba(45,35,22,.28)";
  for (const e of reg.edificios) retangulo(e.o, .8);

  // 4) rio, com margem mais escura
  const linhaRio = (larg, cor) => {
    ctx.strokeStyle = cor; ctx.lineWidth = larg * s; ctx.lineJoin = ctx.lineCap = "round"; ctx.beginPath();
    for (let z = -METADE - 40; z <= METADE + 40; z += 8) { const x = xDoRio(reg, z); z === -METADE - 40 ? ctx.moveTo(X(x), Z(z)) : ctx.lineTo(X(x), Z(z)); }
    ctx.stroke();
  };
  linhaRio(reg.rio.larg * 2 + 10, "#6f7448"); linhaRio(reg.rio.larg * 2 + 3, "#8a8a6a"); linhaRio(reg.rio.larg * 2, "#4c8592"); linhaRio(reg.rio.larg * 1.2, "#457c8a");

  // 5) vias: primeiro a calçada/acostamento, depois o asfalto ou a terra, depois a faixa
  const estilo = {
    trilha:  { borda: null, borda2: 0, chao: "#ad9672" },
    beco:    { borda: null, borda2: 0, chao: "#9b8b74" },
    rua:     { borda: "#c4bba8", borda2: 3, chao: "#6d6a62" },
    estrada: { borda: "#b8a782", borda2: 2.5, chao: "#64615a" },
    avenida: { borda: "#cac1ad", borda2: 4.5, chao: "#5e5b55", meio: "#8f9a6a" },
    rodovia: { borda: "#bba98a", borda2: 3.5, chao: "#55534e", faixa: "#e0d6b4" }
  };
  const ordem = ["trilha", "beco", "estrada", "rua", "avenida", "rodovia"];
  const traca = (via, larg, cor, tracejado) => {
    ctx.strokeStyle = cor; ctx.lineWidth = Math.max(1, larg * s); ctx.lineJoin = ctx.lineCap = "round";
    ctx.setLineDash(tracejado ? [5 * s, 7 * s] : []);
    ctx.beginPath(); via.pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Z(p[1])) : ctx.moveTo(X(p[0]), Z(p[1]))); ctx.stroke();
  };
  for (const t of ordem) for (const via of reg.vias) if (via.tipo === t && estilo[t].borda) traca(via, via.larg + estilo[t].borda2, estilo[t].borda);
  for (const t of ordem) for (const via of reg.vias) if (via.tipo === t) traca(via, via.larg, estilo[t].chao);
  for (const via of reg.vias) {
    if (via.tipo === "avenida") traca(via, 1.6, estilo.avenida.meio);
    if (via.tipo === "rodovia") traca(via, .7, estilo.rodovia.faixa, true);
  }
  ctx.setLineDash([]);
  return cv;
}

function malhaTerreno(reg, renderer) {
  const L = reg.L, N = reg.N, H = reg.H;
  const pos = new Float32Array(L * L * 3), uv = new Float32Array(L * L * 2), idx = new Uint32Array(N * N * 6);
  for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) {
    const k = j * L + i;
    pos[k * 3] = -METADE + i * GRADE; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = -METADE + j * GRADE;
    uv[k * 2] = i / N; uv[k * 2 + 1] = 1 - j / N;
  }
  let t = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * L + i, b = a + 1, c = a + L, d = c + 1;
    idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const T = Math.min(4096, renderer.capabilities.maxTextureSize);
  const tex = new THREE.CanvasTexture(pintaTerreno(reg, T));
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
  m.receiveShadow = true;
  return m;
}

/* Vegetação: cada tipo de árvore é desenhado de uma vez (instâncias) */
function malhasDaVegetacao(reg) {
  const grupo = new THREE.Group();
  const tipos = {
    palma:    [[new THREE.CylinderGeometry(.22, .32, 7, 5), 0x7a6548, 3.5], [new THREE.ConeGeometry(2.8, 1.8, 7), 0x4f7a3a, 7.4]],
    oliva:    [[new THREE.CylinderGeometry(.2, .28, 1.4, 5), 0x6b5a44, .7], [new THREE.IcosahedronGeometry(1.8, 0), 0x6f7d48, 2.3]],
    citrico:  [[new THREE.CylinderGeometry(.18, .24, 1.6, 5), 0x6b5a44, .8], [new THREE.IcosahedronGeometry(1.7, 0), 0x3f6a34, 2.6]],
    pinheiro: [[new THREE.CylinderGeometry(.25, .35, 3, 5), 0x6b4a2f, 1.5], [new THREE.ConeGeometry(2.6, 7.5, 7), 0x3d5e38, 6.2]],
    cipreste: [[new THREE.ConeGeometry(.9, 8, 6), 0x34553a, 4]],
    arbusto:  [[new THREE.IcosahedronGeometry(.9, 0), 0x8a8655, .45]]
  };
  const M = new THREE.Matrix4(), C = new THREE.Color();
  for (const [tipo, partes] of Object.entries(tipos)) {
    const lista = reg.arvores.filter(a => a.tipo === tipo); if (!lista.length) continue;
    const ys = lista.map(a => alturaEm(reg, a.x, a.z));
    for (const [geo, cor, alt] of partes) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), lista.length);
      lista.forEach((a, i) => {
        M.makeScale(a.s, a.s * (tipo === "arbusto" ? .7 : 1), a.s); M.setPosition(a.x, ys[i] + alt * a.s, a.z); im.setMatrixAt(i, M);
        C.setHex(cor).multiplyScalar(.88 + ((i * 2654435761) >>> 0) % 1000 / 1000 * .24); im.setColorAt(i, C);
      });
      im.castShadow = tipo !== "arbusto"; im.receiveShadow = false;
      grupo.add(im);
    }
  }
  return grupo;
}

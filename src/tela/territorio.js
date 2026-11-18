"use strict";
/* ============================================================
   CAMADA DE TERRITÓRIO SOBRE O MAPA
   - Zona com controle total: chão e borda na cor do dono.
   - Sem controle total: só a marca de cada prédio na cor de quem o controla.
   - Bordas finas brancas mostram os limites de todas as zonas.
   ============================================================ */
function criaCamadaTerritorio(reg, geoTerreno) {
  const R = 1024, ids = new Int16Array(R * R), borda = new Uint8Array(R * R);
  const valida = new Set(reg.zonas);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const x = -METADE + (i + .5) * MUNDO / R, z = -METADE + (j + .5) * MUNDO / R, zn = zonaDe(reg, x, z);
    ids[j * R + i] = zn && valida.has(zn) ? zn.id : -1;
  }
  for (let j = 1; j < R - 1; j++) for (let i = 1; i < R - 1; i++) {
    const k = j * R + i, v = ids[k];
    if (ids[k + 1] !== v || ids[k - 1] !== v || ids[k + R] !== v || ids[k - R] !== v) borda[k] = 1;
  }
  const base = document.createElement("canvas"); base.width = base.height = R;
  const bctx = base.getContext("2d"), img = bctx.createImageData(R, R);
  const T = 2048, cv = document.createElement("canvas"); cv.width = cv.height = T;
  const ctx = cv.getContext("2d"), tex = new THREE.CanvasTexture(cv);
  const malha = new THREE.Mesh(geoTerreno, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  malha.renderOrder = 1;
  const camada = { malha, tex, cv, sujo: true };
  camada.atualiza = () => {
    const cores = reg.zonas.map(zn => zn.dono ? [(zn.dono.cor >> 16) & 255, (zn.dono.cor >> 8) & 255, zn.dono.cor & 255] : null);
    const d = img.data;
    for (let k = 0; k < R * R; k++) {
      const id = ids[k], o = k * 4, c = id >= 0 ? cores[id] : null;
      if (borda[k]) { if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 235; } else { d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = 70; } }
      else if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 62; }
      else d[o + 3] = 0;
    }
    bctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, T, T); ctx.imageSmoothingEnabled = true; ctx.drawImage(base, 0, 0, T, T);
    const s = T / MUNDO;
    for (const e of reg.edificios) {
      if (!e.dono || e.dono === e.zona.dono) continue;
      ctx.fillStyle = "#" + e.dono.cor.toString(16).padStart(6, "0");
      ctx.globalAlpha = e.dono.governo ? .45 : .8;
      const o = e.o; ctx.save(); ctx.translate((o.x + METADE) * s, (o.z + METADE) * s); ctx.rotate(o.a);
      ctx.fillRect(-(o.hw + 1.5) * s, -(o.hd + 1.5) * s, (o.hw + 1.5) * 2 * s, (o.hd + 1.5) * 2 * s); ctx.restore();
    }
    ctx.globalAlpha = 1;
    tex.needsUpdate = true; camada.sujo = false;
  };
  return camada;
}

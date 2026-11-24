"use strict";
/* ============================================================
   MARCAS DE PERCEPÇÃO NO MAPA 3D (protótipo 19)
   - Última posição conhecida: onde os soldados do jogador viram, ouviram
     ou suspeitam que um inimigo está. Anel e seta na cor da facção dele,
     com um ícone de como se soube; esmaece em 60 s e some.
   - Ícones sobre o soldado selecionado e sobre quem está em combate (do
     jogador): olho = vendo; orelha = ouviu o aviso ou levou tiro;
     interrogação = atira em lugar suspeito (onde viu o inimigo se abrigar).
   (Números provisórios.)
   ============================================================ */
const MARCAS = { recente: 10, max: 40, icones: 90, tamanhoIcone: 2.6 };
function desenhaIconePercepcao(tipo) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), cor = { olho: "#3d8f5a", orelha: "#d4a02a", interrogacao: "#d9622b" }[tipo];
  g.fillStyle = cor; g.beginPath(); g.arc(32, 32, 29, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 4.5; g.lineCap = "round"; g.lineJoin = "round";
  if (tipo === "olho") {
    g.beginPath(); g.moveTo(10, 32); g.quadraticCurveTo(32, 10, 54, 32); g.quadraticCurveTo(32, 54, 10, 32); g.stroke();
    g.beginPath(); g.arc(32, 32, 7, 0, Math.PI * 2); g.fill();
  } else if (tipo === "orelha") {
    g.beginPath(); g.moveTo(25, 51); g.bezierCurveTo(14, 38, 15, 13, 32, 13); g.bezierCurveTo(49, 13, 51, 31, 39, 38); g.bezierCurveTo(33, 42, 35, 48, 29, 52); g.stroke();
    g.beginPath(); g.moveTo(27, 31); g.bezierCurveTo(27, 22, 40, 22, 40, 30); g.stroke();
  } else {
    g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 32, 35);
  }
  return new THREE.CanvasTexture(c);
}
function criaMarcasPercepcao() {
  const grupo = new THREE.Group(), tex = {};
  for (const t of ["olho", "orelha", "interrogacao"]) tex[t] = desenhaIconePercepcao(t);
  const novoIcone = () => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.olho, transparent: true, depthTest: false, depthWrite: false }));
    sp.visible = false; sp.renderOrder = 8; grupo.add(sp); return sp;
  };
  const geoAnel = new THREE.RingGeometry(2.2, 3, 28); geoAnel.rotateX(-Math.PI / 2);
  const geoSeta = new THREE.ConeGeometry(1.4, 4.5, 8); geoSeta.rotateX(Math.PI);
  const marcas = [];
  for (let i = 0; i < MARCAS.max; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthTest: false, depthWrite: false });
    const anel = new THREE.Mesh(geoAnel, mat), seta = new THREE.Mesh(geoSeta, mat);
    anel.renderOrder = seta.renderOrder = 7; anel.visible = seta.visible = false; grupo.add(anel); grupo.add(seta);
    marcas.push({ anel, seta, mat, icone: novoIcone() });
  }
  const icones = []; for (let i = 0; i < MARCAS.icones; i++) icones.push(novoIcone());
  return { grupo, tex, marcas, icones };
}
function poeIcone(M, sp, tipo, x, y, z, esc) {
  if (sp.material.map !== M.tex[tipo]) { sp.material.map = M.tex[tipo]; sp.material.needsUpdate = true; }
  sp.position.set(x, y, z); sp.scale.set(esc, esc, 1); sp.visible = true;
}
function atualizaMarcasPercepcao(M, P, reg) {
  const f = eu(), escala = Math.max(1, cam.dist / 380), iconeEsc = MARCAS.tamanhoIcone * Math.max(1, cam.dist / 200);
  let nm = 0, ni = 0;
  // última posição conhecida dos inimigos (só do que os soldados do jogador sabem)
  if (f && PERCEPCAO.ligada && P.tempo > 0) {
    for (const u of ultimasPosicoes(P, f)) {
      if (nm >= M.marcas.length) break;
      const m = M.marcas[nm++], idade = P.tempo - u.t, y = alturaEm(reg, u.x, u.z);
      m.mat.color.setHex(u.o.faccao.cor); m.mat.opacity = limita(.9 - .8 * idade / PERCEPCAO.memoria, .1, .9);
      m.anel.position.set(u.x, y + .5, u.z); m.anel.scale.setScalar(escala); m.anel.visible = true;
      m.seta.position.set(u.x, y + 5 * escala, u.z); m.seta.scale.setScalar(escala); m.seta.visible = true;
      // olho: visto há pouco; orelha: soube por aviso ou tiro; interrogação: viu se abrigar; perdido (visto e depois sumiu): só o anel
      const t = u.origem === "abrigo" ? "interrogacao" : u.base === "viu" ? (idade <= MARCAS.recente ? "olho" : null) : "orelha";
      if (t) poeIcone(M, m.icone, t, u.x, y + 10 * escala, u.z, iconeEsc * .8); else m.icone.visible = false;
    }
  }
  for (let i = nm; i < M.marcas.length; i++) { const m = M.marcas[i]; m.anel.visible = m.seta.visible = m.icone.visible = false; }
  // ícones sobre o soldado selecionado e sobre quem está em combate
  if (PERCEPCAO.ligada) {
    const quem = new Set();
    if (contexto && contexto.tipo === "soldado" && contexto.alvo.vida === "ok") quem.add(contexto.alvo);
    if (f) for (const sq of P.esquadroes) if (sq.faccao === f && sq.combate) for (const s of sq.membros) if (s.vida === "ok") quem.add(s);
    for (const s of selecao) for (const o of s.membros) if (o.vida === "ok" && s.combate) quem.add(o);
    for (const s of quem) {
      if (ni >= M.icones.length) break;
      const t = iconeMira(s); if (!t) continue;
      poeIcone(M, M.icones[ni++], t, s.x, alturaEm(reg, s.x, s.z) + 4.6 + (iconeEsc - MARCAS.tamanhoIcone) * .4, s.z, iconeEsc);
    }
  }
  for (let i = ni; i < M.icones.length; i++) M.icones[i].visible = false;
}

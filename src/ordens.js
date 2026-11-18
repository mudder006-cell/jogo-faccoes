"use strict";
/* ============================================================
   ORDENS DO JOGADOR
   - Avançar até um ponto (ou prédio): no caminho o esquadrão toma as
     casas por onde passa e desvia para pegar os pontos importantes perto.
   - Defender um ponto: vai até lá e ocupa o prédio mais perto.
   - Tomar uma zona: vai pegando os pontos importantes dela, um a um.
   - Linha de ataque ou de defesa: vários esquadrões espalhados ao longo
     de uma linha desenhada no mapa.
   ============================================================ */
const RAIO_VARREDURA = 12;   // casas a menos disso do esquadrão passam para ele
const RAIO_DESVIO = 150;     // pontos importantes a menos disso puxam um desvio
const CORREDOR = 110;        // ... desde que fiquem perto do caminho até o destino

function objetivoDe(sq) {
  if (sq.alvo) return entradaDe(sq.alvo);
  if (sq.ordem.alvo) return entradaDe(sq.ordem.alvo);
  if (sq.ordem.destino) return sq.ordem.destino;
  return null;
}
function rotaAtePonto(P, sq, x, z) {
  let [ax, az] = centroDoEsquadrao(sq);
  if (sq.guarda && !sq.combate) [ax, az] = entradaDe(sq.guarda);
  sq.rota = rotaAPe(P.reg, ax, az, x, z, evitaPara(P, sq));
  sq.x = sq.rota[0][0]; sq.z = sq.rota[0][1];
  sq.passo = 1; sq.alvo = null; sq.guarda = null; sq.estado = "andando";
  for (const s of sq.membros) s.dentro = null;
}
function ordenaPonto(P, sq, x, z, modo) {
  sq.ordem = { tipo: modo === "defesa" ? "defender" : "avancar", destino: [x, z], visitados: new Set() };
  sq.sub = null;
  if (!sq.combate) rotaAtePonto(P, sq, x, z);
  avisa(P, "ordem", { sq });
}
function ordenaPredio(P, sq, e, modo) {
  if (modo === "defesa") { ordenaPonto(P, sq, e.x, e.z, "defesa"); sq.ordem.alvo = e; if (!sq.combate) rotaAte(P, sq, e); return; }
  sq.ordem = { tipo: "avancar", alvo: e, destino: entradaDe(e), visitados: new Set() };
  sq.sub = null;
  if (!sq.combate) rotaAte(P, sq, e);
  avisa(P, "ordem", { sq, e });
}
function ordenaZona(P, sq, zn) {
  sq.ordem = { tipo: "zona", zona: zn, visitados: new Set() }; sq.sub = null;
  if (!sq.combate) continuaOrdem(P, sq);
  avisa(P, "ordem", { sq });
}
function ordenaRecuar(P, sq) {
  const b = sq.faccao.base;
  if (b) ordenaPredio(P, sq, b, "defesa"); else ordenaSegurar(P, sq);
}
/* Vários esquadrões espalhados ao longo de uma linha, na ordem em que estão no mapa */
function ordenaLinha(P, lista, ax, az, bx, bz, modo) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  const ord = lista.slice().sort((p, q) => {
    const [px, pz] = centroDoEsquadrao(p), [qx, qz] = centroDoEsquadrao(q);
    return ((px - ax) * dx + (pz - az) * dz) / L2 - ((qx - ax) * dx + (qz - az) * dz) / L2;
  });
  ord.forEach((sq, i) => { const t = (i + .5) / ord.length; ordenaPonto(P, sq, ax + dx * t, az + dz * t, modo); });
}

/* Depois de tomar algo no caminho ou de um combate, segue a ordem */
function continuaOrdem(P, sq) {
  const o = sq.ordem;
  if (o.tipo === "zona") {
    const minhas = e => e.dono === sq.faccao;
    const [x, z] = centroDoEsquadrao(sq);
    const pend = o.zona.chaves.filter(e => !minhas(e)).sort((a, b) => {
      const da = Math.hypot(a.x - x, a.z - z) + (defensores(P, a, sq.faccao).length ? 400 : 0);
      const db = Math.hypot(b.x - x, b.z - z) + (defensores(P, b, sq.faccao).length ? 400 : 0);
      return da - db;
    });
    if (pend.length) { sq.sub = pend[0]; rotaAte(P, sq, pend[0]); return; }
    const fim = o.zona.chaves.filter(minhas).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    if (fim && !guarnicaoDe(P, fim).length) { sq.ordem = { tipo: "segurar" }; rotaAte(P, sq, fim); }
    else ordenaSegurar(P, sq);
    avisa(P, "zonaconcluida", { sq, zona: o.zona });
    return;
  }
  if (o.alvo && o.alvo.dono !== sq.faccao) { rotaAte(P, sq, o.alvo); return; }
  if (o.destino) { rotaAtePonto(P, sq, o.destino[0], o.destino[1]); return; }
  ordenaSegurar(P, sq);
}

/* Chegou ao ponto da ordem: ocupa o prédio mais adequado por perto */
function chegouAoPonto(P, sq) {
  const [x, z] = sq.ordem.destino || [sq.x, sq.z];
  let melhor = null, mn = Infinity;
  for (const e of P.reg.edificios) {
    const d = Math.hypot(e.x - x, e.z - z); if (d > 50) continue;
    if (guarnicaoDe(P, e).some(o => o !== sq)) continue;
    const nota = d - (e.dono === sq.faccao ? 15 : 0) - (TIPOS_CHAVE.includes(e.tipo) ? 10 : 0);
    if (nota < mn) { mn = nota; melhor = e; }
  }
  if (melhor) { sq.ordem = { tipo: "segurar" }; ocupa(P, sq, melhor); }
  else { sq.ordem = { tipo: "segurar" }; sq.estado = "parado"; sq.rota = null; avisa(P, "chegou", { sq }); }
}

/* No caminho: toma as casas por onde passa e desvia para os pontos importantes */
function varredura(P) {
  for (const sq of P.esquadroes) {
    if (sq.combate || sq.estado !== "andando" || !ativos(sq).length) continue;
    const o = sq.ordem; if (o.tipo !== "avancar" && o.tipo !== "zona") continue;
    const [x, z] = centroDoEsquadrao(sq);
    P.reg.oc.edificiosPerto(x, z, RAIO_VARREDURA, e => {
      if (!podeTomar(P, sq.faccao, e) || TIPOS_CHAVE.includes(e.tipo) || defensores(P, e, sq.faccao).length) return;
      tomaEdificio(P, e, sq.faccao);
    });
    if (o.tipo !== "avancar" || sq.sub || !o.destino) continue;
    const [dx, dz] = o.destino, falta = Math.hypot(dx - x, dz - z);
    let melhor = null, md = completa(sq.faccao) ? postura(sq).desvio : RAIO_DESVIO;
    for (const zn of P.reg.zonas) {
      if (Math.hypot(zn.x - x, zn.z - z) > 700) continue;
      for (const e of zn.chaves) {
        if (!podeTomar(P, sq.faccao, e) || o.visitados.has(e) || e === o.alvo || defensores(P, e, sq.faccao).length) continue;
        const d = Math.hypot(e.x - x, e.z - z);
        if (d > md || Math.hypot(e.x - dx, e.z - dz) > falta + 60) continue;
        if (distPontoSeg(e.x, e.z, x, z, dx, dz).d > CORREDOR) continue;
        md = d; melhor = e;
      }
    }
    if (melhor) { sq.sub = melhor; rotaAte(P, sq, melhor); avisa(P, "desvio", { sq, e: melhor }); }
  }
}

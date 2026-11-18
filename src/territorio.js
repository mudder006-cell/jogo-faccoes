"use strict";
/* ============================================================
   TERRITÓRIO
   - Cada zona (quarteirão da cidade velha, bairro, vila ou setor rural)
     tem pontos importantes. Quem tiver todos eles tem o controle total
     da zona (dá bônus de imposto, produção e influência, valores a definir).
   - Sem o controle total, vale o controle prédio por prédio.
   - O governo antigo começa com cerca de 80% dos edifícios, a partir do
     centro, e com guarnições nos pontos importantes.
   ============================================================ */
function criaFaccao(id, nome, cor, extra) {
  return Object.assign({ id, nome, cor, jogador: false, governo: false }, extra);
}

function controleDaZona(zn) {
  if (!zn.chaves.length) return null;
  const d = zn.chaves[0].dono;
  return d && zn.chaves.every(e => e.dono === d) ? d : null;
}
function atualizaZona(zn) { const antes = zn.dono; zn.dono = controleDaZona(zn); return antes !== zn.dono; }

/* Divide o mapa: o governo antigo fica com as zonas do centro para fora até ter ~80% dos edifícios */
function territorioInicial(reg, governo, r) {
  const total = reg.edificios.length;
  const ordem = reg.zonas.slice().sort((a, b) => {
    const pa = a.tipo === "velha" ? -1 : Math.hypot(a.x, a.z), pb = b.tipo === "velha" ? -1 : Math.hypot(b.x, b.z);
    return pa - pb;
  });
  let doGoverno = 0;
  for (const zn of ordem) {
    const sem = doGoverno / total, com = (doGoverno + zn.edificios.length) / total;
    zn.doGoverno = sem < PARTE_DO_GOVERNO && com - PARTE_DO_GOVERNO <= PARTE_DO_GOVERNO - sem;
    if (zn.doGoverno) { doGoverno += zn.edificios.length; for (const e of zn.edificios) e.dono = governo; }
  }
  // o quartel é do governo mesmo fora das zonas dele
  for (const e of reg.edificios) if (e.tipo === "quartel" && !e.dono) e.dono = governo;
  for (const e of reg.edificios) e.doGovernoNoInicio = e.dono === governo;
  for (const zn of reg.zonas) atualizaZona(zn);
  // guarnições: tudo na cidade velha e nos prédios de força; metade do resto
  const guardas = [];
  for (const zn of reg.zonas) for (const e of zn.chaves) {
    if (e.dono !== governo) continue;
    const forte = zn.tipo === "velha" || ["governo", "quartel", "cidadela", "delegacia"].includes(e.tipo);
    if (forte || r() < .5) guardas.push(e);
  }
  for (const e of reg.edificios) if (e.tipo === "quartel" && !guardas.includes(e)) guardas.push(e);
  return guardas;
}

/* Edifícios onde uma facção pode começar: fora das zonas do governo */
function podeComecar(e) { return !e.dono && !e.zona.doGoverno; }

function escolhaRival(reg, r, tomadas) {
  const livres = reg.edificios.filter(e => podeComecar(e) && !e.dono);
  let melhor = null, mn = -1;
  for (let i = 0; i < 300 && livres.length; i++) {
    const e = r.de(livres);
    let perto = Infinity;
    for (const t of tomadas) perto = Math.min(perto, Math.hypot(t.x - e.x, t.z - e.z));
    const nota = Math.min(perto, 1500) + r.entre(0, 120);
    if (nota > mn) { mn = nota; melhor = e; }
  }
  return melhor;
}

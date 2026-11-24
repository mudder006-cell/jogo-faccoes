"use strict";
/* ============================================================
   EQUIPE DE OBRAS (protótipo 19.4): engenheiros de cada batalhão, fora dos esquadrões
   - Cada batalhão (do jogador e das rivais; o governo antigo não) tem uma equipe:
     2 engenheiros quando o batalhão nasce, +1 a cada 2 esquadrões além do 2º,
     no máximo 4. Cada um custa salário de soldado ($ 5/h) mais um kit de explosivos
     ($ 300, pago uma vez quando entra). Só entra com caixa de $ 300 + reserva e com
     renda por hora positiva na última hora fechada. Não entram em esquadrão, não lutam e não
     atiram primeiro; só fortificam, consertam e reconstruem.
   - Prioridade: 1) as bases (QG e bases avançadas) até fortificação 100;
     2) prédios de fronteira (a até 150 m de prédio de quem está em guerra com a
     facção) até 60 (a guarnição do governo parada não conta como perigo); 3) consertar e reconstruir prédios danificados.
   - Cada engenheiro trabalha num prédio diferente (nenhum outro da facção no mesmo).
     Velocidade (a pé) e gasto de suprimentos são os do engenheiro de esquadrão
     (trabalhaNoPredio, em suprimentos.js): leva 30, enche e repõe nas bases.
   - Segurança: não vai a prédio com inimigo a menos de 150 m; se um esquadrão
     inimigo em combate chega a menos de 100 m, foge para a base mais perto e
     descansa 1 minuto.
   - Não são soldados do jogo: ficam em b.equipeObras (posição, estado, suprimentos).
   (Números provisórios.)
   ============================================================ */
const EQUIPE_OBRAS = {
  inicial: 2, maximo: 4, esquadroesBase: 2, esquadroesPorExtra: 2,   // 2 ao nascer; +1 a cada 2 esquadrões além do 2º; máximo 4
  tetoBase: 1, tetoFronteira: .6,                                     // fortificação (0 a 1) que cada prioridade busca
  raioFronteira: 150, raioInimigo: 150,                               // metros: o que conta como fronteira; inimigo perto do prédio que impede a obra
  raioTiro: 100, descansa: 60,                                        // esquadrão inimigo em combate a menos de 100 m = "levou tiro" (foge); segundos parado na base depois da fuga
  raioBusca: 500,                                                     // só escolhe prédios a até 500 m da base do batalhão
  reservaJogador: 500, raioBases: 1500,                               // reserva de caixa do jogador para contratar (as rivais usam a reserva de obras da personalidade); bases só até 1.500 m da base do batalhão
  pensa: 5, chega: 12, minimoParaSair: 3                              // segundos entre decisões; chegou a menos de 12 m; só sai da base com 3 suprimentos ou mais
};
const tamanhoDaEquipe = nEsquadroes => Math.min(EQUIPE_OBRAS.maximo, EQUIPE_OBRAS.inicial + Math.floor(Math.max(0, nEsquadroes - EQUIPE_OBRAS.esquadroesBase) / EQUIPE_OBRAS.esquadroesPorExtra));
const totalEquipeDeObras = (P, fac) => batalhoesDe(P, fac).reduce((n, b) => n + (b.equipeObras || []).length, 0);

/* ---------- contratação ---------- */
function novoEngenheiroDeObras(P, b) {
  const n = (b.nEngObras = (b.nEngObras || 0) + 1);
  const u = { nome: "Engenheiro de obras " + n, faccao: b.faccao, bat: b, funcao: "engenheiro", item: "explosivo", nivelItem: 1, suprimentos: 0, sq: null, obras: true,
    x: b.base.x, z: b.base.z, estado: "espera", alvo: null, tarefa: null, destino: null, proxima: 0, descansaAte: 0 };
  abasteceSuprimentos(u, estoquesNaBase(P, b.faccao, b, b.base));
  return u;
}
/* completa a equipe até o tamanho que o batalhão pede, enquanto o caixa paga o kit ($ 300 cada) */
function contrataEquipeDeObras(P, b) {
  const fac = b.faccao; if (!organizada(fac) || fac.eliminada || !b.base) return;
  b.equipeObras = b.equipeObras || [];
  if (b.equipeObras.length >= EQUIPE_OBRAS.maximo) return;
  const alvo = tamanhoDaEquipe(esquadroesDe(P, b).length);
  const reserva = fac.jogador ? EQUIPE_OBRAS.reservaJogador : (pers(fac).reservaObras == null ? 700 : pers(fac).reservaObras);
  if (!((fac.rendaHora || 0) > 0)) return;   // 19.4: só contrata com renda por hora positiva (saldo de dinheiro da última hora fechada)
  while (b.equipeObras.length < alvo && fac.recursos.dinheiro >= PRECO.explosivo + reserva) {   // só contrata com folga: custo do kit + reserva
    fac.recursos.dinheiro -= PRECO.explosivo;
    b.equipeObras.push(novoEngenheiroDeObras(P, b));
    if (fac.jogador && b.minimo) b.minimo["cx-suprimento"] = (b.minimo["cx-suprimento"] || 0) + SUPRIMENTO.carga.engenheiro;   // o mínimo do jogador inclui a mochila da equipe
  }
}

/* ---------- onde há perigo ---------- */
/* esquadrão inimigo (em combate, se soCombate) com o centro a menos de "raio" metros */
function inimigoPerto(P, fac, x, z, raio, soCombate) {
  for (const q of P.esquadroes) {
    if (soCombate && !q.combate) continue;
    if (q.faccao.governo && !q.combate && (q.estado === "guarnição" || q.estado === "parado")) continue;   // guarnição do governo parada não bloqueia a obra (só em combate ou em movimento)
    if (q.faccao === fac || !hostis(P, fac, q.faccao) || !ativos(q).length) continue;
    const [cx, cz] = centroDoEsquadrao(q);
    if (Math.hypot(cx - x, cz - z) < raio) return q;
  }
  return null;
}
function ehFronteira(P, fac, e) {
  let sim = false;
  P.reg.oc.edificiosPerto(e.x, e.z, EQUIPE_OBRAS.raioFronteira, o => { if (!sim && o.dono && o.dono !== fac && hostis(P, fac, o.dono)) sim = true; });
  return sim;
}

/* ---------- escolha do prédio ---------- */
/* devolve { e, teto, soConserto, classe } ou null */
function escolheObraDaEquipe(P, b, u) {
  const fac = b.faccao, E = EQUIPE_OBRAS;
  const ocupados = new Set();
  for (const o of batalhoesDe(P, fac)) for (const x of o.equipeObras || []) if (x !== u && x.alvo) ocupados.add(x.alvo);   // cada um num prédio diferente
  const distancia = e => Math.hypot(e.x - u.x, e.z - u.z);
  const primeiro = (lista, extra) => {   // o mais perto que está livre, sem inimigo por perto (e que passa na conta "extra")
    for (const e of lista.slice().sort((x, y) => distancia(x) - distancia(y))) {
      if (ocupados.has(e) || (extra && !extra(e)) || inimigoPerto(P, fac, e.x, e.z, E.raioInimigo, false)) continue;
      return e;
    }
    return null;
  };
  const falta = (e, teto) => precisaDeConserto(e) || (e.fortificado || 0) < teto - 1e-9;
  // 1) bases até fortificação 100
  let e = primeiro(basesDe(P, fac).filter(x => Math.hypot(x.x - b.base.x, x.z - b.base.z) <= E.raioBases && falta(x, E.tetoBase)));
  if (e) return { e, teto: E.tetoBase, soConserto: false, classe: "base" };
  const perto = P.reg.edificios.filter(x => x.dono === fac && Math.hypot(x.x - b.base.x, x.z - b.base.z) <= E.raioBusca);
  // 2) fronteira até 60
  e = primeiro(perto.filter(x => falta(x, E.tetoFronteira)), x => ehFronteira(P, fac, x));
  if (e) return { e, teto: E.tetoFronteira, soConserto: false, classe: "fronteira" };
  // 3) consertar e reconstruir
  e = primeiro(perto.filter(x => precisaDeConserto(x)));
  if (e) return { e, teto: 0, soConserto: true, classe: "conserto" };
  return null;
}

/* ---------- movimento e rotina (chamado a cada segundo) ---------- */
function andaAte(u, x, z, dt) {   // a pé, em linha reta, na velocidade do esquadrão a pé; devolve se já chegou
  const d = Math.hypot(x - u.x, z - u.z), p = VELOCIDADE_A_PE * dt;
  if (d <= p) { u.x = x; u.z = z; return true; }
  u.x += (x - u.x) / d * p; u.z += (z - u.z) / d * p;
  return d - p <= EQUIPE_OBRAS.chega;
}
function baseComEstoqueDeSuprimento(P, b, u) {
  const fac = b.faccao; let m = null, md = Infinity;
  for (const base of basesDe(P, fac)) {
    if (!somaMunicao(estoquesNaBase(P, fac, b, base), "suprimento")) continue;
    const d = Math.hypot(base.x - u.x, base.z - u.z); if (d < md) { md = d; m = base; }
  }
  return m;
}
function voltaParaBase(P, b, u, estado) {
  u.alvo = null; u.tarefa = null; u.estado = estado || "volta";
  u.destino = baseMaisPerto(P, b.faccao, u.x, u.z) || b.faccao.base || b.base;
}
function passoDoEngenheiroDeObras(P, b, u, dt) {
  const fac = b.faccao, E = EQUIPE_OBRAS;
  if (u.alvo && u.alvo.dono !== fac) { u.alvo = null; if (u.estado === "indo" || u.estado === "obra") u.estado = "espera"; }
  const base = baseEm(P, fac, u.x, u.z);
  // levou tiro: um esquadrão inimigo está lutando por perto, foge para a base mais perto
  if ((u.estado === "indo" || u.estado === "obra" || (u.estado === "espera" && !base)) && inimigoPerto(P, fac, u.x, u.z, E.raioTiro, true)) {
    voltaParaBase(P, b, u, "foge"); u.descansaAte = P.tempo + E.descansa;
    if (fac.jogador && P.tempo - (b.avisouFuga || -1e9) > 60) { b.avisouFuga = P.tempo; avisa(P, "equipeobrasfugiu", { b, u }); }
    return;
  }
  if (u.estado === "foge" || u.estado === "volta" || u.estado === "reabastece") {
    const d = u.destino;
    if (!d || d.dono !== fac) { u.destino = baseMaisPerto(P, fac, u.x, u.z) || fac.base; return; }
    if (andaAte(u, d.x, d.z, dt)) { abasteceSuprimentos(u, estoquesNaBase(P, fac, b, d)); u.estado = "espera"; u.destino = null; u.proxima = 0; }
    return;
  }
  if (u.estado === "indo") {
    const e = u.alvo;
    if (!e || inimigoPerto(P, fac, e.x, e.z, E.raioInimigo, false)) { u.alvo = null; u.tarefa = null; u.estado = "espera"; u.proxima = P.tempo + E.pensa; return; }
    const [ex, ez] = entradaDe(e);
    if (andaAte(u, ex, ez, dt)) u.estado = "obra";
    return;
  }
  if (u.estado === "obra") {
    const e = u.alvo;
    if (!e || inimigoPerto(P, fac, e.x, e.z, E.raioInimigo, false)) { u.alvo = null; u.tarefa = null; u.estado = "espera"; u.proxima = P.tempo + E.pensa; return; }
    if (!b.equipeSq) b.equipeSq = { faccao: fac, nome: "Equipe de obras do " + b.nome };
    const r = trabalhaNoPredio(P, b.equipeSq, [u], e, dt, u.tarefa.soConserto, u.tarefa.teto);
    if (r === null || r === "semsuprimentos") { u.alvo = null; u.tarefa = null; u.estado = "espera"; u.proxima = 0; }
    return;
  }
  // espera: na base enche a mochila; com material, escolhe o próximo prédio
  if (P.tempo < u.proxima || P.tempo < u.descansaAte) return;
  u.proxima = P.tempo + E.pensa;
  if (base) abasteceSuprimentos(u, estoquesNaBase(P, fac, b, base));
  if (u.suprimentos < E.minimoParaSair) {
    const comEstoque = baseComEstoqueDeSuprimento(P, b, u);
    if (comEstoque && comEstoque !== base) { u.destino = comEstoque; u.estado = "reabastece"; }
    else if (!base) voltaParaBase(P, b, u);
    return;
  }
  const t = escolheObraDaEquipe(P, b, u);
  if (t) { u.alvo = t.e; u.tarefa = t; u.estado = "indo"; }
  else if (!base) voltaParaBase(P, b, u);
}
function equipesDeObras(P, dt) {
  for (const b of (P.batalhoes || [])) {
    const fac = b.faccao;
    if (b.dissolvido || fac.eliminada || !organizada(fac)) continue;
    if (!b.base || b.base.dono !== fac) b.base = fac.base;
    contrataEquipeDeObras(P, b);
    for (const u of b.equipeObras || []) passoDoEngenheiroDeObras(P, b, u, dt);
  }
}

/* ---------- para a tela (janela de Batalhões) ---------- */
const NOME_CLASSE_OBRA = { base: "base", fronteira: "fronteira", conserto: "conserto" };
function textoDoEngenheiroDeObras(P, u) {
  const nm = e => TIPOS[e.tipo].n.toLowerCase() + " em " + e.zona.nome;
  const base = baseEm(P, u.faccao, u.x, u.z), sup = Math.floor(u.suprimentos || 0);
  if (u.estado === "obra" && u.alvo) {
    const e = u.alvo, t = u.tarefa;
    if (e.destruido) return "reconstruindo " + nm(e);
    if ((e.dano || 0) > 1e-9) return "consertando " + nm(e);
    return "fortificando " + nm(e) + ": " + fortificacaoDe(e) + " de " + Math.round((t ? t.teto : 1) * 100);
  }
  if (u.estado === "indo" && u.alvo) return "a caminho de " + nm(u.alvo) + " (" + NOME_CLASSE_OBRA[u.tarefa ? u.tarefa.classe : "base"] + ")";
  if (u.estado === "foge") return "fugiu de tiro, voltando à base";
  if (u.estado === "volta") return "voltando à base";
  if (u.estado === "reabastece") return "indo buscar suprimentos";
  if (u.suprimentos < EQUIPE_OBRAS.minimoParaSair) return "esperando suprimentos" + (base ? " na base" : "");
  return base ? "esperando na base: nada a fazer agora" : "sem obra por perto";
}

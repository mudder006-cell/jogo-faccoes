"use strict";
/* ============================================================
   BATALHÕES
   - O jogador comanda só os líderes de batalhão. Cada batalhão tem um
     líder, que fica numa base (QG ou base avançada) e comanda de lá.
   - Dentro do batalhão, os esquadrões são comandados por sargentos.
     O líder monta os esquadrões, escolhe os sargentos, distribui as
     funções conforme o equipamento que tem e transforma a ordem do
     jogador em missões para cada esquadrão.
   - Ordens: tomar área (uma zona), proteger área, segurar a frente
     contra uma facção, avançar na fronteira de uma facção (só em guerra).
   - Orçamento: o jogador entrega soldados e uma parte do arsenal
     (armas, kits e munição). Compras chegam ao depósito geral da
     facção; dali o jogador passa para cada batalhão.
   - O jogador pode sugerir trocas nos esquadrões; o líder decide.
   - Começa com 1 batalhão; abre mais conforme o território cresce.
     O líder precisa poder comandar (Veterano ou liderança 60+).
   (Números provisórios.)
   ============================================================ */
const BATALHAO = { prediosPorBatalhao: 60, tamanhoEsquadrao: 6, pensa: 5, sugestaoBase: .55 };
const ORDENS_BATALHAO = {
  tomar:    { n: "Tomar área", icone: "flag", pede: "zona", dica: "Toma os pontos importantes e os prédios da zona escolhida" },
  proteger: { n: "Proteger área", icone: "shield_home", pede: "zona", dica: "Guarda a zona escolhida e expulsa quem entrar" },
  frente:   { n: "Segurar frente", icone: "wall", pede: "faccao", dica: "Ocupa a fronteira com a facção escolhida e segura quem vier" },
  avancar:  { n: "Avançar fronteira", icone: "swords", pede: "faccao", dica: "Toma os prédios da facção escolhida, a partir da fronteira (precisa estar em guerra)" }
};
const batalhoesDe = (P, fac) => (P.batalhoes || []).filter(b => b.faccao === fac && !b.dissolvido);
const esquadroesDe = (P, b) => P.esquadroes.filter(q => q.bat === b && ativos(q).length);
const soldadosDe = (P, b) => P.soldados.filter(s => s.bat === b && s !== b.lider && ["ok", "ferido", "reserva", "tratando", "fila", "motorista"].includes(s.vida));
function limiteBatalhoes(P, fac) { let n = 0; for (const e of P.reg.edificios) if (e.dono === fac) n++; return 1 + Math.floor(n / BATALHAO.prediosPorBatalhao); }
/* de onde o soldado tira armas e munição: do batalhão dele (ou do depósito da facção) */
const estoqueDe = s => (s.bat && !s.bat.dissolvido ? s.bat : s.faccao);

function criaBatalhao(P, fac, lider, base) {
  P.batalhoes = P.batalhoes || [];
  const n = (P.batalhoes.filter(b => b.faccao === fac).length) + 1;
  const b = { id: P.batalhoes.length, nome: n + "º Batalhão", faccao: fac, lider, base, ordem: null, postura: "equilibrado",
    arsenal: criaArsenal(), municao: { bala: 0, cinta: 0, granada: 0, foguete: 0 }, proximo: 0,
    minimo: {}, prioridade: (P.batalhoes.filter(o => o.faccao === fac).length) + 1, proximoRecruta: 0 };
  P.batalhoes.push(b);
  viraLiderDeBatalhao(P, lider, b, base);
  if (!fac.batalhaoPadrao) fac.batalhaoPadrao = b;
  avisa(P, "novobatalhao", { b });
  return b;
}
function viraLiderDeBatalhao(P, s, b, base) {
  if (s.sq) { const sq = s.sq; sq.membros = sq.membros.filter(m => m !== s); s.sq = null; if (sq.lider === s) escolheLider(P, sq); }
  s.faccao.reserva = (s.faccao.reserva || []).filter(o => o !== s);
  s.vida = "comando"; s.cargo = "batalhao"; s.bat = b; s.pedido = null; s.esperaEm = base; s.x = base.x; s.z = base.z;
  b.lider = s;
  anota(P, s, "Assumiu o comando do " + b.nome);
}
/* candidatos a comandar um batalhão novo */
function candidatosACmd(P, fac) { return P.soldados.filter(s => s.faccao === fac && (s.vida === "ok" || s.vida === "reserva") && !s.cargo && podeLiderar(s)); }
function pedeComando(P, s) {
  const fac = s.faccao;
  if (batalhoesDe(P, fac).length >= limiteBatalhoes(P, fac)) return "limite de batalhões (cresça o território para abrir mais)";
  if (!podeLiderar(s)) return "precisa ser Veterano ou ter liderança " + LIDERANCA_PARA_LIDERAR;
  if (s.vida === "reserva") { criaBatalhao(P, fac, s, ondeEspera(s)); return null; }
  s.pedido = { tipo: "comandar" };
  avisa(P, "pedidocomando", { s });
  return null;
}

/* ---------- orçamento ---------- */
function passaItem(de, para, k, n) {   // de/para: facção (depósito) ou batalhão
  if (ehCaixa(k)) { const t = tipoDaCaixa(k), q = Math.min(n * MUNICOES[t].caixa, de.municao[t]); if (q <= 0) return false; de.municao[t] -= q; para.municao[t] += q; return true; }
  const q = Math.min(n, de.arsenal[k] || 0); if (q <= 0) return false;
  de.arsenal[k] -= q; para.arsenal[k] = (para.arsenal[k] || 0) + q; return true;
}
function passaSoldado(P, s, b) {   // muda de batalhão (ou para "sem batalhão" com b = null)
  if (s.bat === b || s.cargo) return false;
  if (s.vida === "reserva" || !s.sq) { s.bat = b; s.pedido = null; return true; }
  s.pedido = { tipo: "transferir", destino: "bat", bat: b };   // vai com o esquadrão até uma base e muda lá
  return true;
}

/* ---------- ordens do jogador ---------- */
/* facções organizadas (jogador e rivais) usam batalhões, estoques por base e logística; o governo antigo não */
const organizada = f => !!f && !f.governo && !!f.recursos;
const MAX_ORDENS = 4;
/* acrescenta uma ordem ao batalhão (a mesma ordem de novo tira); tipo null tira todas */
function ordenaBatalhao(P, b, tipo, alvo) {
  b.ordens = b.ordens || [];
  if (!tipo) { b.ordens = []; b.proximo = 0; avisa(P, "ordembatalhao", { b }); return null; }
  const ja = b.ordens.find(o => o.tipo === tipo && o.alvo === alvo);
  if (ja) { tiraOrdem(P, b, ja); return null; }
  if (tipo === "avancar" && !hostis(P, b.faccao, alvo)) return "precisa estar em guerra com " + alvo.nome;
  // a mesma zona ou facção só fica com uma ordem: trocar tomar ↔ proteger, frente ↔ avançar
  b.ordens = b.ordens.filter(o => o.alvo !== alvo);
  if (b.ordens.length >= MAX_ORDENS) return "no máximo " + MAX_ORDENS + " ordens por batalhão";
  b.ordens.push({ tipo, alvo, desde: P.tempo, id: (b.nOrdem = (b.nOrdem || 0) + 1) });
  b.proximo = 0;
  avisa(P, "ordembatalhao", { b });
  return null;
}
function tiraOrdem(P, b, o) { b.ordens = (b.ordens || []).filter(x => x !== o); b.proximo = 0; avisa(P, "ordembatalhao", { b }); }
const textoUmaOrdem = o => ORDENS_BATALHAO[o.tipo].n + ": " + (o.alvo ? o.alvo.nome : "");
function textoOrdem(b) {
  const l = b.ordens || []; if (!l.length) return "Sem ordem: protege a área da base";
  return l.length === 1 ? textoUmaOrdem(l[0]) : l.length + " ordens: " + l.map(o => o.alvo.nome).join(", ");
}

/* ---------- o líder pensa (a cada 5 s) ---------- */
/* ---------- estoque mínimo: o batalhão se repõe sozinho do depósito geral e recruta até o mínimo de soldados ---------- */
const REPOSICAO = { recrutaACada: 5 };   // minutos do jogo entre um recruta e outro, por batalhão
// minimo: { fuzil: n (armas no estoque do batalhão, qualquer nível), "cx-bala": n (balas, em unidades), soldados: n }
function estoqueDoBatalhao(b, k) { return ehCaixa(k) ? b.municao[tipoDaCaixa(k)] : noArsenal(b, k); }
function faltaNoBatalhao(P, b) {
  const f = [];
  for (const k of Object.keys(b.minimo || {})) {
    const m = b.minimo[k] || 0; if (!m) continue;
    const tem = k === "soldados" ? soldadosDe(P, b).length : estoqueDoBatalhao(b, k);
    if (tem < m) f.push({ k, falta: m - tem });
  }
  return f;
}
function repoeBatalhao(P, b, reservado) {
  const fac = b.faccao, noQG = b.base === fac.base;
  const doQG = k => ehCaixa(k) ? fac.municao[tipoDaCaixa(k)] : noArsenal(fac, k);
  const passa = (k, q) => {   // do depósito para o batalhão, quando ele está no QG (sem veículo)
    if (ehCaixa(k)) { const t = tipoDaCaixa(k), p = Math.min(q, fac.municao[t]); fac.municao[t] -= p; b.municao[t] += p; return p; }
    let n = 0; while (n < q) { const nv = melhorNivel(fac, k); if (!nv) break; passaItem(fac, b, chave(k, nv), 1); n++; } return n;
  };
  for (const { k, falta } of faltaNoBatalhao(P, b)) {
    if (k === "soldados") { recrutaPara(P, b); continue; }
    let resto = falta;
    if (noQG) resto -= passa(k, resto);
    else { const livre = Math.max(0, doQG(k) - (reservado[k] || 0)), usa = Math.min(resto, livre); reservado[k] = (reservado[k] || 0) + usa; resto -= usa; }
    resto -= aCaminhoPara(P, b, k);
    if (resto > 0) { compraAutomatica(P, fac, b, k, resto); if (noQG) passa(k, resto); }
  }
}
function recrutaPara(P, b) {
  const fac = b.faccao;
  if (P.tempo < (b.proximoRecruta || 0)) return;
  const antes = fac.batalhaoPadrao; fac.batalhaoPadrao = b;
  let s = null;
  const zonas = zonasComVoluntarios(fac).sort((x, y) => Math.hypot(x.zona.x - b.base.x, x.zona.z - b.base.z) - Math.hypot(y.zona.x - b.base.x, y.zona.z - b.base.z));
  if (zonas.length && !podeRecrutar(P, fac, "voluntario", zonas[0].zona)) s = recrutaVoluntario(P, fac, zonas[0].zona);
  if (!s && !podeRecrutar(P, fac, "mercenario")) s = recrutaMercenario(P, fac);
  fac.batalhaoPadrao = antes;
  if (s) { s.bat = b; if (s.sq) s.sq.bat = b; b.proximoRecruta = P.tempo + REPOSICAO.recrutaACada * HORA / 60; b.semRecruta = false; }
  else if (!b.semRecruta) { b.semRecruta = true; avisa(P, "semrecruta", { b }); }
}
function porPrioridade(P, fac) { return batalhoesDe(P, fac).sort((x, y) => x.prioridade - y.prioridade); }
function mudaPrioridade(P, b, d) {
  const l = porPrioridade(P, b.faccao), i = l.indexOf(b), j = i + d; if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]]; l.forEach((o, n) => o.prioridade = n + 1);
}

function batalhoesDoSegundo(P) {
  // reposição em ordem de prioridade: o primeiro pega antes do depósito e do caixa
  if (!P.proximaReposicao || P.tempo >= P.proximaReposicao) {
    P.proximaReposicao = P.tempo + BATALHAO.pensa;
    for (const f of P.faccoes) if (organizada(f) && !f.eliminada) { const reservado = {}; for (const b of porPrioridade(P, f)) repoeBatalhao(P, b, reservado); }
  }
  for (const b of (P.batalhoes || [])) {
    if (b.dissolvido || b.faccao.eliminada || !organizada(b.faccao)) continue;
    if (P.tempo < b.proximo) continue;
    b.proximo = P.tempo + BATALHAO.pensa;
    pensaBatalhao(P, b);
  }
}
function pensaBatalhao(P, b) {
  const fac = b.faccao;
  if (!b.base || b.base.dono !== fac) b.base = fac.base;
  // 1) soldados do batalhão esperando nas bases: busca ou forma esquadrão
  const esperando = (fac.reserva || []).filter(s => s.bat === b && !s.pedido && s.vida === "reserva");
  const sqs = esquadroesDe(P, b);
  for (const s of esperando) {
    const com = sqs.filter(q => ativos(q).length < BATALHAO.tamanhoEsquadrao && !q.combate).sort((x, y) => Math.hypot(centroDoEsquadrao(x)[0] - s.x, centroDoEsquadrao(x)[1] - s.z) - Math.hypot(centroDoEsquadrao(y)[0] - s.x, centroDoEsquadrao(y)[1] - s.z))[0];
    if (com) { s.pedido = { tipo: "transferir", destino: com }; continue; }
  }
  for (const base of basesDe(P, fac)) {
    const aqui = (fac.reserva || []).filter(s => s.bat === b && !s.pedido && s.vida === "reserva" && ondeEspera(s) === base);
    if (aqui.length >= 3 || (aqui.length && !sqs.length)) formaEsquadrao(P, b, aqui, base);
  }
  // 2) distribui funções conforme o equipamento do batalhão
  for (const sq of esquadroesDe(P, b)) if (!sq.combate) distribuiFuncoes(P, b, sq);
  // 3) a ordem vira missão de cada esquadrão
  cumpreOrdem(P, b);
}
function formaEsquadrao(P, b, l, base) {
  const fac = b.faccao, chefe = l.slice().sort((x, y) => y.atr.lideranca - x.atr.lideranca)[0];
  const sq = moveSoldado(P, chefe, "novo"); sq.x = base.x; sq.z = base.z; sq.bat = b; sq.manual = true;
  for (const s of l.slice(0, BATALHAO.tamanhoEsquadrao)) if (s !== chefe) moveSoldado(P, s, sq);
  sq.lider = chefe; posicionaNoLugar(P, sq);
  anota(P, chefe, "Virou sargento do " + sq.nome + " (" + b.nome + ")");
  avisa(P, "novoesquadrao", { sq, base, b });
}
/* composição ideal: 1 sargento, 1 AR, 1 médico; AT, granadeiro e engenheiro se houver equipamento */
function distribuiFuncoes(P, b, sq) {
  const l = ativos(sq); if (l.length < 3 || l.some(s => s.pedido)) return;
  const tem = f => l.some(s => s.funcao === f || (s.pedido && s.pedido.funcao === f));
  const querer = [["metralhador", "metralhadora", 4], ["medico", "kit", 3], ["antitanque", "rpg", 5], ["granadeiro", "lancagranadas", 6], ["engenheiro", "explosivo", 5]];
  for (const [f, item, minimo] of querer) {
    if (l.length < minimo || tem(f) || noArsenal(b, item) < 1) continue;
    const s = l.filter(o => o.funcao === "fuzileiro" && o !== sq.lider && !o.pedido).sort((x, y) => (f === "metralhador" || f === "antitanque" ? y.atr.pontaria - x.atr.pontaria : y.atr.disciplina - x.atr.disciplina))[0];
    if (s && pedeFuncao(P, s, f)) { s.pedido && (s.pedido.peloLider = true); return; }
  }
}
function mesmaMissao(a, b) { return a && b && a.tipo === b.tipo && a.zona === b.zona && a.contra === b.contra && a.alvo === b.alvo; }
function poeMissao(P, sq, m) { sq.postura = sq.bat.postura; if (mesmaMissao(sq.missao, m)) return; sq.missao = Object.assign({ desde: P.tempo }, m); sq.fixo = false; sq.proximaMissao = 0; sq.caca = null; }
/* se nenhum esquadrão sozinho dá conta, o líder junta todos contra o ponto mais fraco */
function ataqueConjunto(P, b, sqs, filtro) {
  const parados = sqs.filter(q => !q.combate && q.estado !== "andando" && !pendencias(P, q).proprios.length);
  if (parados.length < 2 || parados.length < sqs.length) return;
  const forcaTotal = parados.reduce((n, q) => n + forca(q), 0);
  let melhor = null, menor = Infinity;
  for (const zn of P.reg.zonas) for (const e of zn.chaves) {
    if (!filtro(e) || !podeTomar(P, b.faccao, e)) continue;
    const d = forcaDefesa(P, e, b.faccao) * 1.8; if (d < menor) { menor = d; melhor = e; }
  }
  if (!melhor || forcaTotal < menor) return;
  for (const q of parados) { const m = q.missao; ordenaPredio(P, q, melhor, "ataque"); q.missao = m; }
  avisa(P, "ataqueconjunto", { b, e: melhor });
}
/* prédios seus colados aos da facção (pontos importantes primeiro, depois os mais perto dela) */
function frenteContra(P, fac, outra) {
  const l = [];
  for (const e of P.reg.edificios) {
    if (e.dono !== fac) continue;
    let d = Infinity; P.reg.oc.edificiosPerto(e.x, e.z, 160, o => { if (o.dono === outra) d = Math.min(d, Math.hypot(o.x - e.x, o.z - e.z)); });
    if (d < Infinity) l.push([e, d - (TIPOS_CHAVE.includes(e.tipo) ? 80 : 0) - (e.andares || 1) * 4]);
  }
  l.sort((a, b) => a[1] - b[1]);
  // espalha: não pega dois prédios a menos de 60 m um do outro
  const esc = [];
  for (const [e] of l) if (!esc.some(o => Math.hypot(o.x - e.x, o.z - e.z) < 60)) { esc.push(e); if (esc.length >= 8) break; }
  return esc;
}
/* missão de esquadrão: segurar um ponto da frente */
function missaoFrente(P, sq) {
  const e = sq.missao.alvo, fac = sq.faccao;
  if (e.dono !== fac) { if (podeTomar(P, fac, e) && daPraTomar(P, sq, e)) ordenaPredio(P, sq, e, "ataque"); return; }
  let perto = null, md = 260;
  for (const o of P.esquadroes) {
    if (!hostis(P, o.faccao, fac) || !ativos(o).length || (o.guarda && !o.combate)) continue;
    const [ox, oz] = centroDoEsquadrao(o), d = Math.hypot(ox - e.x, oz - e.z);
    if (d < md && forca(sq) >= ativos(o).length - 1 + postura(sq).folga) { md = d; perto = o; }
  }
  if (perto) { vaiAtacarEsquadrao(P, sq, perto, "socorro"); return; }
  if (!(sq.estado === "guarnição" && sq.guarda === e)) { const m = sq.missao; ordenaPredio(P, sq, e, "defesa"); sq.missao = m; }
}

/* ---------- sugestões do jogador (o líder decide) ---------- */
function sugere(P, s, pedido) {
  const b = s.bat, lider = b && b.lider;
  if (!lider) { if (pedido.tipo === "funcao") return pedeFuncao(P, s, pedido.funcao) ? { ok: true } : { ok: false, motivo: "sem equipamento" }; return { ok: pedeTransferencia(P, s, pedido.destino) }; }
  let motivo = null;
  if (pedido.tipo === "funcao") {
    motivo = motivoFuncao(P, s, pedido.funcao);
    if (!motivo && s.sq && s.sq.lider === s) motivo = "ele é o sargento do esquadrão";
    if (!motivo && ["metralhador", "medico"].includes(s.funcao) && s.sq && ativos(s.sq).filter(o => o.funcao === s.funcao).length === 1) motivo = "o esquadrão ficaria sem " + FUNCOES[s.funcao].n.toLowerCase();
  } else if (pedido.destino && pedido.destino !== "novo" && pedido.destino.bat !== b) motivo = "esse esquadrão é de outro batalhão";
  else if (pedido.destino && pedido.destino !== "novo" && ativos(pedido.destino).length >= BATALHAO.tamanhoEsquadrao + 1) motivo = "o esquadrão de destino está cheio";
  else if (pedido.destino === "novo") motivo = "quem forma esquadrões novos é o líder do batalhão";
  if (!motivo && P.r() > BATALHAO.sugestaoBase + lider.atr.lideranca / 250) motivo = "prefere manter como está por enquanto";
  if (motivo) { avisa(P, "sugestaorecusada", { s, b, motivo }); return { ok: false, motivo }; }
  if (pedido.tipo === "funcao") pedeFuncao(P, s, pedido.funcao); else pedeTransferencia(P, s, pedido.destino);
  avisa(P, "sugestaoaceita", { s, b });
  return { ok: true };
}

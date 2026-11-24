"use strict";
/* ============================================================
   DIPLOMACIA
   - Todas as facções começam neutras entre si; o governo antigo está
     em guerra com todas.
   - Estados: neutro, pacto (não agressão), aliança, guerra e cessar-fogo
     (temporário: em 12 h vira paz/neutro ou volta à guerra).
     Só quem está em guerra luta e toma prédios um do outro.
     Neutros não se atacam (atacar um neutro é declarar guerra).
     Aliados também se ajudam nas lutas e trocam armas.
   - A relação (−100 a 100) muda com: fronteira e ataques, inimigo em
     comum, presentes e medo de quem cresce demais.
   - Os líderes trocam propostas. A IA propõe a você e você aceita ou
     recusa; você também propõe. Declarar guerra é na hora.
   - Exaustão de guerra (19.3): cada facção se cansa em cada guerra com
     outra facção (tempo, mortes, prédios perdidos, dinheiro gasto) e
     descansa em paz. Cansada, busca cessar-fogo; muito cansada, perde
     moral e voluntários.
   - Coalizão (19.3): quando uma facção cresce demais, as outras se
     aproximam entre si, pioram com ela e podem declarar guerra juntas.
   - Líder da facção: fica no QG. Se o QG cair, foge para outra base
     (perde influência e moral); sem outra base, a facção cai.
   (Números provisórios.)
   ============================================================ */
const ESTADOS = {
  neutro: { n: "Neutro", icone: "remove", cor: "#9aa6b4" },
  pacto: { n: "Pacto de não agressão", curto: "Pacto", icone: "handshake", cor: "#6fb7ff" },
  alianca: { n: "Aliança", icone: "shield_home", cor: "#8fd18f" },
  guerra: { n: "Guerra", icone: "swords", cor: "#ff6a4a" },
  cessarfogo: { n: "Cessar-fogo", curto: "Cessar-fogo", icone: "pause_circle", cor: "#e6c35c" }
};
const DIPLO = {
  propoePacto: 25, propoeAlianca: 55, declaraGuerra: -45, rompePacto: -60, rompeAlianca: 0, propoePaz: -15,
  aceitaPacto: 15, aceitaAlianca: 45, aceitaPaz: -25,
  tomarPredio: -6, tomarChave: -15, ferir: -2, matar: -4,
  fronteira: -.45, inimigoComum: 1.1, presentePor: 60, medoAcima: 1.4, medo: -.6,
  traicao: -12, propostaDura: 6, esperaDepoisDeRecusa: 8, esperaMesmaProposta: 20, ajudaAliado: 12
};
/* exaustão de guerra e coalizão (19.3, números provisórios) */
const EXAUSTAO = {
  tempo: 1, morte: .8, predio: .25, chave: 1.5, dinheiro: 1 / 500,   // sobe por hora em guerra, por soldado morto, por prédio e por ponto importante perdido, por $ gasto em armas e munição
  descansa: 3, descansaCessar: 4,                                     // desce por hora fora de guerra (e em cessar-fogo)
  efeito: 40, moral: 12, voluntarios: .5,                               // acima de 40: moral máxima cai até 12 e voluntários até 50%
  busca: 40, aceita: 25, minGuerra: 4,                                  // pede cessar-fogo com exaustão >= 40 + guerra da personalidade; aceita com >= 25 + guerra; só depois de 4 h de guerra
  cessarHoras: 12, paz: 20, pazHoras: 24, pazRelacao: -10              // o cessar-fogo dura 12 h e vira paz se a exaustão média era 20+ (ou a relação já está boa), senão volta a guerra; paz sem nova guerra por 24 h e relação sobe a -10
};
const COALIZAO = { minimoHoras: 12, vezes: 1.8, sai: 1.25, minPredios: 60, aproxima: 1.5, afasta: 2, guerraAte: -20, cansaco: 30, bonusPaz: 15 };   // cresce demais: >= 1,8x a força média das outras e 60 prédios; sai abaixo de 1,4x
const INCIDENTES = [
  { texto: "um tiroteio na fronteira deixou feridos", valor: -12 },
  { texto: "acusações de roubar combustível", valor: -8 },
  { texto: "um acordo de troca de comida", valor: 9 },
  { texto: "os dois emboscaram juntos uma patrulha do governo", valor: 10 },
  { texto: "líderes de clã fizeram a ponte entre os dois", valor: 7 },
  { texto: "um sequestro de um comandante", valor: -14 }
];
const chavePar = (a, b) => (a.id < b.id ? a.id + "-" + b.id : b.id + "-" + a.id);
function rel(P, a, b) {
  P.diplo = P.diplo || new Map();
  const k = chavePar(a, b);
  if (!P.diplo.has(k)) P.diplo.set(k, { valor: Math.round(P.r.entre(-12, 12)), tendencia: P.r.entre(-.55, .55), estado: "neutro", desde: P.tempo, lutouContra: {}, exaustao: {} });   // cada par começa com uma simpatia diferente
  return P.diplo.get(k);
}
function estadoEntre(P, a, b) {
  if (!a || !b || a === b) return "mesmo";
  if (a.governo || b.governo) return "guerra";
  return rel(P, a, b).estado;
}
const hostis = (P, a, b) => !!a && !!b && a !== b && estadoEntre(P, a, b) === "guerra";
const aliados = (P, a, b) => !!a && !!b && a !== b && estadoEntre(P, a, b) === "alianca";
/* pode tomar o prédio? sem dono, do governo ou de quem está em guerra com ela */
const podeTomar = (P, fac, e) => e.dono !== fac && (!e.dono || e.dono.governo || hostis(P, fac, e.dono));
const rivaisVivas = P => P.faccoes.filter(f => !f.governo && !f.eliminada);

function mudaRelacao(P, a, b, d, motivo) {
  if (!a || !b || a === b || a.governo || b.governo) return;
  const r = rel(P, a, b); r.valor = limita(r.valor + d, -100, 100);
}
function mudaEstado(P, a, b, estado, porQuem) {
  const r = rel(P, a, b), antes = r.estado; if (antes === estado) return;
  r.estado = estado; r.desde = P.tempo;
  if (estado === "cessarfogo") { r.fimCessar = P.tempo + EXAUSTAO.cessarHoras * HORA; r.exCessar = (exaustaoEm(P, a, b) + exaustaoEm(P, b, a)) / 2; }
  if (estado === "guerra" && (antes === "pacto" || antes === "alianca") && porQuem) {
    for (const f of rivaisVivas(P)) if (f !== a && f !== b) mudaRelacao(P, porQuem, f, DIPLO.traicao);   // traição pega mal com todos
  }
  avisa(P, "diplomacia", { a, b, estado, antes, porQuem });
}

/* ---------- propostas ---------- */
function propostaPendente(P, de, para) { return (P.propostas || []).find(p => p.de === de && p.para === para); }
function propoe(P, de, para, tipo) {
  P.propostas = P.propostas || [];
  if (propostaPendente(P, de, para)) return null;
  const p = { de, para, tipo, expira: P.tempo + DIPLO.propostaDura * HORA };
  (rel(P, de, para).propostaEm ||= {})[tipo] = P.tempo;   // para o cooldown (vença, seja recusada ou aceita)
  P.propostas.push(p);
  avisa(P, "proposta", { p });
  return p;
}
const ESTADO_DA_PROPOSTA = { pacto: "pacto", alianca: "alianca", paz: "neutro", cessar: "cessarfogo" };
function respondeProposta(P, p, aceita) {
  P.propostas = P.propostas.filter(o => o !== p);
  if (aceita) { if ((p.tipo === "paz" || p.tipo === "cessar") && rel(P, p.de, p.para).estado !== "guerra") return; mudaEstado(P, p.de, p.para, ESTADO_DA_PROPOSTA[p.tipo]); if (p.tipo === "paz") apazigua(P, p.de, p.para); }
  else { rel(P, p.de, p.para).recusouEm = P.tempo; mudaRelacao(P, p.de, p.para, -3); avisa(P, "recusada", { p }); }
}
/* o jogador propõe a uma facção da IA: ela aceita se a relação deixar */
function jogadorPropoe(P, eu, fac, tipo) {
  const pf = pers(fac), r = rel(P, eu, fac), lim = { pacto: DIPLO.aceitaPacto + pf.acordo, alianca: DIPLO.aceitaAlianca + pf.acordo, paz: DIPLO.aceitaPaz + pf.guerra, cessar: DIPLO.aceitaPaz + pf.guerra }[tipo];
  const pode = { pacto: r.estado === "neutro", alianca: r.estado === "pacto", paz: r.estado === "guerra", cessar: r.estado === "guerra" }[tipo];
  if (!pode) return { ok: false, motivo: "não faz sentido agora" };
  if (tipo === "cessar") {   // cessar-fogo: aceita quem já está cansado (ou se a relação deixa)
    const ex = exaustaoEm(P, fac, eu), precisa = limiteAceita(P, fac, eu);
    if (ex < precisa && r.valor < lim) { r.recusouEm = P.tempo; return { ok: false, motivo: "ainda não está cansada da guerra (exaustão " + Math.round(ex) + ", precisa " + Math.round(precisa) + ")" }; }
    mudaEstado(P, eu, fac, "cessarfogo"); return { ok: true };
  }
  if (r.valor < lim) { r.recusouEm = P.tempo; return { ok: false, motivo: "relação baixa demais (" + Math.round(r.valor) + ", precisa " + lim + ")" }; }
  mudaEstado(P, eu, fac, ESTADO_DA_PROPOSTA[tipo]);
  if (tipo === "paz") apazigua(P, eu, fac);
  return { ok: true };
}
/* depois da paz: a relação sobe um pouco e ninguém declara guerra por 24 h */
function apazigua(P, a, b) { const r = rel(P, a, b); r.valor = Math.max(r.valor, EXAUSTAO.pazRelacao); r.pazAte = P.tempo + EXAUSTAO.pazHoras * HORA; }
function declaraGuerra(P, de, para) { if (de === para) return; mudaRelacao(P, de, para, -20); mudaEstado(P, de, para, "guerra", de); }
function rompe(P, de, para) {   // sai de pacto/aliança sem guerra
  const r = rel(P, de, para);
  if (r.estado === "alianca") mudaEstado(P, de, para, "pacto", de);
  else if (r.estado === "pacto") mudaEstado(P, de, para, "neutro", de);
  mudaRelacao(P, de, para, -8);
}

/* ---------- presentes e ajuda entre aliados ---------- */
function presenteia(P, de, para, tipo, qtd) {
  if (tipo === "dinheiro" || tipo === "comida") {
    if (de.recursos[tipo] < qtd) return false;
    de.recursos[tipo] -= qtd; if (para.recursos) para.recursos[tipo] += qtd;
    mudaRelacao(P, de, para, Math.min(25, qtd / (tipo === "dinheiro" ? DIPLO.presentePor : DIPLO.presentePor / 4)));
  } else {   // armas ou caixas de munição: só entre aliados
    if (!aliados(P, de, para)) return false;
    if (ehCaixa(tipo)) { const t = tipoDaCaixa(tipo), n = MUNICOES[t].caixa * qtd; if (de.municao[t] < n) return false; de.municao[t] -= n; para.municao[t] += n; }
    else { if ((de.arsenal[tipo] || 0) < qtd) return false; de.arsenal[tipo] -= qtd; para.arsenal[tipo] = (para.arsenal[tipo] || 0) + qtd; }
    mudaRelacao(P, de, para, Math.min(25, precoDe(tipo) * qtd / DIPLO.presentePor));
  }
  avisa(P, "presente", { de, para, tipo, qtd });
  return true;
}

/* ---------- exaustão de guerra ---------- */
/* a exaustão de "a" na guerra com "b" (0 a 100) */
function exaustaoEm(P, a, b) { const r = rel(P, a, b); return (r.exaustao && r.exaustao[a.id]) || 0; }
/* "a" se cansa na guerra com "b" (só conta enquanto estão em guerra; o governo não negocia, fica de fora) */
function cansa(P, a, b, v) {
  if (!a || !b || a === b || a.governo || b.governo || !v) return;
  const r = rel(P, a, b); if (r.estado !== "guerra") return;
  r.exaustao = r.exaustao || {}; r.exaustao[a.id] = Math.min(100, (r.exaustao[a.id] || 0) + v);
}
/* dinheiro gasto em armas e munição: cansa nas guerras em curso (dividido entre elas) */
function gastoDeGuerra(P, fac, valor) {
  if (!fac || fac.governo || !P.faccoes) return;
  const contra = P.faccoes.filter(o => o !== fac && !o.governo && !o.eliminada && hostis(P, fac, o)); if (!contra.length) return;
  for (const o of contra) cansa(P, fac, o, valor * EXAUSTAO.dinheiro / contra.length);
}
/* quanto a facção está cansada no total (a pior das guerras; some devagar depois) */
function exaustaoDe(P, f) { let m = 0; if (f && !f.governo && P.diplo) for (const r of P.diplo.values()) if (r.exaustao && r.exaustao[f.id] > m) m = r.exaustao[f.id]; return m; }
const fracaoExaustao = f => f && f.exaustao > EXAUSTAO.efeito ? Math.min(1, (f.exaustao - EXAUSTAO.efeito) / (100 - EXAUSTAO.efeito)) : 0;
const moralExaustao = f => fracaoExaustao(f) * EXAUSTAO.moral;            // quanto a moral máxima cai
const fatorVoluntarios = f => 1 - fracaoExaustao(f) * EXAUSTAO.voluntarios;
/* limite da exaustão para pedir e para aceitar cessar-fogo: a personalidade pesa; entre quem está na coalizão contra um terceiro, é mais fácil */
const bonusCoalizaoPaz = (P, a, b) => P.coalizao && P.coalizao.alvo !== a && P.coalizao.alvo !== b ? COALIZAO.bonusPaz : 0;
const limitePede = (P, a, b) => EXAUSTAO.busca + pers(a).guerra - bonusCoalizaoPaz(P, a, b);
const limiteAceita = (P, a, b) => EXAUSTAO.aceita + pers(a).guerra - bonusCoalizaoPaz(P, a, b);
function horaDaExaustao(P) {
  if (!P.diplo) return;
  const vivas = rivaisVivas(P), porId = new Map(P.faccoes.map(f => [f.id, f]));
  for (const [k, r] of P.diplo) {
    const [ia, ib] = k.split("-").map(Number), a = porId.get(ia), b = porId.get(ib); if (!a || !b) continue;
    r.exaustao = r.exaustao || {};
    for (const [f, o] of [[a, b], [b, a]]) {
      const v = r.exaustao[f.id] || 0; if (!v && r.estado !== "guerra") continue;
      if (f.eliminada || o.eliminada) { r.exaustao[f.id] = 0; continue; }
      r.exaustao[f.id] = r.estado === "guerra" ? Math.min(100, v + EXAUSTAO.tempo) : Math.max(0, v - (r.estado === "cessarfogo" ? EXAUSTAO.descansaCessar : EXAUSTAO.descansa));
    }
  }
  for (const f of vivas) f.exaustao = exaustaoDe(P, f);
}

/* ---------- coalizão contra quem cresce demais ---------- */
function prediosDe(P, f) { let n = 0; for (const e of P.reg.edificios) if (e.dono === f) n++; return n; }
function atualizaCoalizao(P, vivas, forca) {
  const co = P.coalizao, mediaOutros = t => { const o = vivas.filter(f => f !== t); return o.reduce((n, f) => n + forca.get(f), 0) / Math.max(1, o.length); };
  if (co) {
    if (vivas.includes(co.alvo) && P.tempo - co.desde < COALIZAO.minimoHoras * HORA) return;   // histerese: fica pelo menos 12 h
    const some = !vivas.includes(co.alvo) || vivas.length < 3 || forca.get(co.alvo) < mediaOutros(co.alvo) * COALIZAO.sai || prediosDe(P, co.alvo) < COALIZAO.minPredios * .8;
    if (some) { P.coalizao = null; P.coalizaoFimEm = P.tempo; avisa(P, "coalizao", { alvo: co.alvo, formou: false }); }
    return;
  }
  if (vivas.length < 3 || P.tempo - (P.coalizaoFimEm == null ? -1e9 : P.coalizaoFimEm) < COALIZAO.minimoHoras * HORA) return;
  const top = vivas.reduce((m, f) => forca.get(f) > forca.get(m) ? f : m);
  if (forca.get(top) >= mediaOutros(top) * COALIZAO.vezes && prediosDe(P, top) >= COALIZAO.minPredios) {
    P.coalizao = { alvo: top, desde: P.tempo };
    avisa(P, "coalizao", { alvo: top, formou: true });
  }
}

/* ---------- a cada hora ---------- */
/* força = prédios + 8 por soldado pronto (a função do mesmo nome em ia.js, só de soldados, agora é soldadosProntos) */
function forcaDaFaccao(P, f) { let n = 0; for (const e of P.reg.edificios) if (e.dono === f) n++; return n + P.soldados.filter(s => s.faccao === f && s.vida === "ok").length * 8; }
function horaDaDiplomacia(P) {
  horaDaExaustao(P);
  const vivas = rivaisVivas(P); if (vivas.length < 2) { P.coalizao = null; return; }
  const forca = new Map(vivas.map(f => [f, forcaDaFaccao(P, f)])), media = [...forca.values()].reduce((a, b) => a + b, 0) / vivas.length;
  atualizaCoalizao(P, vivas, forca);
  const alvoCo = P.coalizao && P.coalizao.alvo;
  // fronteira: quantos prédios de um estão colados aos do outro
  const front = new Map();
  for (const e of P.reg.edificios) {
    if (!e.dono || e.dono.governo) continue;
    P.reg.oc.edificiosPerto(e.x, e.z, 90, o => { if (o.dono && o.dono !== e.dono && !o.dono.governo && e.dono.id < o.dono.id) { const k = chavePar(e.dono, o.dono); front.set(k, (front.get(k) || 0) + 1); } });
  }
  for (let i = 0; i < vivas.length; i++) for (let j = i + 1; j < vivas.length; j++) {
    const a = vivas[i], b = vivas[j], r = rel(P, a, b);
    const f = front.get(chavePar(a, b)) || 0;
    if (f) mudaRelacao(P, a, b, DIPLO.fronteira * Math.min(4, f / 8));
    // inimigo em comum: os dois lutaram contra a mesma facção nas últimas horas
    const comum = Object.keys(a.lutouContra || {}).some(k => b.lutouContra && b.lutouContra[k] > P.tempo - 6 * HORA && a.lutouContra[k] > P.tempo - 6 * HORA);
    if (comum) mudaRelacao(P, a, b, DIPLO.inimigoComum);
    // medo de quem cresce demais
    if (forca.get(a) > media * DIPLO.medoAcima) mudaRelacao(P, a, b, DIPLO.medo);
    if (forca.get(b) > media * DIPLO.medoAcima) mudaRelacao(P, a, b, DIPLO.medo);
    // coalizão: as outras se aproximam entre si e pioram com quem cresce demais
    if (alvoCo) mudaRelacao(P, a, b, a === alvoCo || b === alvoCo ? -COALIZAO.afasta : COALIZAO.aproxima);
    mudaRelacao(P, a, b, r.tendencia);   // cada par tem seu jeito: uns se entendem, outros não
    // inimigo do meu inimigo: os dois estão em guerra com a mesma facção
    if (vivas.some(c => c !== a && c !== b && estadoEntre(P, a, c) === "guerra" && estadoEntre(P, b, c) === "guerra")) mudaRelacao(P, a, b, .6);
    if (r.estado === "cessarfogo") mudaRelacao(P, a, b, .8);   // a trégua acalma os ânimos
    if (r.estado !== "guerra") r.valor *= .998;
  }
  // cessar-fogo vencido: vira paz (neutro) ou volta à guerra
  for (let i = 0; i < vivas.length; i++) for (let j = i + 1; j < vivas.length; j++) fimDoCessarFogo(P, vivas[i], vivas[j]);
  // incidentes de vez em quando entre um par sorteado
  if (P.r() < 1 / 7) {
    const a = P.r.de(vivas), b = P.r.de(vivas.filter(f => f !== a));
    const inc = P.r.de(INCIDENTES); mudaRelacao(P, a, b, inc.valor);
    avisa(P, "incidente", { a, b, texto: inc.texto, valor: inc.valor });
  }
  // propostas vencidas
  P.propostas = (P.propostas || []).filter(p => { if (P.tempo > p.expira) { avisa(P, "propostavenceu", { p }); return false; } return true; });
  // coalizão: quem já se afastou do alvo e não está esgotado declara guerra (as outras IAs fazem o mesmo, então a guerra vem junta)
  if (alvoCo) for (const m of vivas) {
    if (m === alvoCo || m.jogador) continue;
    const r = rel(P, m, alvoCo);
    if (r.estado === "neutro" && r.valor <= COALIZAO.guerraAte + pers(m).guerra * .5 && exaustaoDe(P, m) < COALIZAO.cansaco) declaraGuerra(P, m, alvoCo);
  }
  // decisões dos líderes da IA
  for (let i = 0; i < vivas.length; i++) for (let j = i + 1; j < vivas.length; j++) decideDiplomacia(P, vivas[i], vivas[j]);
  // aliados que têm sobra mandam ajuda ao jogador às vezes
  const eu = vivas.find(f => f.jogador);
  if (eu) for (const f of vivas) if (!f.jogador && aliados(P, eu, f) && rel(P, eu, f).valor > 60 && P.r() < 1 / DIPLO.ajudaAliado) {
    if (f.municao.bala > 600) presenteia(P, f, eu, "cx-bala", 2);
    else if (noArsenal(f, "fuzil") > 2) presenteia(P, f, eu, "fuzil", 1);
  }
}
function fimDoCessarFogo(P, a, b) {
  const r = rel(P, a, b); if (r.estado !== "cessarfogo" || P.tempo < (r.fimCessar || 0)) return;
  // se pararam cansadas (média das duas no começo do cessar-fogo) ou a relação já está boa, a paz fica; senão a guerra volta
  const cansadas = (r.exCessar || 0) >= EXAUSTAO.paz, calma = r.valor >= DIPLO.propoePaz - 10;
  if (cansadas || calma) { mudaEstado(P, a, b, "neutro"); apazigua(P, a, b); }
  else mudaEstado(P, a, b, "guerra");
}
function decideDiplomacia(P, a, b) {
  const r = rel(P, a, b), ia = !a.jogador && !b.jogador, outro = a.jogador ? b : a, eu = a.jogador ? a : b.jogador ? b : null;
  const podeProporAoJogador = eu && !(r.recusouEm > P.tempo - DIPLO.esperaDepoisDeRecusa * HORA) && !propostaPendente(P, outro, eu);
  const cooldownOk = tipo => !(r.propostaEm && r.propostaEm[tipo] > P.tempo - DIPLO.esperaMesmaProposta * HORA);   // 20 h entre propostas iguais do mesmo par
  // exaustão de guerra: quem está cansado pede cessar-fogo; o outro aceita se também estiver cansado (ou se a relação deixa)
  if (r.estado === "guerra" && P.tempo - r.desde > EXAUSTAO.minGuerra * HORA) {
    for (const [x, y] of [[a, b], [b, a]]) {
      if (x.jogador || exaustaoEm(P, x, y) < limitePede(P, x, y)) continue;
      if (y.jogador) { if (podeProporAoJogador && cooldownOk("cessar")) { propoe(P, x, y, "cessar"); return; } continue; }
      if (exaustaoEm(P, y, x) >= limiteAceita(P, y, x) || r.valor >= DIPLO.aceitaPaz + pers(y).guerra) { mudaEstado(P, a, b, "cessarfogo"); return; }
    }
  }
  // personalidade: quem é agressivo entra em guerra mais fácil e aceita acordo mais difícil
  const [quem, contra] = ia ? (P.r() < .5 ? [a, b] : [b, a]) : [outro, eu];
  const pq = pers(quem), acordo = pq.acordo, guerra = pq.guerra;
  // oportunista: com quem é bem mais forte quer acordo; com quem é bem mais fraco, guerra
  let opo = 0;
  if (pq.fracos && !contra.governo) { const razao = forcaDaFaccao(P, contra) / Math.max(1, forcaDaFaccao(P, quem)); opo = razao > 1.5 ? -15 : razao < .6 ? 20 : 0; }
  const quer = r.estado === "neutro" && r.valor >= DIPLO.propoePacto + acordo + Math.min(0, opo) ? "pacto"
    : r.estado === "pacto" && r.valor >= DIPLO.propoeAlianca + acordo + Math.min(0, opo) ? "alianca"
    : r.estado === "guerra" && r.valor >= DIPLO.propoePaz + guerra + opo && P.tempo - r.desde > 6 * HORA ? "paz" : null;
  if (quer) { if (ia) { mudaEstado(P, a, b, ESTADO_DA_PROPOSTA[quer]); if (quer === "paz") apazigua(P, a, b); } else if (podeProporAoJogador && cooldownOk(quer)) propoe(P, outro, eu, quer); return; }
  if (r.estado === "neutro" && !(r.pazAte > P.tempo) && r.valor <= DIPLO.declaraGuerra + guerra + Math.max(0, opo)) declaraGuerra(P, quem, contra);
  else if (r.estado === "pacto" && r.valor <= DIPLO.rompePacto + guerra + Math.max(0, opo)) declaraGuerra(P, quem, contra);
  else if (r.estado === "alianca" && r.valor <= DIPLO.rompeAlianca) mudaEstado(P, a, b, "pacto", ia ? a : outro);
}

/* ---------- efeitos de batalha na relação ---------- */
function registraLuta(P, a, b) { if (!a || !b || a === b) return; (a.lutouContra = a.lutouContra || {})[b.id] = P.tempo; (b.lutouContra = b.lutouContra || {})[a.id] = P.tempo; }

/* ---------- líder da facção ---------- */
function criaLiderDaFaccao(P, fac) {
  const s = criaSoldado(P, fac, "lider", [55, 75]);
  s.atr.lideranca = Math.max(s.atr.lideranca, 70); s.vida = "comando"; s.cargo = "faccao"; s.xp = 200;
  s.esperaEm = fac.base; s.x = fac.base.x; s.z = fac.base.z;
  fac.liderFac = s;
  return s;
}
/* quando uma base é tomada: líderes que estavam lá fogem para outra base */
function baseCaiu(P, e, antes) {
  if (!antes || antes.governo || antes.eliminada) return;
  const outras = basesDe(P, antes).filter(b => b !== e);
  const destino = outras.length ? outras.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0] : null;
  if (antes.base === e) {
    if (!destino) { eliminaFaccao(P, antes, e); return; }
    antes.base = destino;
    if (antes.liderFac) { antes.liderFac.esperaEm = destino; antes.liderFac.x = destino.x; antes.liderFac.z = destino.z; }
    if (antes.recursos) antes.recursos.influencia = Math.max(0, antes.recursos.influencia - 20);
    for (const s of P.soldados) if (s.faccao === antes && s.vida === "ok") s.moral -= 15;
    avisa(P, "liderfugiu", { fac: antes, de: e, para: destino });
  }
  for (const b of (P.batalhoes || [])) if (b.faccao === antes && b.base === e) {
    if (destino || antes.base) { b.base = destino || antes.base; if (b.lider) { b.lider.esperaEm = b.base; b.lider.x = b.base.x; b.lider.z = b.base.z; } avisa(P, "batalhaomudou", { b, de: e }); }
  }
  for (const s of (antes.reserva || []).slice()) if (s.esperaEm === e) { s.esperaEm = destino || antes.base; }
}
function eliminaFaccao(P, fac, ondeCaiu) {
  if (fac.eliminada) return;
  fac.eliminada = true; fac.exaustao = 0; fac.alvoDoGoverno = false;   // limpa exaustão, alvo do governo e cessar-fogos
  for (const [k, r] of (P.diplo || [])) if (k.split("-").includes(String(fac.id))) { r.exaustao = {}; if (r.estado === "cessarfogo") r.estado = "neutro"; }
  for (const e of P.reg.edificios) if (e.dono === fac) { e.dono = null; e.donoAnterior = fac; }
  for (const z of P.reg.zonas) atualizaZona(z);
  for (const s of P.soldados) if (s.faccao === fac && ["ok", "ferido", "reserva", "comando", "fila", "tratando"].includes(s.vida)) { if (s.sq) tiraDoEsquadrao(P, s); s.vida = "desertou"; }
  fac.reserva = [];
  P.propostas = (P.propostas || []).filter(p => p.de !== fac && p.para !== fac);
  avisa(P, "eliminada", { fac, e: ondeCaiu });
  const vivas = rivaisVivas(P), eu = vivas.find(f => f.jogador);
  if (fac.jogador) avisa(P, "derrota", { fac });
  else if (eu && vivas.length === 1) avisa(P, "vitoria", { fac: eu });
}

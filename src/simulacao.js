"use strict";
/* ============================================================
   SIMULAÇÃO DA PARTIDA (sem tela)
   Tempo real com pausa. O jogador só dá ordens ao esquadrão
   (avançar até um prédio ou segurar posição); o combate é automático.
   ============================================================ */
const HORA = 60;                      // uma hora do jogo dura 60 segundos na velocidade 1x
const VELOCIDADE_A_PE = 2.4, VELOCIDADE_CORRENDO = 3.4;   // metros por segundo
const IA_PENSA_A_CADA = 4;            // segundos de jogo entre decisões das rivais
const DISTANCIA_DE_CONTATO = 190;     // a partir daqui os esquadrões podem se ver e lutar
const TRATAMENTO_HOSPITAL = 1.5 * HORA, TRATAMENTO_QG = 6 * HORA, VAGAS_QG = 2;
const CAIXA_GOVERNO = -250000, GASTO_GOVERNO_HORA = 2000;
const TIME_GOVERNO = ["lider", "metralhador", "fuzileiro", "fuzileiro"];
const TIME_GOVERNO_FORTE = ["lider", "metralhador", "granadeiro", "fuzileiro", "fuzileiro", "medico"];
const TIME_INICIAL = ["lider", "fuzileiro", "fuzileiro", "fuzileiro", "fuzileiro", "fuzileiro"];

function criaPartida(reg) {
  const P = { reg, faccoes: [], esquadroes: [], soldados: [], tempo: 0, velocidade: 1, pausado: false, ouvintes: [], efeitos: [],
    proximaIA: 0, proximoContato: 0, proximaCaptura: 0, proximaHora: HORA, proximaOfensiva: 4 * HORA, proximoContra: 10 * HORA, proximoEvento: 3 * HORA };
  P.r = criaSorteio(reg.semente + "-partida");
  P.governo = criaFaccao(0, "Governo antigo", COR_GOVERNO, { governo: true, arsenal: criaArsenal(), prisioneiros: [], reserva: [], fila: [], caixa: CAIXA_GOVERNO });
  P.faccoes.push(P.governo);
  for (const e of territorioInicial(reg, P.governo, P.r)) {
    const forte = e.zona.tipo === "velha" || e.tipo === "quartel" || e.tipo === "cidadela";
    novoEsquadrao(P, P.governo, e, forte ? TIME_GOVERNO_FORTE : TIME_GOVERNO, { nome: "Guarda do governo", base: [30, 55] });
  }
  return P;
}
function avisa(P, tipo, dados) { for (const f of P.ouvintes) f(tipo, dados); }

/* ---------- esquadrões ---------- */
function entradaDe(e) { const [u, v] = gira(0, e.d / 2 + 2.5, e.a); return [e.x + u, e.z + v]; }
function ativos(sq) { return sq.membros.filter(s => s.vida === "ok"); }
function escolheLider(P, sq) {
  const l = ativos(sq); if (!l.length) { sq.lider = null; return; }
  const antes = sq.lider;
  const aptos = l.filter(podeLiderar);   // quem pode comandar tem preferência
  sq.lider = (aptos.length ? aptos : l).reduce((a, b) => (b.atr.lideranca > a.atr.lideranca ? b : a));
  if (antes !== sq.lider) anota(P, sq.lider, "Assumiu o comando de " + sq.nome);
}
function novoEsquadrao(P, fac, e, funcoes, extra) {
  extra = extra || {};
  const sq = { id: P.esquadroes.length, faccao: fac, nome: extra.nome || "Esquadrão", membros: [], lider: null,
    x: e ? e.x : extra.x, z: e ? e.z : extra.z, rota: null, passo: 0, alvo: null, guarda: e || null,
    estado: e ? "guarnição" : "parado", rumo: 0, ordem: { tipo: "segurar" }, combate: false, semContato: 0, plano: "segurar",
    proximoPlano: 0, perdas: 0, conhecidos: new Map(), recuoAte: 0 };
  P.esquadroes.push(sq);
  if (funcoes) for (const f of funcoes) {
    const s = criaSoldado(P, fac, f, extra.base);
    entraNoEsquadrao(sq, s);
  }
  if (sq.membros.length) { sq.lider = sq.membros.find(s => s.funcao === "lider") || sq.membros[0]; posicionaNoLugar(P, sq); }
  return sq;
}
function entraNoEsquadrao(sq, s) {
  if (s.sq) s.sq.membros = s.sq.membros.filter(o => o !== s);
  if (sq.estado === "eliminado") sq.estado = "parado";
  s.sq = sq; sq.membros.push(s); s.dentro = sq.estado === "guarnição" ? sq.guarda : null;
}
function vagas(sq) {
  const l = ativos(sq), r = [];
  if (sq.estado === "guarnição" && sq.guarda) {
    const e = sq.guarda, per = 2 * (e.w + e.d);
    l.forEach((s, i) => {
      let t = (i + .5) / l.length * per, u, v, olha;
      if (t < e.w) { u = -e.w / 2 + t; v = e.d / 2 + .9; olha = Math.PI / 2; }
      else if ((t -= e.w) < e.d) { u = e.w / 2 + .9; v = e.d / 2 - t; olha = 0; }
      else if ((t -= e.d) < e.w) { u = e.w / 2 - t; v = -e.d / 2 - .9; olha = -Math.PI / 2; }
      else { t -= e.w; u = -e.w / 2 - .9; v = -e.d / 2 + t; olha = Math.PI; }
      const [du, dv] = gira(u, v, e.a); r.push([e.x + du, e.z + dv, e.a + olha]);
    });
  } else if (sq.estado === "andando") {
    const dx = Math.cos(sq.rumo), dz = Math.sin(sq.rumo);
    l.forEach((s, i) => { const lado = (i % 2 ? 1 : -1) * .9, atras = Math.floor(i / 2) * 2.4; r.push([sq.x - dx * atras - dz * lado, sq.z - dz * atras + dx * lado, sq.rumo]); });
  } else {
    l.forEach((s, i) => { const a = i / l.length * Math.PI * 2; r.push([sq.x + Math.cos(a) * 2.6, sq.z + Math.sin(a) * 2.6, a]); });
  }
  return r;
}
function posicionaNoLugar(P, sq) {
  const v = vagas(sq);
  ativos(sq).forEach((s, i) => { [s.x, s.z, s.rumo] = v[i]; s.dentro = sq.estado === "guarnição" ? sq.guarda : null; });
}
function centroDoEsquadrao(sq) {
  if (sq.combate) { const l = ativos(sq); if (l.length) { let x = 0, z = 0; for (const s of l) { x += s.x; z += s.z; } return [x / l.length, z / l.length]; } }
  if (sq.estado === "guarnição" && sq.guarda) { const e = sq.guarda, [u, v] = gira(0, e.d / 2 + 2.6, e.a); return [e.x + u, e.z + v]; }
  return [sq.x, sq.z];
}
function defensores(P, e, fac) { return P.esquadroes.filter(o => o.guarda === e && hostis(P, o.faccao, fac) && ativos(o).length > 0); }
function guarnicaoDe(P, e) { return P.esquadroes.filter(o => o.guarda === e && ativos(o).length > 0); }

function fundaFaccao(P, fac, e) {
  Object.assign(fac, { arsenal: criaArsenal(), prisioneiros: [], reserva: [], fila: [], recursos: Object.assign({}, RECURSOS_INICIAIS) });
  fac.arsenal.kit = 1; fac.municao = Object.assign({}, MUNICAO_INICIAL);
  preparaPaises(P, fac);
  P.faccoes.push(fac);
  fac.base = e;
  tomaEdificio(P, e, fac);
  criaLiderDaFaccao(P, fac);
  const sq = novoEsquadrao(P, fac, e, TIME_INICIAL, { nome: fac.jogador ? "1º Esquadrão" : "Esquadrão de " + fac.nome.split(" ")[0] });
  if (fac.jogador) {   // o jogador comanda por batalhões: o 1º começa com o esquadrão inicial e o estoque inicial
    const cmd = criaSoldado(P, fac, "lider", [50, 70]); cmd.atr.lideranca = Math.max(cmd.atr.lideranca, 64); cmd.xp = 120;
    const b = criaBatalhao(P, fac, cmd, e);
    sq.bat = b; for (const s of sq.membros) s.bat = b;
    for (const k of Object.keys(fac.arsenal)) passaItem(fac, b, k, fac.arsenal[k]);
    for (const t of Object.keys(fac.municao)) { b.municao[t] += fac.municao[t]; fac.municao[t] = 0; }
  } else if (!fac.governo) novoVeiculo(fac, 1);   // as rivais têm uma picape para os comboios
  fac.veiculos = fac.veiculos || [];
  return sq;
}

function tomaEdificio(P, e, fac, adesao) {
  const antes = e.dono; if (antes === fac) return;
  e.dono = fac; e.donoAnterior = antes; if (e.fortificado) e.fortificado *= .5;
  // o estoque guardado no prédio fica com quem tomou
  if (antes && antes.jogador && fac) {
    const perdido = [];
    if (e.estoque && !cargaVazia(e.estoque)) perdido.push(e.estoque);
    for (const b of batalhoesDe(P, antes)) if (b.base === e && !cargaVazia(b)) perdido.push(b);
    for (const est of perdido) {
      const txt = textoCarga(est), para = fac.jogador ? estoqueDaBase(e) : fac.arsenal && fac.municao ? fac : criaEstoque();
      if (para !== est) descarrega({ carga: est }, para);
      avisa(P, "estoqueperdido", { e, fac, antes, txt });
    }
  }
  if (antes && fac && !antes.governo && !fac.governo && !adesao) mudaRelacao(P, antes, fac, TIPOS_CHAVE.includes(e.tipo) ? DIPLO.tomarChave : DIPLO.tomarPredio);
  if (antes && !antes.governo && (antes.base === e || (P.batalhoes || []).some(b => b.faccao === antes && b.base === e) || basesDe(P, antes).length === 0 || e.tipo === "lider")) baseCaiu(P, e, antes);
  const zn = e.zona, donoAntes = zn.dono;
  atualizaZona(zn);
  avisa(P, "edificio", { e, fac, antes, adesao });
  if (zn.dono !== donoAntes) avisa(P, "zona", { zona: zn, dono: zn.dono, antes: donoAntes });
}

/* ---------- adesão: quem tem todos os pontos importantes de um bairro leva o bairro inteiro, aos poucos ---------- */
const ADESAO = { minutos: 4 };   // um prédio passa a cada 4 minutos do jogo, em cada bairro
function ehBase(P, e) { return P.faccoes.some(f => f.base === e) || (P.batalhoes || []).some(b => b.base === e); }
function podeAderir(P, e, fac) {
  if (e.dono === fac || e.destruido || TIPOS_CHAVE.includes(e.tipo) || ehBase(P, e)) return false;
  if (e.dono && !hostis(P, e.dono, fac)) return false;                       // prédio de facção em paz fica com ela
  return !P.esquadroes.some(o => o.guarda === e && o.faccao !== fac && ativos(o).length);   // com soldados dentro, não
}
function adesoes(P) {
  for (const zn of P.reg.zonas) {
    const d = zn.dono;
    if (!d || d.governo || d.eliminada) { zn.proximaAdesao = null; continue; }
    if (zn.proximaAdesao == null || zn.adesaoDe !== d) { zn.adesaoDe = d; zn.perdendoAvisado = null; zn.proximaAdesao = P.tempo + ADESAO.minutos * HORA / 60; zn.adesaoAcabou = false; avisa(P, "adesao", { zona: zn, fac: d, inicio: true }); continue; }
    if (P.tempo < zn.proximaAdesao) continue;
    zn.proximaAdesao = P.tempo + ADESAO.minutos * HORA / 60;
    const cand = zn.edificios.filter(e => podeAderir(P, e, d));
    if (!cand.length) { if (!zn.adesaoAcabou) { zn.adesaoAcabou = true; avisa(P, "adesao", { zona: zn, fac: d, fim: true }); } continue; }
    zn.adesaoAcabou = false;
    // passa primeiro o prédio mais perto de algum que já é dela: o bairro "vira" de vizinho em vizinho
    const meus = zn.edificios.filter(e => e.dono === d);
    let melhor = null, md = Infinity;
    for (const e of cand) { let m = Infinity; for (const o of meus) { const dd = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (dd < m) m = dd; } if (m < md) { md = m; melhor = e; } }
    const antes = melhor.dono;
    tomaEdificio(P, melhor, d, true);
    if (antes && !zn.perdendoAvisado?.has(antes)) { (zn.perdendoAvisado ||= new Set()).add(antes); avisa(P, "adesao", { zona: zn, fac: d, perde: antes }); }
  }
}

/* ---------- ordens ---------- */
function ordenaIr(P, sq, e) {
  sq.ordem = { tipo: "avancar", alvo: e };
  if (sq.combate) { avisa(P, "ordem", { sq, e }); return; }   // em combate, o líder decide como chegar lá
  rotaAte(P, sq, e);
  avisa(P, "ordem", { sq, e });
}
/* quem vai defender ou fazer ronda (jogador) dá a volta nas guarnições inimigas paradas */
function evitaPara(P, sq) {
  if (!sq.faccao.jogador || !sq.ordem || sq.ordem.tipo !== "defender") return null;
  return guarnicoesInimigas(P, sq.faccao);
}
function guarnicoesInimigas(P, fac) { const l = []; for (const q of P.esquadroes) if (q.guarda && ativos(q).length && hostis(P, q.faccao, fac)) l.push([q.guarda.x, q.guarda.z]); return l; }
function rotaAte(P, sq, e) {
  let [ax, az] = centroDoEsquadrao(sq);
  if (sq.guarda && !sq.combate) [ax, az] = entradaDe(sq.guarda);
  const [bx, bz] = entradaDe(e);
  sq.rota = rotaAPe(P.reg, ax, az, bx, bz, evitaPara(P, sq));
  sq.rota.push([e.x, e.z]);
  sq.x = sq.rota[0][0]; sq.z = sq.rota[0][1];
  sq.passo = 1; sq.alvo = e; sq.guarda = null; sq.estado = "andando";
  for (const s of sq.membros) s.dentro = null;
}
function ordenaSegurar(P, sq) {
  sq.ordem = { tipo: "segurar" }; sq.rota = null; sq.alvo = null;
  if (!sq.combate) {
    const [x, z] = centroDoEsquadrao(sq); sq.x = x; sq.z = z;
    let perto = null, md = 30;
    for (const e of P.reg.edificios) if (e.dono === sq.faccao) { const d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; perto = e; } }
    if (perto && !guarnicaoDe(P, perto).some(o => o !== sq)) { sq.guarda = perto; sq.estado = "guarnição"; } else sq.estado = "parado";
  }
  avisa(P, "ordem", { sq });
}

function chegou(P, sq) {
  const e = sq.alvo; sq.rota = null;
  if (!e) { chegouAoPonto(P, sq); return; }
  const def = defensores(P, e, sq.faccao);
  if (def.length) {   // o prédio tem defensores: começa o combate
    const [x, z] = entradaDe(e); sq.x = x; sq.z = z; sq.estado = "parado";
    entraEmCombate(P, sq); for (const d of def) entraEmCombate(P, d);
    avisa(P, "defendido", { sq, e, def });
    return;
  }
  if (sq.sub === e) { tomouNoCaminho(P, sq, e); return; }
  if (sq.ordem.tipo === "defender" || sq.ordem.alvo === e || sq.ordem.tipo === "segurar") { sq.ordem = { tipo: "segurar" }; ocupa(P, sq, e); return; }
  ocupa(P, sq, e);
}
function tomouNoCaminho(P, sq, e) {
  if (podeTomar(P, sq.faccao, e)) tomaEdificio(P, e, sq.faccao);
  if (sq.ordem.visitados) sq.ordem.visitados.add(e);
  sq.sub = null; sq.alvo = null;
  const [x, z] = entradaDe(e); sq.x = x; sq.z = z; sq.estado = "parado";
  continuaOrdem(P, sq);
}
function ocupa(P, sq, e) {
  if (e.dono !== sq.faccao && !podeTomar(P, sq.faccao, e)) { const [x, z] = entradaDe(e); sq.x = x; sq.z = z; sq.estado = "parado"; sq.alvo = null; sq.rota = null; sq.ordem = { tipo: "segurar" }; return; }   // não é inimigo: não entra
  sq.x = e.x; sq.z = e.z; sq.guarda = e; sq.estado = "guarnição"; sq.alvo = null; sq.rota = null;
  sq.ordem = { tipo: "segurar" };
  for (const s of ativos(sq)) s.dentro = e;
  tomaEdificio(P, e, sq.faccao);
  avisa(P, "chegou", { sq, e });
}

function anda(P, sq, dist) {
  while (dist > 0 && sq.rota && sq.passo < sq.rota.length) {
    const [tx, tz] = sq.rota[sq.passo], dx = tx - sq.x, dz = tz - sq.z, d = Math.hypot(dx, dz);
    if (d > .01) sq.rumo = Math.atan2(dz, dx);
    if (d <= dist) { sq.x = tx; sq.z = tz; dist -= d; sq.passo++; }
    else { sq.x += dx / d * dist; sq.z += dz / d * dist; dist = 0; }
  }
  if (sq.rota && sq.passo >= sq.rota.length) chegou(P, sq);
}
/* Fora de combate, cada soldado anda até o seu lugar na formação */
function acompanha(P, sq, dt) {
  const v = vagas(sq);
  ativos(sq).forEach((s, i) => {
    const [x, z, r] = v[i], d = Math.hypot(x - s.x, z - s.z);
    if (d > 60) { s.x = x; s.z = z; }
    else if (d > .05) { const p = Math.min(1, VELOCIDADE_CORRENDO * 1.4 * dt / d); s.x += (x - s.x) * p; s.z += (z - s.z) * p; }
    s.rumo = d > .5 ? Math.atan2(z - s.z, x - s.x) : r;
    s.dentro = sq.estado === "guarnição" ? sq.guarda : null;
    s.moral = Math.min(moralMax(s), s.moral + dt * .5);
  });
}

/* ---------- IA simples das facções rivais ---------- */
function pensaRival(P, fac) {
  const reg = P.reg;
  if (fac.eliminada) return;
  for (const sq of P.esquadroes) {
    if (sq.faccao !== fac || sq.estado === "andando" || sq.combate || !ativos(sq).length) continue;
    if (semArma(sq)) { if (noArsenal(fac, "fuzil") > 0 || !pertoDoQG(fac, sq)) mandaAoQG(P, sq); continue; }
    if (precisaRecarregar(sq) && !pertoDoQG(fac, sq)) { mandaAoQG(P, sq); continue; }
    if (sq.reforco) { if (ativos(sq).length < 4) { juntaReforcos(P, sq); continue; } sq.reforco = false; }
    const forca = ativos(sq).length;
    let melhor = null, md = Infinity;
    // evita alvos perto de guarnições inimigas fortes (o caminho passaria por elas)
    const perigos = P.esquadroes.filter(o => hostis(P, o.faccao, fac) && o.guarda && ativos(o).length >= forca - 1);
    const vale = e => {
      if (!podeTomar(P, fac, e)) return false;
      if (perigos.some(o => o.guarda !== e && Math.hypot(o.guarda.x - e.x, o.guarda.z - e.z) < 240)) return false;
      const def = defensores(P, e, fac); if (!def.length) return true;
      return forca >= def.reduce((n, d) => n + ativos(d).length, 0) + 2;
    };
    for (const zn of reg.zonas) {
      if (Math.hypot(zn.x - sq.x, zn.z - sq.z) > 1400) continue;
      for (const e of zn.chaves) { if (!vale(e)) continue; const d = Math.hypot(e.x - sq.x, e.z - sq.z) * (e.zona === fac.base.zona ? .5 : 1); if (d < md && d < 900) { md = d; melhor = e; } }
    }
    if (!melhor) for (const e of reg.edificios) { if (!podeTomar(P, fac, e) || defensores(P, e, fac).length) continue; const d = Math.hypot(e.x - sq.x, e.z - sq.z); if (d < md && d < 260) { md = d; melhor = e; } }
    if (melhor) ordenaIr(P, sq, melhor);
  }
}

/* reforços pequenos da IA se juntam com outro esquadrão parado perto */
function juntaReforcos(P, sq) {
  const [x, z] = centroDoEsquadrao(sq);
  const outro = P.esquadroes.find(o => o !== sq && o.faccao === sq.faccao && !o.combate && o.estado !== "andando" && ativos(o).length && !semArma(o) && Math.hypot(centroDoEsquadrao(o)[0] - x, centroDoEsquadrao(o)[1] - z) < DISTANCIA_PARA_TROCAR);
  if (outro) for (const s of ativos(sq)) moveSoldado(P, s, outro);
}

/* ---------- feridos, tratamento e reserva ---------- */
function temMedico(sq, ferido) { return ativos(sq).some(m => m.funcao === "medico" && m.item === "kit" && m !== ferido); }
function evacua(P, s) {
  const fac = s.faccao, sq = s.sq;
  if (sq) { sq.membros = sq.membros.filter(o => o !== s); if (sq.lider === s) escolheLider(P, sq); }
  s.sqAntes = sq; s.sq = null;
  const hospital = P.reg.edificios.find(e => e.tipo === "hospital" && e.dono === fac);
  if (hospital) { s.vida = "tratando"; s.ondeTrata = "hospital"; s.fimTrat = P.tempo + TRATAMENTO_HOSPITAL; }
  else if (fac.base) { s.vida = "fila"; s.ondeTrata = "QG"; fac.fila.push(s); }
  else { s.vida = "morto"; anota(P, s, "Morreu: não havia onde tratar o ferimento"); }
}
function tratamentos(P) {
  for (const fac of P.faccoes) {
    if (!fac.fila) continue;
    const noQG = P.soldados.filter(s => s.faccao === fac && s.vida === "tratando" && s.ondeTrata === "QG").length;
    for (let i = noQG; i < VAGAS_QG && fac.fila.length; i++) { const s = fac.fila.shift(); s.vida = "tratando"; s.fimTrat = P.tempo + TRATAMENTO_QG; }
  }
  for (const s of P.soldados) {
    if (s.vida !== "tratando" || P.tempo < s.fimTrat) continue;
    s.vida = "ok"; s.moral = s.atr.coragem + 20;
    anota(P, s, "Voltou do tratamento (" + s.ondeTrata + ")");
    const fac = s.faccao, volta = s.sqAntes && ativos(s.sqAntes).length && !fac.jogador ? s.sqAntes : null;
    if (volta) { entraNoEsquadrao(volta, s); const [x, z] = centroDoEsquadrao(volta); s.x = x; s.z = z; }
    else { fac.reserva.push(s); const e = fac.base || P.reg.edificios.find(b => b.tipo === "hospital" && b.dono === fac); if (e) { s.x = e.x; s.z = e.z; } s.vida = "reserva"; s.esperaEm = fac.base; }
    avisa(P, "tratado", { s });
  }
}

/* ---------- mexer na formação (jogador) ---------- */
const DISTANCIA_PARA_TROCAR = 60;
function pertoDoQG(fac, sq) { if (!fac.base) return false; const [x, z] = centroDoEsquadrao(sq); return Math.hypot(x - fac.base.x, z - fac.base.z) < DISTANCIA_PARA_TROCAR; }
function podeTrocarFuncao(P, s, funcao) {
  const f = FUNCOES[funcao], fac = s.faccao;
  if (s.vida !== "ok" && s.vida !== "reserva") return "fora de combate";
  if (funcao === "lider") return null;
  const precisaArma = f.arma !== s.arma && !(funcao === "lider" && s.arma), precisaItem = f.item && f.item !== s.item;
  if (!precisaArma && !precisaItem) return null;
  if (s.sq && !pertoDeBase(P, fac, s.sq)) return "precisa estar numa base";
  const aqui = s.faccao.jogador ? estoquesNaBase(P, s.faccao, s.bat, baseDoSoldado(P, s)) : [s.faccao];
  if (precisaArma && somaArsenal(aqui, f.arma) < 1) return "sem " + ARMAS[f.arma].n.toLowerCase() + " nesta base";
  if (precisaItem && somaArsenal(aqui, f.item) < 1) return "sem " + ITENS[f.item].toLowerCase() + " nesta base";
  return null;
}
function trocaFuncao(P, s, funcao) {
  if (podeTrocarFuncao(P, s, funcao)) return false;
  const f = FUNCOES[funcao], fac = (s.faccao.jogador ? estoquesNaBase(P, s.faccao, s.bat, baseDoSoldado(P, s))[0] : null) || estoqueDe(s);
  if (funcao === "lider") { if (s.sq) { s.sq.lider = s; anota(P, s, "Nomeado líder de " + s.sq.nome); } return true; }
  if (f.arma !== s.arma) devolveArma(fac, s);
  if (s.item !== (f.item || null)) devolveItem(fac, s);
  s.funcao = funcao;
  equipaNaBase(P, s);   // pega o melhor nível que tiver e enche a munição
  return true;
}
function moveSoldado(P, s, destino) {   // destino: esquadrão ou "novo"
  const de = s.sq;
  if (destino === "novo") {
    const [x, z] = de ? centroDoEsquadrao(de) : [s.x, s.z];
    const n = P.esquadroes.filter(q => q.faccao === s.faccao).length + 1;
    destino = novoEsquadrao(P, s.faccao, null, null, { nome: n + "º Esquadrão", x, z });
    destino.bat = s.bat || null;
  }
  if (destino.bat !== undefined && destino.bat !== null) s.bat = destino.bat;
  if (s.vida === "reserva") { s.faccao.reserva = s.faccao.reserva.filter(o => o !== s); s.vida = "ok"; }
  entraNoEsquadrao(destino, s);
  if (!destino.lider || destino.lider.vida !== "ok") destino.lider = s;
  if (de && de.lider === s) escolheLider(P, de);
  [s.x, s.z] = centroDoEsquadrao(destino);
  return destino;
}

/* ---------- passo do tempo ---------- */
function passoDaPartida(P, dtReal) {
  if (P.pausado) return;
  let resta = Math.min(dtReal, .1) * P.velocidade;
  while (resta > 0) { const dt = Math.min(resta, .25); resta -= dt; subpasso(P, dt); }
}
function subpasso(P, dt) {
  P.tempo += dt;
  veiculosDoPasso(P, dt);
  if (P.governo) P.governo.caixa -= GASTO_GOVERNO_HORA * dt / HORA;
  for (const sq of P.esquadroes) {
    if (!ativos(sq).length) { if (sq.estado !== "eliminado") { sq.combate = false; sq.estado = "eliminado"; sq.rota = null; sq.guarda = null; if (sq.membros.some(s => ["morto", "ferido", "tratando", "fila", "rendido", "desertou"].includes(s.vida))) avisa(P, "eliminado", { sq }); } continue; }
    if (sq.combate) combateDoEsquadrao(P, sq, dt);
    else { if (sq.estado === "andando") anda(P, sq, VELOCIDADE_A_PE * dt); acompanha(P, sq, dt); }
  }
  for (const s of P.soldados) if (s.vida === "ferido" && P.tempo - s.caiuEm > (s.sq && s.sq.combate !== undefined && temMedico(s.sq, s) ? 30 : 5)) evacua(P, s);
  if (P.tempo >= P.proximoContato) { P.proximoContato = P.tempo + 1; procuraContato(P); tratamentos(P); }
  if (P.tempo >= P.proximaCaptura) { P.proximaCaptura = P.tempo + 1; verificaCapturas(P); varredura(P); for (const sq of P.esquadroes) if (ativos(sq).length) armaNoQG(P, sq); if (P.faccoes.some(f => f.jogador)) acaoNoMapa(P); batalhoesDoSegundo(P); missoesDoSegundo(P); adesoes(P); veiculosDoSegundo(P); fortificacoes(P, 1); }
  if (P.tempo >= P.proximaIA) {
    P.proximaIA = P.tempo + IA_PENSA_A_CADA;
    for (const f of P.faccoes) if (!f.jogador && !f.governo) pensaRival(P, f);
  }
  if (P.tempo >= P.proximaHora) {
    P.proximaHora += HORA;
    horaDoMercado(P); horaDaEconomia(P); horaDoRecrutamento(P); horaDasArmas(P); horaDaDiplomacia(P);
    for (const f of P.faccoes) if (!f.jogador && !f.governo && !f.eliminada) { economiaRival(P, f); recrutamentoRival(P, f); armasRival(P, f); }
    avisa(P, "hora", {});
  }
}
function relogio(P) {
  const min = Math.floor(P.tempo * 60 / HORA) + 6 * 60, dia = Math.floor(min / 1440) + 1, h = Math.floor(min / 60) % 24, m = min % 60;
  return "Dia " + dia + " · " + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
function resumoFaccao(P, fac) {
  let predios = 0; for (const e of P.reg.edificios) if (e.dono === fac) predios++;
  const zonas = P.reg.zonas.filter(z => z.dono === fac).length;
  const sold = P.soldados.filter(s => s.faccao === fac);
  const des = sold.filter(s => s.vida === "desertou").length;
  return { predios, zonas, esquadroes: P.esquadroes.filter(s => s.faccao === fac && ativos(s).length > 0).length,
    ativos: sold.filter(s => s.vida === "ok").length, feridos: sold.filter(s => s.vida === "ferido" || s.vida === "tratando" || s.vida === "fila").length,
    mortos: sold.filter(s => s.vida === "morto").length, desertores: des, presos: sold.filter(s => s.vida === "rendido").length, reserva: fac.reserva ? fac.reserva.length : 0 };
}

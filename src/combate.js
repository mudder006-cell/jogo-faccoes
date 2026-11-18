"use strict";
/* ============================================================
   COMBATE AUTOMÁTICO
   Cada soldado vê (campo de visão e linha de visada), avalia,
   ouve o plano do líder (obedece ou não), age e aprende.
   ============================================================ */
const MEMORIA_INIMIGO = 8;   // segundos que o esquadrão lembra onde viu um inimigo

function entraEmCombate(P, sq) {
  if (!sq || sq.combate || !ativos(sq).length) return;
  sq.combate = true; sq.semContato = 0; sq.proximoPlano = 0; sq.recuo = false; sq.tirosNoCombate = 0;
  for (const s of ativos(sq)) { s.destino = null; s.acao = "segurar"; s.pensa = P.r() * .4; }
  avisa(P, "combate", { sq });
}
function saiDoCombate(P, sq) {
  sq.combate = false; sq.conhecidos.clear(); sq.pediuAjuda = false;
  const vivos = ativos(sq);
  const lutou = (sq.tirosNoCombate || 0) > 0 || sq.perdasNoCombate > 0;   // só conta se houve troca de tiros
  for (const s of vivos) {
    s.destino = null; s.alvo = null;
    if (!lutou) { s.episodio = null; continue; }
    s.combates++;
    aprende(P, s, "reacao", 2, "sobreviveu a um combate");
    if (s !== sq.lider && nivelPatente(s) >= 1) aprende(P, s, "lideranca", 1);   // experientes aprendem a comandar vendo o líder
    avaliaEpisodio(P, s); s.episodio = null;
  }
  if (lutou && sq.lider && sq.perdasNoCombate < vivos.length) aprende(P, sq.lider, "lideranca", 3, "comandou um combate");
  sq.perdasNoCombate = 0;
  if (!vivos.length) return;
  const [x, z] = centroDoEsquadrao(sq); sq.x = x; sq.z = z;
  if (sq.recuo) {   // depois de recuar, volta para o prédio próprio mais perto
    sq.recuo = false;
    let perto = null, md = 900;
    for (const e of P.reg.edificios) if (e.dono === sq.faccao && !defensores(P, e, sq.faccao).length) { const d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; perto = e; } }
    if (perto) { sq.ordem = { tipo: "avancar", alvo: perto }; rotaAte(P, sq, perto); }
    else { sq.estado = "parado"; sq.ordem = { tipo: "segurar" }; }
  } else if (sq.sub && sq.sub.dono !== sq.faccao) rotaAte(P, sq, sq.sub);
  else if (sq.ordem.tipo === "avancar" || sq.ordem.tipo === "zona" || (sq.ordem.tipo === "defender" && sq.ordem.destino)) continuaOrdem(P, sq);
  else if (sq.guarda) { sq.estado = "guarnição"; for (const s of vivos) s.dentro = sq.guarda; }
  else sq.estado = "parado";
  avisa(P, "fimcombate", { sq });
}

/* ---------- ver ---------- */
function linhaLivre(P, ax, az, bx, bz) {
  const reg = P.reg, ha = alturaEm(reg, ax, az) + 1.6, hb = alturaEm(reg, bx, bz) + 1.6;
  for (let k = 1; k < 8; k++) { const t = k / 8; if (alturaEm(reg, ax + (bx - ax) * t, az + (bz - az) * t) > ha + (hb - ha) * t + .3) return false; }
  return !reg.oc.linhaCortada(ax, az, bx, bz, 3);
}
function procuraContato(P) {
  const l = P.esquadroes.filter(sq => ativos(sq).length);
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const a = l[i], b = l[j];
    if (!hostis(P, a.faccao, b.faccao) || (a.combate && b.combate)) continue;
    const [ax, az] = centroDoEsquadrao(a), [bx, bz] = centroDoEsquadrao(b);
    if (Math.hypot(ax - bx, az - bz) > DISTANCIA_DE_CONTATO) continue;
    let viu = false;
    for (const s of ativos(a).slice(0, 3)) { for (const o of ativos(b).slice(0, 3)) if (linhaLivre(P, s.x, s.z, o.x, o.z)) { viu = true; break; } if (viu) break; }
    if (viu) {
      for (const s of ativos(a)) b.conhecidos.set(s, { x: s.x, z: s.z, t: P.tempo });
      for (const o of ativos(b)) a.conhecidos.set(o, { x: o.x, z: o.z, t: P.tempo });
      entraEmCombate(P, a); entraEmCombate(P, b);
    }
  }
}
function inimigosPerto(P, sq) {
  const [x, z] = centroDoEsquadrao(sq), l = [];
  for (const o of P.esquadroes) {
    if (!hostis(P, o.faccao, sq.faccao)) continue;
    const [ox, oz] = centroDoEsquadrao(o); if (Math.hypot(ox - x, oz - z) > 340) continue;
    for (const s of ativos(o)) l.push(s);
  }
  return l;
}

/* ---------- cobertura ---------- */
function protecao(P, alvo, atirador) {
  if (alvo.dentro) {
    const e = alvo.dentro;
    if (e.destruido) return .85;   // escombros quase não protegem
    return (.4 + .5 * (e.dano || 0)) * (1 - .4 * (e.fortificado || 0));   // dano tira proteção; engenheiros fortificam
  }
  const dx = atirador.x - alvo.x, dz = atirador.z - alvo.z, d = Math.hypot(dx, dz) || 1;
  return P.reg.oc.edificioPerto(alvo.x + dx / d * 2.2, alvo.z + dz / d * 2.2, 0) ? .5 : 1;
}
function procuraCobertura(P, s, ameaca, objetivo, raio) {
  let melhor = null, mn = -Infinity;
  for (let i = 0; i < 12; i++) {
    const a = P.r.entre(0, 6.28), d = P.r.entre(3, raio), x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
    if (P.reg.oc.edificioPerto(x, z, .6)) continue;
    let nota = -d * .15;
    if (ameaca) {
      const dx = ameaca.x - x, dz = ameaca.z - z, dd = Math.hypot(dx, dz) || 1;
      if (P.reg.oc.edificioPerto(x + dx / dd * 2.2, z + dz / dd * 2.2, 0)) nota += 10;
    }
    if (objetivo) { const antes = Math.hypot(objetivo[0] - s.x, objetivo[1] - s.z), depois = Math.hypot(objetivo[0] - x, objetivo[1] - z); nota += (antes - depois) * .35; }
    if (nota > mn) { mn = nota; melhor = [x, z]; }
  }
  return melhor;
}

/* ---------- o líder decide o plano ---------- */
function planoDoLider(P, sq) {
  sq.proximoPlano = P.tempo + 2;
  const vivos = ativos(sq), conhecidos = [...sq.conhecidos.entries()].filter(([o, k]) => o.vida === "ok" && P.tempo - k.t < MEMORIA_INIMIGO);
  const meu = vivos.length, deles = conhecidos.length;
  const moral = vivos.reduce((n, s) => n + s.moral, 0) / Math.max(1, meu);
  let plano;
  const pos = sq.faccao.jogador ? postura(sq) : POSTURAS.equilibrado;
  if (moral < pos.moralRecuo || (deles > 0 && meu < deles * pos.razaoRecuo && sq.perdasNoCombate >= pos.perdasRecuo)) plano = "recuar";
  else if (sq.ordem.tipo === "segurar" || (sq.ordem.tipo === "defender" && sq.guarda)) plano = "segurar";
  else if (!deles) plano = "avancar";
  else if (meu >= deles * pos.vantagem) plano = sq.lider && sq.lider.pref.flanco > .55 ? "flanquear" : "avancar";
  else plano = "cobrir";
  if (plano !== sq.plano) avisa(P, "plano", { sq, plano });
  if (sq.faccao.jogador && (plano === "recuar" || (deles > meu && sq.perdasNoCombate >= 1))) pedeAjuda(P, sq);
  sq.plano = plano;
  if (sq.lider && sq.tirosNoCombate > 0) aprende(P, sq.lider, "lideranca", .1);   // comandar sob fogo ensina
  if (plano === "recuar" && !sq.recuo) {
    sq.recuo = true;
    if (sq.guarda) { avisa(P, "abandonou", { sq, e: sq.guarda }); sq.guarda = null; sq.estado = "parado"; for (const s of vivos) s.dentro = null; }
  }
}

/* ---------- cada soldado pensa ---------- */
function pensa(P, s, sq, inimigos) {
  avaliaEpisodio(P, s);
  const visao = 160 + s.atr.reacao * 1.2, vistos = [];
  const perto = inimigos.map(o => [o, Math.hypot(o.x - s.x, o.z - s.z)]).filter(([o, d]) => d < visao).sort((a, b) => a[1] - b[1]).slice(0, 6);
  for (const [o, d] of perto) {
    const olhando = difAng(Math.atan2(o.z - s.z, o.x - s.x), s.rumo) < 1.15 || d < 35 || (s.atacadoPor === o && P.tempo - s.atacadoEm < 3);
    if (olhando && linhaLivre(P, s.x, s.z, o.x, o.z)) { vistos.push([o, d]); sq.conhecidos.set(o, { x: o.x, z: o.z, t: P.tempo }); }
  }
  if (vistos.length) sq.semContato = 0;
  let alvo = vistos.length ? vistos[0][0] : null;
  if (s.funcao === "antitanque" && vistos.length) { const dentro = vistos.find(([o]) => o.dentro); if (dentro) alvo = dentro[0]; }
  let ameaca = alvo;
  if (!ameaca) { let md = Infinity; for (const [o, k] of sq.conhecidos) if (o.vida === "ok" && P.tempo - k.t < MEMORIA_INIMIGO) { const d = Math.hypot(k.x - s.x, k.z - s.z); if (d < md) { md = d; ameaca = { x: k.x, z: k.z, faccao: o.faccao }; } } }
  const dAmeaca = ameaca ? Math.hypot(ameaca.x - s.x, ameaca.z - s.z) : Infinity;

  // rendição: moral no chão e inimigo perto
  if (s.moral < 12 && ameaca && dAmeaca < 55 && P.r() < .5) { rende(P, s, ameaca.faccao); return; }

  const lider = sq.lider;
  const chance = limita(.3 + s.atr.disciplina / 250 + s.pref.obedece * .35 + (lider && lider !== s ? lider.atr.lideranca / 500 : 0), .2, .97);
  const obedece = s === lider || P.r() < chance;
  let acao;
  if (!s.arma || s.municao <= 0) acao = !ameaca ? "segurar" : dAmeaca < 120 ? "recuar" : "abrigar";
  else if (obedece) acao = { segurar: "segurar", cobrir: "atirar", avancar: "avancar", flanquear: "flanquear", recuar: "recuar" }[sq.plano] || "segurar";
  else if (s.moral < 28) acao = "recuar";
  else if (alvo && protecao(P, s, alvo) === 1 && P.r() < s.pref.cobertura) acao = "abrigar";
  else if (alvo) acao = "atirar";
  else if (sq.ordem.tipo === "avancar" || sq.ordem.tipo === "zona") acao = P.r() < s.pref.flanco ? "flanquear" : "avancar";
  else acao = "segurar";
  if (s.funcao === "metralhador" && alvo && (acao === "avancar" || acao === "flanquear")) acao = "atirar";   // cobre o avanço dos outros
  if (s.funcao === "medico" && s.item === "kit" && acao !== "recuar") {
    const ferido = sq.membros.filter(o => o.vida === "ferido" && (!o.medico || o.medico === s) && Math.hypot(o.x - s.x, o.z - s.z) < 70).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (ferido) { ferido.medico = s; s.paciente = ferido; s.destino = [ferido.x, ferido.z]; s.acao = "socorrer"; s.alvo = null; return; }
  }
  s.paciente = null;
  if (obedece && s !== lider && acao !== s.acao) aprende(P, s, "disciplina", .3);

  const obj = objetivoDe(sq) || (ameaca ? [ameaca.x, ameaca.z] : null);
  s.destino = null;
  if (acao === "segurar" || acao === "atirar") {
    if (!s.dentro && ameaca && protecao(P, s, ameaca) === 1 && P.r() < s.pref.cobertura * .6) s.destino = procuraCobertura(P, s, ameaca, null, 9);
  } else if (acao === "abrigar") s.destino = procuraCobertura(P, s, ameaca, null, 16);
  else if (acao === "avancar" && obj && alvo && protecao(P, s, alvo) < 1 && P.r() < .55) s.destino = null;   // abrigado: para e atira enquanto os outros avançam
  else if (acao === "avancar" && obj) {
    s.destino = procuraCobertura(P, s, ameaca, obj, 18);
    if (!s.destino) { const dx = obj[0] - s.x, dz = obj[1] - s.z, d = Math.hypot(dx, dz) || 1; s.destino = [s.x + dx / d * Math.min(14, d), s.z + dz / d * Math.min(14, d)]; }
  } else if (acao === "flanquear" && ameaca) {
    const dx = ameaca.x - s.x, dz = ameaca.z - s.z, d = Math.hypot(dx, dz) || 1, lado = s.id % 2 ? 1 : -1;
    s.destino = [s.x - dz / d * 20 * lado + dx / d * 8, s.z + dx / d * 20 * lado + dz / d * 8];
  } else if (acao === "recuar") {
    const ref = s.faccao.base || { x: 0, z: 0 };
    let dx = s.x - (ameaca ? ameaca.x : s.x - 1), dz = s.z - (ameaca ? ameaca.z : s.z);
    const d = Math.hypot(dx, dz) || 1, bx = ref.x - s.x, bz = ref.z - s.z, bd = Math.hypot(bx, bz) || 1;
    dx = dx / d + bx / bd * .6; dz = dz / d + bz / bd * .6; const n = Math.hypot(dx, dz) || 1;
    s.destino = [s.x + dx / n * 40, s.z + dz / n * 40]; s.dentro = null;
  }
  if (["abrigar", "avancar", "flanquear"].includes(acao) && !s.episodio)
    s.episodio = { tipo: acao === "abrigar" ? "abrigar" : acao, t0: P.tempo, acertos: s.acertos, ferimentos: s.ferimentos, perdasSq: sq.perdas, obedeceu: obedece && s !== lider };
  s.acao = acao; s.alvo = alvo;
  if (!alvo && ameaca && !s.destino) s.rumo = Math.atan2(ameaca.z - s.z, ameaca.x - s.x);   // vira para onde o inimigo foi visto
}

/* ---------- cada soldado age ---------- */
function age(P, s, sq, dt) {
  if (s.sobFogo > 0) {
    s.sobFogo -= dt;
    s.moral -= dt * 3 * (1 - s.atr.coragem / 150) * bonusDe(s).calma;
    if (s.acao !== "recuar") aprende(P, s, "coragem", .04 * dt * 4, "aguentou fogo inimigo");
  }
  if (s.paciente) {
    const o = s.paciente;
    if (o.vida !== "ferido") s.paciente = null;
    else if (Math.hypot(o.x - s.x, o.z - s.z) < 2.5) { s.destino = null; s.tempoTrat = (s.tempoTrat || 0) + dt; if (s.tempoTrat >= 4) trataNoCampo(P, s, o); }
    else s.destino = [o.x, o.z];
  }
  if (s.destino) {
    const [tx, tz] = s.destino, dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
    if (d < .8) s.destino = null;
    else {
      const v = (s.acao === "recuar" ? 3.8 : VELOCIDADE_CORRENDO) * dt, p = Math.min(1, v / d);
      let nx = s.x + dx * p, nz = s.z + dz * p;
      const oc = P.reg.oc, livre = (x, z) => !oc.edificioPerto(x, z, .3) || (s.dentro && pontoNoObb(s.dentro.o, x, z, 1));
      if (!livre(nx, nz)) { if (livre(nx, s.z)) nz = s.z; else if (livre(s.x, nz)) nx = s.x; else { nx = s.x; nz = s.z; s.destino = null; } }
      if (Math.abs(nx - s.x) + Math.abs(nz - s.z) > .001) s.rumo = Math.atan2(nz - s.z, nx - s.x);
      s.x = nx; s.z = nz;
      if (s.dentro && !pontoNoObb(s.dentro.o, s.x, s.z, 3)) s.dentro = null;
    }
  }
  const a = s.alvo;
  if (a && a.vida === "ok" && s.acao !== "recuar") {
    if (!s.destino) s.rumo = Math.atan2(a.z - s.z, a.x - s.x);
    s.recarga -= dt;
    if (s.recarga <= 0 && (!s.destino || P.r() < .4)) dispara(P, s, a);
  }
}

/* ---------- tiros ---------- */
function dispara(P, s, alvo) {
  if (!s.arma || s.municao <= 0) { s.recarga = 1; return; }
  const w = ARMAS[s.arma], d = Math.hypot(alvo.x - s.x, alvo.z - s.z), nv = (s.nivel || 1) - 1;
  if (d > w.alcance) { s.recarga = .5; return; }
  s.recarga = w.cadencia * (1.15 - s.atr.reacao / 250) * P.r.entre(.85, 1.15);
  s.municao--; if (s.sq) s.sq.tirosNoCombate = (s.sq.tirosNoCombate || 0) + 1;
  if (alvo.sq) alvo.sq.tirosNoCombate = (alvo.sq.tirosNoCombate || 0) + 1;
  const cob = protecao(P, alvo, s), mov = alvo.destino ? .75 : 1, euMov = s.destino ? .7 : 1, sup = s.sobFogo > 0 ? 1 - .3 * bonusDe(s).calma : 1;
  const chance = limita(.22 * w.precisao * NIVEL.precisao[nv] * bonusDe(s).precisao * (.45 + s.atr.pontaria / 90) * (1 - .65 * d / w.alcance) * cob * mov * euMov * sup, .02, .9);
  const acerta = P.r() < chance;
  aprende(P, s, "pontaria", .05);
  alvo.atacadoPor = s; alvo.atacadoEm = P.tempo;
  if (alvo.sq) entraEmCombate(P, alvo.sq);
  // explosivos: com amigo perto do alvo, quem é disciplinado segura o tiro
  if (w.area && ativos(s.sq || { membros: [] }).some(m => m !== s && Math.hypot(m.x - alvo.x, m.z - alvo.z) < w.area + 1.5) && P.r() < .35 + s.atr.disciplina / 150) { s.recarga = .8; return; }
  const desvio = acerta ? 0 : (2 + d * .04) * (alvo.dentro && w.mira ? w.mira : 1);   // o RPG mira no prédio: alvo grande
  const ix = alvo.x + P.r.entre(-desvio, desvio), iz = alvo.z + P.r.entre(-desvio, desvio);
  P.efeitos.push({ tipo: w.area ? "granada" : "tiro", ax: s.x, az: s.z, bx: ix, bz: iz, cor: s.faccao.cor, arma: s.arma });
  if (w.area) { explode(P, s, w, ix, iz, NIVEL.area[nv]); return; }
  if (acerta) atingido(P, alvo, s);
  else alvo.sobFogo = Math.max(alvo.sobFogo, w.supressao ? 2.5 : 1);
  if (w.supressao) for (const o of P.soldados) if (o.vida === "ok" && o.faccao === alvo.faccao && Math.hypot(o.x - ix, o.z - iz) < 4) o.sobFogo = Math.max(o.sobFogo, 2);
}

/* ---------- explosão ----------
   Acerta quem está no raio, menos quem tem parede ou prédio no meio.
   Dentro de um prédio, quem está no mesmo prédio do impacto leva em cheio
   (o RPG mais que a granada). Também machuca soldados do próprio lado
   e estraga o prédio atingido. */
function explode(P, s, w, ix, iz, mult) {
  w = Object.assign({}, w, { area: w.area * (mult || 1) });
  let predio = null;
  P.reg.oc.edificiosPerto(ix, iz, 4, e => { if (!predio && pontoNoObb(e.o, ix, iz, 1.5)) predio = e; });
  if (predio) danificaPredio(P, predio, w.danoPredio || 0, s);
  const raioDentro = w.area * 1.5;
  for (const o of P.soldados) {
    if (o.vida !== "ok" || o === s) continue;
    const dd = Math.hypot(o.x - ix, o.z - iz); if (dd > 9) continue;
    const amigo = o.faccao === s.faccao;
    if (!amigo && dd < 8) { o.sobFogo = Math.max(o.sobFogo, 2); if (o.sq) entraEmCombate(P, o.sq); }
    let fator;
    if (o.dentro && o.dentro === predio) { if (dd > raioDentro) continue; fator = w.contraPredio * (predio.destruido ? 1 : 1 - .3 * (predio.fortificado || 0)) * (1 - dd / raioDentro * .5); }
    else {
      if (dd > w.area) continue;
      if (o.dentro && !o.dentro.destruido) fator = .25;                                  // as paredes do prédio dele seguram quase tudo
      else if (P.reg.oc.linhaCortada(ix, iz, o.x, o.z, 1.2)) continue;                    // prédio ou muro no meio: protegido
      else fator = 1;
      fator *= 1 - dd / w.area * .5;
    }
    if (P.r() < .65 * fator) atingido(P, o, s, amigo);
  }
}
const DANO_DESTROI = 1;
function danificaPredio(P, e, dano, s) {
  if (!dano || e.destruido) return;
  const tamanho = e.w * e.d * Math.max(1, e.andares || 1);
  e.dano = Math.min(DANO_DESTROI, (e.dano || 0) + dano * limita(120 / tamanho, .12, 1.5));
  if (e.fortificado) e.fortificado = Math.max(0, e.fortificado - dano);
  if (e.dano >= DANO_DESTROI) { e.destruido = true; avisa(P, "destruido", { e, s }); }
  else avisa(P, "dano", { e });
}

function tiraDoEsquadrao(P, o) {
  const sq = o.sq; if (!sq) return;
  sq.perdas++; sq.perdasNoCombate = (sq.perdasNoCombate || 0) + 1;
  for (const m of ativos(sq)) if (m !== o && Math.hypot(m.x - o.x, m.z - o.z) < 40) m.moral -= (o === sq.lider ? 15 : 8) * (1 - m.atr.coragem / 200);
  if (o.vida !== "ferido") { sq.membros = sq.membros.filter(m => m !== o); o.sqAntes = sq; o.sq = null; }
  if (sq.lider === o) escolheLider(P, sq);
}
function atingido(P, o, s, amigo) {
  if (o.vida !== "ok") return;
  if (!amigo) { registraLuta(P, o.faccao, s.faccao); mudaRelacao(P, o.faccao, s.faccao, DIPLO.ferir); }
  if (!amigo) { s.acertos++; aprende(P, s, "pontaria", 2.5, "acertou um inimigo"); }
  const medico = o.sq && ativos(o.sq).some(m => m.funcao === "medico" && m.item === "kit" && m !== o && Math.hypot(m.x - o.x, m.z - o.z) < 40);
  const fatal = P.r() < Math.min(.6, (medico ? .14 : .3) * (s.arma ? NIVEL.dano[(s.nivel || 1) - 1] : 1) * bonusDe(o).fatal);   // arma melhor mata mais; veterano sabe se proteger   // arma melhor, ferimento pior
  o.ferimentos++; o.caiuEm = P.tempo; o.destino = null;
  const por = amigo ? "fogo amigo de " + s.nome : s.nome + " (" + s.faccao.nome + ")";
  if (fatal) { o.vida = "morto"; if (!amigo) { s.abates++; aprende(P, s, "pontaria", 3); } anota(P, o, "Morto por " + por); }
  else { o.vida = "ferido"; anota(P, o, "Ferido por " + por + (medico ? "; o médico estancou o sangramento" : "")); }
  if (amigo) { anota(P, s, "Acertou " + o.nome + ", do próprio lado, com uma explosão"); avisa(P, "fogoamigo", { o, s, fatal }); }
  tiraDoEsquadrao(P, o);
  if (s.sq && !amigo) for (const m of ativos(s.sq)) m.moral = Math.min(moralMax(m) + 10, m.moral + 3);
  avisa(P, "baixa", { o, s, fatal });
}
/* o médico trata o ferido ali mesmo: ferimento leve volta a lutar */
const CHANCE_LEVE = .6, USOS_KIT = 3;
function trataNoCampo(P, m, o) {
  m.tempoTrat = 0; m.paciente = null; o.medico = null;
  const nk = (m.nivelItem || 1) - 1;
  m.usosKit = (m.usosKit == null ? NIVEL.kitUsos[nk] : m.usosKit) - 1;
  if (m.usosKit <= 0) { m.item = null; m.usosKit = null; anota(P, m, "O kit médico acabou; precisa de outro no QG"); avisa(P, "kitacabou", { s: m }); }
  aprende(P, m, "coragem", 1.5, "tratou um ferido sob fogo");
  if (P.r() < NIVEL.kitLeve[nk]) {
    o.vida = "ok"; o.moral = Math.max(o.moral, o.atr.coragem + 5); o.caiuEm = 0;
    if (!o.sq) { const sq = o.sqAntes || m.sq; if (sq) entraNoEsquadrao(sq, o); }
    anota(P, o, "Tratado no campo por " + m.nome + "; voltou a lutar");
    avisa(P, "tratadocampo", { s: o, m });
  } else { anota(P, o, "Ferimento grave: " + m.nome + " estabilizou, mas precisa de hospital"); o.caiuEm = P.tempo - 5; }
}
function rende(P, s, captor) {
  s.vida = "rendido"; s.caiuEm = P.tempo; s.destino = null;
  captor.prisioneiros.push(s);
  if (captor.arsenal) { if (s.arma) captor.arsenal[chave(s.arma, s.nivel || 1)]++; if (s.item) captor.arsenal[chave(s.item, s.nivelItem || 1)]++; if (s.arma && captor.municao) captor.municao[MUNICAO_DA[s.arma]] += Math.floor(s.municao); }
  s.arma = null; s.item = null; s.municao = 0;
  anota(P, s, "Rendeu-se a " + captor.nome + "; as armas ficaram com eles");
  tiraDoEsquadrao(P, s);
  avisa(P, "rendicao", { s, captor });
}

/* ---------- o esquadrão em combate ---------- */
function combateDoEsquadrao(P, sq, dt) {
  const inimigos = inimigosPerto(P, sq);
  if (P.tempo >= sq.proximoPlano) planoDoLider(P, sq);
  sq.semContato += dt;
  for (const s of ativos(sq)) {
    s.pensa -= dt;
    if (s.pensa <= 0) { s.pensa = .5 + P.r() * .2; pensa(P, s, sq, inimigos); }
    if (s.vida === "ok") age(P, s, sq, dt);
  }
  if (!ativos(sq).length) return;
  if (sq.semContato > 10) saiDoCombate(P, sq);
}

/* ---------- tomar prédio defendido ---------- */
function verificaCapturas(P) {
  for (const sq of P.esquadroes) {
    const e = sq.alvo || sq.sub || (sq.ordem.tipo === "avancar" ? sq.ordem.alvo : null);
    if (!e || !sq.combate || !podeTomar(P, sq.faccao, e)) continue;
    if (defensores(P, e, sq.faccao).length) continue;
    if (!ativos(sq).some(s => pontoNoObb(e.o, s.x, s.z, 8))) continue;
    if (sq.sub === e) { tomaEdificio(P, e, sq.faccao); if (sq.ordem.visitados) sq.ordem.visitados.add(e); sq.sub = null; sq.alvo = null; }
    else ocupa(P, sq, e);
  }
}

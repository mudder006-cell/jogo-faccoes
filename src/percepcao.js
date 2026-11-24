"use strict";
/* ============================================================
   PERCEPÇÃO: ver ou saber (protótipo 19)
   O soldado só escolhe alvo em quatro casos:
     (a) vê o inimigo (linha de visada, cone e alcance: regra de sempre, em combate.js);
     (b) um colega a poucos metros gritou "contato" e deu a posição (aviso);
     (c) levou tiro e sabe de que lado veio (direção com erro);
     (d) lembra de ter visto o inimigo se abrigar e ainda não o viu sair.
   Em (b), (c) e (d) o tiro é de supressão: gasta munição, quase não acerta e
   segura a cabeça do inimigo (baixa a moral dele). Sem nenhum dos quatro, não atira.
   Cada soldado guarda a última posição conhecida de cada inimigo (s.mem), com hora e
   origem (viu, aviso, tiro, abrigo); a lembrança esmaece com o tempo. As rivais usam
   exatamente a mesma regra. A grade espacial (quadradinhos do mapa) evita comparar
   cada esquadrão com todos os outros. (Números provisórios.)
   ============================================================ */
const PERCEPCAO = {
  ligada: true,        // desligada: volta ao comportamento antigo (só atira em quem vê; memória só do esquadrão)
  grade: true,         // desligada: busca "todos contra todos" de antes
  aviso: 60,           // m: alcance do grito "contato" de um colega
  memoria: 60,         // s: a lembrança some depois disto
  janelaSupressao: 20, // s: atira em lugar suspeito (aviso ou tiro) enquanto a informação for mais nova que isto
  janelaAbrigo: 40,    // s: idem para quem lembra de ter visto o inimigo se abrigar
  recemVisto: 1.5,     // s: até aqui o inimigo ainda conta como "visto agora"; depois só vale se estava em abrigo
  erroTiro: .12,       // erro da direção de quem levou tiro: fração da distância (mais 4 m)
  desvioSup: 3,        // m: espalhamento do tiro de supressão em volta do ponto lembrado (mais 5% da distância)
  precisaoSup: .2,     // chance de acerto da supressão, comparada a mirar de verdade
  raioSup: 6,          // m: o tiro de supressão só pode acertar quem está a até isto do ponto de impacto
  moralSup: .8,        // pontos de moral que o inimigo perde por tiro de supressão que passa perto (antes da coragem)
  celula: 120          // m: lado do quadradinho da grade espacial
};
const RANGO_ORIGEM = { viu: 3, aviso: 2, tiro: 1 };

/* ---------- grade espacial ---------- */
function criaGrade(celula) { return { c: celula, m: new Map() }; }
function poeNaGrade(G, x, z, obj) {
  const k = Math.floor(x / G.c) * 100003 + Math.floor(z / G.c); let l = G.m.get(k);
  if (!l) G.m.set(k, l = []); l.push(obj);
}
/* chama fn(obj) para tudo que está nos quadradinhos que tocam o quadrado de lado 2*raio em volta de (x, z) */
function buscaNaGrade(G, x, z, raio, fn) {
  const i0 = Math.floor((x - raio) / G.c), i1 = Math.floor((x + raio) / G.c), j0 = Math.floor((z - raio) / G.c), j1 = Math.floor((z + raio) / G.c);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = G.m.get(i * 100003 + j); if (l) for (const o of l) fn(o); }
}
/* grade dos soldados em pé, refeita a cada passo de tempo em que alguém pede */
function gradeDeSoldados(P) {
  if (P.gradeSold && P.gradeSold.t === P.tempo) return P.gradeSold;
  const G = criaGrade(PERCEPCAO.celula); G.t = P.tempo;
  for (const s of P.soldados) if (s.vida === "ok") poeNaGrade(G, s.x, s.z, s);
  return (P.gradeSold = G);
}
/* grade dos esquadrões (pelo centro), feita no início do passo; quem pergunta confere o centro de novo */
function gradeDeEsquadroes(P) {
  if (P.gradeEsq && P.gradeEsq.t === P.tempo) return P.gradeEsq;
  const G = criaGrade(PERCEPCAO.celula * 2); G.t = P.tempo;
  P.esquadroes.forEach((sq, i) => { if (ativos(sq).length) { const [x, z] = centroDoEsquadrao(sq); poeNaGrade(G, x, z, i); } });
  return (P.gradeEsq = G);
}

/* ---------- memória por soldado ---------- */
/* guarda onde o soldado s soube que o inimigo o está; origem: viu, aviso ou tiro */
function lembra(P, s, o, x, z, origem) {
  const mem = s.mem, ant = mem.get(o);
  if (ant && ant.t > P.tempo - PERCEPCAO.recemVisto * 2 && RANGO_ORIGEM[ant.origem] > RANGO_ORIGEM[origem]) return;   // não troca visão recente por palpite
  // abrigo: visto dentro de um prédio, ou parado junto de um (a menos de 4 m), ou chegando nele (antes longe, agora junto). Visto saindo: deixa de ser abrigo.
  let abrigo = false, perto4 = false;
  if (origem === "viu") {
    perto4 = P.reg.oc.edificioPerto(o.x, o.z, 4);
    const vistoAntes = ant && ant.origem === "viu" && P.tempo - ant.t < 3;
    abrigo = !!o.dentro || (perto4 && (!!vistoAntes && (Math.hypot(o.x - ant.x, o.z - ant.z) < .8 || !ant.perto4)));
  }
  mem.set(o, { x, z, t: P.tempo, origem, abrigo, perto4 });
  if (mem.size > 24) for (const [k, v] of mem) if (P.tempo - v.t > PERCEPCAO.memoria || k.vida !== "ok") mem.delete(k);
  if (s.sq) s.sq.conhecidos.set(o, { x, z, t: P.tempo });   // o esquadrão soma o que os soldados sabem
}
/* de onde vem a informação hoje: "viu" antigo de quem entrou em abrigo vira "abrigo" */
function origemAgora(P, k) {
  if (k.origem !== "viu") return k.origem;
  if (P.tempo - k.t <= PERCEPCAO.recemVisto) return "viu";
  return k.abrigo ? "abrigo" : "perdido";
}
/* o colega grita "contato": quem está a poucos metros anota a posição */
function avisaColegas(P, s, o) {
  buscaNaGrade(gradeDeSoldados(P), s.x, s.z, PERCEPCAO.aviso, f => {
    if (f === s || f.faccao !== s.faccao || Math.hypot(f.x - s.x, f.z - s.z) > PERCEPCAO.aviso) return;
    lembra(P, f, o, o.x, o.z, "aviso");
  });
}
/* levou tiro: sabe de que lado veio, com erro */
function ouveTiro(P, alvo, atirador, d) {
  if (!alvo.mem || alvo.vida !== "ok") return;
  const e = PERCEPCAO.erroTiro * d + 4;
  lembra(P, alvo, atirador, atirador.x + P.r.entre(-e, e), atirador.z + P.r.entre(-e, e), "tiro");
}
/* melhor lugar suspeito para atirar de supressão (casos b, c, d); null se não há */
function alvoDeSupressao(P, s) {
  const w = ARMAS[s.arma]; if (!w || w.area || s.municao <= 0) return null;
  let melhor = null, md = Infinity;
  for (const [o, k] of s.mem) {
    if (o.vida !== "ok") continue;
    const idade = P.tempo - k.t, orig = origemAgora(P, k);
    if (orig === "viu" || orig === "perdido" || !hostis(P, s.faccao, o.faccao)) continue;   // só contra quem ainda é inimigo (pacto e aliança mudam isso)
    if (idade > (orig === "abrigo" ? PERCEPCAO.janelaAbrigo : PERCEPCAO.janelaSupressao)) continue;
    const d = Math.hypot(k.x - s.x, k.z - s.z); if (d > w.alcance || d >= md) continue;
    md = d; melhor = { x: k.x, z: k.z, o, origem: orig, t: k.t };
  }
  return melhor;
}
/* tiro de supressão: vai para o ponto lembrado; só acerta quem estiver de fato por perto */
function suprime(P, s, k) {
  const w = ARMAS[s.arma];
  if (!w || w.area || s.municao <= 0 || k.o.vida !== "ok" || !hostis(P, s.faccao, k.o.faccao) || P.tempo - k.t > PERCEPCAO.janelaAbrigo) { s.sup = null; s.recarga = 1; return; }   // inimigo caiu: para de atirar nele
  const d = Math.hypot(k.x - s.x, k.z - s.z), nv = (s.nivel || 1) - 1;
  if (d > w.alcance) { s.recarga = .5; return; }
  s.recarga = w.cadencia * (1.15 - s.atr.reacao / 250) * P.r.entre(.85, 1.15);
  s.municao--; if (s.sq) s.sq.tirosNoCombate = (s.sq.tirosNoCombate || 0) + 1;
  s.supTiros = (s.supTiros || 0) + 1;
  const dv = PERCEPCAO.desvioSup + d * .05, ix = k.x + P.r.entre(-dv, dv), iz = k.z + P.r.entre(-dv, dv);
  P.efeitos.push({ tipo: "tiro", ax: s.x, az: s.z, bx: ix, bz: iz, cor: s.faccao.cor, arma: s.arma });
  const o = k.o; if (o.vida !== "ok") return;
  const dr = Math.hypot(o.x - ix, o.z - iz); if (dr > PERCEPCAO.raioSup) return;   // errou o lugar: o inimigo nem percebe
  const cob = protecao(P, o, s);
  const chance = limita(.22 * w.precisao * NIVEL.precisao[nv] * bonusDe(s).precisao * (.45 + s.atr.pontaria / 90) * (1 - .65 * d / w.alcance) * cob * PERCEPCAO.precisaoSup * (1 - dr / PERCEPCAO.raioSup), .005, .3);
  ouveTiro(P, o, s, d);   // sabe só a direção, com erro (não marca atacadoPor: isso daria a posição exata)
  if (o.sq) entraEmCombate(P, o.sq);
  o.moral -= PERCEPCAO.moralSup * (1 - o.atr.coragem / 150) * bonusDe(o).calma;
  if (P.r() < chance) atingido(P, o, s);
  else o.sobFogo = Math.max(o.sobFogo, 2);
}

/* poda a memória de todos (chamado a cada poucos segundos, também fora de combate) */
function podaMemorias(P) {
  for (const s of P.soldados) if (s.mem.size) for (const [o, k] of s.mem) if (o.vida !== "ok" || P.tempo - k.t > PERCEPCAO.memoria) s.mem.delete(o);
}
/* ---------- o que o soldado enxerga, sabe ou lembra agora (usado por pensa em combate.js) ---------- */
function percebe(P, s, vistos) {
  if (s.mem.size) for (const [o, k] of s.mem) if (o.vida !== "ok" || P.tempo - k.t > PERCEPCAO.memoria) s.mem.delete(o);
  for (const [o] of vistos) { lembra(P, s, o, o.x, o.z, "viu"); avisaColegas(P, s, o); }
  s.sup = vistos.length || !s.arma ? null : alvoDeSupressao(P, s);
}
/* o que aparece no painel e nos ícones: alvo real (vendo) ou lugar suspeito (supressão) */
function defineMira(P, s, alvo) {
  s.mira = alvo ? { tipo: "vendo", o: alvo, t: P.tempo, origem: "viu" } : s.sup ? { tipo: "supressao", o: s.sup.o, t: s.sup.t, origem: s.sup.origem } : null;
}

/* ---------- para a tela e os testes ---------- */
/* a mira só vale para quem está de pé e em combate */
const miraVale = s => s.vida === "ok" && !!s.sq && s.sq.combate;
/* texto do painel do soldado */
function textoMira(P, s) {
  const m = miraVale(s) ? s.mira : null;
  if (!m) return miraVale(s) ? "Sem alvo: não vê nem sabe onde está o inimigo" : null;
  if (m.tipo === "vendo") return "Mirando em: " + m.o.nome + " (vendo)";
  const fac = m.o.faccao.jogador ? "seus soldados" : m.o.faccao.nome, h = Math.max(0, Math.round(P.tempo - m.t));
  if (m.origem === "abrigo") return "Supressão onde viu " + fac + " se abrigar há " + h + " s";
  if (m.origem === "aviso") return "Supressão onde um colega avisou ter visto " + fac + " há " + h + " s";
  return "Supressão na direção do tiro de " + fac + ", há " + h + " s";
}
/* ícone sobre o soldado: olho (vendo), orelha (ouviu ou levou tiro), interrogação (lugar suspeito, abrigo) */
function iconeMira(s) {
  const m = miraVale(s) ? s.mira : null; if (!m) return null;
  if (m.tipo === "vendo") return "olho";
  return m.origem === "abrigo" ? "interrogacao" : "orelha";
}
/* última posição conhecida de cada inimigo, pelos soldados da facção (a mais nova de cada um); refeita no máximo a cada segundo */
function ultimasPosicoes(P, fac) {
  const c = P.ultimas || (P.ultimas = new Map()), ant = c.get(fac);
  if (ant && P.tempo - ant.t < 1) return ant.lista;
  const por = new Map();
  for (const s of P.soldados) {
    if (s.faccao !== fac || s.vida !== "ok" || !s.mem || !s.mem.size) continue;
    for (const [o, k] of s.mem) {
      if (o.vida !== "ok" || P.tempo - k.t > PERCEPCAO.memoria) continue;
      const a = por.get(o);
      if (!a || k.t > a.t) por.set(o, { o, x: k.x, z: k.z, t: k.t, origem: origemAgora(P, k), base: k.origem, por: s });
    }
  }
  const lista = [...por.values()].filter(u => P.tempo - u.t > PERCEPCAO.recemVisto);   // quem está à vista aparece como soldado, não como marca
  c.set(fac, { t: P.tempo, lista });
  return lista;
}

"use strict";
/* ============================================================
   SOLDADOS
   Cada soldado tem atributos que sobem com a prática e um jeito de
   lutar próprio (preferências) que muda conforme o que deu certo ou
   errado para ele. Tudo isso vale só para a partida atual.
   Protótipo 19: cada soldado tem memória própria (s.mem: última posição
   conhecida de cada inimigo, com hora e origem), ver percepcao.js.
   ============================================================ */
const NOMES_SOLDADO = ["Ahmad", "Karim", "Omar", "Yusuf", "Khalil", "Samir", "Tariq", "Bilal", "Hamza", "Nabil", "Rami", "Fadi",
  "Walid", "Ziad", "Hassan", "Ali", "Mahmoud", "Imad", "Jamal", "Salim", "Faris", "Adnan", "Basel", "Majid", "Nizar", "Qasim",
  "Rashid", "Wael", "Yasin", "Munir", "Hadi", "Issa", "Jawad", "Malik", "Murad", "Saeed", "Talal", "Ayman", "Ghassan", "Raed"];
const INICIAIS = "ABDFGHJKMNQRSTZ";

const ARMAS = {
  fuzil:         { n: "Fuzil", alcance: 260, cadencia: 1.1, precisao: 1, area: 0 },
  metralhadora:  { n: "Metralhadora", alcance: 300, cadencia: .22, precisao: .5, area: 0, supressao: true },
  lancagranadas: { n: "Lança-granadas", alcance: 170, cadencia: 4, precisao: .8, area: 5, contraPredio: .25, danoPredio: .068 },
  rpg:           { n: "Lança-foguetes (RPG)", alcance: 200, cadencia: 7, precisao: .75, area: 4, contraPredio: .85, danoPredio: .34, mira: .5 }
};
const ITENS = { kit: "Kit médico", explosivo: "Explosivos" };
const FUNCOES = {
  lider:       { n: "Líder", arma: "fuzil" },
  fuzileiro:   { n: "Fuzileiro", arma: "fuzil" },
  metralhador: { n: "Metralhador (AR)", arma: "metralhadora" },
  granadeiro:  { n: "Granadeiro", arma: "lancagranadas" },
  antitanque:  { n: "Anti-tanque (AT)", arma: "rpg" },
  medico:      { n: "Médico", arma: "fuzil", item: "kit" },
  engenheiro:  { n: "Engenheiro", arma: "fuzil", item: "explosivo" }
};
const ATRIBUTOS = { pontaria: "Pontaria", reacao: "Reação", coragem: "Coragem", disciplina: "Disciplina", lideranca: "Liderança" };
const PATENTES = [[0, "Recruta"], [60, "Soldado"], [180, "Veterano"], [400, "Elite"]];
const PREFS = { cobertura: "Se abrigar", flanco: "Flanquear", obedece: "Obedecer o líder" };

function patente(s) { let p = PATENTES[0][1]; for (const [xp, n] of PATENTES) if (s.xp >= xp) p = n; return p; }
function nivelPatente(s) { let n = 0; PATENTES.forEach(([xp], i) => { if (s.xp >= xp) n = i; }); return n; }
/* bônus de cada patente (Recruta, Soldado, Veterano, Elite):
   moral a mais, precisão, calma sob fogo (menos perda de moral e de pontaria) e chance de um ferimento ser fatal */
const BONUS_PATENTE = [
  { moral: 0, precisao: 1, calma: 1, fatal: 1 },
  { moral: 5, precisao: 1.05, calma: .9, fatal: .85 },
  { moral: 10, precisao: 1.1, calma: .8, fatal: .7 },
  { moral: 15, precisao: 1.15, calma: .7, fatal: .55 }
];
const bonusDe = s => BONUS_PATENTE[nivelPatente(s)];
const moralMax = s => s.atr.coragem + 30 + bonusDe(s).moral;
/* pode comandar um esquadrão: Veterano ou mais, ou liderança 60+ */
const LIDERANCA_PARA_LIDERAR = 60;
function podeLiderar(s) { return nivelPatente(s) >= 2 || s.atr.lideranca >= LIDERANCA_PARA_LIDERAR; }

function criaSoldado(P, fac, funcao, base) {
  const r = P.r, b = base || [25, 55];
  const nome = r.de(NOMES_SOLDADO) + " " + INICIAIS[Math.floor(r() * INICIAIS.length)] + ".";
  const atr = {};
  for (const k of Object.keys(ATRIBUTOS)) atr[k] = Math.round(r.entre(b[0], b[1]));
  if (fac.governo) atr.coragem = Math.round(atr.coragem * .75);   // sem salário, sem moral
  const s = { id: P.soldados.length, nome, faccao: fac, sq: null, funcao, arma: FUNCOES[funcao].arma, item: FUNCOES[funcao].item || null,
    x: 0, z: 0, rumo: 0, vida: "ok", atr, xp: 0, moral: atr.coragem + 30, pref: { cobertura: r.entre(.3, .7), flanco: r.entre(.2, .6), obedece: r.entre(.5, .9) },
    acao: "parado", alvo: null, destino: null, recarga: r.entre(0, 1.5), sobFogo: 0, dentro: null, pensa: r.entre(0, .5), episodio: null,
    abates: 0, acertos: 0, ferimentos: 0, combates: 0, diario: [], caiuEm: 0, rosto: criaRosto(r, fac), nivel: 1, nivelItem: 1, municao: 0,
    mem: new Map(), sup: null, mira: null };   // percepção: última posição conhecida de cada inimigo, alvo de supressão e o que mostra a tela
  s.municao = cargaDe(s);
  s.suprimentos = fac.governo ? cargaSuprimento(s) : 0;   // o governo antigo já nasce com o que vai usar; os outros enchem a mochila numa base
  P.soldados.push(s);
  return s;
}

/* Rosto do retrato (desenhado na tela a partir destes números) */
const CABECAS = ["keffiyeh", "keffiyeh", "bandana", "gorro", "nada", "bone", "capacete"];
function criaRosto(r, fac) {
  const gov = fac && fac.governo;
  return { pele: Math.floor(r() * 6), cabelo: Math.floor(r() * 4), barba: r() < .2 ? 0 : r() < .5 ? 1 : 2, bigode: r() < .4,
    cabeca: gov ? (r() < .7 ? "capacete" : "bone") : r.de(CABECAS), pano: Math.floor(r() * 5), corDaFaccao: !gov && r() < .45,
    grisalho: r() < .12, olhos: r.entre(-.6, .6), rosto: r.entre(-.08, .08), sobrancelha: r.entre(-1, 1.2) };
}

/* Aprender: o atributo sobe mais devagar quanto mais alto já está */
function aprende(P, s, attr, pontos, motivo) {
  const antes = s.atr[attr];
  s.atr[attr] = Math.min(100, antes + pontos * (1 - antes / 110));
  const antesXp = s.xp; s.xp += pontos;
  if (Math.floor(s.atr[attr] / 10) > Math.floor(antes / 10)) anota(P, s, ATRIBUTOS[attr] + " subiu para " + Math.floor(s.atr[attr]) + (motivo ? " (" + motivo + ")" : ""));
  if (patente({ xp: antesXp }) !== patente(s)) { anota(P, s, "Promovido a " + patente(s)); avisa(P, "promovido", { s }); }
  if (!s.avisouLider && podeLiderar(s) && !(s.sq && s.sq.lider === s)) { s.avisouLider = true; avisa(P, "podeliderar", { s }); }
}
function anota(P, s, texto) {
  s.diario.unshift(relogio(P) + " · " + texto);
  if (s.diario.length > 8) s.diario.pop();
}
/* Ajusta o jeito de lutar depois de ver o resultado de uma escolha */
function avaliaEpisodio(P, s) {
  const ep = s.episodio; if (!ep || P.tempo - ep.t0 < 6) return;
  s.episodio = null;
  const ganho = (s.acertos - ep.acertos) - (s.ferimentos > ep.ferimentos ? 2 : 0) - (ep.perdasSq < (s.sq ? s.sq.perdas : 0) ? .5 : 0);
  const sinal = ganho > 0 ? 1 : ganho < 0 ? -1 : 0; if (!sinal) return;
  const p = s.pref, passo = .07 * sinal;
  if (ep.tipo === "abrigar") p.cobertura = limita(p.cobertura + passo, .05, .95);
  if (ep.tipo === "avancar") p.cobertura = limita(p.cobertura - passo, .05, .95);
  if (ep.tipo === "flanquear") p.flanco = limita(p.flanco + passo, .05, .95);
  if (ep.obedeceu) p.obedece = limita(p.obedece + passo * .7, .05, .98);
  const txt = { abrigar: sinal > 0 ? "abrigar-se funcionou" : "abrigado, mesmo assim foi mal",
                avancar: sinal > 0 ? "avançar deu certo, ficou mais ousado" : "avançou em campo aberto e se deu mal, vai se abrigar mais",
                flanquear: sinal > 0 ? "flanquear deu certo, vai tentar mais" : "o flanco não funcionou" }[ep.tipo];
  if (txt && Math.abs(ganho) >= 1) anota(P, s, "Aprendeu: " + txt);
}

/* Arsenal da facção (fica no QG) */
/* criaArsenal, textoArsenal: ver catalogo.js */

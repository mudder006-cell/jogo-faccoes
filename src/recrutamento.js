"use strict";
/* ============================================================
   RECRUTAMENTO
   - Voluntários: moradores dos seus bairros. Custam influência e
     chegam sem arma, no bairro de onde vieram.
   - Mercenários: custam dinheiro, já vêm armados e treinados, cobram
     salário maior. Chegam pelo prédio seu mais perto da borda do mapa.
   - Homens do clã: quem tem a casa do líder do clã recebe um grupo
     armado de uma vez (uma vez por dia por casa). Chegam na casa.
   - Prisioneiros: dá para convencer um prisioneiro a mudar de lado.
     Chega sem arma, no QG (onde os presos ficam).
   Quem chega sem arma precisa ir ao QG buscar uma no arsenal.
   (Números provisórios.)
   ============================================================ */
const RECRUTA = {
  voluntario:  { n: "Voluntário", icone: "volunteer_activism", influencia: 18, base: [20, 45] },
  mercenario:  { n: "Mercenário", icone: "paid", dinheiro: 450, base: [45, 70], salario: 12, arma: "fuzil" },
  cla:         { n: "Homens do clã", icone: "diversity_3", influencia: 60, qtd: 3, base: [30, 55], arma: "fuzil", espera: 24 * HORA },
  prisioneiro: { n: "Prisioneiro", icone: "lock_open", influencia: 30 }
};
const VOLUNTARIOS_POR_MORADOR = .012;   // por hora, em cada zona onde você tem casas
const MAX_VOLUNTARIOS_ZONA = 3;

function salarioDe(s) { return s.salario || SALARIO; }

/* a cada hora: os seus bairros produzem voluntários */
function horaDoRecrutamento(P) {
  for (const fac of P.faccoes) {
    if (fac.governo || !fac.recursos) continue;
    fac.voluntarios = fac.voluntarios || new Map();
    const mor = new Map();
    for (const e of P.reg.edificios) if (e.dono === fac && confiancaEm(fac, e.zona) >= CONFIANCA.voluntarios) mor.set(e.zona, (mor.get(e.zona) || 0) + moradoresDe(e));
    const apoio = 1 + Math.min(1, fac.recursos.influencia / 200);
    for (const [zn, m] of mor) fac.voluntarios.set(zn, Math.min(MAX_VOLUNTARIOS_ZONA, (fac.voluntarios.get(zn) || 0) + m * VOLUNTARIOS_POR_MORADOR * apoio));
    for (const zn of fac.voluntarios.keys()) if (!mor.has(zn)) fac.voluntarios.delete(zn);
  }
}
function zonasComVoluntarios(fac) {
  if (!fac.voluntarios) return [];
  return [...fac.voluntarios].filter(([, n]) => n >= 1).map(([zn, n]) => ({ zona: zn, n: Math.floor(n) }));
}

/* onde cada tipo de recruta aparece */
function chegadaVoluntario(P, fac, zn) {
  let melhor = null, md = Infinity;
  for (const e of zn.edificios) if (e.dono === fac) { const d = Math.hypot(e.x - zn.x, e.z - zn.z) - moradoresDe(e); if (d < md) { md = d; melhor = e; } }
  return melhor || fac.base;
}
function chegadaMercenario(P, fac) {
  let melhor = fac.base, md = Infinity;
  for (const e of P.reg.edificios) if (e.dono === fac) { const d = METADE - Math.max(Math.abs(e.x), Math.abs(e.z)); if (d < md) { md = d; melhor = e; } }
  return melhor;
}

/* os recrutas que chegam no mesmo lugar se juntam num esquadrão de recrutas ali */
function grupoDeChegada(P, fac, e, nome) {
  let sq = P.esquadroes.find(q => q.faccao === fac && q.recrutas && q.guarda === e && !q.combate && ativos(q).length < 8 && (!completa(fac) || q.bat === (fac.batalhaoPadrao || null)));
  if (!sq) {
    const n = P.esquadroes.filter(q => q.faccao === fac).length + 1;
    sq = novoEsquadrao(P, fac, null, null, { nome: nome || n + "º Esquadrão", x: e.x, z: e.z });
    sq.recrutas = true; sq.guarda = e; sq.estado = "guarnição"; sq.bat = completa(fac) ? fac.batalhaoPadrao || null : null;
    if (e.dono !== fac) tomaEdificio(P, e, fac);
  }
  return sq;
}
function chega(P, fac, s, e, nomeGrupo) {
  const sq = grupoDeChegada(P, fac, e, nomeGrupo);
  entraNoEsquadrao(sq, s); s.bat = sq.bat || null;
  if (!sq.lider || sq.lider.vida !== "ok") escolheLider(P, sq);
  posicionaNoLugar(P, sq);
  return sq;
}
function novoRecruta(P, fac, tipo, funcao) {
  const R = RECRUTA[tipo];
  const s = criaSoldado(P, fac, funcao || "fuzileiro", R.base);
  s.origem = tipo;
  s.arma = R.arma || null; s.municao = s.arma ? cargaDe(s) : 0;
  s.item = null;
  if (R.salario) s.salario = R.salario;
  if (tipo === "cla") s.atr.coragem = Math.min(100, s.atr.coragem + 10);
  s.moral = s.atr.coragem + 30;
  anota(P, s, "Entrou para " + fac.nome + " (" + R.n.toLowerCase() + ")" + (s.arma ? "" : ", sem arma"));
  return s;
}

/* ---------- ações ---------- */
function podeRecrutar(P, fac, tipo, alvo) {
  const R = RECRUTA[tipo], rec = fac.recursos;
  if (!fac.base) return "sem QG";
  if (R.influencia && rec.influencia < R.influencia) return "influência insuficiente";
  if (R.dinheiro && rec.dinheiro < R.dinheiro) return "dinheiro insuficiente";
  if (tipo === "voluntario") {
    if (!alvo) return zonasComVoluntarios(fac).length ? null : "nenhum bairro seu tem voluntários agora";
    if ((fac.voluntarios.get(alvo) || 0) < 1) return "sem voluntários neste bairro";
  }
  if (tipo === "cla") {
    const casas = P.reg.edificios.filter(e => e.tipo === "lider" && e.dono === fac);
    if (!casas.length) return "você não tem nenhuma casa de líder de clã";
    if (alvo && (alvo.dono !== fac || (alvo.claPronto || 0) > P.tempo)) return "o clã ainda não pode mandar mais homens";
    if (!alvo && !casas.some(e => (e.claPronto || 0) <= P.tempo)) return "os clãs já mandaram homens hoje";
  }
  if (tipo === "prisioneiro") {
    const presos = fac.prisioneiros.filter(s => s.vida === "rendido");
    if (!presos.length) return "você não tem prisioneiros";
    if (alvo && alvo.recusou >= 2) return "ele não vai mudar de lado";
  }
  return null;
}
function recrutaVoluntario(P, fac, zn) {
  if (podeRecrutar(P, fac, "voluntario", zn)) return null;
  fac.recursos.influencia -= RECRUTA.voluntario.influencia;
  fac.voluntarios.set(zn, fac.voluntarios.get(zn) - 1);
  const s = novoRecruta(P, fac, "voluntario");
  const e = chegadaVoluntario(P, fac, zn);
  chega(P, fac, s, e, "Voluntários de " + zn.nome);
  avisa(P, "recrutou", { fac, s, tipo: "voluntario", e });
  return s;
}
function recrutaMercenario(P, fac) {
  if (podeRecrutar(P, fac, "mercenario")) return null;
  fac.recursos.dinheiro -= RECRUTA.mercenario.dinheiro;
  const s = novoRecruta(P, fac, "mercenario");
  s.xp = 70;
  const e = chegadaMercenario(P, fac);
  chega(P, fac, s, e, "Mercenários");
  avisa(P, "recrutou", { fac, s, tipo: "mercenario", e });
  return s;
}
function recrutaCla(P, fac, casa) {
  casa = casa || P.reg.edificios.find(e => e.tipo === "lider" && e.dono === fac && (e.claPronto || 0) <= P.tempo);
  if (podeRecrutar(P, fac, "cla", casa) || !casa) return null;
  fac.recursos.influencia -= RECRUTA.cla.influencia;
  casa.claPronto = P.tempo + RECRUTA.cla.espera;
  const l = [];
  for (let i = 0; i < RECRUTA.cla.qtd; i++) { const s = novoRecruta(P, fac, "cla"); chega(P, fac, s, casa, "Homens de " + casa.zona.nome); l.push(s); }
  avisa(P, "recrutou", { fac, s: l[0], tipo: "cla", e: casa, n: l.length });
  return l;
}
function convencePrisioneiro(P, fac, s) {
  if (podeRecrutar(P, fac, "prisioneiro", s)) return null;
  fac.recursos.influencia -= RECRUTA.prisioneiro.influencia;
  const chance = limita(.65 - s.atr.disciplina / 200 - (s.faccao.governo ? 0 : .1) - (s.recusou || 0) * .15, .1, .8);
  if (P.r() > chance) { s.recusou = (s.recusou || 0) + 1; avisa(P, "recusou", { fac, s }); return false; }
  fac.prisioneiros = fac.prisioneiros.filter(o => o !== s);
  const antes = s.faccao;
  s.faccao = fac; s.vida = "ok"; s.arma = null; s.item = null; s.municao = 0; s.origem = "prisioneiro"; s.funcao = "fuzileiro";
  s.moral = s.atr.coragem + 20; s.sqAntes = null;
  anota(P, s, "Mudou de lado: deixou " + antes.nome + " e entrou para " + fac.nome);
  chega(P, fac, s, fac.base, "Ex-prisioneiros");
  avisa(P, "recrutou", { fac, s, tipo: "prisioneiro", e: fac.base });
  return true;
}

/* ---------- armar no QG ----------
   Quando um esquadrão está no QG, quem não tem a arma da sua função
   pega uma no arsenal (se tiver). */
function armaNoQG(P, sq) {
  const fac = sq.faccao; if (!fac.arsenal || sq.combate || !(pertoDoQG(fac, sq) || pertoDeBase(P, fac, sq))) return;
  for (const s of ativos(sq)) if (equipaNaBase(P, s)) avisa(P, "armou", { s, sq });
}
function semArma(sq) { return ativos(sq).filter(s => !s.arma).length; }

/* ---------- IA das rivais ---------- */
function recrutamentoRival(P, fac) {
  const R = fac.recursos; if (!R || !fac.base) return;
  const cheio = completa(fac);   // com exército completo, voluntários e mercenários vêm pelo mínimo dos batalhões; o comandante só chama o clã e os prisioneiros
  if (!cheio && R.influencia >= 60) for (const { zona } of zonasComVoluntarios(fac)) { if (R.influencia < 60) break; const s = recrutaVoluntario(P, fac, zona); if (s && s.sq) mandaAoQG(P, s.sq); }
  if (!cheio && R.dinheiro > 2500) { const s = recrutaMercenario(P, fac); if (s && s.sq) s.sq.reforco = true; }
  if (R.influencia >= 100) { const l = recrutaCla(P, fac); if (!cheio && l && l[0].sq) l[0].sq.reforco = true; }
  for (const s of fac.prisioneiros.slice()) if (R.influencia >= 70 && s.vida === "rendido") { if (convencePrisioneiro(P, fac, s) && s.sq && !cheio) s.sq.reforco = true; }
}
function mandaAoQG(P, sq) {
  if (!sq.faccao.base || pertoDoQG(sq.faccao, sq)) return;
  ordenaPredio(P, sq, sq.faccao.base, "defesa");
}

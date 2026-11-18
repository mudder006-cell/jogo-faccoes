"use strict";
/* ============================================================
   MAIS AÇÃO NO MAPA
   - Ofensivas das rivais: de tempos em tempos, uma rival manda o
     esquadrão mais forte atacar outra facção (você ou outra rival).
   - Contra-ataque do governo: enquanto tem gente, o governo antigo
     tira soldados de guarnições e tenta retomar o que perdeu.
   - Eventos aleatórios: desertores, armas escondidas, comerciantes,
     protestos, voluntários depois de um funeral.
   (Números provisórios.)
   ============================================================ */
const OFENSIVA = { aCada: [3, 6], minimo: 4 };            // horas do jogo; soldados mínimos no esquadrão
const CONTRA = { aCada: [2, 4], maxAoMesmoTempo: 2, raio: 700, minimoGuarnicao: 4 };
const EVENTO = { aCada: [3, 6] };

const horasEntre = (P, [a, b]) => P.r.entre(a, b) * HORA;
function predioMaisPerto(lista, x, z) { let m = null, md = Infinity; for (const e of lista) { const d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; m = e; } } return m; }

/* ---------- rivais ---------- */
function ofensivaRival(P) {
  const rivais = P.faccoes.filter(f => !f.jogador && !f.governo && !completa(f) && f.base && !f.eliminada);   // as rivais com exército completo atacam pelo comandante
  if (!rivais.length) return;
  const fac = P.r.de(rivais);
  const prontos = P.esquadroes.filter(q => q.faccao === fac && !q.combate && q.estado !== "andando" && ativos(q).length >= OFENSIVA.minimo && !semArma(q));
  if (!prontos.length) return;
  const sq = prontos.reduce((a, b) => (ativos(b).length > ativos(a).length ? b : a));
  const [x, z] = centroDoEsquadrao(sq);
  // alvo: o prédio de outra facção (não o governo) mais perto; pontos importantes valem mais
  const alvos = P.reg.edificios.filter(e => e.dono && e.dono !== fac && !e.dono.governo && hostis(P, fac, e.dono));   // só quem está em guerra
  let melhor = null, nota = Infinity;
  for (const e of alvos) {
    const d = Math.hypot(e.x - x, e.z - z) * (TIPOS_CHAVE.includes(e.tipo) ? .6 : 1) * (e.dono.jogador ? .8 : 1);
    if (d < nota && d < 1600) { nota = d; melhor = e; }
  }
  if (!melhor) return;
  ordenaPredio(P, sq, melhor, "ataque");
  sq.ofensiva = melhor.dono;
  avisa(P, "ofensiva", { fac, sq, e: melhor, contra: melhor.dono });
}

/* ---------- governo ---------- */
function contraAtaqueGoverno(P) {
  const gov = P.governo; if (!gov) return;
  const emCurso = P.esquadroes.filter(q => q.faccao === gov && q.contra && ativos(q).length && (q.estado === "andando" || q.combate)).length;
  if (emCurso >= CONTRA.maxAoMesmoTempo) return;
  const perdidos = P.reg.edificios.filter(e => e.doGovernoNoInicio && e.dono && e.dono !== gov && TIPOS_CHAVE.includes(e.tipo));
  if (!perdidos.length) return;
  // a guarnição mais perto de algum ponto perdido sai para retomar
  let melhor = null, alvo = null, md = CONTRA.raio;
  for (const sq of P.esquadroes) {
    if (sq.faccao !== gov || sq.combate || ativos(sq).length < CONTRA.minimoGuarnicao || semArma(sq)) continue;
    if (sq.guarda && (sq.guarda.tipo === "cidadela" || sq.guarda.tipo === "governo")) continue;   // o centro não sai
    const [x, z] = centroDoEsquadrao(sq), e = predioMaisPerto(perdidos, x, z);
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < md) { md = d; melhor = sq; alvo = e; }
  }
  if (!melhor) return;
  melhor.contra = true;
  ordenaPredio(P, melhor, alvo, "ataque");
  avisa(P, "contraataque", { sq: melhor, e: alvo, contra: alvo.dono });
}

/* ---------- eventos aleatórios ---------- */
const EVENTOS = [
  { id: "desertores", peso: 2, pode: (P, f) => P.esquadroes.some(q => q.faccao === P.governo && q.guarda && ativos(q).length >= 3),
    faz(P, f) {
      const q = P.r.de(P.esquadroes.filter(q => q.faccao === P.governo && q.guarda && ativos(q).length >= 3));
      const ida = ativos(q).filter(s => s !== q.lider).slice(0, 2);
      const e = predioMaisPerto(P.reg.edificios.filter(b => b.dono === f), q.guarda.x, q.guarda.z) || f.base;
      for (const s of ida) {
        tiraDoEsquadrao(P, s); s.vida = "ok"; s.faccao = f; s.origem = "desertor"; s.moral = s.atr.coragem + 25;
        anota(P, s, "Desertou do governo antigo e entrou para " + f.nome);
        chega(P, f, s, e, "Desertores");
      }
      return { texto: ida.length + " soldados do governo desertaram e se juntaram a você, com fuzil", icone: "directions_run", e };
    } },
  { id: "esconderijo", peso: 1, pode: () => true,
    faz(P, f) {
      const k = P.r() < .4 ? "cx-bala" : P.r() < .25 ? "rpg" : P.r() < .4 ? "metralhadora" : "fuzil", n = k === "fuzil" || k === "cx-bala" ? 2 : 1;
      guarda(f, k, n);
      return { texto: "Moradores mostraram um esconderijo de armas: +" + n + " " + nomeMin(k), icone: "inventory_2" };
    } },
  { id: "comerciantes", peso: 2, pode: (P, f) => P.reg.edificios.some(e => e.dono === f && (e.tipo === "loja" || e.tipo === "mercado")),
    faz(P, f) {
      const n = P.reg.edificios.filter(e => e.dono === f && (e.tipo === "loja" || e.tipo === "mercado")).length, v = Math.min(800, 120 + n * 40);
      f.recursos.dinheiro += v;
      return { texto: "Comerciantes pagaram pela proteção: +$ " + v, icone: "storefront" };
    } },
  { id: "protesto", peso: 1, pode: (P, f) => f.recursos.comida < 60 || f.recursos.influencia < 10,
    faz(P, f) {
      const v = Math.min(f.recursos.influencia, 8); f.recursos.influencia -= v;
      return { texto: "Protesto contra a falta de comida e de segurança: −" + Math.round(v) + " de influência", icone: "campaign", ruim: true };
    } },
  { id: "funeral", peso: 1, pode: (P, f) => f.voluntarios && f.voluntarios.size > 0,
    faz(P, f) {
      const zn = P.r.de([...f.voluntarios.keys()]);
      f.voluntarios.set(zn, Math.min(MAX_VOLUNTARIOS_ZONA, (f.voluntarios.get(zn) || 0) + 2));
      return { texto: "Depois de um funeral em " + zn.nome + ", mais jovens querem lutar: +2 voluntários", icone: "volunteer_activism", e: zn };
    } }
];
function eventoAleatorio(P) {
  for (const f of P.faccoes) {
    if (f.governo || !f.recursos || !f.base) continue;
    if (!f.jogador && P.r() < .5) continue;
    const l = EVENTOS.filter(ev => ev.pode(P, f)); if (!l.length) continue;
    let t = P.r() * l.reduce((n, ev) => n + ev.peso, 0), ev = l[0];
    for (const x of l) { t -= x.peso; if (t <= 0) { ev = x; break; } }
    const r = ev.faz(P, f);
    avisa(P, "evento", Object.assign({ fac: f, id: ev.id }, r));
  }
}

/* chamado a cada segundo de simulação */
function acaoNoMapa(P) {
  if (P.tempo >= P.proximaOfensiva) { P.proximaOfensiva = P.tempo + horasEntre(P, OFENSIVA.aCada); ofensivaRival(P); }
  if (P.tempo >= P.proximoContra) { P.proximoContra = P.tempo + horasEntre(P, CONTRA.aCada); contraAtaqueGoverno(P); }
  if (P.tempo >= P.proximoEvento) { P.proximoEvento = P.tempo + horasEntre(P, EVENTO.aCada); eventoAleatorio(P); }
}

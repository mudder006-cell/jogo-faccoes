"use strict";
/* ============================================================
   IA DAS FACÇÕES RIVAIS E DO GOVERNO
   As rivais seguem as mesmas regras do jogador: batalhões com líder,
   ordens (várias por batalhão), estoque mínimo com compra automática,
   estoque em cada base, veículos de logística, alimentar por bairro,
   obras, comércio e diplomacia. O "general" de cada rival decide o que
   o jogador decidiria, conforme a personalidade sorteada:
   - agressiva: ataca muito, entra em guerra fácil, postura agressiva;
   - defensiva: protege o que tem, cresce devagar, postura cautelosa;
   - comerciante: faz acordos, vende comida, constrói fazendas;
   - oportunista: ataca quem está mais fraco e se aproxima dos fortes.
   Dificuldade: fácil (a IA pensa devagar e às vezes erra), normal,
   difícil (a IA pensa rápido e recebe +25% de renda).
   O governo antigo organiza as guarnições em batalhões por região:
   rondas entre os pontos importantes e reação rápida a quem chega perto.
   Protótipo 19.3: o governo enfraquece aos poucos (solta os bairros mais
   distantes do centro e corta guarnições) e reage a quem cresce demais
   (facção grande vira alvo: reação rápida de mais longe e contra-ataques).
   (Números provisórios.)
   ============================================================ */
const PERSONALIDADES = {
  agressiva:   { n: "Agressiva", ataque: 1.5, defesa: .8, ordensAtaque: 2, postura: "agressivo", guerra: 15, acordo: 12, soldados: 12, armasPesadas: 5000 },
  defensiva:   { n: "Defensiva", ataque: .7, defesa: 1.5, ordensAtaque: 1, postura: "cauteloso", guerra: -15, acordo: -8, soldados: 10, armasPesadas: 9000 },
  comerciante: { n: "Comerciante", ataque: .85, defesa: 1.1, ordensAtaque: 1, postura: "equilibrado", guerra: -20, acordo: -15, soldados: 9, armasPesadas: 10000, vendeAcima: 120, guarda: 80, obras: 2500 },
  oportunista: { n: "Oportunista", ataque: 1.1, defesa: 1, ordensAtaque: 2, postura: "equilibrado", guerra: 0, acordo: 0, soldados: 10, armasPesadas: 7000, fracos: true }
};
const DIFICULDADES = {
  facil:   { n: "Fácil", pensa: 45, erra: .3, renda: 1 },
  normal:  { n: "Normal", pensa: 20, erra: 0, renda: 1 },
  dificil: { n: "Difícil", pensa: 12, erra: 0, renda: 1.25 }
};
const IA = { replaneja: 180, alcanceAlvo: 900, raioAmeaca: 450, ordensPorBatalhao: 3 };
const dificuldade = P => DIFICULDADES[P.dificuldade || "normal"];
const pers = f => PERSONALIDADES[f.personalidade || "oportunista"];
function sorteiaPersonalidade(P, fac) { fac.personalidade = P.r.de(Object.keys(PERSONALIDADES)); }

/* ---------- soldados prontos de cada facção (a "força" de diplomacia.js é outra conta: prédios + soldados) ---------- */
function soldadosProntos(P, f) { let n = 0; for (const s of P.soldados) if (s.faccao === f && s.vida === "ok" && s.arma) n++; return n; }

/* ---------- o general de uma rival ---------- */
function generalRival(P, fac) {
  if (fac.eliminada || !fac.base) return;
  const D = dificuldade(P);
  if (P.tempo < (fac.proximoPlano || 0)) return;
  fac.proximoPlano = P.tempo + D.pensa;
  if (D.erra && P.r() < D.erra) return;   // no fácil, às vezes não faz nada
  const pe = pers(fac), bats = batalhoesDe(P, fac);
  // 1) batalhão novo quando o território deixa
  if (bats.length < limiteBatalhoes(P, fac) && !P.soldados.some(s => s.faccao === fac && s.pedido && s.pedido.tipo === "comandar")) {
    const c = candidatosACmd(P, fac)[0]; if (c) pedeComando(P, c);
  }
  if (!bats.length) return;
  // 2) postura, prioridade e para onde vão os recrutas
  for (const b of bats) b.postura = pe.postura;
  const menor = bats.slice().sort((a, b) => soldadosDe(P, a).length / ((a.minimo && a.minimo.soldados) || 1) - soldadosDe(P, b).length / ((b.minimo && b.minimo.soldados) || 1))[0];
  fac.batalhaoPadrao = menor;
  // 3) estoque mínimo de cada batalhão
  for (const b of bats) minimoDaIA(P, fac, b);
  // 4) veículos: um para cada batalhão longe do QG (ou para abastecer bases avançadas)
  const precisam = bats.filter(b => b.base !== fac.base || basesDe(P, fac).length > 2).length;
  if ((fac.veiculos || []).length < precisam && fac.recursos.dinheiro > 4000) compra(P, fac, chave("veiculo", fac.recursos.dinheiro > 25000 ? 2 : 1), 1, true);
  // 5) comida: corta bairros quando falta comida e dinheiro; volta quando sobra
  alimentacaoDaIA(P, fac);
  // 6) armas melhores quando sobra dinheiro
  if (fac.recursos.dinheiro > pe.armasPesadas && noArsenal(fac, "rpg") + bats.reduce((t, b) => t + noArsenal(b, "rpg"), 0) < bats.length) compra(P, fac, "rpg", 1, true);
  if (fac.recursos.dinheiro > pe.armasPesadas * 2 && (fac.arsenal.fuzil_2 || 0) < 2) compra(P, fac, "fuzil_2", 1, true);
  // 7) ordens dos batalhões
  if (P.tempo >= (fac.proximasOrdens || 0) || ameacaNova(P, fac)) { fac.proximasOrdens = P.tempo + IA.replaneja; ordensDaIA(P, fac, bats); }
}
function minimoDaIA(P, fac, b) {
  const pe = pers(fac), sold = soldadosDe(P, b), dinheiro = fac.recursos.dinheiro;
  const fuzileiros = sold.filter(s => MUNICAO_DA[s.arma || "fuzil"] === "bala").length, ar = sold.filter(s => s.arma === "metralhadora").length;
  const fator = dinheiro < 800 ? .5 : 1;
  // só cresce o exército se a renda aguenta o salário (como um jogador cuidadoso faria)
  const renda = contas(P, fac).total.dinheiro, cabe = sold.length + Math.max(0, Math.floor(renda / (SALARIO + 1)));
  const alvo = dinheiro > 1500 && renda > 0 ? Math.min(pe.soldados, cabe) : dinheiro > 600 && sold.length < 6 ? 6 : sold.length;
  b.minimo = {
    soldados: alvo,
    "cx-bala": Math.round((fuzileiros + 2) * 120 * fator / 100) * 100,
    fuzil: dinheiro > 1200 ? 2 : 1,
    kit: 1
  };
  if (sold.length >= 5) b.minimo.explosivo = 1;   // 19.2: com 5 ou mais o líder põe um engenheiro (fortifica e conserta) se houver explosivos no estoque
  if (ar || sold.length >= 8) { b.minimo.metralhadora = 1; b.minimo["cx-cinta"] = Math.max(1, ar) * 400 * fator; }
  if (noArsenal(b, "rpg") || sold.some(s => s.arma === "rpg")) b.minimo["cx-foguete"] = 3;
  // suprimentos (19.2): mesma regra do jogador: o suficiente para encher a mochila de cada médico e engenheiro, mais uma folga de 20
  b.minimo["cx-suprimento"] = 20 + sold.reduce((t, s) => t + cargaSuprimento(s), 0);
}
function alimentacaoDaIA(P, fac) {
  const c = contas(P, fac), R = fac.recursos;
  const zonas = [...new Set(P.reg.edificios.filter(e => e.dono === fac).map(e => e.zona))].filter(z => z !== fac.base.zona);
  const comeDe = z => z.edificios.filter(e => e.dono === fac).reduce((t, e) => t + moradoresDe(e), 0) * COME_MORADOR;
  if (c.total.comida < -2 && R.comida < 60 && R.dinheiro < 1500) {
    const z = zonas.filter(z => alimenta(fac, z)).sort((a, b) => comeDe(b) - comeDe(a))[0];
    if (z) trocaAlimentar(fac, z);
  } else if (fac.semAlimentar && fac.semAlimentar.size && (c.total.comida > 5 || R.dinheiro > 4000)) {
    const z = [...fac.semAlimentar].sort((a, b) => comeDe(a) - comeDe(b))[0];
    if (z && comeDe(z) < c.total.comida + R.dinheiro / 400) trocaAlimentar(fac, z);
  }
}
/* inimigo chegou perto de um bairro meu sem ordem de defesa? replaneja já */
function ameacaNova(P, fac) {
  const protegidas = new Set(batalhoesDe(P, fac).flatMap(b => (b.ordens || []).filter(o => o.tipo === "proteger").map(o => o.alvo)));
  for (const zn of zonasMinhas(P, fac)) if (!protegidas.has(zn) && ameacaNaZona(P, fac, zn) >= 3) return true;
  return false;
}
function zonasMinhas(P, fac) { return P.reg.zonas.filter(z => z.chaves.some(e => e.dono === fac)); }
function ameacaNaZona(P, fac, zn) {
  let a = 0;
  for (const q of P.esquadroes) {
    if (!ativos(q).length || !hostis(P, q.faccao, fac) || (q.guarda && !q.combate && q.faccao.governo)) continue;
    const [x, z] = centroDoEsquadrao(q), d = Math.hypot(x - zn.x, z - zn.z);
    if (d < IA.raioAmeaca) a += ativos(q).length * (1 - d / IA.raioAmeaca);
  }
  return a;
}
/* escolhe as ordens: uma ou duas de defesa (onde há perigo) e as de ataque onde vale mais */
function ordensDaIA(P, fac, bats) {
  const pe = pers(fac), minhas = zonasMinhas(P, fac);
  // defesa: bairros meus com mais perigo (o da base sempre conta)
  const defesa = minhas.map(z => ({ z, perigo: ameacaNaZona(P, fac, z) * pe.defesa + (z === fac.base.zona ? 2 : 0) + z.chaves.filter(e => e.dono === fac).length * .3 })).sort((a, b) => b.perigo - a.perigo);
  // ataque: zonas perto com pontos importantes que dá para tomar
  const centros = minhas.length ? minhas.map(z => [z.x, z.z]) : [[fac.base.x, fac.base.z]];
  const minhaForca = soldadosProntos(P, fac);
  const alvos = [];
  for (const zn of P.reg.zonas) {
    if (zn.dono === fac) continue;
    const pontos = zn.chaves.filter(e => e.dono !== fac && podeTomar(P, fac, e)); if (!pontos.length) continue;
    const d = Math.min(...centros.map(([x, z]) => Math.hypot(x - zn.x, z - zn.z))); if (d > IA.alcanceAlvo) continue;
    const def = pontos.reduce((t, e) => t + forcaDefesa(P, e, fac), 0);
    let nota = pe.ataque * (pontos.length + zn.chaves.filter(e => e.dono === fac).length * 1.5) / (1 + def * .5) / (1 + d / 400);
    if (pe.fracos) { const donos = [...new Set(pontos.map(e => e.dono).filter(Boolean))]; const f = donos.reduce((m, o) => Math.min(m, soldadosProntos(P, o) / Math.max(1, minhaForca)), 2); nota *= f < .7 ? 1.8 : f > 1.3 ? .6 : 1; }
    alvos.push({ zn, nota });
  }
  alvos.sort((a, b) => b.nota - a.nota);
  // facção em guerra com fronteira: segurar ou avançar contra ela
  const guerras = P.faccoes.filter(o => o !== fac && !o.governo && !o.eliminada && hostis(P, fac, o) && P.reg.edificios.some(e => e.dono === o && Math.hypot(e.x - fac.base.x, e.z - fac.base.z) < 1500));
  const usados = new Set();
  bats.forEach((b, i) => {
    const novas = [];
    const pega = (tipo, alvo) => { if (!alvo || usados.has(alvo) || novas.length >= IA.ordensPorBatalhao) return; usados.add(alvo); novas.push({ tipo, alvo }); };
    // defesa: a zona da base do batalhão e a mais ameaçada
    const zb = b.base.zona; if (zb.chaves.some(e => e.dono === fac)) pega("proteger", zb);
    const quente = defesa.find(x => !usados.has(x.z) && x.perigo >= 2); if (quente) pega("proteger", quente.z);
    // guerra: o mais forte entre os vizinhos em guerra
    if (guerras.length && i === 0) { const g = guerras.sort((a, c) => soldadosProntos(P, c) - soldadosProntos(P, a))[0]; pega(pe.fracos && soldadosProntos(P, g) < minhaForca * .7 ? "avancar" : "frente", g); }
    // ataque: alvos mais perto da base deste batalhão
    const meus = alvos.filter(a => !usados.has(a.zn)).sort((a, c) => (c.nota - a.nota) || 0).slice(0, 4).sort((a, c) => Math.hypot(a.zn.x - b.base.x, a.zn.z - b.base.z) - Math.hypot(c.zn.x - b.base.x, c.zn.z - b.base.z));
    for (const a of meus.slice(0, pe.ordensAtaque)) pega("tomar", a.zn);
    if (!novas.length && minhas.length) pega("proteger", minhas[0]);
    trocaOrdens(P, b, novas);
  });
}
/* troca as ordens do batalhão mantendo as que continuam (para não embaralhar os esquadrões) */
function trocaOrdens(P, b, novas) {
  b.ordens = b.ordens || [];
  const ficam = b.ordens.filter(o => novas.some(n => n.tipo === o.tipo && n.alvo === o.alvo));
  for (const n of novas) if (!ficam.some(o => o.tipo === n.tipo && o.alvo === n.alvo)) ficam.push({ tipo: n.tipo, alvo: n.alvo, desde: P.tempo, id: (b.nOrdem = (b.nOrdem || 0) + 1) });
  b.ordens = ficam.slice(0, MAX_ORDENS);
}

/* ---------- governo antigo: batalhões por região, rondas e reação rápida ---------- */
const GOV = { reacao: 320, volta: 380, rondaEspera: [15, 30], pensa: 10, maxReagindo: 3,
  // 19.3 (provisório): enfraquece depois de 4 h, soltando 1,5% dos prédios iniciais por hora (primeiro os bairros entre as facções; a cidade velha e os prédios de força ficam) e cortando 1 soldado de cada guarnição de fora do centro a cada 6 h (mínimo 3); a cidade velha e os prédios de força mantêm a guarnição inteira
  // o ritmo cai pela metade a cada 36 h e o governo nunca solta abaixo de 30% dos prédios iniciais (abaixo disso só perde por conquista)
  enfraquece: { inicio: 4, taxa: .015, cortaCada: 6, minimo: 3, meiaVida: 36, piso: .3 },
  // facção vira alvo com 80+ prédios e (2x a média das outras ou 10% do mapa); deixa de ser abaixo de 80% disso
  alvo: { minPredios: 80, vezes: 2, parte: .10, sai: .7, minimoHoras: 12, reacaoVezes: 2, extraReagindo: 2 } };
const PREDIOS_DE_FORCA = ["governo", "quartel", "cidadela", "delegacia"];
/* a cada hora: o governo solta prédios e corta guarnições, e marca quem cresceu demais */
function horaDoGoverno(P) {
  const gov = P.governo; if (!gov) return;
  enfraqueceGoverno(P);
  marcaAlvosDoGoverno(P);
}
function enfraqueceGoverno(P) {
  const gov = P.governo, E = GOV.enfraquece, h = P.tempo / HORA; if (h < E.inicio) return;
  if (P.govInicial == null) P.govInicial = P.reg.edificios.filter(e => e.doGovernoNoInicio).length;
  // guarnições: cada uma perde 1 soldado a cada 6 h, até o mínimo
  for (const sq of P.esquadroes) {
    if (sq.faccao !== gov || !sq.guarda || sq.combate) continue;
    if (sq.guarda.zona.tipo === "velha" || PREDIOS_DE_FORCA.includes(sq.guarda.tipo)) continue;   // o centro mantém a guarnição
    if (sq.proximoCorte == null) sq.proximoCorte = P.tempo + P.r.entre(1, E.cortaCada) * HORA;
    if (P.tempo < sq.proximoCorte) continue;
    sq.proximoCorte = P.tempo + E.cortaCada * HORA;
    const a = ativos(sq); if (a.length <= E.minimo) continue;
    const s = a.filter(x => x !== sq.lider).pop(); if (!s) continue;
    dispensaSoldado(P, s); anota(P, s, "Desertou: o governo antigo deixou de pagar a guarnição");
  }
  // prédios: um orçamento por hora (acumula as frações), tirado da zona mais longe do centro; pontos importantes primeiro
  P.govOrcamento = (P.govOrcamento || 0) + P.govInicial * E.taxa * Math.pow(.5, (h - E.inicio) / E.meiaVida);
  let n = Math.floor(P.govOrcamento); if (n < 1) return;
  P.govOrcamento -= n;
  const atuais = P.reg.edificios.filter(e => e.dono === gov).length;
  n = Math.min(n, Math.floor(atuais - P.govInicial * E.piso)); if (n < 1) return;
  // o governo recua primeiro dos bairros que ficam entre as facções (soma das distâncias às duas mais perto): todas têm terra livre ao alcance e as fronteiras aparecem cedo
  const delas = new Map();
  for (const e of P.reg.edificios) if (e.dono && !e.dono.governo && !e.dono.eliminada) { if (!delas.has(e.dono)) delas.set(e.dono, []); delas.get(e.dono).push(e); }
  const dist = zn => {
    const ds = [...delas.values()].map(l => Math.min(...l.map(e => Math.hypot(e.x - zn.x, e.z - zn.z)))).sort((a, b) => a - b);
    return ds.length ? ds[0] + (ds[1] === undefined ? ds[0] : ds[1]) : Math.hypot(zn.x, zn.z);
  };
  const zonas = P.reg.zonas.filter(z => z.tipo !== "velha" && z.edificios.some(e => e.dono === gov && !PREDIOS_DE_FORCA.includes(e.tipo))).map(z => ({ z, d: dist(z) })).sort((a, b) => a.d - b.d).map(x => x.z);
  for (const zn of zonas) {
    if (n <= 0) break;
    const lista = zn.edificios.filter(e => e.dono === gov && !PREDIOS_DE_FORCA.includes(e.tipo)).sort((a, b) => (TIPOS_CHAVE.includes(b.tipo) ? 1 : 0) - (TIPOS_CHAVE.includes(a.tipo) ? 1 : 0));
    for (const e of lista) {
      if (n <= 0) break;
      if (P.esquadroes.some(q => q.guarda === e && ativos(q).length && (q.faccao !== gov || q.combate))) continue;   // inimigo dentro ou guarnição em combate: não solta
      soltaPredioDoGoverno(P, e); n--;
    }
  }
}
function dispensaSoldado(P, s) { const sq = s.sq; if (sq) { sq.membros = sq.membros.filter(o => o !== s); if (sq.lider === s) escolheLider(P, sq); } s.sqAntes = sq; s.sq = null; s.vida = "desertou"; s.dentro = null; }
function soltaPredioDoGoverno(P, e) {
  const gov = P.governo;
  for (const sq of P.esquadroes) if (sq.faccao === gov && sq.guarda === e && ativos(sq).length) {   // a guarnição é dispensada
    for (const s of ativos(sq)) dispensaSoldado(P, s);
    sq.guarda = null;
  }
  e.soltoPeloGoverno = true;   // o contra-ataque não "retoma" o que o próprio governo soltou
  tomaEdificio(P, e, null);
}
/* quem passou de um tamanho vira alvo do governo (o jogador também); aviso quando muda */
function marcaAlvosDoGoverno(P) {
  const A = GOV.alvo, vivas = rivaisVivas(P), total = P.reg.edificios.length, preds = new Map(vivas.map(f => [f, 0]));
  for (const e of P.reg.edificios) if (e.dono && preds.has(e.dono)) preds.set(e.dono, preds.get(e.dono) + 1);
  const soma = [...preds.values()].reduce((a, b) => a + b, 0);
  for (const f of vivas) {
    const p = preds.get(f), outras = vivas.length > 1 ? (soma - p) / (vivas.length - 1) : 0, k = f.alvoDoGoverno ? A.sai : 1;
    const grande = p >= A.minPredios * k && (p >= A.vezes * outras * k || p >= A.parte * total * k);
    if (grande !== !!f.alvoDoGoverno && P.tempo - (f.alvoMudouEm == null ? -1e9 : f.alvoMudouEm) >= A.minimoHoras * HORA) { f.alvoDoGoverno = grande; f.alvoMudouEm = P.tempo; avisa(P, "governoalvo", { fac: f, alvo: grande, predios: p }); }
  }
  for (const f of P.faccoes) if (f.alvoDoGoverno && (f.eliminada || !vivas.includes(f))) f.alvoDoGoverno = false;
}
const haAlvoDoGoverno = P => P.faccoes.some(f => f.alvoDoGoverno && !f.eliminada);
function batalhoesDoGoverno(P) {
  const gov = P.governo; if (!gov || P.govBats) return;
  // uma região por tipo de área do governo (cidade velha, bairros, vilas, campo), cada uma vira um batalhão
  const grupos = new Map();
  for (const e of P.reg.edificios) if (e.dono === gov && TIPOS_CHAVE.includes(e.tipo)) { const k = e.zona.tipo; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); }
  P.govBats = [];
  for (const [tipo, pontos] of grupos) {
    const b = { nome: "Batalhão de " + NOME_TIPO_ZONA_GOV[tipo], pontos, ronda: null };
    // ronda: 2 soldados de cada uma das maiores guarnições (que continuam com 4 ou mais)
    const grandes = P.esquadroes.filter(q => q.faccao === gov && q.guarda && pontos.includes(q.guarda) && ativos(q).length >= 6 && !["cidadela", "governo"].includes(q.guarda.tipo)).slice(0, 3);
    if (grandes.length >= 2) {
      const r = novoEsquadrao(P, gov, null, [], { nome: "Ronda do governo", x: grandes[0].guarda.x, z: grandes[0].guarda.z });
      r.guarda = null; r.estado = "parado";
      for (const g of grandes) for (const s of ativos(g).filter(s => s !== g.lider).slice(0, 2)) moveSoldado(P, s, r);
      b.ronda = { sq: r, i: 0, espera: 0 };
    }
    P.govBats.push(b);
  }
}
const NOME_TIPO_ZONA_GOV = { velha: "Cidade Velha", bairro: "Bairros", vila: "Vilas", rural: "Campo" };
function governoComanda(P) {
  const gov = P.governo; if (!gov) return;
  if (P.tempo < (P.proximoGov || 0)) return; P.proximoGov = P.tempo + GOV.pensa;
  batalhoesDoGoverno(P);
  for (const b of P.govBats) {
    const pontos = b.pontos.filter(e => e.dono === gov); if (!pontos.length) continue;
    // inimigos chegando perto de um ponto do governo
    const ameacas = [];
    for (const q of P.esquadroes) {
      if (q.faccao === gov || !ativos(q).length || (q.guarda && !q.combate)) continue;
      const [x, z] = centroDoEsquadrao(q);
      const raio = GOV.reacao * (q.faccao.alvoDoGoverno ? GOV.alvo.reacaoVezes : 1);   // 19.3: a facção grande é vista de mais longe
      const e = pontos.find(p => Math.hypot(p.x - x, p.z - z) < raio); if (e) ameacas.push({ q, e });
    }
    // reação rápida: a guarnição mais perto (que não seja do centro) sai e depois volta ao posto
    let reagindo = P.esquadroes.filter(q => q.faccao === gov && q.posto && ativos(q).length).length;
    for (const { q, e } of ameacas) {
      if (reagindo >= GOV.maxReagindo + (haAlvoDoGoverno(P) ? GOV.alvo.extraReagindo : 0)) break;
      const [x, z] = centroDoEsquadrao(q);
      const cand = P.esquadroes.filter(s => s.faccao === gov && !s.combate && !s.posto && !s.contra && ativos(s).length >= 3 && !semArma(s) && (s === (b.ronda && b.ronda.sq) || (s.guarda && b.pontos.includes(s.guarda) && s.guarda !== e && !["cidadela", "governo"].includes(s.guarda.tipo))))
        .sort((a, c) => Math.hypot(centroDoEsquadrao(a)[0] - x, centroDoEsquadrao(a)[1] - z) - Math.hypot(centroDoEsquadrao(c)[0] - x, centroDoEsquadrao(c)[1] - z))[0];
      if (!cand || ativos(cand).length < ativos(q).length - 2) continue;
      cand.posto = cand.guarda || "ronda"; cand.guarda = null;
      ordenaPonto(P, cand, x, z, "ataque"); reagindo++;
    }
    // quem reagiu e não tem mais inimigo perto volta ao posto
    for (const s of P.esquadroes) {
      if (s.faccao !== gov || !s.posto || s.combate || s.estado === "andando") continue;
      const [x, z] = centroDoEsquadrao(s);
      if (ameacas.some(({ q }) => Math.hypot(centroDoEsquadrao(q)[0] - x, centroDoEsquadrao(q)[1] - z) < GOV.volta)) continue;
      const posto = s.posto; s.posto = null;
      if (posto !== "ronda" && posto.dono === gov) ordenaPredio(P, s, posto, "defesa");
    }
    // ronda entre os pontos importantes da região
    const r = b.ronda; if (!r || !ativos(r.sq).length || r.sq.combate || r.sq.posto || r.sq.estado === "andando") continue;
    if (P.tempo < r.espera) continue;
    const alvo = pontos[r.i % pontos.length]; r.i++;
    ordenaPonto(P, r.sq, entradaDe(alvo)[0], entradaDe(alvo)[1], "defesa");
    r.espera = P.tempo + P.r.entre(...GOV.rondaEspera);
  }
}

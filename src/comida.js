"use strict";
/* ============================================================
   COMIDA: alimentar por bairro, obras no campo e comércio
   - Cada bairro seu tem "alimentar" ligado ou desligado. Quem não é
     alimentado não come, mas a confiança cai aos poucos e o bairro
     paga menos imposto (e não dá voluntários).
   - Obras (paga e espera): fazenda nova, armazém, expandir plantação
     e melhorar fazenda (nível I, II, III). Só em vilas e setores rurais.
   - Comércio: quem tem comida sobrando vende para quem está faltando,
     entre facções que não estão em guerra. O preço sobe quando falta
     comida no mapa e cai quando sobra. Se não houver quem venda,
     importa dos países (mais caro). Entrega na hora.
   (Números provisórios.)
   ============================================================ */
const CONFIANCA = { inicial: 100, sobeAlimentado: 3, caiSemComida: 4, caiFome: 6, minImposto: .3, voluntarios: 50 };
const OBRAS = {
  fazenda:   { n: "Construir fazenda", icone: "agriculture", custo: 1200, horas: 6, em: ["casa"], txt: "A casa vira fazenda (+20 de comida por hora)" },
  armazem:   { n: "Construir armazém", icone: "warehouse", custo: 900, horas: 4, em: ["casa", "loja"], txt: "Vira armazém (+6 de comida por hora)" },
  plantacao: { n: "Expandir plantação", icone: "grass", custo: 600, horas: 4, em: ["fazenda"], max: 3, txt: "+10 roças na fazenda (+5 de comida por hora)" },
  melhorar:  { n: "Melhorar fazenda", icone: "upgrade", custo: [0, 2400, 6000], horas: [0, 8, 12], em: ["fazenda"], txt: "Nível II: 1,7x a produção; nível III: 2,6x" }
};
const FAZENDA_NIVEL = [1, 1.7, 2.6];
const POR_PLANTACAO = 5;                 // comida por hora de cada expansão de plantação
const ZONAS_DE_CAMPO = ["vila", "rural"];
const MERCADO_COMIDA = { base: 2, minimo: 1, importa: 6, reserva: 40, horasDeFolga: 3, rivalVendeAcima: 180, rivalGuarda: 120, relacaoPor100: 1, colchao: 60 };

/* ---------- alimentar e confiança ---------- */
const alimenta = (fac, zn) => !(fac.semAlimentar && fac.semAlimentar.has(zn));
function trocaAlimentar(fac, zn) { fac.semAlimentar = fac.semAlimentar || new Set(); if (fac.semAlimentar.has(zn)) fac.semAlimentar.delete(zn); else fac.semAlimentar.add(zn); }
function confiancaEm(fac, zn) { return fac.confianca && fac.confianca.has(zn) ? fac.confianca.get(zn) : CONFIANCA.inicial; }
const fatorImposto = (fac, zn) => CONFIANCA.minImposto + (1 - CONFIANCA.minImposto) * confiancaEm(fac, zn) / 100;
function horaDaConfianca(P, fac, faltou) {
  fac.confianca = fac.confianca || new Map();
  const zonas = new Set(); for (const e of P.reg.edificios) if (e.dono === fac) zonas.add(e.zona);
  for (const zn of zonas) {
    const c = confiancaEm(fac, zn);
    const d = !alimenta(fac, zn) ? -CONFIANCA.caiSemComida : faltou ? -CONFIANCA.caiFome : CONFIANCA.sobeAlimentado;
    const n = Math.max(0, Math.min(100, c + d)); fac.confianca.set(zn, n);
    if (fac.jogador && c >= 50 && n < 50) avisa(P, "confianca", { fac, zona: zn });
  }
}

/* ---------- produção de cada prédio ---------- */
function comidaDoPredio(e) {
  if (e.destruido) return 0;
  if (e.tipo === "fazenda") return COMIDA.fazenda * FAZENDA_NIVEL[(e.nivel || 1) - 1] + (e.plantacao || 0) * POR_PLANTACAO;
  return COMIDA[e.tipo] || 0;
}

/* ---------- obras ---------- */
function custoObra(tipo, e) { const o = OBRAS[tipo]; return tipo === "melhorar" ? o.custo[e.nivel || 1] : o.custo; }
function horasObra(tipo, e) { const o = OBRAS[tipo]; return tipo === "melhorar" ? o.horas[e.nivel || 1] : o.horas; }
function motivoObra(P, fac, e, tipo) {
  const o = OBRAS[tipo];
  if (e.dono !== fac) return "o prédio não é seu";
  if (e.destruido) return "prédio destruído";
  if (!ZONAS_DE_CAMPO.includes(e.zona.tipo)) return "só em vilas e setores rurais";
  if (!o.em.includes(e.tipo)) return "não dá neste tipo de prédio";
  if ((fac.obras || []).some(x => x.e === e)) return "já tem obra aqui";
  if (fac.base === e || batalhoesDe(P, fac).some(b => b.base === e)) return "é uma base";
  if (tipo === "plantacao" && (e.plantacao || 0) >= o.max) return "plantação já no máximo";
  if (tipo === "melhorar" && (e.nivel || 1) >= 3) return "já está no nível III";
  if (fac.recursos.dinheiro < custoObra(tipo, e)) return "falta dinheiro";
  return null;
}
function obrasPossiveis(P, fac, e) { return Object.keys(OBRAS).filter(t => OBRAS[t].em.includes(e.tipo) && ZONAS_DE_CAMPO.includes(e.zona.tipo)); }
function comecaObra(P, fac, e, tipo) {
  if (motivoObra(P, fac, e, tipo)) return false;
  fac.recursos.dinheiro -= custoObra(tipo, e);
  (fac.obras || (fac.obras = [])).push({ e, tipo, fim: P.tempo + horasObra(tipo, e) * HORA, inicio: P.tempo });
  avisa(P, "obra", { fac, e, tipo });
  return true;
}
function horaDasObras(P, fac) {
  if (!fac.obras || !fac.obras.length) return;
  for (const o of fac.obras.slice()) {
    if (o.e.dono !== fac || o.e.destruido) { fac.obras = fac.obras.filter(x => x !== o); avisa(P, "obraperdida", { fac, e: o.e, tipo: o.tipo }); continue; }
    if (P.tempo < o.fim) continue;
    const e = o.e;
    if (o.tipo === "fazenda") { e.tipo = "fazenda"; e.nivel = 1; e.plantacao = 0; }
    else if (o.tipo === "armazem") e.tipo = "armazem";
    else if (o.tipo === "plantacao") e.plantacao = (e.plantacao || 0) + 1;
    else if (o.tipo === "melhorar") e.nivel = (e.nivel || 1) + 1;
    e.mudouTipo = true;
    fac.obras = fac.obras.filter(x => x !== o);
    avisa(P, "obrapronta", { fac, e, tipo: o.tipo });
  }
}
/* rivais: com dinheiro sobrando e comida faltando, constroem e melhoram fazendas */
function obrasRival(P, fac) {
  const c = contas(P, fac);
  if (c.total.comida > 4 || fac.recursos.dinheiro < 4000 || (fac.obras || []).length) return;
  const meus = P.reg.edificios.filter(e => e.dono === fac && ZONAS_DE_CAMPO.includes(e.zona.tipo));
  const f = meus.find(e => e.tipo === "fazenda" && !motivoObra(P, fac, e, "plantacao")) || meus.find(e => e.tipo === "fazenda" && !motivoObra(P, fac, e, "melhorar"));
  if (f) { comecaObra(P, fac, f, (f.plantacao || 0) < 3 ? "plantacao" : "melhorar"); return; }
  const casa = meus.find(e => !motivoObra(P, fac, e, "fazenda"));
  if (casa) comecaObra(P, fac, casa, "fazenda");
}

/* ---------- mercado de comida ---------- */
function vendedores(P) {
  const l = [];
  for (const f of P.faccoes) {
    if (f.governo || f.eliminada || !f.recursos) continue;
    const acima = f.jogador ? (f.vendeComida ? f.vendaAcima : Infinity) : MERCADO_COMIDA.rivalVendeAcima;
    const guarda = f.jogador ? f.vendaAcima : MERCADO_COMIDA.rivalGuarda;
    if (f.recursos.comida > acima) l.push({ f, tem: f.recursos.comida - guarda });
  }
  return l;
}
function precisaDeComida(P, f) {
  const c = contas(P, f), folga = Math.max(0, -c.total.comida) * MERCADO_COMIDA.horasDeFolga;
  return Math.max(0, MERCADO_COMIDA.reserva + folga - f.recursos.comida);
}
function precoDaComida(P) {
  const oferta = vendedores(P).reduce((t, v) => t + v.tem, 0);
  let procura = 0; for (const f of P.faccoes) if (!f.governo && !f.eliminada && f.recursos) procura += precisaDeComida(P, f);
  const p = MERCADO_COMIDA.base * (procura + MERCADO_COMIDA.colchao) / (oferta + MERCADO_COMIDA.colchao);
  return Math.max(MERCADO_COMIDA.minimo, Math.min(MERCADO_COMIDA.importa, p));
}
/* compra q de comida: primeiro de quem vende (sem estar em guerra), depois importa */
function compraComida(P, f, q, manual) {
  const preco = P.precoComida || precoDaComida(P);
  let comprou = 0, gasto = 0, deQuem = [];
  for (const v of vendedores(P).sort((a, b) => b.tem - a.tem)) {
    if (v.f === f || hostis(P, f, v.f)) continue;
    const n = Math.min(q - comprou, v.tem, Math.floor((f.recursos.dinheiro - gasto) / preco)); if (n <= 0) continue;
    v.f.recursos.comida -= n; v.f.recursos.dinheiro += n * preco; comprou += n; gasto += n * preco; deQuem.push([v.f, n]);
    mudaRelacao(P, f, v.f, Math.min(3, n / 100 * MERCADO_COMIDA.relacaoPor100));
    if (comprou >= q) break;
  }
  let importou = 0;
  if (comprou < q) { importou = Math.min(q - comprou, Math.floor((f.recursos.dinheiro - gasto) / MERCADO_COMIDA.importa)); if (importou > 0) { gasto += importou * MERCADO_COMIDA.importa; comprou += importou; } }
  if (comprou > 0) { f.recursos.dinheiro -= gasto; f.recursos.comida += comprou; avisa(P, "comprouComida", { fac: f, n: comprou, custo: Math.round(gasto), importou, deQuem, manual }); }
  return comprou;
}
function vendeComida(P, f, q) {   // venda na hora para quem está precisando (sem estar em guerra)
  const preco = P.precoComida || precoDaComida(P); let vendeu = 0, ganhou = 0;
  for (const o of P.faccoes) {
    if (o === f || o.governo || o.eliminada || !o.recursos || hostis(P, f, o)) continue;
    const n = Math.min(q - vendeu, Math.ceil(precisaDeComida(P, o)), f.recursos.comida, Math.floor(o.recursos.dinheiro / preco)); if (n <= 0) continue;
    o.recursos.comida += n; o.recursos.dinheiro -= n * preco; f.recursos.comida -= n; f.recursos.dinheiro += n * preco; vendeu += n; ganhou += n * preco;
    mudaRelacao(P, f, o, Math.min(3, n / 100 * MERCADO_COMIDA.relacaoPor100));
    if (vendeu >= q) break;
  }
  if (vendeu) avisa(P, "vendeuComida", { fac: f, n: vendeu, ganho: Math.round(ganhou) });
  return vendeu;
}
function horaDoMercado(P) {
  P.precoComida = precoDaComida(P);
  (P.historicoComida || (P.historicoComida = [])).push(+P.precoComida.toFixed(2)); if (P.historicoComida.length > 48) P.historicoComida.shift();
  // quem está faltando compra (o jogador também, sozinho, para não passar fome)
  for (const f of P.faccoes) {
    if (f.governo || f.eliminada || !f.recursos) continue;
    const q = Math.ceil(precisaDeComida(P, f));
    if (q > 0 && f.recursos.comida < MERCADO_COMIDA.reserva) compraComida(P, f, q);
  }
}
function comidaDoPais(rel) { return rel.relacao >= 85 ? 150 : rel.relacao >= 60 ? 80 : rel.relacao >= ENTREGA.minimo ? 40 : 0; }

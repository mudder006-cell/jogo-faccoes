"use strict";
/* ============================================================
   ESTOQUES POR BASE (jogador e rivais com exército completo)
   Três tipos de base:
   - QG da facção: o depósito geral. Compras, fábricas e doações chegam aqui.
   - Base do líder: onde está o líder de um batalhão. O estoque do
     batalhão (com mínimo) fica aqui. Os veículos trazem do QG.
   - Base avançada: as outras casas de líder de clã. Cada uma tem o seu
     estoque; o líder do batalhão manda munição para as bases perto de
     onde os esquadrões dele lutam.
   O esquadrão só usa o estoque da base onde está.
   ============================================================ */
const COMPRA_AUTO = { filaMaxHoras: 3 };   // fabrica só se a fila da oficina tiver menos de 3 h de trabalho; senão compra

function criaEstoque() { return { arsenal: criaArsenal(), municao: { bala: 0, cinta: 0, granada: 0, foguete: 0 } }; }
function estoqueDaBase(e) { return e.estoque || (e.estoque = criaEstoque()); }
/* estoques que um soldado do batalhão "bat" pode usar nesta base, na ordem em que usa */
function estoquesNaBase(P, fac, bat, base) {
  if (!completa(fac)) return [fac];
  if (!base) return [];
  const l = [];
  if (bat && !bat.dissolvido && bat.base === base) l.push(bat);
  l.push(base === fac.base ? fac : estoqueDaBase(base));
  return l;
}
/* o estoque "da base" (onde se descarrega): QG = depósito, base do líder = estoque do batalhão */
function estoqueDoLugar(P, fac, base, bat) {
  if (!completa(fac) || base === fac.base) return fac;
  const b = bat && bat.base === base ? bat : batalhoesDe(P, fac).find(o => o.base === base);
  return b || estoqueDaBase(base);
}
function tipoDaBase(P, fac, e) { return e === fac.base ? "qg" : batalhoesDe(P, fac).some(b => b.base === e) ? "lider" : "avancada"; }
const NOME_TIPO_BASE = { qg: "QG", lider: "Base do líder", avancada: "Base avançada" };
function baseDoSoldado(P, s) { return s.sq ? pertoDeBase(P, s.faccao, s.sq) : s.vida === "reserva" ? ondeEspera(s) : baseEm(P, s.faccao, s.x, s.z); }

function melhorEm(l, b) { for (const n of [3, 2, 1]) for (const e of l) if ((e.arsenal[chave(b, n)] || 0) > 0) return { e, n }; return null; }
const somaArsenal = (l, b) => l.reduce((t, e) => t + noArsenal(e, b), 0);
const somaMunicao = (l, t) => l.reduce((x, e) => x + (e.municao ? e.municao[t] || 0 : 0), 0);
function tiraMunicao(l, t, q) { let tirou = 0; for (const e of l) { if (!e.municao) continue; const p = Math.min(q - tirou, e.municao[t] || 0); if (p > 0) { e.municao[t] -= p; tirou += p; } } return tirou; }

/* numa base: pega a melhor arma da função, o melhor kit e enche a munição (do estoque daquela base) */
function equipaNaBase(P, s, base) {
  const l = completa(s.faccao) ? estoquesNaBase(P, s.faccao, s.bat, base || baseDoSoldado(P, s)) : [s.faccao];
  if (!l.length) return false;
  const dep = l[0], f = FUNCOES[s.funcao]; let mudou = false;
  const m = f.arma && melhorEm(l, f.arma);
  if (m && (s.arma !== f.arma || m.n > (s.nivel || 1))) {
    if (s.arma !== f.arma) devolveArma(dep, s); else dep.arsenal[chave(s.arma, s.nivel || 1)] = (dep.arsenal[chave(s.arma, s.nivel || 1)] || 0) + 1;
    const trocouTipo = s.arma !== f.arma;
    m.e.arsenal[chave(f.arma, m.n)]--; s.arma = f.arma; s.nivel = m.n; if (trocouTipo) s.municao = 0;
    anota(P, s, "Pegou " + nomeMin(chave(f.arma, m.n)) + " no estoque"); mudou = true;
  }
  if (f.item) {
    const mi = melhorEm(l, f.item);
    if (mi && (s.item !== f.item || mi.n > (s.nivelItem || 1))) { devolveItem(dep, s); mi.e.arsenal[chave(f.item, mi.n)]--; s.item = f.item; s.nivelItem = mi.n; s.usosKit = null; }
  } else if (s.item) devolveItem(dep, s);
  if (s.arma) { const t = MUNICAO_DA[s.arma], falta = Math.floor(cargaDe(s) - s.municao); if (falta > 0) s.municao += tiraMunicao(l, t, falta); }
  return mudou;
}
/* tem este item (arma ou kit) em alguma base que o soldado pode usar? devolve a base mais perto */
function baseComItem(P, s, item) {
  let m = null, md = Infinity;
  for (const b of basesDe(P, s.faccao)) {
    if (!somaArsenal(estoquesNaBase(P, s.faccao, s.bat, b), item)) continue;
    const d = Math.hypot(b.x - s.x, b.z - s.z); if (d < md) { md = d; m = b; }
  }
  return m;
}
/* base mais perto com munição para quem está com pouca */
function baseParaRecarregar(P, sq) {
  const fac = sq.faccao, tipos = new Set(ativos(sq).filter(s => s.arma && s.municao < cargaDe(s) * POUCA_MUNICAO).map(s => MUNICAO_DA[s.arma]));
  const [x, z] = centroDoEsquadrao(sq); let m = null, md = Infinity;
  for (const b of basesDe(P, fac)) {
    const l = estoquesNaBase(P, fac, sq.bat, b);
    if (![...tipos].some(t => somaMunicao(l, t) > 0)) continue;
    const d = Math.hypot(b.x - x, b.z - z); if (d < md) { md = d; m = b; }
  }
  return m;
}

/* ---------- compra automática do mínimo (fabrica se der, senão mercado negro; chega no QG) ---------- */
function filaDeFabrica(P, fac) { const p = pontosDeFabrica(P, fac).leve; return p ? fac.producao.reduce((t, o) => t + pontosDoItem(o.item) - o.feito, 0) / p : Infinity; }
function aCaminhoPara(P, b, k) {   // fabricação marcada para o batalhão + carga nos veículos indo para ele
  let n = 0; const fac = b.faccao;
  for (const o of fac.producao) if (o.para === b && (ehCaixa(k) ? o.item === k : baseDe(o.item) === k)) n += ehCaixa(k) ? MUNICOES[tipoDaCaixa(k)].caixa : 1;
  for (const v of fac.veiculos || []) if (v.plano && v.plano.para === b.base && v.carga) n += ehCaixa(k) ? v.carga.municao[tipoDaCaixa(k)] : noArsenal(v.carga, k);
  return n;
}
function compraAutomatica(P, fac, b, k, quantos, reservado) {
  // quantos: unidades (munição) ou armas que faltam depois de contar o QG e o que já vem
  const item = ehCaixa(k) ? k : chave(k, 1), n = ehCaixa(k) ? Math.ceil(quantos / MUNICOES[tipoDaCaixa(k)].caixa) : quantos;
  let feitos = 0;
  for (let i = 0; i < n; i++) {
    if (!podeFabricar(P, fac, item) && filaDeFabrica(P, fac) < COMPRA_AUTO.filaMaxHoras) { fabrica(P, fac, item); fac.producao[fac.producao.length - 1].para = b; feitos++; continue; }
    if (!compra(P, fac, item, 1, true)) break;
    feitos++;
  }
  if (feitos < n && !b.semDinheiro) { b.semDinheiro = true; avisa(P, "semdinheiroauto", { b, k }); }
  if (feitos === n) b.semDinheiro = false;
  return feitos;
}

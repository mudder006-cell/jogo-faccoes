"use strict";
/* ============================================================
   ARMAS: de onde vêm
   - Mercado negro: paga e a arma chega na hora ao arsenal do QG.
   - Contrabando: mais barato, demora algumas horas e a carga pode ser
     apreendida no caminho (menos risco com postos de gasolina seus).
   - Fabricar: oficinas e fábricas suas produzem aos poucos. Armas
     pesadas só saem de fábrica.
   - Suprimentos (19.2): caixa de 20 por $ 80, 2 pontos de fabricação (oficina serve), contrabando e doação.
   - Doação estrangeira: cada país tem uma relação com você, que sobe
     mandando emissários (influência) e cumprindo os pedidos dele.
     Com relação alta, manda armas todo dia.
   - Capturar: quem se rende deixa as armas (já existia).
   Tudo vai para o arsenal do QG. (Números provisórios.)
   ============================================================ */
/* preço do nível 1 (nível 2 = 4x, nível 3 = 15x) e das caixas de munição */
const PRECO = { fuzil: 400, metralhadora: 1500, lancagranadas: 1800, rpg: 2500, kit: 200, explosivo: 300,
  "cx-bala": 60, "cx-cinta": 150, "cx-granada": 240, "cx-foguete": 450, "cx-suprimento": 80, veiculo: 2500 };
const precoDe = k => (ehCaixa(k) ? PRECO[k] : PRECO[baseDe(k)] * NIVEL.preco[nivelDe(k) - 1]);
const ITENS_A_VENDA = () => { const l = []; for (const b of BASES_ARMA) for (const n of [1, 2, 3]) l.push(chave(b, n)); return l.concat(Object.keys(MUNICOES).map(t => "cx-" + t)); };
const CONTRABANDO = { desconto: .55, horas: 6, risco: .25, riscoPorPosto: .05, riscoMin: .05 };
const FABRICACAO = {
  pontos: { oficina: 1, fabrica: 3 },          // pontos de produção por hora
  custo: { fuzil: 8, kit: 3, explosivo: 5, metralhadora: 18, lancagranadas: 22, rpg: 26, "cx-bala": 2, "cx-cinta": 4, "cx-granada": 4, "cx-foguete": 6, "cx-suprimento": 2, veiculo: 30 },
  pesada: ["metralhadora", "lancagranadas", "rpg", "cx-granada", "cx-foguete", "veiculo"],   // só em fábrica (e todo nível 3)
  material: .3                                  // paga 30% do preço em material
};
const PAISES = [
  { id: "sarabel", n: "Reino de Sarabel", icone: "crown", gosta: ["fuzil", "metralhadora", "fuzil"], municao: ["cx-bala", "cx-cinta"], suprimento: 1 },
  { id: "toveria", n: "República de Toveria", icone: "account_balance", gosta: ["rpg", "lancagranadas", "fuzil"], municao: ["cx-foguete", "cx-granada"], suprimento: 1 },
  { id: "ostlan", n: "Federação de Ostlan", icone: "public", gosta: ["kit", "fuzil", "explosivo"], municao: ["cx-bala", "cx-bala"], suprimento: 2 }
];
const EMISSARIO = { influencia: 45, relacao: 8 };
const PEDIDO = { aCada: 12 * HORA, prazo: 48 * HORA, premio: 25, castigo: 10 };
const ENTREGA = { aCada: 24 * HORA, minimo: 40 };
const pontosDoItem = k => (ehCaixa(k) ? FABRICACAO.custo[k] : FABRICACAO.custo[baseDe(k)] * NIVEL.pontos[nivelDe(k) - 1]);
const itemPesado = k => FABRICACAO.pesada.includes(ehCaixa(k) ? k : baseDe(k)) || (!ehCaixa(k) && nivelDe(k) === 3);

function preparaPaises(P, fac) {
  if (fac.paises) return;
  fac.paises = {};
  for (const p of PAISES) fac.paises[p.id] = { relacao: Math.round(P.r.entre(5, 20)), pedido: null, proximoPedido: P.tempo + P.r.entre(1, 6) * HORA, proximaEntrega: P.tempo + ENTREGA.aCada };
  fac.cargas = []; fac.producao = [];
}

/* ---------- mercado negro e contrabando ---------- */
function compra(P, fac, item, n, auto) {
  n = n || 1; const custo = precoDe(item) * n;
  if (fac.recursos.dinheiro < custo) return false;
  fac.recursos.dinheiro -= custo; guarda(fac, item, n);
  avisa(P, "comprou", { fac, item, n, auto });
  return true;
}
function riscoContrabando(P, fac) {
  const postos = P.reg.edificios.filter(e => e.tipo === "posto" && e.dono === fac).length;
  return Math.max(CONTRABANDO.riscoMin, CONTRABANDO.risco - postos * CONTRABANDO.riscoPorPosto);
}
function encomenda(P, fac, item, n) {
  n = n || 1; const custo = Math.round(precoDe(item) * CONTRABANDO.desconto) * n;
  if (fac.recursos.dinheiro < custo) return false;
  fac.recursos.dinheiro -= custo;
  fac.cargas.push({ item, n, chega: P.tempo + CONTRABANDO.horas * HORA, risco: riscoContrabando(P, fac) });
  avisa(P, "encomendou", { fac, item, n });
  return true;
}

/* ---------- fabricação ---------- */
function pontosDeFabrica(P, fac) {
  let leve = 0, pesada = 0;
  for (const e of P.reg.edificios) if (e.dono === fac && FABRICACAO.pontos[e.tipo]) { leve += FABRICACAO.pontos[e.tipo]; if (e.tipo === "fabrica") pesada += FABRICACAO.pontos[e.tipo]; }
  return { leve, pesada };
}
function podeFabricar(P, fac, item) {
  const p = pontosDeFabrica(P, fac);
  if (itemPesado(item) && !p.pesada) return "precisa de uma fábrica sua";
  if (!p.leve) return "precisa de uma oficina ou fábrica sua";
  if (fac.recursos.dinheiro < Math.round(precoDe(item) * FABRICACAO.material)) return "dinheiro insuficiente para o material";
  return null;
}
function fabrica(P, fac, item) {
  if (podeFabricar(P, fac, item)) return false;
  fac.recursos.dinheiro -= Math.round(precoDe(item) * FABRICACAO.material);
  fac.producao.push({ item, feito: 0 });
  return true;
}

/* ---------- países ---------- */
function mandaEmissario(P, fac, id) {
  const rel = fac.paises[id];
  if (fac.recursos.influencia < EMISSARIO.influencia || rel.relacao >= 100) return false;
  fac.recursos.influencia -= EMISSARIO.influencia;
  rel.relacao = Math.min(100, rel.relacao + EMISSARIO.relacao);
  return true;
}
function novoPedido(P, fac, pais) {
  // pede um ponto importante que não é seu, perto da sua área
  const meus = P.reg.edificios.filter(e => e.dono === fac);
  let melhor = null, md = Infinity;
  for (const zn of P.reg.zonas) for (const e of zn.chaves) {
    if (e.dono === fac) continue;
    let d = Infinity; for (const m of meus) { const k = Math.hypot(m.x - e.x, m.z - e.z); if (k < d) d = k; }
    d += P.r() * 250;
    if (d < md) { md = d; melhor = e; }
  }
  if (!melhor) return null;
  return { tipo: "tomar", alvo: melhor, prazo: P.tempo + PEDIDO.prazo };
}
function entregaDoPais(rel, pais) {
  const l = {};
  const add = (k, n) => { l[k] = (l[k] || 0) + n; };
  if (rel.relacao >= ENTREGA.minimo) add(pais.gosta[0], 2);
  if (rel.relacao >= 60) { add(pais.gosta[1], 1); add(pais.gosta[2], 1); }
  if (rel.relacao >= 85) { add(chave(pais.gosta[0], 2), 1); add(pais.gosta[1], 1); }
  if (rel.relacao >= ENTREGA.minimo) add(pais.municao[0], 1);
  if (rel.relacao >= 60) add(pais.municao[1], 1);
  if (rel.relacao >= ENTREGA.minimo) add("cx-suprimento", pais.suprimento);          // 19.2: caixas de suprimentos (Ostlan manda o dobro)
  if (rel.relacao >= 85) add("cx-suprimento", pais.suprimento);
  return l;
}

/* ---------- a cada hora ---------- */
function horaDasArmas(P) {
  for (const fac of P.faccoes) {
    if (fac.governo || !fac.recursos) continue;
    preparaPaises(P, fac);
    // cargas de contrabando
    for (const c of fac.cargas.slice()) {
      if (P.tempo < c.chega) continue;
      fac.cargas = fac.cargas.filter(o => o !== c);
      if (P.r() < c.risco) avisa(P, "apreendida", { fac, c });
      else { guarda(fac, c.item, c.n); avisa(P, "chegoucarga", { fac, c }); }
    }
    // fabricação
    const p = pontosDeFabrica(P, fac);
    let leve = p.leve, pesada = p.pesada;
    for (const o of fac.producao.slice()) {
      const ehPesada = itemPesado(o.item);
      const tem = ehPesada ? Math.min(pesada, leve) : leve; if (tem <= 0) continue;
      const falta = pontosDoItem(o.item) - o.feito, usa = Math.min(tem, falta);
      o.feito += usa; leve -= usa; if (ehPesada) pesada -= usa;
      if (o.feito >= pontosDoItem(o.item) - 1e-6) { fac.producao = fac.producao.filter(x => x !== o); guarda(fac, o.item, 1); avisa(P, "fabricou", { fac, item: o.item }); }
    }
    // países: pedidos e entregas
    for (const pais of PAISES) {
      const rel = fac.paises[pais.id];
      if (rel.pedido) {
        if (rel.pedido.alvo.dono === fac) { rel.relacao = Math.min(100, rel.relacao + PEDIDO.premio); avisa(P, "pedidocumprido", { fac, pais, pedido: rel.pedido }); rel.pedido = null; rel.proximoPedido = P.tempo + PEDIDO.aCada; }
        else if (P.tempo > rel.pedido.prazo) { rel.relacao = Math.max(0, rel.relacao - PEDIDO.castigo); avisa(P, "pedidoperdido", { fac, pais, pedido: rel.pedido }); rel.pedido = null; rel.proximoPedido = P.tempo + PEDIDO.aCada; }
      } else if (P.tempo >= rel.proximoPedido) {
        rel.pedido = novoPedido(P, fac, pais);
        if (rel.pedido) avisa(P, "pedido", { fac, pais, pedido: rel.pedido });
        else rel.proximoPedido = P.tempo + PEDIDO.aCada;
      }
      if (P.tempo >= rel.proximaEntrega) {
        rel.proximaEntrega = P.tempo + ENTREGA.aCada;
        const l = entregaDoPais(rel, pais);
        rel.nEntregas = (rel.nEntregas || 0) + 1;
        if (pais.id === "ostlan" && rel.relacao >= 85 && rel.nEntregas % 3 === 0) l.veiculo = 1;   // de 3 em 3 entregas, uma picape
        const cm = comidaDoPais(rel); if (cm) fac.recursos.comida += cm;
        if (Object.keys(l).length || cm) { for (const [k, n] of Object.entries(l)) guarda(fac, k, n); avisa(P, "doacao", { fac, pais, itens: l, comida: cm }); }
      }
    }
  }
}
function textoItens(l) { return Object.entries(l).map(([k, n]) => n + " " + nomeMin(k)).join(", "); }

/* ---------- IA das rivais ---------- */
function armasRival(P, fac) {
  const R = fac.recursos; if (!R) return;
  preparaPaises(P, fac);
  // armas e munição do dia a dia vêm do estoque mínimo dos batalhões (compra automática), como o jogador
  if (!podeFabricar(P, fac, "cx-bala") && fac.producao.length < 2 && R.dinheiro > 400) fabrica(P, fac, fac.municao.bala < 400 ? "cx-bala" : "fuzil");
  // suprimentos: fabrica caixas quando o estoque (QG e batalhões) está baixo; o resto vem do mínimo dos batalhões (compra automática)
  if (!podeFabricar(P, fac, "cx-suprimento") && fac.producao.length < 3 && totalSuprimentos(P, fac) < 60 && R.dinheiro > 600) fabrica(P, fac, "cx-suprimento");
  if (R.influencia > 200) { const p = PAISES.reduce((a, b) => (fac.paises[b.id].relacao > fac.paises[a.id].relacao ? b : a)); mandaEmissario(P, fac, p.id); }
}

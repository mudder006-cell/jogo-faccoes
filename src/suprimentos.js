"use strict";
/* ============================================================
   SUPRIMENTOS (protótipo 19.2): o que o médico e o engenheiro gastam
   Um recurso guardado no estoque do QG, do batalhão e das bases como a
   munição ("cx-suprimento" no catálogo: caixa de 20, ocupa 1 volume nos
   veículos, tem estoque mínimo e compra automática).
   Fontes: oficina ou fábrica (fabricar), mercado negro (comprar),
   contrabando e doação dos países nas entregas. Pronto para o comércio
   entre facções e os tratados com potências (ainda não existem).
   - Médico: cada soldado tratado no campo gasta 1 da mochila (leva 8; repõe
     na base como a munição). Sem suprimentos ele NÃO trata e não ajuda a
     estancar sangramento (decisão: não trata; não existe "trata pior").
   - Hospital e QG: cada ferido tratado gasta 2 do estoque do QG. Sem estoque,
     o tratamento leva o dobro do tempo.
   - Engenheiro (leva 30): fortificar gasta 15 por 100 pontos de fortificação;
     consertar prédio danificado e reconstruir prédio destruído gastam
     suprimentos e tempo. Esquadrão parado ou em guarnição, fora de combate,
     com engenheiro conserta os prédios seus a até 45 m; esquadrão parado sem
     missão vai até um prédio seu danificado a até 220 m.
   - Engenheiro de combate (19.4): 1 por esquadrão com 4 ou mais soldados. Fortifica
     o prédio onde o esquadrão fica parado ou de guarnição por mais de 2 minutos,
     só até 50; o resto da fortificação é da equipe de obras (equipeobras.js).
   - Governo antigo (sem dinheiro): sem estoque. Médico e engenheiro dele nascem
     com a mochila cheia (x1,5), nunca repõem, e o hospital dele trata sempre no
     dobro do tempo.
   - Estradas: hoje nada as danifica (só prédios sofrem dano), então não há
     reconstrução de estrada.
   (Números provisórios.)
   ============================================================ */
const SUPRIMENTO = {
  carga: { medico: 8, engenheiro: 30 },   // o que cada um leva na mochila
  tratarCampo: 1, tratarBase: 2, lentidao: 2,
  fortificarPorPonto: .15,                // fortificação de 0 a 100: 15 suprimentos para chegar a 100
  alcanceObra: 45, procuraObra: 220,      // metros: obra sem sair do lugar / ir até o prédio danificado
  reconstruir: { custoDestruido: 20, horasDestruido: 4, danoAoReerguer: .5, custoDano: 10, horasDano: 2, tamMin: .6, tamMax: 3 },   // custos de uma casa de 120 m², vezes o fator de tamanho
  avisaACada: 90,                         // segundos entre avisos repetidos de "sem suprimentos"
  paradoMin: 120, tetoCombate: .5         // 19.4: o engenheiro do esquadrão só fortifica depois de 2 min parado, e só até 50 de 100
};
const cargaSuprimento = s => (SUPRIMENTO.carga[s.funcao] || 0) * (s.faccao && s.faccao.governo ? CARGA_GOVERNO : 1);
const temSuprimento = (s, q) => (s.suprimentos || 0) >= (q || 1) - 1e-9;
function gastaSuprimento(s, q) { s.suprimentos = Math.max(0, (s.suprimentos || 0) - q); }
/* enche a mochila de quem usa suprimentos com o estoque da base (l = estoques que ele pode usar, como a munição) */
function abasteceSuprimentos(s, l) {
  const c = cargaSuprimento(s); if (!c) return;
  const falta = Math.floor(c - (s.suprimentos || 0));
  if (falta > 0) s.suprimentos = (s.suprimentos || 0) + tiraMunicao(l, "suprimento", falta);
}
const fortificacaoDe = e => Math.round(limita(e.fortificado || 0, 0, 1) * 100);   // 0 a 100, como aparece na tela
function totalSuprimentos(P, fac) {   // estoques (QG, batalhões e bases) mais o que está na mochila e nos veículos
  let n = fac.municao ? fac.municao.suprimento || 0 : 0;
  for (const b of batalhoesDe(P, fac)) n += b.municao.suprimento || 0;
  for (const e of P.reg.edificios) if (e.dono === fac && e.estoque) n += e.estoque.municao.suprimento || 0;
  for (const v of fac.veiculos || []) n += v.carga.municao.suprimento || 0;
  return n;
}
function avisaSemSuprimento(P, s) {
  if (P.tempo - (s.avisouSup || -1e9) < SUPRIMENTO.avisaACada) return;
  s.avisouSup = P.tempo; avisa(P, "semsuprimento", { s, sq: s.sq });
}

/* ---------- tratamento no hospital e no QG ---------- */
/* gasta o estoque do QG; devolve quantas vezes o tempo de tratamento demora (1 normal, 2 sem estoque) */
function gastaTratamento(P, fac, s) {
  const falta = () => { if (organizada(fac) && P.tempo - (fac.avisouSupTrat || -1e9) > HORA) { fac.avisouSupTrat = P.tempo; avisa(P, "semsuprimentosestoque", { fac }); } return SUPRIMENTO.lentidao; };
  if (!organizada(fac) || !fac.base) return SUPRIMENTO.lentidao;   // o governo não tem estoque
  const tirou = tiraMunicao(estoquesNaBase(P, fac, s.bat, fac.base), "suprimento", SUPRIMENTO.tratarBase);
  return tirou >= SUPRIMENTO.tratarBase ? 1 : falta();
}

/* ---------- reposição: o esquadrão volta à base quando o médico ou engenheiro ficou sem nada ---------- */
function precisaSuprimentos(P, sq) {
  const fac = sq.faccao; if (!organizada(fac) || !fac.base) return null;
  if (!ativos(sq).some(s => cargaSuprimento(s) && (s.suprimentos || 0) < 1)) return null;
  const [x, z] = centroDoEsquadrao(sq); let m = null, md = Infinity;
  for (const b of basesDe(P, fac)) {
    if (!somaMunicao(estoquesNaBase(P, fac, sq.bat, b), "suprimento")) continue;
    const d = Math.hypot(b.x - x, b.z - z); if (d < md) { md = d; m = b; }
  }
  return m;
}

/* ---------- obras dos engenheiros ---------- */
const fatorTamanhoObra = e => limita(tamanhoDoPredio(e) / PREDIO.tamanhoRef, SUPRIMENTO.reconstruir.tamMin, SUPRIMENTO.reconstruir.tamMax);
const precisaDeConserto = e => !!e.destruido || (e.dano || 0) > 1e-9;
/* uma etapa de obra em "e" durante dt segundos: reconstrói se destruído, conserta se danificado, senão fortifica.
   Devolve "reconstruir", "consertar" ou "fortificar" quando trabalhou, "semsuprimentos" se faltou material, ou null se não há o que fazer.
   teto (0 a 1, padrão 1): até onde fortifica (19.4: engenheiro de esquadrão 0,5; equipe de obras 1 nas bases e 0,6 na fronteira). */
function trabalhaNoPredio(P, sq, engs, e, dt, soConserto, teto) {
  teto = teto == null ? 1 : teto;
  const R = SUPRIMENTO.reconstruir, tf = fatorTamanhoObra(e);
  const nv = Math.max(...engs.map(s => (s.item === "explosivo" ? s.nivelItem || 1 : 1))) - 1;   // explosivos melhores, fortificação mais rápida
  let fase, taxa, custo, falta;
  if (e.destruido) { fase = "reconstruir"; taxa = 1 / (R.horasDestruido * HORA); custo = R.custoDestruido * tf; falta = 1 - (e.reconstrucao || 0); }
  else if ((e.dano || 0) > 1e-9) { fase = "consertar"; taxa = 1 / (R.horasDano * HORA); custo = R.custoDano * tf; falta = e.dano; }
  else if (!soConserto && (e.fortificado || 0) < teto - 1e-9) { fase = "fortificar"; taxa = 1 / (NIVEL.fortificaHoras[nv] * HORA); custo = SUPRIMENTO.fortificarPorPonto * 100; falta = teto - (e.fortificado || 0); }
  else return null;
  const quer = Math.min(taxa * dt, falta), precisa = quer * custo;
  let feito = quer;
  if (precisa > 0) {
    const tinha = engs.reduce((t, s) => t + (s.suprimentos || 0), 0);
    if (tinha < precisa) feito = quer * tinha / precisa;
    let resto = Math.min(precisa, tinha);
    for (const s of engs) { const p = Math.min(resto, s.suprimentos || 0); if (p > 0) { gastaSuprimento(s, p); resto -= p; } }
    if (tinha < precisa + 1e-9) { for (const s of engs) if ((s.suprimentos || 0) < 1e-6) avisaSemSuprimento(P, s); if (feito <= 0) return "semsuprimentos"; }
  }
  if (fase === "reconstruir") {
    e.reconstrucao = (e.reconstrucao || 0) + feito;
    if (e.reconstrucao >= 1 - 1e-9) {
      e.destruido = false; e.reconstrucao = 0; e.dano = R.danoAoReerguer; e.fortificado = 0;
      avisa(P, "reconstruido", { sq, e });
    }
  } else if (fase === "consertar") {
    e.dano = Math.max(0, e.dano - feito);
    if (e.dano <= 1e-9) { e.dano = 0; avisa(P, "consertado", { sq, e }); }
  } else {
    const antes = e.fortificado || 0;
    e.fortificado = Math.min(teto, antes + feito);
    if (antes < teto - 1e-9 && e.fortificado >= teto - 1e-9) { e.fortificado = teto; avisa(P, "fortificado", { sq, e }); }
  }
  return fase;
}
/* prédio seu danificado ou destruído para os engenheiros do esquadrão consertarem sem sair do lugar */
function predioPerto(P, sq, raio, soAqui) {
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq); let melhor = null, md = Infinity;
  const confere = e => {
    if (e.dono !== fac || !precisaDeConserto(e) || e === sq.guarda) return;
    if (defensores(P, e, fac).length || guarnicaoDe(P, e).some(o => o !== sq && o.combate)) return;
    const d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; melhor = e; }
  };
  if (soAqui) P.reg.oc.edificiosPerto(x, z, raio, confere);
  else for (const e of P.reg.edificios) if (e.dono === fac) confere(e);
  return melhor && md <= raio ? melhor : null;
}
/* prédio seu onde o esquadrão está (a até alcanceObra) e que ainda não chegou ao teto de fortificação */
function predioParaFortificar(P, sq, raio, teto) {
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq); let melhor = null, md = Infinity;
  P.reg.oc.edificiosPerto(x, z, raio, e => {
    if (e.dono !== fac || e.destruido || (e.fortificado || 0) >= teto - 1e-9) return;
    const d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; melhor = e; }
  });
  return melhor;
}
/* chamado a cada segundo: esquadrões com engenheiro, fora de combate, parados ou em guarnição, fazem obra.
   Conserto e reconstrução na hora; fortificar só depois de 2 min no mesmo estado e só até o teto de 50 (19.4). */
function fortificacoes(P, dt) {
  const teto = SUPRIMENTO.tetoCombate;
  for (const sq of P.esquadroes) {
    if (sq.combate || (sq.estado !== "guarnição" && sq.estado !== "parado") || !ativos(sq).length) { sq.quietoDesde = null; continue; }
    if (sq.quietoDesde == null || sq.quietoEstado !== sq.estado) { sq.quietoDesde = P.tempo; sq.quietoEstado = sq.estado; }
    const engs = ativos(sq).filter(s => s.funcao === "engenheiro"); if (!engs.length) continue;
    const quieto = P.tempo - sq.quietoDesde >= SUPRIMENTO.paradoMin;
    const g = sq.estado === "guarnição" && sq.guarda && sq.guarda.dono === sq.faccao ? sq.guarda : null;
    let e = g, soConserto = !quieto;
    if (!g || (!precisaDeConserto(g) && (g.fortificado || 0) >= teto - 1e-9)) { e = predioPerto(P, sq, SUPRIMENTO.alcanceObra, true); soConserto = true; }
    let foi = false;
    if (!e && sq.estado === "parado" && !sq.fixo && !sq.missao && P.tempo >= (sq.proximaObra || 0)) {   // parado sem missão: vai até um prédio seu danificado
      sq.proximaObra = P.tempo + 10;
      if (engs.some(s => temSuprimento(s, 1))) {
        const alvo = predioPerto(P, sq, SUPRIMENTO.procuraObra, false);
        if (alvo && !guarnicaoDe(P, alvo).some(o => o !== sq)) { ordenaPredio(P, sq, alvo, "defesa"); foi = true; }
      }
    }
    if (!e && !g && quieto && !foi) { e = predioParaFortificar(P, sq, SUPRIMENTO.alcanceObra, teto); soConserto = false; }
    if (!e) continue;
    const r = trabalhaNoPredio(P, sq, engs, e, dt, soConserto, teto);
    if (r && r !== "semsuprimentos") sq.obraAte = P.tempo + 3;
  }
}
/* ação do jogador: manda o esquadrão com engenheiro mais perto reconstruir ou consertar este prédio. Devolve o motivo se não der. */
function motivoReconstruir(P, fac, e) {
  if (e.dono !== fac) return "o prédio não é seu";
  if (!precisaDeConserto(e)) return "não precisa de conserto";
  if (defensores(P, e, fac).length) return "tem inimigos dentro";
  if (!engenheiroPara(P, fac, e)) return "nenhum esquadrão seu tem engenheiro livre com suprimentos";
  return null;
}
function engenheiroPara(P, fac, e) {
  let melhor = null, md = Infinity;
  for (const sq of P.esquadroes) {
    if (sq.faccao !== fac || sq.combate || !ativos(sq).length) continue;
    const engs = ativos(sq).filter(s => s.funcao === "engenheiro" && temSuprimento(s, 1)); if (!engs.length) continue;
    const [x, z] = centroDoEsquadrao(sq), d = Math.hypot(e.x - x, e.z - z); if (d < md) { md = d; melhor = sq; }
  }
  return melhor;
}
function reconstroi(P, fac, e) {
  if (motivoReconstruir(P, fac, e)) return false;
  const sq = engenheiroPara(P, fac, e);
  ordenaPredio(P, sq, e, "defesa"); ordemDireta(sq, true);
  avisa(P, "ordem", { sq, e });
  return true;
}

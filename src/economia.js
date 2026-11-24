"use strict";
/* ============================================================
   ECONOMIA: dinheiro, influência e comida
   Contas por hora de jogo. Cada facção (menos o governo, que só
   tem o caixa negativo) recebe e gasta a cada hora.
   Protótipo 19: "convencer algo" da rival confere só os prédios da própria
   facção em vez de varrer o mapa inteiro a cada prédio (pico de ~70 ms).
   ============================================================ */
const RECURSOS_INICIAIS = { dinheiro: 3000, influencia: 20, comida: 200 };
// imposto fixo por prédio ($ por hora)
const IMPOSTO = { casa: 2, predio: 0, loja: 8, mercado: 14, posto: 20, oficina: 6, armazem: 10, fabrica: 18, fazenda: 3, lider: 4, mesquita: 0, escola: 0, hospital: 0, delegacia: 0, governo: 0, quartel: 0, cidadela: 0, caixadagua: 0 };
const IMPOSTO_POR_ANDAR = 1.5;           // prédio residencial: por andar
// comida produzida por hora
const COMIDA = { fazenda: 30, armazem: 10, mercado: 4 };   // 19.4: fazenda 20 → 30, armazém 6 → 10
const COMIDA_POR_CAMPO = .4;             // cada roça, pomar ou olival numa zona com controle total
// influência por hora
const INFLUENCIA = { mesquita: 1, lider: 2, escola: .5, hospital: .5 };
const INFLUENCIA_ZONA = 1.5;             // por zona com controle total
const BONUS_CONTROLE_TOTAL = .25;        // +25% de imposto nos prédios de zona com controle total
const SALARIO = 5;                       // $ por soldado por hora
const MANUTENCAO = { qg: 15, lider: 8, avancada: 4 };   // $ por hora por base
const COME_SOLDADO = .1, COME_MORADOR = .04;   // comida por pessoa por hora
const DISTRIBUIR = { comida: 50, influencia: 8 };
/* facção "zumbi" (19.4): com menos de 5 prédios e caixa negativo por 12 h seguidas, ela se desfaz (desertam os soldados, os prédios ficam sem dono) */
const ZUMBI = { predios: 5, horas: 12, avisoFaltando: 1 };
const CONVENCER = { casa: 24, predio: 36, chave: 120, governo: 1.5 };   // custo em influência (×1,5 se for do governo)

function moradoresDe(e) {
  if (e.destruido) return 0;
  if (e.tipo === "casa") return e.patio ? 8 : e.murada ? 6 : 5;
  if (e.tipo === "predio") return e.andares * 6;
  return { loja: 2, lider: 12, fazenda: 6, mercado: 0 }[e.tipo] || 0;
}
function impostoDe(e) { if (e.destruido) return 0; return e.tipo === "predio" ? IMPOSTO_POR_ANDAR * e.andares : IMPOSTO[e.tipo] || 0; }

/* Contas da facção por hora, item por item (para o painel mostrar de onde vem cada número) */
function contas(P, fac) {
  const c = { dinheiro: [], influencia: [], comida: [] };
  const soma = {};
  const add = (rec, rotulo, v) => { if (!v) return; const k = rec + "|" + rotulo; soma[k] = (soma[k] || 0) + v; };
  let moradores = 0, semComida = 0, campos = 0;
  const zonasMinhas = new Set(P.reg.zonas.filter(z => z.dono === fac));
  for (const e of P.reg.edificios) {
    if (e.dono !== fac) continue;
    const bonus = zonasMinhas.has(e.zona) ? 1 + BONUS_CONTROLE_TOTAL : 1;
    const conf = fatorImposto(fac, e.zona);
    add("dinheiro", "Imposto: " + TIPOS[e.tipo].n.toLowerCase(), impostoDe(e) * bonus * conf);
    add("comida", "Produção: " + TIPOS[e.tipo].n.toLowerCase(), comidaDoPredio(e));
    add("influencia", TIPOS[e.tipo].n, INFLUENCIA[e.tipo] || 0);
    if (alimenta(fac, e.zona)) moradores += moradoresDe(e); else semComida += moradoresDe(e);
  }
  for (const cp of P.reg.campos) { const zn = zonaDe(P.reg, cp.o.x, cp.o.z); if (zonasMinhas.has(zn)) campos++; }
  add("comida", "Roças e pomares (" + campos + ")", campos * COMIDA_POR_CAMPO);
  add("influencia", "Zonas com controle total (" + zonasMinhas.size + ")", zonasMinhas.size * INFLUENCIA_ZONA);
  const tropa = P.soldados.filter(s => s.faccao === fac && ["ok", "ferido", "tratando", "fila", "reserva", "motorista"].includes(s.vida)), soldados = tropa.length;
  add("dinheiro", "Salário de " + soldados + " soldados", -tropa.reduce((n, s) => n + salarioDe(s), 0));
  const equipe = totalEquipeDeObras(P, fac);   // 19.4: engenheiros das equipes de obras (fora dos esquadrões)
  if (equipe) { add("dinheiro", "Salário da equipe de obras (" + equipe + ")", -equipe * SALARIO); add("comida", "Equipe de obras come (" + equipe + ")", -equipe * COME_SOLDADO); }
  if (fac.base) {
    add("dinheiro", "Manutenção do QG", -MANUTENCAO.qg);
    const bl = new Set(batalhoesDe(P, fac).map(b => b.base).filter(e => e && e !== fac.base));
    if (bl.size) add("dinheiro", "Manutenção das bases dos líderes (" + bl.size + ")", -bl.size * MANUTENCAO.lider);
    const av = P.reg.edificios.filter(e => e.dono === fac && e.tipo === "lider" && e !== fac.base && !bl.has(e)).length;
    if (av) add("dinheiro", "Manutenção das bases avançadas (" + av + ")", -av * MANUTENCAO.avancada);
  }
  add("comida", "Soldados comem (" + soldados + ")", -soldados * COME_SOLDADO);
  add("comida", "Moradores comem (" + moradores + ")", -moradores * COME_MORADOR);
  for (const [k, v] of Object.entries(soma)) { const [rec, rotulo] = k.split("|"); c[rec].push([rotulo, v]); }
  for (const rec of Object.keys(c)) c[rec].sort((a, b) => b[1] - a[1]);
  c.total = { dinheiro: 0, influencia: 0, comida: 0 };
  for (const rec of Object.keys(c.total)) for (const [, v] of c[rec]) c.total[rec] += v;
  c.moradores = moradores; c.semComida = semComida; c.soldados = soldados;
  return c;
}

function horaDaEconomia(P) {
  for (const fac of P.faccoes) {
    if (fac.governo || !fac.recursos) continue;
    const c = contas(P, fac), R = fac.recursos;
    R.dinheiro += c.total.dinheiro; R.influencia += c.total.influencia; R.comida += c.total.comida;
    const meus = P.soldados.filter(s => s.faccao === fac && s.vida === "ok");
    // sem dinheiro: sem salário, moral cai e alguns desertam
    if (R.dinheiro < 0) {
      for (const s of meus) {
        s.moral -= 5;
        if (P.r() < .02 * (1.3 - s.atr.disciplina / 100)) { anota(P, s, "Desertou: sem salário"); s.vida = "desertou"; s.caiuEm = P.tempo; tiraDoEsquadrao(P, s); avisa(P, "desercao", { s }); }
      }
      avisa(P, "falta", { fac, rec: "dinheiro" });
    }
    // sem comida: moral cai rápido e os bairros alimentados perdem a confiança
    const faltou = R.comida < 0;
    if (faltou) {
      R.comida = 0;
      for (const s of meus) s.moral -= 10;
      avisa(P, "falta", { fac, rec: "comida" });
    }
    // difícil: as rivais recebem mais renda
    if (!fac.jogador && dificuldade(P).renda > 1 && c.total.dinheiro > 0) R.dinheiro += c.total.dinheiro * (dificuldade(P).renda - 1);
    verificaZumbi(P, fac);
    horaDaConfianca(P, fac, faltou);
    horaDasObras(P, fac);
    if (!fac.jogador) obrasRival(P, fac);
    R.influencia = Math.max(0, R.influencia);
  }
}

/* a cada hora: a contagem de 12 h começa quando a facção tem menos de 5 prédios e caixa negativo; sai se uma das duas coisas melhora.
   Avisa quando a contagem começa e 1 h antes do fim. Vale para o jogador (derrota) e para as rivais, nunca para o governo antigo. */
function verificaZumbi(P, fac) {
  if (fac.governo || fac.eliminada) return;
  let predios = 0; for (const e of P.reg.edificios) if (e.dono === fac) predios++;
  if (predios >= ZUMBI.predios || fac.recursos.dinheiro >= 0) {
    if (fac.zumbiDesde != null) { fac.zumbiDesde = null; fac.zumbiAvisou = false; avisa(P, "zumbialivio", { fac }); }
    return;
  }
  if (fac.zumbiDesde == null) { fac.zumbiDesde = P.tempo; fac.zumbiAvisou = false; avisa(P, "zumbi", { fac, horas: ZUMBI.horas, predios }); return; }
  const falta = ZUMBI.horas - (P.tempo - fac.zumbiDesde) / HORA;
  if (falta <= 1e-9) { eliminaFaccao(P, fac, null, "zumbi"); return; }
  if (falta <= ZUMBI.avisoFaltando + 1e-9 && !fac.zumbiAvisou) { fac.zumbiAvisou = true; avisa(P, "zumbifim", { fac, horas: ZUMBI.avisoFaltando }); }
}

/* ---------- ações ---------- */
function custoConvencer(e) {
  let c = TIPOS_CHAVE.includes(e.tipo) ? CONVENCER.chave : e.tipo === "predio" ? CONVENCER.predio : CONVENCER.casa;
  if (e.dono && e.dono.governo) c *= CONVENCER.governo;
  return Math.round(c);
}
/* Dá para convencer os moradores? (sem defensores, e a facção já tem algo perto) */
function podeConvencer(P, fac, e, meus) {   // meus (opcional): lista dos prédios da facção, para não varrer o mapa inteiro a cada prédio
  if (e.dono === fac) return "o prédio já é seu";
  if (e.dono && !e.dono.governo && ["pacto", "alianca", "cessarfogo"].includes(estadoEntre(P, fac, e.dono))) return "é de " + e.dono.nome + ", com quem você tem " + ESTADOS[estadoEntre(P, fac, e.dono)].n.toLowerCase();
  if (defensores(P, e, fac).length) return "tem guarnição inimiga";
  if (!moradoresDe(e) && !TIPOS_CHAVE.includes(e.tipo)) return "não tem moradores para convencer";
  const perto = (meus || P.reg.edificios).some(o => o.dono === fac && (o.zona === e.zona || Math.hypot(o.x - e.x, o.z - e.z) < 150));
  if (!perto) return "você não tem presença nesta área";
  if (fac.recursos.influencia < custoConvencer(e)) return "influência insuficiente";
  return null;
}
function convence(P, fac, e) {
  if (podeConvencer(P, fac, e)) return false;
  fac.recursos.influencia -= custoConvencer(e);
  tomaEdificio(P, e, fac);
  avisa(P, "convenceu", { fac, e });
  return true;
}
function distribuiComida(P, fac) {
  if (fac.recursos.comida < DISTRIBUIR.comida) return false;
  fac.recursos.comida -= DISTRIBUIR.comida; fac.recursos.influencia += DISTRIBUIR.influencia;
  avisa(P, "distribuiu", { fac });
  return true;
}

/* IA das rivais: convence prédios baratos perto e distribui comida quando sobra */
function economiaRival(P, fac) {
  const R = fac.recursos; if (!R) return;
  for (let i = 0; i < 3 && R.comida > 450; i++) distribuiComida(P, fac);
  for (let i = 0; i < 2 && R.influencia >= 40; i++) convenceAlgo(P, fac);
}
function convenceAlgo(P, fac) {
  const meus = P.reg.edificios.filter(e => e.dono === fac);
  let melhor = null, md = Infinity;
  for (const e of P.reg.edificios) {
    if (e.dono === fac || podeConvencer(P, fac, e, meus)) continue;
    let d = Infinity; for (const m of meus) d = Math.min(d, Math.hypot(m.x - e.x, m.z - e.z));
    const nota = d - (TIPOS_CHAVE.includes(e.tipo) ? 80 : 0);
    if (nota < md) { md = nota; melhor = e; }
  }
  if (melhor) convence(P, fac, melhor);
}

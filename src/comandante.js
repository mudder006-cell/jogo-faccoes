"use strict";
/* ============================================================
   COMANDANTE DAS RIVAIS (protótipo 18)
   As rivais jogam com as mesmas regras do jogador: batalhões com líder,
   sargentos, missões e postura, estoque por base, estoque mínimo,
   veículos de logística e compra automática. Ninguém trapaceia: a IA
   não ganha dinheiro, soldados nem armas de graça.
   O comandante de cada rival faz o papel do jogador:
   - abre batalhões quando o território deixa e há quem comande;
   - define o mínimo de soldados, armas e munição de cada batalhão,
     conforme o caixa e a renda (sem caixa, não cresce);
   - escolhe as ordens: proteger o QG ameaçado, segurar a frente ou
     avançar contra quem está em guerra com ela, tomar a zona mais
     vantajosa perto da sua área;
   - escolhe a postura (a dificuldade e o tamanho do batalhão mudam).
   A dificuldade muda a rapidez com que o comandante reage, quanto ele
   arrisca e o tamanho do exército que tenta manter.
   (Números provisórios.)
   ============================================================ */
const DIFICULDADES = {
  facil:   { n: "Fácil",   pensa: 90, postura: "cauteloso",   ordens: 2, soldados: 10, reserva: .6, ataque: 1.6, dica: "As rivais reagem devagar, arriscam pouco e mantêm exércitos menores" },
  normal:  { n: "Normal",  pensa: 40, postura: "equilibrado", ordens: 3, soldados: 16, reserva: 1,  ataque: 1.2, dica: "As rivais jogam com as mesmas regras que você" },
  dificil: { n: "Difícil", pensa: 15, postura: "agressivo",   ordens: 4, soldados: 22, reserva: 1.4, ataque: .9, dica: "As rivais reagem rápido, atacam mais cedo e mantêm exércitos maiores" }
};
const COMANDANTE = { fronteira: 160, ameacaQG: 420, ameacaMinima: 3, caixaParaCrescer: 1500, caixaParaSuporte: 3000, caixaParaRpg: 8000, caixaMinimo: 1000 };
const dificuldade = P => DIFICULDADES[P.dificuldade] || DIFICULDADES.normal;
const MAIS_CAUTELOSO = { agressivo: "equilibrado", equilibrado: "cauteloso", cauteloso: "cauteloso" };

function comandantesDoSegundo(P) {
  const d = dificuldade(P);
  for (const fac of P.faccoes) {
    if (fac.jogador || !completa(fac) || fac.eliminada || !fac.base) continue;
    if (P.tempo < (fac.proximoComando || 0)) continue;
    fac.proximoComando = P.tempo + d.pensa;
    pensaComandante(P, fac, d);
  }
}
function comandantesDaHora(P) { /* reservado: o comandante pensa pelo relógio da dificuldade */ }

function pensaComandante(P, fac, d) {
  abreBatalhao(P, fac);
  const bats = batalhoesDe(P, fac); if (!bats.length) return;
  const c = contas(P, fac);
  for (const b of bats) {
    ajustaMinimos(P, fac, b, d, c);
    b.postura = soldadosDe(P, b).length < 6 ? MAIS_CAUTELOSO[d.postura] : d.postura;
  }
  planejaOrdens(P, fac, d, bats);
}

/* ---------- batalhões ---------- */
function abreBatalhao(P, fac) {
  if (batalhoesDe(P, fac).length >= limiteBatalhoes(P, fac)) return;
  if (P.soldados.some(s => s.faccao === fac && s.pedido && s.pedido.tipo === "comandar")) return;   // já tem um a caminho da base
  const c = candidatosACmd(P, fac).filter(s => !(s.sq && s.sq.lider === s && ativos(s.sq).length <= 3))   // não desmancha esquadrão pequeno
    .sort((a, b) => b.atr.lideranca - a.atr.lideranca)[0];
  if (c) pedeComando(P, c);
}

/* ---------- estoque mínimo: o que o batalhão tenta manter (a compra automática faz o resto) ---------- */
function ajustaMinimos(P, fac, b, d, c) {
  const R = fac.recursos, m = b.minimo || (b.minimo = {});
  const sold = soldadosDe(P, b).length;
  const apertado = R.dinheiro < COMANDANTE.caixaParaCrescer && c.total.dinheiro < 0;
  const semComida = R.comida < 30 && c.total.comida < 0;
  m.soldados = apertado || semComida ? Math.min(d.soldados, sold) : d.soldados;
  const n = Math.max(sold, 6), nsq = Math.max(1, Math.ceil(n / BATALHAO.tamanhoEsquadrao));
  const pobre = R.dinheiro < COMANDANTE.caixaMinimo;
  m.fuzil = pobre ? 0 : Math.ceil(n * .2 * d.reserva);
  m["cx-bala"] = Math.round(n * MUNICOES.bala.carga * .5 * d.reserva);
  const suporte = R.dinheiro > COMANDANTE.caixaParaSuporte;
  m.metralhadora = suporte ? nsq : 0;
  m.kit = suporte ? nsq : pobre ? 0 : 1;
  m["cx-cinta"] = noArsenal(b, "metralhadora") || ativos2(P, fac, "metralhadora") ? Math.round(nsq * MUNICOES.cinta.carga * .5 * d.reserva) : 0;
  const rpg = R.dinheiro > COMANDANTE.caixaParaRpg;
  m.rpg = rpg ? nsq : 0;
  m["cx-foguete"] = noArsenal(b, "rpg") || ativos2(P, fac, "rpg") ? Math.round(nsq * MUNICOES.foguete.carga * d.reserva) : 0;
}
function ativos2(P, fac, arma) { return P.soldados.some(s => s.faccao === fac && s.vida === "ok" && s.arma === arma); }

/* ---------- ordens ---------- */
function planejaOrdens(P, fac, d, bats) {
  const meus = P.reg.edificios.filter(e => e.dono === fac);
  if (!meus.length) return;
  const forcaDe = f => P.soldados.filter(s => s.faccao === f && s.vida === "ok" && s.arma).length;
  const minha = forcaDe(fac);
  const ordens = [];
  // 1) QG ameaçado: protege a zona do QG
  let ameaca = 0;
  for (const q of P.esquadroes) {
    if (!ativos(q).length || !hostis(P, q.faccao, fac) || (q.guarda && !q.combate && q.faccao.governo)) continue;
    const [x, z] = centroDoEsquadrao(q);
    if (Math.hypot(x - fac.base.x, z - fac.base.z) < COMANDANTE.ameacaQG) ameaca += ativos(q).length;
  }
  if (ameaca >= COMANDANTE.ameacaMinima) ordens.push({ tipo: "proteger", alvo: fac.base.zona, peso: 3 + ameaca });
  // 2) facções em guerra com fronteira: segura ou avança
  const vizinhas = new Map();
  for (const e of meus) P.reg.oc.edificiosPerto(e.x, e.z, COMANDANTE.fronteira, o => { if (o.dono && o.dono !== fac && !o.dono.governo && hostis(P, fac, o.dono)) vizinhas.set(o.dono, (vizinhas.get(o.dono) || 0) + 1); });
  for (const [outra, contato] of [...vizinhas.entries()].sort((a, b) => b[1] - a[1])) {
    const forte = minha >= forcaDe(outra) * d.ataque;
    ordens.push({ tipo: forte ? "avancar" : "frente", alvo: outra, peso: forte ? 2 : 2 + contato / 20 });
  }
  // 3) expansão: a zona mais vantajosa perto da sua área
  const zona = melhorZona(P, fac, d, meus, minha);
  if (zona) ordens.push({ tipo: "tomar", alvo: zona, peso: 1.5 });
  ordens.sort((a, b) => b.peso - a.peso);
  // divide entre os batalhões: o 1º (perto do QG) fica com a defesa; os outros com o que estiver mais perto da base deles
  const porBat = new Map(bats.map(b => [b, []]));
  const lugar = o => o.alvo.chaves ? [o.alvo.x, o.alvo.z] : o.alvo.base ? [o.alvo.base.x, o.alvo.base.z] : [fac.base.x, fac.base.z];
  for (const o of ordens.slice(0, d.ordens * bats.length)) {
    let b;
    if (o.tipo === "proteger" || bats.length === 1) b = bats[0];
    else { const [x, z] = lugar(o); b = bats.filter(k => porBat.get(k).length < d.ordens).sort((a, k) => (porBat.get(a).length - porBat.get(k).length) || Math.hypot(a.base.x - x, a.base.z - z) - Math.hypot(k.base.x - x, k.base.z - z))[0]; }
    if (b && porBat.get(b).length < Math.min(d.ordens, MAX_ORDENS)) porBat.get(b).push(o);
  }
  for (const [b, l] of porBat) poeOrdens(P, b, l);
}
/* troca as ordens do batalhão sem desmanchar as que continuam iguais (o líder não reembaralha os esquadrões à toa) */
function poeOrdens(P, b, l) {
  const antes = b.ordens || [];
  const novas = l.map(o => antes.find(a => a.tipo === o.tipo && a.alvo === o.alvo) || { tipo: o.tipo, alvo: o.alvo, desde: P.tempo, id: (b.nOrdem = (b.nOrdem || 0) + 1) });
  const mudou = novas.length !== antes.length || novas.some((o, i) => o !== antes[i]);
  b.ordens = novas;
  if (mudou) { b.proximo = 0; avisa(P, "ordembatalhao", { b }); }
}
function melhorZona(P, fac, d, meus, minha) {
  let melhor = null, nota = Infinity;
  for (const zn of P.reg.zonas) {
    if (zn.dono === fac || !zn.chaves.length) continue;
    const toma = zn.chaves.filter(e => podeTomar(P, fac, e));
    if (!toma.length) continue;
    let dist = Infinity; for (const e of meus) dist = Math.min(dist, Math.hypot(e.x - zn.x, e.z - zn.z));
    if (dist > 1200) continue;
    const defesa = toma.reduce((n, e) => n + forcaDefesa(P, e, fac), 0) / toma.length;   // defesa média de um ponto
    if (defesa * d.ataque > Math.max(minha, 3)) continue;   // nem o ponto médio dá para tomar
    const ja = zn.chaves.filter(e => e.dono === fac).length / zn.chaves.length;
    const n = dist + defesa * 60 - ja * 400 + (zn.tipo === "velha" ? 300 : 0);
    if (n < nota) { nota = n; melhor = zn; }
  }
  return melhor;
}

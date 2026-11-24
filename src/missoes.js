"use strict";
/* ============================================================
   MISSÕES, POSTURA E INICIATIVA DOS ESQUADRÕES
   O jogador dá uma missão geral e uma postura; o esquadrão decide o resto.
   - Missões: expandir, defender um bairro, caçar inimigos, apoiar outro esquadrão.
   - Postura: agressivo, equilibrado, cauteloso (muda alvos, desvios e quando recuar).
   - Iniciativa (sem missão, ou entre um passo e outro da missão):
     voltar ao QG para se refazer, pegar prédios fáceis colados aos seus,
     socorrer prédios e esquadrões vizinhos, pedir ajuda quando está perdendo.
   Uma ordem direta do jogador (ir até um ponto, linha, zona, segurar) tira a missão.
   (Números provisórios.)
   ============================================================ */
const MISSOES = {
  expandir: { n: "Expandir", icone: "flag_plus", dica: "Vai tomando prédios e pontos importantes perto da sua área" },
  defender: { n: "Defender bairro", icone: "shield_home", dica: "Fica num bairro e corre para onde houver ataque ali" },
  cacar:    { n: "Caçar inimigos", icone: "target_account", dica: "Procura esquadrões inimigos perto e ataca os que dá para vencer" },
  apoiar:   { n: "Apoiar", icone: "account_supervisor", dica: "Segue outro esquadrão e entra no combate quando ele luta" }
};
const POSTURAS = {
  agressivo:   { n: "Agressivo", icone: "sword", refazAbaixo: .34, moralRecuo: 25, perdasRecuo: 3, razaoRecuo: .6, vantagem: .9, desvio: 220, folga: 2, pegaFacil: 120 },
  equilibrado: { n: "Equilibrado", icone: "scale_balance", refazAbaixo: .5, moralRecuo: 35, perdasRecuo: 2, razaoRecuo: .75, vantagem: 1.2, desvio: 150, folga: 0, pegaFacil: 90 },
  cauteloso:   { n: "Cauteloso", icone: "turtle", refazAbaixo: .67, moralRecuo: 45, perdasRecuo: 1, razaoRecuo: 1, vantagem: 1.6, desvio: 80, folga: -2, pegaFacil: 50 }
};
const PENSA_MISSAO = 3;          // segundos entre decisões
const RAIO_SOCORRO = 380;        // socorre prédios e esquadrões seus até essa distância
const MINIMO_PARA_LUTAR = 3;     // com menos soldados, volta ao QG para se refazer
const RAIO_CACA = 900;
const postura = sq => POSTURAS[sq.postura || "equilibrado"];
const forca = sq => ativos(sq).filter(s => s.arma).length;

function daMissao(P, sq, tipo, alvo) {
  sq.missao = tipo ? { tipo, alvo: alvo || null, desde: P.tempo } : null;
  sq.fixo = false; sq.proximaMissao = 0; sq.caca = null;
  avisa(P, "missao", { sq });
}
function ordemDireta(sq, fixo) { sq.missao = null; sq.fixo = !!fixo; sq.caca = null; }

/* força de um prédio defendido (soma dos defensores) */
function forcaDefesa(P, e, fac) { return defensores(P, e, fac).reduce((n, d) => n + ativos(d).length, 0); }
/* quem está dentro de prédio vale mais: entrincheirado */
const PESO_ENTRINCHEIRADO = { agressivo: 1.3, equilibrado: 1.8, cauteloso: 99 };
function daPraTomar(P, sq, e) { const d = forcaDefesa(P, e, sq.faccao) * (1 + .4 * (e.fortificado || 0)); return !d || forca(sq) >= d * PESO_ENTRINCHEIRADO[sq.postura || "equilibrado"]; }
function perigoDeAlguem(P, sq) {   // um inimigo perto atacando algo meu?
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq);
  let melhor = null, md = RAIO_SOCORRO;
  for (const o of P.esquadroes) {
    if (!hostis(P, o.faccao, fac) || !ativos(o).length) continue;
    const alvo = o.alvo || o.sub || o.ordem.alvo;
    const ameacaMeu = (alvo && (alvo.dono === fac || aliados(P, alvo.dono, fac))) || (o.combate && P.esquadroes.some(m => m.faccao === fac && m.combate && m !== sq && Math.hypot(centroDoEsquadrao(m)[0] - centroDoEsquadrao(o)[0], centroDoEsquadrao(m)[1] - centroDoEsquadrao(o)[1]) < DISTANCIA_DE_CONTATO));
    if (!ameacaMeu || (o.guarda && !o.combate)) continue;
    const [ox, oz] = centroDoEsquadrao(o), d = Math.hypot(ox - x, oz - z);
    if (d < md && forca(sq) >= ativos(o).length - 1 + (sq.postura === "agressivo" ? 2 : 0)) { md = d; melhor = o; }
  }
  return melhor;
}
function vaiAtacarEsquadrao(P, sq, o, motivo) {
  const [x, z] = centroDoEsquadrao(o);
  const m = sq.missao; ordenaPonto(P, sq, x, z, "ataque"); sq.missao = m;
  sq.caca = { alvo: o, x, z };
  if (motivo) avisa(P, motivo, { sq, o, e: { x, z } });
}

/* ---------- decisão de cada esquadrão do jogador ---------- */
function pensaMissao(P, sq) {
  if (!ativos(sq).length || sq.combate) return;
  if (logistica(P, sq)) return;   // pedidos de troca: vai à base antes de tudo
  const fac = sq.faccao, m = sq.missao;
  // 1) se refazer: perdeu muita gente, ficou pequeno ou tem gente sem arma → QG
  sq.maior = Math.max(sq.maior || 0, ativos(sq).length);
  const baseSup = precisaSuprimentos(P, sq);   // médico ou engenheiro sem suprimentos e uma base com estoque
  const recarregar = precisaRecarregar(sq, P) || !!baseSup, alvoRec = recarregar && organizada(fac) ? (baseParaRecarregar(P, sq) || baseSup) : null;
  if (!recarregar && poucaMunicao(sq) >= Math.ceil(ativos(sq).length / 2)) {
    if (!sq.avisouEstoque) { sq.avisouEstoque = true; const s = ativos(sq).find(s => s.arma && s.municao < cargaDe(s) * POUCA_MUNICAO); if (s) avisa(P, "semestoque", { sq, tipo: MUNICAO_DA[s.arma] }); }
  } else if (municaoMedia(sq) > .5) sq.avisouEstoque = false;
  const fraco = recarregar || (forca(sq) < MINIMO_PARA_LUTAR && !(sq.manual && forca(sq) === ativos(sq).length && !sq.perdas)) || forca(sq) <= sq.maior * postura(sq).refazAbaixo;
  let base = pertoDeBase(P, fac, sq);
  if (alvoRec && base && base !== alvoRec) base = null;   // esta base não tem munição: vai à que tem
  if (fac.base && (fraco || semArma(sq)) && !base) {
    const [x, z] = centroDoEsquadrao(sq), alvo = alvoRec || baseMaisPerto(P, fac, x, z);
    if (!(sq.estado === "andando" && sq.ordem.alvo === alvo)) { const mm = sq.missao; ordenaPredio(P, sq, alvo, "defesa"); sq.missao = mm; avisa(P, recarregar ? "recarregar" : "refazer", { sq, base: alvo }); }
    return;
  }
  if (base) { completaNaBase(P, sq, base); if (!ativos(sq).length) return; sq.maior = ativos(sq).length; if (forca(sq) < MINIMO_PARA_LUTAR) return; }
  if (sq.fixo) return;
  // 2) caçada em curso: corrige o rumo se o alvo andou
  if (sq.caca && sq.estado === "andando") {
    const o = sq.caca.alvo;
    if (!ativos(o).length) sq.caca = null;
    else { const [x, z] = centroDoEsquadrao(o); if (Math.hypot(x - sq.caca.x, z - sq.caca.z) > 60) vaiAtacarEsquadrao(P, sq, o); return; }
  }
  if (sq.estado === "andando") return;
  sq.caca = null;
  // 3) socorrer (menos quem está apoiando ou caçando, que tem lógica própria)
  if (!m || m.tipo === "expandir" || m.tipo === "defender" || m.tipo === "frente") {
    const o = perigoDeAlguem(P, sq);
    if (o && (!m || m.tipo !== "defender" || zonaDe(P.reg, ...centroDoEsquadrao(o)) === m.alvo)) { vaiAtacarEsquadrao(P, sq, o, "socorro"); return; }
  }
  if (!m) { if (!(sq.obraAte > P.tempo)) pegaFacil(P, sq); return; }   // engenheiros no meio de uma obra seguram o esquadrão
  if (m.tipo === "expandir") missaoExpandir(P, sq);
  else if (m.tipo === "defender") missaoDefender(P, sq);
  else if (m.tipo === "cacar") missaoCacar(P, sq);
  else if (m.tipo === "apoiar") missaoApoiar(P, sq);
  else if (m.tipo === "frente") missaoFrente(P, sq);
  else if (m.tipo === "ronda") missaoRonda(P, sq);
  else if (m.tipo === "reacao") missaoReacao(P, sq);
}

/* numa base: pega soldados que esperam ali até 6 (as armas ele pega sozinho em armaNoQG) */
function completaNaBase(P, sq, base) {
  const fac = sq.faccao;
  for (const s of (fac.reserva || []).slice()) {
    if (ativos(sq).length >= 6) break;
    if (s.pedido || ondeEspera(s) !== base || (s.bat || null) !== (sq.bat || null)) continue;
    moveSoldado(P, s, sq); avisa(P, "reforcado", { sq, s });
  }
  // restos pequenos se juntam com outro esquadrão que está no QG
  if (ativos(sq).length < MINIMO_PARA_LUTAR && !sq.manual) {
    const outro = P.esquadroes.find(o => o !== sq && o.faccao === fac && o.bat === sq.bat && !o.combate && ativos(o).length && ativos(o).length < 8 && pertoDeBase(P, fac, o) === base);
    if (outro) { const l = ativos(sq); for (const s of l) moveSoldado(P, s, outro); avisa(P, "juntou", { sq: outro, de: sq, n: l.length }); }
  }
}

/* sem missão: toma prédios sem defesa colados à sua área, perto de onde está */
function pegaFacil(P, sq) {
  if (!sq.posto || sq.estado === "guarnição" && Math.hypot(sq.posto[0] - sq.x, sq.posto[1] - sq.z) > 200) sq.posto = centroDoEsquadrao(sq);
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq), lim = postura(sq).pegaFacil;
  let melhor = null, md = lim;
  P.reg.oc.edificiosPerto(x, z, lim, e => {
    if (!podeTomar(P, fac, e) || e.dono && e.dono.governo && TIPOS_CHAVE.includes(e.tipo) || defensores(P, e, fac).length) return;
    if (Math.hypot(e.x - sq.posto[0], e.z - sq.posto[1]) > 160) return;
    let vizinho = false; P.reg.oc.edificiosPerto(e.x, e.z, 30, o => { if (o.dono === fac) vizinho = true; });
    if (!vizinho) return;
    const d = Math.hypot(e.x - x, e.z - z) - (TIPOS_CHAVE.includes(e.tipo) ? 30 : 0);
    if (d < md) { md = d; melhor = e; }
  });
  if (melhor) { ordenaPredio(P, sq, melhor, "ataque"); sq.fixo = false; }
}

/* restrição da missão dada pelo batalhão: só uma zona, ou só prédios de uma facção */
function filtroMissao(sq, e) {
  const m = sq.missao; if (!m) return true;
  if (m.zona && e.zona !== m.zona) return false;
  if (m.contra && e.dono !== m.contra) return false;
  if (m.reservados && m.reservados.has(e)) return false;
  return true;
}
function missaoExpandir(P, sq) {
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq);
  const meus = P.reg.edificios.filter(e => e.dono === fac);
  const livre = sq.missao && sq.missao.zona;   // tomar uma zona: vale mesmo longe da sua área
  const pertoDaArea = e => livre || meus.some(m => Math.hypot(m.x - e.x, m.z - e.z) < 260);
  let melhor = null, nota = Infinity;
  for (const zn of P.reg.zonas) for (const e of zn.chaves) {
    if (!podeTomar(P, fac, e) || !daPraTomar(P, sq, e) || !pertoDaArea(e) || !filtroMissao(sq, e)) continue;
    const n = Math.hypot(e.x - x, e.z - z) + forcaDefesa(P, e, fac) * 60 - (zn.chaves.filter(k => k.dono === fac).length / zn.chaves.length) * 200
      - (sq.missao && sq.missao.rotaInimiga && pertoDeRota(P, fac, e.x, e.z, false) ? 180 : 0);   // rua de logística do inimigo: vale mais
    if (n < nota) { nota = n; melhor = e; }
  }
  if (!melhor) for (const e of P.reg.edificios) {   // sem ponto importante possível: prédios comuns perto
    if (!podeTomar(P, fac, e) || defensores(P, e, fac).length || !pertoDaArea(e) || !filtroMissao(sq, e)) continue;
    const d = Math.hypot(e.x - x, e.z - z) - (sq.missao && sq.missao.rotaInimiga && pertoDeRota(P, fac, e.x, e.z, false) ? 120 : 0); if (d < nota) { nota = d; melhor = e; }
  }
  if (melhor) { ordenaPredio(P, sq, melhor, "ataque"); sq.missao.passo = melhor; }
  else if (sq.estado !== "guarnição") ordenaSegurar(P, sq);
}

function missaoDefender(P, sq) {
  const zn = sq.missao.alvo, fac = sq.faccao;
  // inimigo dentro do bairro?
  let alvo = null, md = Infinity; const [x, z] = centroDoEsquadrao(sq);
  for (const o of P.esquadroes) {
    if (!hostis(P, o.faccao, fac) || !ativos(o).length || (o.guarda && !o.combate && o.guarda.zona === zn && o.faccao.governo)) continue;
    const [ox, oz] = centroDoEsquadrao(o);
    if (zonaDe(P.reg, ox, oz) !== zn) continue;
    const d = Math.hypot(ox - x, oz - z); if (d < md) { md = d; alvo = o; }
  }
  if (alvo && forca(sq) >= ativos(alvo).length - 1 + postura(sq).folga) { vaiAtacarEsquadrao(P, sq, alvo, "socorro"); return; }
  // retomar ponto importante do bairro sem defesa
  const perdido = zn.chaves.filter(e => e.dono !== fac && e.donoAnterior === fac && daPraTomar(P, sq, e)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  if (perdido) { ordenaPredio(P, sq, perdido, "ataque"); return; }
  // guarda o ponto importante seu mais valioso do bairro que está sem guarnição
  if (sq.estado === "guarnição" && sq.guarda && sq.guarda.zona === zn) return;
  const meu = zn.chaves.filter(e => e.dono === fac && !guarnicaoDe(P, e).some(o => o !== sq)).sort((a, b) => Math.hypot(a.x - zn.x, a.z - zn.z) - Math.hypot(b.x - zn.x, b.z - zn.z))[0];
  if (meu) ordenaPredio(P, sq, meu, "defesa");
  else { const mm = sq.missao; ordenaPonto(P, sq, zn.x, zn.z, "defesa"); sq.missao = mm; }
}

function missaoCacar(P, sq) {
  const fac = sq.faccao, [x, z] = centroDoEsquadrao(sq), pos = postura(sq);
  let melhor = null, nota = Infinity;
  for (const o of P.esquadroes) {
    if (!hostis(P, o.faccao, fac) || !ativos(o).length) continue;
    if (o.guarda && !o.combate && sq.postura !== "agressivo") continue;   // entrincheirados só para os agressivos
    const [ox, oz] = centroDoEsquadrao(o), d = Math.hypot(ox - x, oz - z);
    if (d > RAIO_CACA || ativos(o).length > forca(sq) + pos.folga) continue;
    const n = d + ativos(o).length * 40 - (o.faccao.governo ? 0 : 150);
    if (n < nota) { nota = n; melhor = o; }
  }
  if (melhor) vaiAtacarEsquadrao(P, sq, melhor, "caca");
  else if (!sq.missao.semAlvoAvisado) { sq.missao.semAlvoAvisado = true; avisa(P, "semalvo", { sq }); }
}

function missaoApoiar(P, sq) {
  const o = sq.missao.alvo;
  if (!o || !ativos(o).length) { daMissao(P, sq, null); avisa(P, "apoiofim", { sq }); return; }
  const [ox, oz] = centroDoEsquadrao(o), [x, z] = centroDoEsquadrao(sq), d = Math.hypot(ox - x, oz - z);
  if (o.combate) { const mm = sq.missao; ordenaPonto(P, sq, ox, oz, "ataque"); sq.missao = mm; return; }
  if (d > 35) { const mm = sq.missao; ordenaPonto(P, sq, ox - 12, oz - 12, "defesa"); sq.missao = mm; }
}

/* quem está perdendo pede ajuda; os vizinhos sem compromisso e quem apoia respondem */
function pedeAjuda(P, sq) {
  if (sq.pediuAjuda) return; sq.pediuAjuda = true;
  avisa(P, "ajuda", { sq });
  const [x, z] = centroDoEsquadrao(sq);
  for (const o of P.esquadroes) {
    if (o === sq || o.faccao !== sq.faccao || o.combate || forca(o) < MINIMO_PARA_LUTAR || o.fixo) continue;
    const apoia = o.missao && o.missao.tipo === "apoiar" && o.missao.alvo === sq;
    const livre = !o.missao || o.missao.tipo === "expandir" || (o.missao.tipo === "defender" && zonaDe(P.reg, x, z) === o.missao.alvo);
    if (!apoia && !(livre && Math.hypot(centroDoEsquadrao(o)[0] - x, centroDoEsquadrao(o)[1] - z) < RAIO_SOCORRO * 1.5)) continue;
    const mm = o.missao; ordenaPonto(P, o, x, z, "ataque"); o.missao = mm;
    avisa(P, "vaiajudar", { sq: o, ajudado: sq });
  }
}

/* chamado a cada segundo: só para as facções com missões (o jogador) */
function missoesDoSegundo(P) {
  for (const sq of P.esquadroes) {
    if (!organizada(sq.faccao) || !ativos(sq).length) continue;
    if (P.tempo < (sq.proximaMissao || 0)) continue;
    sq.proximaMissao = P.tempo + PENSA_MISSAO;
    pensaMissao(P, sq);
  }
}
/* engenheiros: fortificar, consertar e reconstruir prédios (gastam suprimentos) ficou em suprimentos.js */

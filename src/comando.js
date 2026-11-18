"use strict";
/* ============================================================
   COMANDO DO LÍDER DO BATALHÃO
   O batalhão pode ter várias ordens. O líder:
   - mede o perigo de cada ordem de defesa (inimigos perto da fronteira,
     rotas de logística suas passando ali) e a chance de cada ordem de ataque;
   - divide os esquadrões: cada ordem recebe pelo menos um (se houver),
     e os outros vão para onde o perigo é maior;
   - na defesa, os esquadrões fazem rondas pela borda e, com 3 ou mais,
     um fica atrás como reação rápida; quem vê o inimigo chegando vai
     para cima dele;
   - no ataque, prefere avançar pelas ruas de logística do inimigo;
   - muda gente de uma ordem para outra quando o perigo muda (sem ficar
     trocando toda hora).
   (Números provisórios.)
   ============================================================ */
const COMANDO = {
  ameacaRaio: 450,        // inimigos até aqui da fronteira contam como perigo
  vizinhoFronteira: 55,   // prédio seu com prédio de outro dono até aqui = borda
  pontosRonda: 10, espacoRonda: 45,
  esperaRonda: [12, 28],  // segundos parado em cada ponto da ronda
  reacaoRaio: 360,        // a reação rápida e as rondas vão atrás de inimigo até aqui da fronteira
  rotaPerto: 90, pesoRota: 2.5,
  trocaMinima: 90,        // segundos que um esquadrão fica numa ordem antes de poder ser mudado
  pesoAtaque: 1.6,
  longeDeGuarnicao: 215   // a ronda fica fora do alcance de guarnições inimigas paradas
};

/* ---------- setores ---------- */
function bordaDaZona(P, fac, zn) {
  const l = [];
  for (const e of zn.edificios) {
    if (e.dono !== fac) continue;
    let peso = 0;
    P.reg.oc.edificiosPerto(e.x, e.z, COMANDO.vizinhoFronteira, o => { if (o.dono !== fac) peso = Math.max(peso, o.dono && hostis(P, o.dono, fac) ? 2 : 1); });
    if (peso) l.push({ e, peso });
  }
  if (!l.length) {   // bairro todo cercado de áreas suas: ronda pela beirada do bairro
    const meus = zn.edificios.filter(e => e.dono === fac).sort((a, b) => Math.hypot(b.x - zn.x, b.z - zn.z) - Math.hypot(a.x - zn.x, a.z - zn.z));
    for (const e of meus.slice(0, 30)) l.push({ e, peso: .5 });
  }
  return l;
}
function bordaContra(P, fac, outra) {
  const l = [];
  for (const e of P.reg.edificios) {
    if (e.dono !== fac) continue;
    let d = Infinity; P.reg.oc.edificiosPerto(e.x, e.z, 160, o => { if (o.dono === outra) d = Math.min(d, Math.hypot(o.x - e.x, o.z - e.z)); });
    if (d < Infinity) l.push({ e, peso: 1 + (160 - d) / 80 + (TIPOS_CHAVE.includes(e.tipo) ? 1 : 0) });
  }
  if (!l.length && outra.base) {   // sem fronteira colada: segura os prédios seus mais perto da área dela
    const deles = P.reg.edificios.filter(o => o.dono === outra);
    const dist = e => deles.reduce((m, o) => Math.min(m, Math.hypot(o.x - e.x, o.z - e.z)), Infinity);
    const meus = P.reg.edificios.filter(e => e.dono === fac).map(e => [e, dist(e)]).sort((a, b) => a[1] - b[1]).slice(0, 25);
    for (const [e, d] of meus) l.push({ e, peso: 1 + (TIPOS_CHAVE.includes(e.tipo) ? 1 : 0) - d / 2000 });
  }
  return l;
}
function pertoDeRota(P, fac, x, z, propria) {
  for (const r of P.rotasLog || []) { if ((r.fac === fac) !== propria) continue; for (const [px, pz] of r.pts) if (Math.abs(px - x) < COMANDO.rotaPerto && Math.abs(pz - z) < COMANDO.rotaPerto && Math.hypot(px - x, pz - z) < COMANDO.rotaPerto) return true; }
  return false;
}
/* escolhe até N pontos espalhados (os de mais peso primeiro) e põe em volta do centro, para a ronda andar em sequência */
function pontosDeRonda(P, fac, borda) {
  for (const b of borda) if (pertoDeRota(P, fac, b.e.x, b.e.z, true)) b.peso *= COMANDO.pesoRota;   // rua de logística sua: protege mais
  // a ronda não passa ao alcance de guarnição inimiga parada (só provocaria tiroteio à toa)
  const guarnicoes = P.esquadroes.filter(q => q.guarda && ativos(q).length && hostis(P, q.faccao, fac)).map(q => q.guarda);
  const longe = b => !guarnicoes.some(g => Math.hypot(g.x - b.e.x, g.z - b.e.z) < COMANDO.longeDeGuarnicao);
  let seguros = borda.filter(longe);
  if (!seguros.length) {   // a borda toda está colada numa guarnição: a ronda fica um pouco para trás, em prédios seus
    const vistos = new Set(borda.map(b => b.e)), atras = [];
    for (const b of borda) P.reg.oc.edificiosPerto(b.e.x, b.e.z, 260, o => { if (o.dono === fac && !vistos.has(o)) { vistos.add(o); atras.push({ e: o, peso: b.peso * .5 }); } });
    seguros = atras.filter(longe);
  }
  if (seguros.length) borda = seguros;
  borda.sort((a, b) => b.peso - a.peso);
  const esc = [];
  for (const b of borda) { if (esc.some(o => Math.hypot(o.e.x - b.e.x, o.e.z - b.e.z) < COMANDO.espacoRonda)) continue; esc.push(b); if (esc.length >= COMANDO.pontosRonda) break; }
  if (!esc.length) return { pts: [], centro: null };
  const cx = esc.reduce((t, b) => t + b.e.x, 0) / esc.length, cz = esc.reduce((t, b) => t + b.e.z, 0) / esc.length;
  esc.sort((a, b) => Math.atan2(a.e.z - cz, a.e.x - cx) - Math.atan2(b.e.z - cz, b.e.x - cx));
  return { pts: esc, centro: [cx, cz] };
}
function setorDe(P, b, o) {
  const fac = b.faccao;
  if (o.tipo === "proteger") return Object.assign({ defesa: true }, pontosDeRonda(P, fac, bordaDaZona(P, fac, o.alvo)));
  if (o.tipo === "frente") return Object.assign({ defesa: true }, pontosDeRonda(P, fac, bordaContra(P, fac, o.alvo)));
  return { defesa: false, pts: [], centro: o.tipo === "tomar" ? [o.alvo.x, o.alvo.z] : null };
}
/* perigo: soldados inimigos perto da borda (mais perto pesa mais) */
function ameacaNoSetor(P, fac, setor, contra) {
  if (!setor.pts.length) return 0;
  let a = 0;
  for (const q of P.esquadroes) {
    if (!ativos(q).length || !hostis(P, q.faccao, fac) || (contra && q.faccao !== contra)) continue;
    if (q.guarda && !q.combate && q.faccao.governo) continue;   // guarnição parada do governo não ameaça
    const [x, z] = centroDoEsquadrao(q); let d = Infinity;
    for (const p of setor.pts) d = Math.min(d, Math.hypot(p.e.x - x, p.e.z - z));
    if (d < COMANDO.ameacaRaio) a += ativos(q).length * (1 - d / COMANDO.ameacaRaio) * (q.combate ? 1.5 : 1);
  }
  return a;
}
function inimigoPertoDoSetor(P, fac, pts, raio, contra) {
  let melhor = null, md = Infinity;
  for (const q of P.esquadroes) {
    if (!ativos(q).length || !hostis(P, q.faccao, fac) || (contra && q.faccao !== contra)) continue;
    if (q.guarda && !q.combate && q.faccao.governo) continue;
    const [x, z] = centroDoEsquadrao(q);
    for (const p of pts) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < raio && d < md) { md = d; melhor = q; } }
  }
  return melhor;
}

/* ---------- divisão dos esquadrões entre as ordens ---------- */
function cumpreOrdem(P, b) {
  const fac = b.faccao, sqs = esquadroesDe(P, b);
  if (!sqs.length) return;
  b.ordens = (b.ordens || []).filter(o => !(o.alvo && o.alvo.eliminada));
  // ordens que mudam sozinhas
  for (const o of b.ordens) {
    if (o.tipo === "tomar" && o.alvo.dono === fac) { o.tipo = "proteger"; avisa(P, "ordemcumprida", { b, o }); }
    if (o.tipo === "avancar" && !hostis(P, fac, o.alvo)) { o.tipo = "frente"; avisa(P, "semguerra", { b }); }
  }
  const ordens = b.ordens.length ? b.ordens : [{ tipo: "proteger", alvo: b.base.zona, id: 0, padrao: true }];
  const tarefas = ordens.map(o => {
    const setor = setorDe(P, b, o);
    const perigo = setor.defesa ? ameacaNoSetor(P, fac, setor, o.tipo === "frente" ? o.alvo : null) : 0;
    const rota = setor.defesa && setor.pts.some(p => pertoDeRota(P, fac, p.e.x, p.e.z, true)) ? 1 : 0;
    return { o, setor, peso: setor.defesa ? 1 + perigo + rota : COMANDO.pesoAtaque, perigo, sqs: [] };
  });
  b.tarefas = tarefas;
  const porId = new Map(tarefas.map(t => [t.o.id, t]));
  // mantém quem já está numa ordem que continua
  const livres = [];
  for (const sq of sqs) { const t = porId.get(sq.tarefa); if (t && !sq.reatribuir) t.sqs.push(sq); else livres.push(sq); sq.reatribuir = false; }
  const forcaDe = t => t.sqs.reduce((n, q) => n + forca(q), 0);
  const necessidade = t => t.peso / (t.sqs.length + 1) + (t.setor.defesa ? Math.max(0, t.perigo - forcaDe(t)) : 0);
  const poe = (sq, t) => { if (sq.tarefa !== t.o.id) { sq.tarefa = t.o.id; sq.desdeTarefa = P.tempo; } t.sqs.push(sq); };
  // cada ordem sem ninguém pega o livre mais perto; depois os livres vão para quem mais precisa
  for (const t of tarefas.slice().sort((x, y) => y.peso - x.peso)) {
    if (t.sqs.length || !livres.length) continue;
    const c = t.setor.centro || [b.base.x, b.base.z];
    livres.sort((x, y) => Math.hypot(centroDoEsquadrao(x)[0] - c[0], centroDoEsquadrao(x)[1] - c[1]) - Math.hypot(centroDoEsquadrao(y)[0] - c[0], centroDoEsquadrao(y)[1] - c[1]));
    poe(livres.shift(), t);
  }
  for (const sq of livres) poe(sq, tarefas.reduce((m, t) => necessidade(t) > necessidade(m) ? t : m));
  // ordem sem ninguém e outra com 2 ou mais: passa um
  for (const t of tarefas) {
    if (t.sqs.length) continue;
    const doador = tarefas.filter(x => x.sqs.length > 1).sort((x, y) => y.sqs.length - x.sqs.length)[0];
    const sq = doador && doador.sqs.find(q => !q.combate);
    if (sq) { doador.sqs = doador.sqs.filter(q => q !== sq); poe(sq, t); }
  }
  // reação do líder: ordem de defesa em perigo maior que a força dela puxa um esquadrão de onde está mais calmo
  const quente = tarefas.filter(t => t.setor.defesa && t.perigo > forcaDe(t) * 1.1).sort((x, y) => (y.perigo - forcaDe(y)) - (x.perigo - forcaDe(x)))[0];
  if (quente) {
    const fria = tarefas.filter(t => t !== quente && t.sqs.length > 1 && (!t.setor.defesa || t.perigo < forcaDe(t) * .5)).sort((x, y) => x.peso - y.peso)[0];
    const sq = fria && fria.sqs.filter(q => !q.combate && P.tempo - (q.desdeTarefa || 0) > COMANDO.trocaMinima)[0];
    if (sq) { fria.sqs = fria.sqs.filter(q => q !== sq); poe(sq, quente); avisa(P, "lidermandou", { b, sq, o: quente.o }); }
  }
  // cada ordem vira missões
  for (const t of tarefas) executaTarefa(P, b, t);
}
function executaTarefa(P, b, t) {
  const fac = b.faccao, o = t.o, sqs = t.sqs; if (!sqs.length) return;
  if (o.tipo === "tomar") {
    const reservados = new Set(sqs.map(q => q.alvo || q.ordem.alvo).filter(Boolean));
    for (const sq of sqs) poeMissao(P, sq, { tipo: "expandir", zona: o.alvo, reservados });
    for (const sq of sqs) sq.missao.reservados = new Set([...reservados].filter(e => e !== (sq.alvo || sq.ordem.alvo)));
    ataqueConjunto(P, b, sqs, e => e.zona === o.alvo);
    return;
  }
  if (o.tipo === "avancar") {
    const reservados = new Set(sqs.map(q => q.alvo || q.ordem.alvo).filter(Boolean));
    for (const sq of sqs) poeMissao(P, sq, { tipo: "expandir", contra: o.alvo, reservados, rotaInimiga: true });
    for (const sq of sqs) sq.missao.reservados = new Set([...reservados].filter(e => e !== (sq.alvo || sq.ordem.alvo)));
    ataqueConjunto(P, b, sqs, e => e.dono === o.alvo);
    return;
  }
  // defesa: rondas na borda + reação rápida
  const pts = t.setor.pts.map(p => [entradaDe(p.e)[0], entradaDe(p.e)[1]]);
  const contra = o.tipo === "frente" ? o.alvo : null;
  if (!pts.length) { for (const sq of sqs) poeMissao(P, sq, { tipo: "defender", alvo: o.tipo === "proteger" ? o.alvo : b.base.zona }); if (o.tipo === "frente" && !o.avisouSemFrente) { o.avisouSemFrente = true; avisa(P, "semfrente", { b, o }); } return; }
  o.avisouSemFrente = false;
  let rondas = sqs;
  if (sqs.length >= 3) {   // o mais perto do meio fica de reação
    const [cx, cz] = t.setor.centro;
    const r = sqs.slice().sort((x, y) => Math.hypot(centroDoEsquadrao(x)[0] - cx, centroDoEsquadrao(x)[1] - cz) - Math.hypot(centroDoEsquadrao(y)[0] - cx, centroDoEsquadrao(y)[1] - cz))[0];
    rondas = sqs.filter(q => q !== r);
    const posto = postoDeReacao(P, fac, t.setor.centro, o);
    poeMissao(P, r, { tipo: "reacao", posto, pts, contra, ordem: o.id });
  }
  // divide os pontos em trechos seguidos, um por esquadrão de ronda
  const n = rondas.length, k = Math.max(1, Math.ceil(pts.length / n));
  rondas.forEach((sq, i) => {
    let trecho = pts.slice(i * k, i * k + k); if (!trecho.length) trecho = [pts[i % pts.length]];
    const chave = o.id + ":" + i + ":" + trecho.map(p => Math.round(p[0]) + "," + Math.round(p[1])).join(";");
    if (sq.missao && sq.missao.tipo === "ronda" && sq.missao.chave === chave) return;
    sq.postura = b.postura;
    sq.missao = { tipo: "ronda", pontos: trecho, i: 0, dir: 1, pts, contra, chave, desde: P.tempo, ordem: o.id };
    sq.fixo = false; sq.proximaMissao = 0; sq.caca = null;
  });
}
function postoDeReacao(P, fac, [cx, cz], o) {
  const zn = o.tipo === "proteger" ? o.alvo : zonaDe(P.reg, cx, cz);
  let m = null, md = Infinity;
  const cands = zn ? zn.chaves.filter(e => e.dono === fac) : [];
  for (const e of cands.length ? cands : P.reg.edificios.filter(e => e.dono === fac && Math.hypot(e.x - cx, e.z - cz) < 300)) { const d = Math.hypot(e.x - cx, e.z - cz); if (d < md) { md = d; m = e; } }
  return m;
}

/* ---------- missões de defesa ---------- */
function missaoRonda(P, sq) {
  const m = sq.missao, fac = sq.faccao;
  const o = inimigoPertoDoSetor(P, fac, m.pontos.concat([centroDoEsquadrao(sq)]), COMANDO.reacaoRaio * .7, m.contra);
  if (o) { if (forca(sq) >= ativos(o).length - 1 + postura(sq).folga) { vaiAtacarEsquadrao(P, sq, o, "socorro"); return; } if (!sq.pediuAjuda) { sq.pediuAjuda = true; avisa(P, "pedeajuda", { sq, o }); } }
  const [px, pz] = m.pontos[m.i], [x, z] = centroDoEsquadrao(sq);
  if (Math.hypot(px - x, pz - z) > 25) {
    // o caminho passa ao lado de guarnição inimiga parada? pula este ponto
    const rota = rotaAPe(P.reg, x, z, px, pz, guarnicoesInimigas(P, fac));
    const g = P.esquadroes.find(q => q.guarda && ativos(q).length && hostis(P, q.faccao, fac) && rota.some(([rx, rz]) => Math.hypot(q.guarda.x - rx, q.guarda.z - rz) < COMANDO.longeDeGuarnicao * .8));
    if (g && m.pontos.length > 1) { m.ruins = m.ruins || new Set(); m.ruins.add(m.i); if (m.ruins.size >= m.pontos.length) { m.pontos = [m.pontos[m.i]]; m.i = 0; m.ruins = null; } else proximoPonto(m); return; }
    const mm = sq.missao; ordenaPonto(P, sq, px, pz, "defesa"); sq.missao = mm; m.espera = null; return;
  }
  if (!m.espera) { m.espera = P.tempo + P.r.entre(...COMANDO.esperaRonda); return; }
  if (P.tempo < m.espera) return;
  m.espera = null; proximoPonto(m);
}
function proximoPonto(m) {
  for (let k = 0; k < m.pontos.length; k++) {
    if (m.pontos.length < 2) return;
    if (m.i + m.dir >= m.pontos.length || m.i + m.dir < 0) m.dir = -m.dir;
    m.i += m.dir;
    if (!m.ruins || !m.ruins.has(m.i)) return;
  }
}
function missaoReacao(P, sq) {
  const m = sq.missao, fac = sq.faccao;
  const o = inimigoPertoDoSetor(P, fac, m.pts, COMANDO.reacaoRaio, m.contra);
  if (o && forca(sq) >= ativos(o).length - 1 + postura(sq).folga) { vaiAtacarEsquadrao(P, sq, o, "reacao"); return; }
  if (!m.posto) return;
  if (m.posto.dono !== fac) { if (daPraTomar(P, sq, m.posto)) ordenaPredio(P, sq, m.posto, "ataque"); return; }
  if (!(sq.estado === "guarnição" && sq.guarda === m.posto)) { const mm = sq.missao; ordenaPredio(P, sq, m.posto, "defesa"); sq.missao = mm; }
}

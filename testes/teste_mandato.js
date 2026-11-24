// Diagnóstico do mandato (19.5): mede % do tempo em que cada esquadrão está no setor da ordem do batalhão,
// por que sai do setor e o que acontece com os pontos tomados. NÃO muda o comportamento do jogo (só embrulha funções para registrar).
// Uso: node testes/teste_mandato.js [--sementes B2,K7,Q4] [--horas 12] [--recrutas 12] [--json arquivo.json]
const fs = require('fs'), path = require('path');
const arg = (n, p) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : p; };
const SEMENTES = arg('sementes', 'B2,K7,Q4,A1,D4,E5').split(','), HORAS = +arg('horas', 12), RECRUTAS = +arg('recrutas', 12), SAIDA = arg('json', '');
const AMOSTRA = +arg('amostra', 10), AQUECE = 1;   // amostra a cada N s do relógio do jogo (P.tempo; 1 h de jogo = 60 s); ignora a 1ª hora (esquadrões se formando)
const src = require('./arquivos.js').map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
const G = new Function(src + `
  const nomeDe = st => { const l = (st || '').split('\\n').map(s => (s.match(/at (?:new )?([A-Za-z_$][\\w$]*) /) || [])[1]).filter(Boolean); return l; };
  const registro = []; let ultimoMotivo = null;
  const hook = (nome, f) => { const o = eval(nome); eval(nome + ' = f(o)'); };
  hook('ordenaPonto', o => function (P, sq, x, z, modo) { const c = nomeDe(new Error().stack); registro.push({ t: P.tempo, sq, tipo: 'ponto', modo, c: c.slice(1, 3), x, z, motivo: ultimoMotivo }); return o.apply(this, arguments); });
  hook('ordenaPredio', o => function (P, sq, e, modo) { const c = nomeDe(new Error().stack); registro.push({ t: P.tempo, sq, tipo: 'predio', modo, c: c.slice(1, 3), e }); return o.apply(this, arguments); });
  hook('ordenaSegurar', o => function (P, sq) { const c = nomeDe(new Error().stack); registro.push({ t: P.tempo, sq, tipo: 'segurar', c: c.slice(1, 3) }); return o.apply(this, arguments); });
  hook('vaiAtacarEsquadrao', o => function (P, sq, alvo, motivo) { const c = nomeDe(new Error().stack); ultimoMotivo = (motivo || 'rumo') + '<' + c[1]; try { return o.apply(this, arguments); } finally { ultimoMotivo = null; } });
  return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, HORA, ativos, batalhoesDe, esquadroesDe, ordenaBatalhao, recrutaMercenario, declaraGuerra, compra, novoEsquadrao, ordenaPredioOriginal: ordenaPredio, centroDoEsquadrao, zonaDe, basesDe, pertoDeBase, TIPOS_CHAVE, hostis, registro };`)();

const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : null;
const media = l => l.length ? +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1) : null;

function rodada(semente, cenario) {
  G.registro.length = 0;
  const reg = G.geraRegiao(semente), P = G.criaPartida(reg); P.dificuldade = 'normal';
  const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
  const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
  G.fundaFaccao(P, eu, base);
  const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); if (!b) break; tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
  const rivais = P.faccoes.filter(f => !f.jogador && !f.governo);
  const [b] = G.batalhoesDe(P, eu);
  eu.recursos.dinheiro = 20000; for (let i = 0; i < RECRUTAS; i++) G.recrutaMercenario(P, eu);
  G.compra(P, eu, 'cx-bala', 20); b.minimo = { 'cx-bala': 1500 };
  const viz = rivais.slice().sort((x, y) => Math.hypot(x.base.x - base.x, x.base.z - base.z) - Math.hypot(y.base.x - base.x, y.base.z - base.z))[0];
  G.declaraGuerra(P, eu, viz);
  const tipoOrdem = cenario.split('+')[0], raid = cenario.includes('+');
  const zonaPedida = tipoOrdem === 'proteger' ? base.zona : reg.zonas.filter(z => z !== base.zona && z.dono !== eu).sort((a, c) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(c.x - base.x, c.z - base.z))[0];
  G.ordenaBatalhao(P, b, tipoOrdem, zonaPedida);
  let raidFalha = 0; const raids = []; let proxRaid = 2 * G.HORA;

  const seg = [];            // saídas: {grupo, motivo, dur, ini}
  const tempo = { jogador: {}, rival: {} };   // por grupo e por tipo de ordem: {dentro, fora, combate, base}
  const estado = new Map();  // sq -> {dentro, tarefa, ini, motivo, grupo}
  const caps = [];           // capturas
  const eventos = { jogador: {}, rival: {} }, trocas = { jogador: 0, rival: 0 }, nSq = { jogador: 0, rival: 0 };
  P.ouvintes.push((t, d) => { if (!['lidermandou', 'reacao', 'socorro', 'recarregar', 'refazer', 'caca', 'ajuda', 'vaiajudar'].includes(t)) return; const f = (d.sq && d.sq.faccao) || (d.b && d.b.faccao); if (!f || !f.recursos || P.tempo < AQUECE * G.HORA) return; const g = f.jogador ? 'jogador' : 'rival'; eventos[g][t] = (eventos[g][t] || 0) + 1; });
  let tomadaFora = { jogador: [0, 0], rival: [0, 0] };
  P.ouvintes.push((t, d) => {
    if (t !== 'edificio' || !d.fac || !d.fac.recursos || d.adesao || d.antes === d.fac || P.tempo < 1) return;
    const grupo = d.fac.jogador ? 'jogador' : 'rival';
    const bs = G.batalhoesDe(P, d.fac), ords = bs.flatMap(x => x.ordens || []);
    const pedidas = ords.filter(o => o.tipo === 'tomar' || (o.tipo === 'proteger' && o.convertida)).map(o => o.alvo);
    const adv = ords.filter(o => o.tipo === 'avancar').map(o => o.alvo);
    if (ords.some(o => o.tipo === 'tomar' || o.tipo === 'avancar')) {
      const ok = pedidas.includes(d.e.zona) || adv.includes(d.antes);
      tomadaFora[grupo][ok ? 0 : 1]++;
    }
    caps.push({ e: d.e, fac: d.fac, grupo, chave: G.TIPOS_CHAVE.includes(d.e.tipo), t0: P.tempo, vazio: 0, tot: 0, ultimoVazio: false, fechado: false, perdido: false, perdidoVazio: false, perdidoPara: null, zonaPedida: pedidas.includes(d.e.zona), naZonaProt: d.e.zona === zonaPedida, quemTomou: null });
  });
  const noSetor = (x, z, t) => {
    const o = t.o, zn = o.alvo;
    const perto = (pts, r) => pts.some(p => Math.hypot(p.x - x, p.z - z) < r);
    if (o.tipo === 'proteger') return G.zonaDe(reg, x, z) === zn || (t.setor.pts && perto(t.setor.pts.map(p => p.e), 120));
    if (o.tipo === 'tomar') return G.zonaDe(reg, x, z) === zn || perto(zn.edificios, 100);
    if (o.tipo === 'frente') return !!(t.setor.pts && perto(t.setor.pts.map(p => p.e), 200));
    if (o.tipo === 'avancar') return perto(reg.edificios.filter(e => e.dono === o.alvo), 150);
    return null;
  };
  const zonaTarefa = (sq, t) => { const [x, z] = G.centroDoEsquadrao(sq); return noSetor(x, z, t); };
  // causa da saída: a ordem de movimento mais recente (até 400 s antes) cujo destino fica FORA do setor
  const motivoDe = (sq, desde, t) => {
    const rs = G.registro.filter(r => r.sq === sq && P.tempo - r.t < 400).sort((a, c) => c.t - a.t);
    for (const r of rs) {
      const alvo = r.tipo === 'predio' ? r.e : r.tipo === 'ponto' ? { x: r.x, z: r.z } : null;
      const doBase = r.tipo === 'predio' && G.basesDe(P, sq.faccao).includes(r.e);
      if (alvo && !doBase && noSetor(alvo.x, alvo.z, t)) continue;   // destino dentro do setor: não explica a saída
      if (!alvo && r.tipo === 'segurar') continue;
      if (doBase) return 'vai à base [' + r.c[0] + ']';
      if (r.tipo === 'ponto' && r.c[0] === 'vaiAtacarEsquadrao') return 'ataca esquadrão inimigo [' + r.motivo + ']';
      if (r.tipo === 'predio') return (r.modo === 'ataque' ? 'ataca prédio fora do setor [' : 'vai a prédio fora do setor [') + r.c.join('<') + ']';
      return 'vai a ponto fora do setor [' + r.c.join('<') + ']';
    }
    return 'sem ordem de movimento para fora (' + (sq.combate ? 'em combate' : 'estado ' + sq.estado) + ')';
  };
  let prox = AQUECE * G.HORA; const tFim = HORAS * G.HORA;
  while (P.tempo < tFim) {
    G.passoDaPartida(P, .25);
    if (raid && P.tempo >= proxRaid) {   // incursão: 6 inimigos (munição cheia) mandados contra um ponto da zona protegida, a cada 2 h de jogo (120 s)
      proxRaid += G.HORA * 2;
      const alvos = zonaPedida.edificios.filter(e => e.dono === eu && G.TIPOS_CHAVE.concat(['casa']).includes(e.tipo) || e === base);
      const alvo = alvos.length ? alvos[raids.length % alvos.length] : null;
      const de = alvo && reg.edificios.filter(e => e.dono !== eu && Math.hypot(e.x - alvo.x, e.z - alvo.z) > 320 && Math.hypot(e.x - alvo.x, e.z - alvo.z) < 480)[0];
      if (!de) raidFalha = (raidFalha || 0) + 1;
      if (de) { const inv = G.novoEsquadrao(P, viz, de, ['lider', 'metralhador', 'fuzileiro', 'fuzileiro', 'fuzileiro', 'fuzileiro'], { nome: 'Invasores' }); for (const s of inv.membros) s.municao = 999; G.ordenaPredioOriginal(P, inv, alvo, 'ataque'); raids.push({ t: P.tempo, alvo, inv, dono0: alvo.dono, medido: false }); }
    }
    for (const rd of raids) if (!rd.medido && P.tempo > rd.t + 200) { rd.medido = true; rd.perdeu = rd.alvo.dono !== eu; rd.invasoresVivos = G.ativos(rd.inv).length; rd.defensorPerto = G.esquadroesDe(P, b).filter(q => Math.hypot(G.centroDoEsquadrao(q)[0] - rd.alvo.x, G.centroDoEsquadrao(q)[1] - rd.alvo.z) < 150).length; rd.esqVivos = G.esquadroesDe(P, b).length; }
    if (P.tempo < prox) continue;
    prox += AMOSTRA;
    // conversão tomar->proteger (marca para saber o que era pedido)
    for (const bt of P.batalhoes || []) for (const o of bt.ordens || []) if (o.tipo === 'proteger' && o.alvo && !o.convertida && bt.__tomou && bt.__tomou.has(o.id)) o.convertida = true; else if (o.tipo === 'tomar') (bt.__tomou = bt.__tomou || new Set()).add(o.id);
    for (const bt of P.batalhoes || []) {
      if (bt.dissolvido || !bt.faccao.recursos || bt.faccao.eliminada) continue;
      const grupo = bt.faccao.jogador ? 'jogador' : 'rival';
      for (const sq of G.esquadroesDe(P, bt)) {
        const t = (bt.tarefas || []).find(x => x.o.id === sq.tarefa); if (!t) continue;
        const dentro = zonaTarefa(sq, t); if (dentro === null) continue;
        const tipo = t.o.tipo, T = (tempo[grupo][tipo] = tempo[grupo][tipo] || { dentro: 0, fora: 0, foraEmCombate: 0, foraNaBase: 0, foraAndando: 0, foraOutro: 0, n: 0 });
        const naBase = G.pertoDeBase(P, bt.faccao, sq);
        T.n++; if (dentro) T.dentro++; else { T.fora++; if (sq.combate) T.foraEmCombate++; else if (naBase) T.foraNaBase++; else if (sq.estado === 'andando') T.foraAndando++; else T.foraOutro++; }
        const k = sq, a = estado.get(k);
        if (a && a.tarefa !== sq.tarefa) trocas[grupo]++;
        if (!a || a.tarefa !== sq.tarefa) { estado.set(k, { dentro, tarefa: sq.tarefa, ini: P.tempo, ult: P.tempo, grupo, tipo, t0: P.tempo, chegada: !dentro, motivo: null, ordemId: t.o.id }); continue; }
        if (a.dentro && !dentro) { a.dentro = false; a.ini = P.tempo; a.motivo = motivoDe(sq, a.ult - 1, t); }
        else if (!a.dentro && dentro) { if (!a.chegada) seg.push({ grupo, tipo, motivo: a.motivo, dur: P.tempo - a.ini, voltou: true }); a.chegada = false; a.dentro = true; }
        a.ult = P.tempo;
      }
    }
    // pontos tomados: vazio = nenhum esquadrão da facção a menos de 100 m
    for (const c of caps) {
      if (c.fechado) continue;
      if (c.e.dono !== c.fac) { c.fechado = true; c.perdido = true; c.perdidoVazio = c.ultimoVazio; c.perdidoPara = c.e.dono ? c.e.dono.nome : 'ninguém'; c.tPerda = P.tempo - c.t0; continue; }
      let tem = false; for (const sq of P.esquadroes) if (sq.faccao === c.fac && G.ativos(sq).length) { const [x, z] = G.centroDoEsquadrao(sq); if (Math.hypot(x - c.e.x, z - c.e.z) < 100) { tem = true; break; } }
      c.tot += AMOSTRA; if (!tem) c.vazio += AMOSTRA; c.ultimoVazio = !tem;
    }
  }
  for (const [k, a] of estado) if (!a.dentro && !a.chegada) seg.push({ grupo: a.grupo, tipo: a.tipo, motivo: a.motivo, dur: P.tempo - a.ini, voltou: false });
  return { eventos, trocas, semente, cenario, tempo, seg, caps: caps.map(c => ({ grupo: c.grupo, chave: c.chave, tipo: c.e.tipo, tot: c.tot, vazio: c.vazio, perdido: c.perdido, perdidoVazio: c.perdidoVazio, para: c.perdidoPara, tPerda: c.tPerda, zonaPedida: c.zonaPedida, naZona: c.naZonaProt })), tomadaFora, esq: G.esquadroesDe(P, b).length, raidFalha, raids: raids.filter(r => r.medido).map(r => ({ perdeu: r.perdeu, invasoresVivos: r.invasoresVivos, defensorPerto: r.defensorPerto, esqVivos: r.esqVivos })), zonaPedida: zonaPedida.nome, donoFinal: zonaPedida.dono && zonaPedida.dono.nome };
}

const todas = [];
for (const s of SEMENTES) for (const c of ['proteger', 'proteger+incursao', 'tomar']) { const t0 = Date.now(); const r = rodada(s, c); r.ms = Date.now() - t0; todas.push(r); console.error(s, c, 'raidFalha', r.raidFalha, 'raids', r.raids.length, r.ms + ' ms', 'esq', r.esq, 'caps', r.caps.length, 'zona dono final', r.donoFinal); }

// agregação
const agg = {};
for (const r of todas) for (const g of ['jogador', 'rival']) for (const [tipo, T] of Object.entries(r.tempo[g])) {
  const k = g + '|' + (g === 'jogador' ? r.cenario + ':' : '') + tipo; const A = agg[k] = agg[k] || { n: 0, dentro: 0, fora: 0, foraEmCombate: 0, foraNaBase: 0, foraAndando: 0, foraOutro: 0 };
  for (const f of Object.keys(A)) A[f] += T[f];
}
console.log('\n== % do tempo dentro do setor (amostras de 30 s) ==');
const tabela = {};
for (const [k, A] of Object.entries(agg)) tabela[k] = { amostras: A.n, '%dentro': pct(A.dentro, A.n), '%fora': pct(A.fora, A.n), 'fora:combate': pct(A.foraEmCombate, A.n), 'fora:na base': pct(A.foraNaBase, A.n), 'fora:andando': pct(A.foraAndando, A.n), 'fora:parado outro': pct(A.foraOutro, A.n) };
console.table(tabela);
console.log('\n== motivos de saída (só saídas de quem já tinha chegado) ==');
const motivos = {};
for (const grupo of ['jogador|proteger', 'jogador|proteger+incursao', 'jogador|tomar', 'rival']) {
  const l = todas.flatMap(r => r.seg.filter(s => (grupo === 'rival' ? s.grupo === 'rival' : s.grupo === 'jogador' && r.cenario === grupo.split('|')[1])));
  const m = {}; for (const s of l) { const k = s.motivo; (m[k] = m[k] || []).push(s.dur); }
  motivos[grupo] = Object.entries(m).map(([k, d]) => ({ motivo: k, n: d.length, '%saidas': pct(d.length, l.length), 'media fora (s; 60 s = 1 h)': media(d), 'mediana (s)': d.slice().sort((a, b) => a - b)[Math.floor(d.length / 2)] })).sort((a, b) => b.n - a.n);
  console.log('-- ' + grupo + ': ' + l.length + ' saídas, não voltaram: ' + l.filter(s => !s.voltou).length + ', fora médio ' + media(l.map(s => s.dur)) + ' s'); console.table(motivos[grupo].slice(0, 10));
}
console.log('\n== pontos tomados ==');
const capsRes = {};
for (const g of ['jogador|proteger', 'jogador|proteger+incursao', 'jogador|tomar', 'rival']) {
  const l = todas.flatMap(r => r.caps.filter(c => g === 'rival' ? c.grupo === 'rival' : c.grupo === 'jogador' && r.cenario === g.split('|')[1]));
  const f = l.filter(c => c.chave);
  const sum = L => ({ tomados: L.length, 'na zona da ordem': L.filter(c => c.naZona).length, perdidos: L.filter(c => c.perdido).length, '%perdidos': pct(L.filter(c => c.perdido).length, L.length), 'perdidos que estavam vazios': L.filter(c => c.perdido && c.perdidoVazio).length, '% do tempo vazio': pct(L.reduce((a, c) => a + c.vazio, 0), L.reduce((a, c) => a + c.tot, 0)), 'vaz>0 & perdido': L.filter(c => c.vazio > 0 && c.perdido).length, 'tempo p/ perder (h de jogo, media)': media(L.filter(c => c.perdido).map(c => c.tPerda / G.HORA)) });
  capsRes[g] = { todos: sum(l), chave: sum(f) }; console.log('-- ' + g); console.table(capsRes[g]);
}
console.log('incursões (200 s = 3,3 h de jogo depois): ' + JSON.stringify(todas.filter(r => r.raids && r.raids.length).map(r => ({ semente: r.semente, n: r.raids.length, perdeu: r.raids.filter(x => x.perdeu).length, invasoresVivosMedia: media(r.raids.map(x => x.invasoresVivos)), defensoresPerto150m: media(r.raids.map(x => x.defensorPerto)), esqVivos: media(r.raids.map(x => x.esqVivos)) }))));
console.log('prédios tomados dentro/fora da zona pedida [dentro, fora] por rodada:');
for (const r of todas) console.log(r.semente, r.cenario, 'zona pedida', r.zonaPedida, 'jogador', JSON.stringify(r.tomadaFora.jogador), 'rival', JSON.stringify(r.tomadaFora.rival));
console.log('\n== eventos (jogador / rival) e trocas de tarefa pelo líder ==');
const ev = { jogador: {}, rival: {} }, tr = { jogador: 0, rival: 0 };
for (const r of todas) for (const g of ['jogador', 'rival']) { for (const [k, v] of Object.entries(r.eventos[g])) ev[g][k] = (ev[g][k] || 0) + v; tr[g] += r.trocas[g]; }
console.log(JSON.stringify(ev), 'trocas de tarefa:', JSON.stringify(tr));
if (SAIDA) fs.writeFileSync(SAIDA, JSON.stringify({ sementes: SEMENTES, horas: HORAS, tabela, motivos, capsRes, ev, tr, rodadas: todas.map(r => ({ raids: r.raids, semente: r.semente, cenario: r.cenario, ms: r.ms, esq: r.esq, zona: r.zonaPedida, donoFinal: r.donoFinal, tomadaFora: r.tomadaFora })) }, null, 1));

// As rivais com as mesmas mecânicas do jogador (batalhões, estoque, veículos, comida) e o governo com batalhões
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, resumoFaccao, batalhoesDe, esquadroesDe, soldadosDe, textoOrdem, estadoEntre, contas, forcaDaFaccao, PERSONALIDADES };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
P.dificuldade = process.argv[3] || 'normal';
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
const rivais = P.faccoes.filter(f => !f.jogador && !f.governo);
console.log('dificuldade', P.dificuldade, '| personalidades:', rivais.map(f => f.nome + '=' + f.personalidade).join(', '));
const ev = {}; P.ouvintes.push((t, d) => { if (['veiculodestruido', 'veiculocapturado', 'entregou', 'obrapronta', 'comprouComida', 'vendeuComida', 'diplomacia', 'novobatalhao', 'eliminada', 'reacao'].includes(t)) ev[t] = (ev[t] || 0) + 1; });
const t0 = Date.now();
for (const h of [12, 24, 48, 72]) {
  while (P.tempo < h * G.HORA) G.passoDaPartida(P, .25);
  console.log('--', G.relogio(P), '(' + Math.round((Date.now() - t0) / 1000) + ' s)');
  for (const f of rivais) {
    if (f.eliminada) { console.log('  ', f.nome, 'ELIMINADA'); continue; }
    const r = G.resumoFaccao(P, f), c = G.contas(P, f), bs = G.batalhoesDe(P, f);
    console.log('  ', f.nome.padEnd(8), f.personalidade.padEnd(11), 'prédios', String(r.predios).padStart(3), 'sold', String(G.forcaDaFaccao(P, f)).padStart(2), '| $', Math.round(f.recursos.dinheiro), '(' + c.total.dinheiro.toFixed(0) + ') comida', Math.round(f.recursos.comida), '(' + c.total.comida.toFixed(0) + ') | bat', bs.length, bs.map(b => '[' + G.esquadroesDe(P, b).length + 'esq ' + G.textoOrdem(b).slice(0, 40) + ']').join(' '), '| veíc', (f.veiculos || []).length, '| guerras', P.faccoes.filter(o => o !== f && !o.governo && G.estadoEntre(P, f, o) === 'guerra').length);
  }
  const gov = P.governo; console.log('   governo: prédios', G.resumoFaccao(P, gov).predios, 'sold', G.forcaDaFaccao(P, gov), '| batalhões', (P.govBats || []).length, 'rondas', (P.govBats || []).filter(b => b.ronda).length, '| reagindo', P.esquadroes.filter(q => q.faccao === gov && q.posto).length);
}
console.log('eventos', ev);

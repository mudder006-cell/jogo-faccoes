// Simula uma partida sem tela: gera, funda o jogador e as rivais, manda o jogador pegar prédios e roda o tempo.
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, ordenaIr, passoDaPartida, relogio, resumoFaccao, criaSorteio, rotaPelasRuas };')();
const sd = process.argv[2] || 'B2';
const reg = G.geraRegiao(sd); const t0 = Date.now();
const P = G.criaPartida(reg);
const log = []; P.ouvintes.push((t, d) => { if (t === 'zona') log.push('ZONA ' + d.zona.nome + ' -> ' + (d.dono ? d.dono.nome : 'sem controle total')); if (t === 'defendido') log.push('defendido ' + d.e.tipo); });
const r = G.criaSorteio('t');
const livres = reg.edificios.filter(G.podeComecar);
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = livres.find(e => e.zona.tipo === 'vila') || livres[0];
const sq = G.fundaFaccao(P, eu, base);
const tomadas = [base];
for (let i = 0; i < 3; i++) { const e = G.escolhaRival(reg, r, tomadas); tomadas.push(e); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), e); }
console.log('início em', base.zona.nome, base.zona.tipo, '| rivais em', tomadas.slice(1).map(e => e.zona.nome).join(', '), '| esquadrões', P.esquadroes.length, '| criar partida', Date.now() - t0, 'ms');
// jogador: vai até cada ponto importante da própria zona
const t1 = Date.now(); const rt = G.rotaPelasRuas(reg, base.x, base.z, 0, 0); console.log('rota até o centro:', rt.length, 'pontos', Date.now() - t1, 'ms');
let fila = base.zona.chaves.filter(e => e !== base);
let segundos = 0;
while (segundos < 3 * 3600) {
  if (sq.estado !== 'andando' && fila.length) G.ordenaIr(P, sq, fila.shift());
  G.passoDaPartida(P, .1 * 0 + .1); P.velocidade = 20; segundos += 2;
}
console.log(G.relogio(P), log.slice(0, 12));
for (const f of P.faccoes) console.log(' ', f.nome, JSON.stringify(G.resumoFaccao(P, f)));

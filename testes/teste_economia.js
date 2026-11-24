// Economia sem tela: um dia de jogo para o jogador e as rivais
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','recrutamento','armas','acao','missoes','logistica','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, contas, convence, podeConvencer, distribuiComida, criaSorteio, resumoFaccao };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg), r = G.criaSorteio('e');
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
for (let i = 0; i < 3; i++) G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), G.escolhaRival(reg, r, [base]));
const c = G.contas(P, eu); console.log('contas iniciais do jogador:', JSON.stringify(c.total), c.dinheiro, c.comida, c.influencia);
P.velocidade = 20;
for (let h = 0; h < 24; h++) {
  for (let k = 0; k < 1800; k++) G.passoDaPartida(P, .1);
  // o jogador convence a casa mais barata e perto
  const alvo = reg.edificios.filter(e => !G.podeConvencer(P, eu, e)).sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z))[0];
  if (alvo) G.convence(P, eu, alvo);
}
console.log(G.relogio(P));
for (const f of P.faccoes) if (f.recursos) console.log(f.nome.padEnd(10), JSON.stringify(Object.fromEntries(Object.entries(f.recursos).map(([k, v]) => [k, Math.round(v)]))), 'prédios', G.resumoFaccao(P, f).predios, JSON.stringify(G.contas(P, f).total));

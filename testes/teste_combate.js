// Batalhas sem tela: o jogador ataca um prédio defendido pelo governo.
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','suprimentos','veiculos','comando','ia','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, ordenaIr, passoDaPartida, relogio, resumoFaccao, criaSorteio, defensores, ativos, patente, FUNCOES, trocaFuncao, moveSoldado };')();
const sd = process.argv[2] || 'B2';
const reg = G.geraRegiao(sd), P = G.criaPartida(reg);
const ev = {}, mat = {}; P.ouvintes.push((t, d) => { if (t === 'baixa' && d.s) { const k = d.s.faccao.nome + ' -> ' + d.o.faccao.nome; mat[k] = (mat[k] || 0) + 1; } ev[t] = (ev[t] || 0) + 1; if (['rendicao', 'abandonou', 'eliminado', 'chegou'].includes(t)) console.log('  ', G.relogio(P), t, d.sq ? d.sq.nome + ' ' + d.sq.faccao.nome : '', d.e ? d.e.tipo : '', d.s ? d.s.nome : ''); });
const r = G.criaSorteio('t');
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
// começa perto de um ponto defendido do governo
const alvos = reg.edificios.filter(e => e.dono === P.governo && G.defensores(P, e, eu).length && e.zona.tipo === 'bairro');
const alvo = alvos.sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z))[0];
const base = reg.edificios.filter(G.podeComecar).sort((a, b) => Math.hypot(a.x - alvo.x, a.z - alvo.z) - Math.hypot(b.x - alvo.x, b.z - alvo.z))[0];
const sq = G.fundaFaccao(P, eu, base);
console.log('base', base.tipo, base.zona.nome, '| alvo', alvo.tipo, alvo.zona.nome, 'dist', Math.round(Math.hypot(base.x - alvo.x, base.z - alvo.z)), 'm');
for (let i = 0; i < 3; i++) G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), G.escolhaRival(reg, r, [base]));
G.ordenaIr(P, sq, alvo);
P.velocidade = 20; const t0 = Date.now();
for (let k = 0; k < 6000; k++) G.passoDaPartida(P, .1);   // 6000 x 2 s = 3,3 h de jogo
console.log('tempo de cálculo', Date.now() - t0, 'ms |', G.relogio(P), '| eventos', JSON.stringify(ev));
console.log('alvo agora é de', alvo.dono.nome, JSON.stringify(mat));
for (const f of P.faccoes) { const x = G.resumoFaccao(P, f); console.log(' ', f.nome.padEnd(16), JSON.stringify(x), 'arsenal', JSON.stringify(f.arsenal), 'presos', f.prisioneiros.length); }
const meus = P.soldados.filter(s => s.faccao === eu);
for (const s of meus) console.log('   ', s.nome.padEnd(10), s.vida.padEnd(9), G.patente(s).padEnd(8), 'xp', s.xp.toFixed(0).padStart(4), Object.entries(s.atr).map(([k, v]) => k.slice(0, 4) + ' ' + v.toFixed(0)).join(' '), '| pref', Object.entries(s.pref).map(([k, v]) => k.slice(0, 4) + ' ' + v.toFixed(2)).join(' '), '|', s.diario.slice(0, 2).join(' / '));

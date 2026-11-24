// Missões e iniciativa: o jogador só dá missões e postura
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','recrutamento','armas','acao','missoes','logistica','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, resumoFaccao, HORA, daMissao, ativos, trocaFuncao, recrutaMercenario, moveSoldado };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
const sq = G.fundaFaccao(P, eu, base);
const tomadas = [base];
for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tomadas); tomadas.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
eu.recursos.dinheiro = 6000;
G.trocaFuncao(P, G.ativos(sq)[1], 'medico');
const cont = {}; P.ouvintes.push((t, d) => { const f = d && (d.fac || (d.sq && d.sq.faccao) || (d.s && d.s.faccao)); if (f !== eu) return; cont[t] = (cont[t] || 0) + 1; });
const roda = h => { const fim = P.tempo + h * G.HORA; while (P.tempo < fim) G.passoDaPartida(P, .1); };
P.velocidade = 20;
sq.postura = 'equilibrado'; G.daMissao(P, sq, 'expandir');
roda(8);
const r1 = G.resumoFaccao(P, eu);
console.log('após 8 h expandindo:', G.relogio(P), 'prédios', r1.predios, 'zonas', r1.zonas, 'soldados', r1.ativos, 'mortos', r1.mortos, '| missão', sq.missao && sq.missao.tipo, sq.estado);
for (let i = 0; i < 3; i++) G.recrutaMercenario(P, eu);
const merc = P.esquadroes.find(q => q.faccao === eu && q !== sq && G.ativos(q).length);
if (merc) { merc.postura = 'agressivo'; G.daMissao(P, merc, 'cacar'); }
roda(12);
const r2 = G.resumoFaccao(P, eu);
console.log('após mais 12 h:', G.relogio(P), 'prédios', r2.predios, 'zonas', r2.zonas, 'soldados', r2.ativos, 'mortos', r2.mortos, 'feridos', r2.feridos);
console.log('eventos do jogador:', JSON.stringify(cont));
for (const q of P.esquadroes.filter(q => q.faccao === eu)) console.log('  ', q.nome, G.ativos(q).length, q.missao && q.missao.tipo, q.postura, q.estado);

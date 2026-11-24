// Pedidos de troca: o esquadrão vai a uma base (QG ou casa de líder) para trocar
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','recrutamento','armas','acao','missoes','logistica','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, daMissao, ativos, pedeFuncao, pedeTransferencia, recrutaMercenario, basesDe, tomaEdificio };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const eu = G.criaFaccao(1, 'J', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
const sq = G.fundaFaccao(P, eu, base);
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'R' + i, 0xff0000), b); }
// uma casa de líder vira base avançada
const lider = reg.edificios.filter(e => e.tipo === 'lider' && e.dono !== P.governo).sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z))[0];
if (lider) G.tomaEdificio(P, lider, eu);
console.log('bases:', G.basesDe(P, eu).map(b => b.tipo + '@' + Math.round(Math.hypot(b.x - base.x, b.z - base.z)) + 'm').join(', '));
eu.recursos.dinheiro = 5000; eu.arsenal.kit = 2;
const log = []; P.ouvintes.push((t, d) => { if (['vaibase', 'trocou', 'semtroca', 'esperando', 'transferido', 'novoesquadrao', 'pedidotroca', 'pedidotransfer'].includes(t)) log.push(G.relogio(P) + ' ' + t + ' ' + (d.s ? d.s.nome : '') + (d.sq ? ' ' + d.sq.nome : '') + (d.base ? ' @' + d.base.tipo : '')); });
const roda = h => { const fim = P.tempo + h * G.HORA; while (P.tempo < fim) G.passoDaPartida(P, .1); };
P.velocidade = 20; sq.postura = 'cauteloso'; G.daMissao(P, sq, 'expandir');
roda(2);
G.recrutaMercenario(P, eu); G.recrutaMercenario(P, eu); G.recrutaMercenario(P, eu);
const merc = P.esquadroes.find(q => q.faccao === eu && q !== sq && G.ativos(q).length);
const [a, b, c] = G.ativos(sq).slice(1);
console.log('pedidos:', G.pedeFuncao(P, a, 'medico'), G.pedeTransferencia(P, b, 'novo'), merc && G.pedeTransferencia(P, c, merc));
roda(6);
console.log(log.join('\n'));
console.log('a é', a.funcao, a.item, '| b em', b.sq && b.sq.nome, '| c em', c.sq && c.sq.nome, c.vida);
for (const q of P.esquadroes.filter(q => q.faccao === eu && G.ativos(q).length)) console.log('  ', q.nome, G.ativos(q).length, q.missao && q.missao.tipo, q.estado);

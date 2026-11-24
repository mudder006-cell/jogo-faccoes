// Batalhão com ordem de tomar área + diplomacia em 2 dias de jogo
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','suprimentos','veiculos','comando','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, ativos, batalhoesDe, esquadroesDe, ordenaBatalhao, textoOrdem, rel, estadoEntre, resumoFaccao, recrutaMercenario, compra, passaItem, respondeProposta };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
const [b] = G.batalhoesDe(P, eu);
console.log('batalhão:', b.nome, 'líder', b.lider.nome, b.lider.vida, 'base', b.base.tipo, '| esquadrões', G.esquadroesDe(P, b).map(q => q.nome + ':' + G.ativos(q).length).join(','), '| estoque balas', b.municao.bala);
// ordem: tomar a zona da base (ou a mais próxima que não é nossa)
const zonas = reg.zonas.filter(z => z.dono !== eu).sort((a, c) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(c.x - base.x, c.z - base.z));
console.log('ordem:', G.ordenaBatalhao(P, b, 'tomar', zonas[0]) || 'ok', G.textoOrdem(b));
const log = []; P.ouvintes.push((t, d) => {
  if (['diplomacia', 'proposta', 'ordemcumprida', 'novoesquadrao', 'ataqueconjunto', 'liderfugiu', 'eliminada', 'sugestaorecusada', 'vaibase', 'trocou', 'adesao'].includes(t)) log.push(G.relogio(P) + ' ' + t + ' ' + (d.a ? d.a.nome + '×' + d.b.nome + '→' + d.estado : '') + (d.p ? d.p.de.nome + ' propõe ' + d.p.tipo + ' a ' + d.p.para.nome : '') + (d.sq ? d.sq.nome : '') + (d.s ? d.s.nome : '') + (d.fac ? d.fac.nome : '') + (d.zona ? ' ' + d.zona.nome + (d.inicio ? ' início' : d.fim ? ' fim' : ' perde ' + (d.perde && d.perde.nome)) : ''));
  if (t === 'proposta' && d.p.para === eu) G.respondeProposta(P, d.p, true);   // o jogador aceita tudo neste teste
});
eu.recursos.dinheiro = 8000; G.compra(P, eu, 'metralhadora'); G.compra(P, eu, 'kit'); G.passaItem(eu, b, 'metralhadora', 1); G.passaItem(eu, b, 'kit', 1);
P.velocidade = 20;
for (const h of [24, 48, 72, 96]) {
  while (P.tempo < h * G.HORA) G.passoDaPartida(P, .1);
  const r = G.resumoFaccao(P, eu);
  console.log(G.relogio(P), '| prédios', r.predios, 'zonas', r.zonas, 'soldados', r.ativos, '|', G.textoOrdem(b), '|', G.esquadroesDe(P, b).map(q => q.nome + ':' + G.ativos(q).map(s => s.funcao[0]).join('')).join(' '));
}
console.log(log.slice(0, 30).join('\n'));
const vivas = P.faccoes.filter(f => !f.governo);
for (let i = 0; i < vivas.length; i++) for (let j = i + 1; j < vivas.length; j++) { const r = G.rel(P, vivas[i], vivas[j]); console.log('  ', vivas[i].nome, '×', vivas[j].nome, r.estado, Math.round(r.valor)); }

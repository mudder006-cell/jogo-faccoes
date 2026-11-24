// Estoques por base, compra automática e veículos de logística
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','veiculos','comando','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, ativos, batalhoesDe, esquadroesDe, criaBatalhao, criaSoldado, tomaEdificio, guarda, textoCarga, noArsenal, soldadosDe, passaSoldado, ordenaBatalhao, VEICULOS };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
// uma casa de líder perto vira a base do 2º batalhão
const casa = reg.edificios.filter(e => e.tipo === 'lider' && e !== base).sort((a, c) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(c.x - base.x, c.z - base.z))[0];
G.tomaEdificio(P, casa, eu);
const cmd = G.criaSoldado(P, eu, 'lider', [50, 70]); cmd.atr.lideranca = 70;
const b2 = G.criaBatalhao(P, eu, cmd, casa);
console.log('casa a', Math.round(Math.hypot(casa.x - base.x, casa.z - base.z)), 'm do QG');
eu.recursos.dinheiro = 30000;
G.guarda(eu, 'veiculo', 1);
b2.minimo = { 'cx-bala': 800, fuzil: 3, soldados: 4 };
const log = []; P.ouvintes.push((t, d) => {
  if (['viagem', 'entregou', 'motorista', 'semmotorista', 'veiculoatribuido', 'veiculoatacado', 'veiculodestruido', 'veiculocapturado', 'semdinheiroauto', 'fabricou'].includes(t))
    log.push(G.relogio(P) + ' ' + t + ' ' + (d.v ? G.VEICULOS[d.v.nivel - 1].n + '/' + d.v.faccao.nome + (d.v.bat ? '/' + d.v.bat.nome : '') : '') + (d.txt ? ' [' + d.txt + ']' : '') + (d.b ? ' ' + d.b.nome : '') + (d.item ? ' ' + d.item : ''));
});
P.velocidade = 20;
for (const h of [2, 4, 8, 16, 24]) {
  while (P.tempo < h * G.HORA) G.passoDaPartida(P, .1);
  console.log(G.relogio(P), '| b2 balas', b2.municao.bala, 'fuzis', G.noArsenal(b2, 'fuzil'), 'soldados', G.soldadosDe(P, b2).length, '| QG balas', eu.municao.bala, 'fuzis', G.noArsenal(eu, 'fuzil'), '| $', Math.round(eu.recursos.dinheiro), '| veículos', eu.veiculos.map(v => v.estado + (v.motorista ? '(' + v.motorista.nome + ')' : '')).join(','), '| fila', eu.producao.length);
}
console.log(log.slice(0, 30).join('\n'));
console.log('rivais:', P.faccoes.filter(f => !f.jogador && !f.governo).map(f => f.nome + ':' + (f.veiculos || []).map(v => v.estado).join(',')).join(' '));

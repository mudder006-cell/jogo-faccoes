// Protótipo 18: rivais com exército completo (batalhões, missões, estoque por base, logística) e o comandante da IA.
// Uso: node testes/teste_rival.js [semente] [dificuldade] [horas]
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','veiculos','comando','comandante','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, ativos, batalhoesDe, esquadroesDe, textoOrdem, resumoFaccao, soldadosDe, contas, completa };')();
const [sd = 'B2', dif = 'normal', horas = '48'] = process.argv.slice(2);
const reg = G.geraRegiao(sd), P = G.criaPartida(reg); P.dificuldade = dif;
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);   // o jogador fica parado: só as rivais jogam
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
const rivais = P.faccoes.filter(f => !f.jogador && !f.governo);
const cont = {}; P.ouvintes.push((t, d) => { if (['novobatalhao','ordembatalhao','recrutou','entregou','ataqueconjunto','lidermandou','diplomacia','eliminada','combate'].includes(t)) cont[t] = (cont[t] || 0) + 1; });
P.velocidade = 20;
const t0 = Date.now(); let erros = 0;
const H = +horas;
for (const h of [6, 12, 24, 36, 48, 72, 96].filter(x => x <= H)) {
  while (P.tempo < h * G.HORA) { try { G.passoDaPartida(P, .1); } catch (e) { erros++; if (erros < 3) console.log('ERRO', e.stack.split('\n').slice(0, 4).join(' | ')); if (erros > 50) process.exit(1); } }
  console.log('== ' + G.relogio(P) + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  for (const f of rivais) {
    const r = G.resumoFaccao(P, f), bs = G.batalhoesDe(P, f);
    console.log(' ', f.nome, f.eliminada ? 'ELIMINADA' : '', '| prédios', r.predios, 'zonas', r.zonas, 'sold', r.ativos, 'mortos', r.mortos, '| $', Math.round(f.recursos.dinheiro), 'inf', Math.round(f.recursos.influencia), 'com', Math.round(f.recursos.comida), '| bat', bs.length, bs.map(b => '[' + G.textoOrdem(b) + ' · ' + b.postura + ' · esq ' + G.esquadroesDe(P, b).length + ' · sold ' + G.soldadosDe(P, b).length + '/' + (b.minimo.soldados || 0) + ']').join(' '), '| veíc', (f.veiculos || []).length);
  }
}
console.log('eventos:', cont, 'erros:', erros, 'completa:', rivais.every(G.completa));

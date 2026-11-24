// Várias ordens num batalhão, rondas na fronteira e reação rápida
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','veiculos','comando','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, HORA, ativos, batalhoesDe, esquadroesDe, ordenaBatalhao, textoOrdem, resumoFaccao, recrutaMercenario, declaraGuerra, compra, novoEsquadrao, ordenaPredio };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
const tom = [base]; for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
const [b] = G.batalhoesDe(P, eu);
eu.recursos.dinheiro = 20000; for (let i = 0; i < 12; i++) G.recrutaMercenario(P, eu);
G.compra(P, eu, 'cx-bala', 20); b.minimo = { 'cx-bala': 1500 };
const rival = P.faccoes.filter(f => !f.jogador && !f.governo).sort((x, y) => Math.hypot(x.base.x - base.x, x.base.z - base.z) - Math.hypot(y.base.x - base.x, y.base.z - base.z))[0];
G.declaraGuerra(P, eu, rival);
let invadiu = false;
const log = []; P.ouvintes.push((t, d) => { if (['lidermandou', 'reacao', 'socorro', 'ordemcumprida', 'semfrente', 'edificio'].includes(t)) { if (t === 'edificio' && !(d.antes === eu && ['mesquita','escola','hospital','delegacia','posto','lider','caixadagua','governo','quartel','cidadela'].includes(d.e.tipo))) return; log.push(G.relogio(P) + ' ' + t + ' ' + (d.sq ? d.sq.nome : '') + (d.e && d.e.tipo ? ' perdeu ' + d.e.tipo + ' p/ ' + d.fac.nome : '') + (d.o && d.o.faccao ? ' vs ' + d.o.faccao.nome : '')); } });
P.velocidade = 20;
let feito = false; G.ordenaBatalhao(P, b, 'tomar', reg.zonas.filter(z => z.dono !== eu).sort((a, c) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(c.x - base.x, c.z - base.z))[0]);
for (const h of [6, 12, 18, 24, 36, 48]) {
  while (P.tempo < h * G.HORA) {
    G.passoDaPartida(P, .1);
    if (!invadiu && P.tempo > 14 * G.HORA) { invadiu = true; const alvo = base.zona.chaves.find(e => e.dono === eu && e !== base) || base; const de = reg.edificios.filter(e => e.dono !== eu && Math.hypot(e.x - alvo.x, e.z - alvo.z) > 300 && Math.hypot(e.x - alvo.x, e.z - alvo.z) < 450)[0]; const inv = G.novoEsquadrao(P, rival, de, ['lider','metralhador','fuzileiro','fuzileiro','fuzileiro','fuzileiro'], { nome: 'Invasores' }); for (const s of inv.membros) { s.municao = 999; } G.ordenaPredio(P, inv, alvo, 'ataque'); console.log('INVASÃO de', rival.nome, 'contra', alvo.tipo, 'saindo a', Math.round(Math.hypot(de.x - alvo.x, de.z - alvo.z)), 'm'); P.ouvintes.push((t, d) => { if (t === 'edificio' && d.e === alvo) log.push(G.relogio(P) + ' ALVO tomado por ' + d.fac.nome); }); }
    if (!feito && P.tempo > 10 * G.HORA) { G.ordenaBatalhao(P, b, null); feito = true; console.log('ordens:', G.ordenaBatalhao(P, b, 'proteger', base.zona) || 'ok', G.ordenaBatalhao(P, b, 'frente', rival) || 'ok', G.textoOrdem(b)); }
  }
  const r = G.resumoFaccao(P, eu);
  console.log(G.relogio(P), '| prédios', r.predios, 'zonas', r.zonas, 'sold', r.ativos, '|', (b.tarefas || []).map(t => t.o.tipo + '(' + t.sqs.length + ' esq, perigo ' + t.perigo.toFixed(1) + ')').join(' '), '|', G.esquadroesDe(P, b).map(q => q.nome.slice(0, 8) + ':' + (q.missao ? q.missao.tipo : '-') + '/' + G.ativos(q).length).join(' '));
}
console.log(log.slice(0, 40).join('\n'));
const mortes = {}; for (const s of P.soldados) if (s.faccao === eu && ['morto','rendido','ferido','tratando','fila','desertou'].includes(s.vida)) { const k = s.vida + ' por ' + (s.atacadoPor ? s.atacadoPor.faccao.nome : '?'); mortes[k] = (mortes[k] || 0) + 1; }
console.log(mortes);

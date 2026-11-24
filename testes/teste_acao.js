// Ritmo novo: 2 dias de jogo (1 hora = 60 s) com rivais, governo e eventos
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, resumoFaccao, HORA };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg), r = G.criaSorteio ? null : null;
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
const tomadas = [base];
for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tomadas); tomadas.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
const cont = {}, log = [];
P.ouvintes.push((t, d) => { if (['ofensiva', 'contraataque', 'evento', 'hora', 'recrutou', 'zona'].includes(t)) { cont[t] = (cont[t] || 0) + 1;
  if (t === 'evento') log.push(G.relogio(P) + ' ' + d.fac.nome + ': ' + d.texto); if (t === 'ofensiva') log.push(G.relogio(P) + ' ' + d.fac.nome + ' ataca ' + d.contra.nome); if (t === 'contraataque') log.push(G.relogio(P) + ' governo contra ' + d.contra.nome); } });
P.velocidade = 20;
const t0 = Date.now(), segundos = 48 * G.HORA;
while (P.tempo < segundos) G.passoDaPartida(P, .1);
console.log(G.relogio(P), 'em', ((Date.now() - t0) / 1000).toFixed(0) + 's de cpu;', JSON.stringify(cont));
console.log(log.slice(0, 25).join('\n'));
for (const f of P.faccoes) { const rr = G.resumoFaccao(P, f); console.log(f.nome.padEnd(14), 'soldados', rr.ativos, 'mortos', rr.mortos, 'prédios', rr.predios, 'zonas', rr.zonas, f.recursos ? JSON.stringify(Object.fromEntries(Object.entries(f.recursos).map(([k, v]) => [k, Math.round(v)]))) : ''); }

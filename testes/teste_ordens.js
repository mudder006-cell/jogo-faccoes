// Ordens novas sem tela: avançar até um ponto, tomar uma zona e linha com dois esquadrões
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, podeComecar, passoDaPartida, relogio, ordenaPonto, ordenaZona, ordenaLinha, moveSoldado, resumoFaccao, ativos, centroDoEsquadrao };')();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg);
const ev = {}; P.ouvintes.push((t, d) => { ev[t] = (ev[t] || 0) + 1; if (t === 'desvio' || t === 'zonaconcluida') console.log('  ', G.relogio(P), t, d.e ? d.e.tipo + ' ' + d.e.zona.nome : d.zona.nome); });
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
const sq = G.fundaFaccao(P, eu, base);
// 1) avançar até um ponto a ~400 m, na direção da cidade
const dx = -base.x, dz = -base.z, d = Math.hypot(dx, dz);
const alvo = [base.x + dx / d * 400, base.z + dz / d * 400];
G.ordenaPonto(P, sq, alvo[0], alvo[1], 'ataque'); P.velocidade = 20;
let k = 0; while (k++ < 4000 && (sq.estado === 'andando' || sq.combate)) G.passoDaPartida(P, .1);
console.log('1) avançar:', G.relogio(P), 'estado', sq.estado, 'guarda', sq.guarda && sq.guarda.tipo, 'prédios', G.resumoFaccao(P, eu).predios, 'dist ao ponto', Math.round(Math.hypot(sq.x - alvo[0], sq.z - alvo[1])));
// 2) tomar a zona da base
G.ordenaZona(P, sq, base.zona);
k = 0; while (k++ < 6000 && (sq.estado === 'andando' || sq.combate)) G.passoDaPartida(P, .1);
console.log('2) zona', base.zona.nome, ':', G.relogio(P), 'dono', base.zona.dono && base.zona.dono.nome, 'chaves meus', base.zona.chaves.filter(e => e.dono === eu).length + '/' + base.zona.chaves.length);
// 3) linha de defesa com dois esquadrões
console.log('   vivos no esquadrão:', G.ativos(sq).length, sq.estado);
if (G.ativos(sq).length < 3) process.exit(0);
const s2 = G.moveSoldado(P, G.ativos(sq)[0], 'novo'); G.moveSoldado(P, G.ativos(sq)[0], s2); G.moveSoldado(P, G.ativos(sq)[0], s2);
const [cx, cz] = G.centroDoEsquadrao(sq);
G.ordenaLinha(P, [sq, s2], cx - 80, cz + 60, cx + 80, cz + 60, 'defesa');
k = 0; while (k++ < 3000 && [sq, s2].some(q => q.estado === 'andando')) G.passoDaPartida(P, .1);
console.log('3) linha:', G.relogio(P), [sq, s2].map(q => q.nome + ' ' + q.estado + ' ' + (q.guarda ? q.guarda.tipo : '-') + ' ' + G.ativos(q).length).join(' | '));
console.log('eventos', JSON.stringify(ev));

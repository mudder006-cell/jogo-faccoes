// Recrutamento e armas sem tela: dois dias de jogo
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + `return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, relogio, contas, convence, podeConvencer,
  criaSorteio, resumoFaccao, ativos, recrutaVoluntario, recrutaMercenario, recrutaCla, convencePrisioneiro, zonasComVoluntarios, podeRecrutar, compra, encomenda, fabrica,
  podeFabricar, mandaEmissario, ordenaRecuar, textoArsenal, pertoDoQG, semArma, PAISES };`)();
const reg = G.geraRegiao(process.argv[2] || 'B2'), P = G.criaPartida(reg), r = G.criaSorteio('e');
const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila');
G.fundaFaccao(P, eu, base);
for (let i = 0; i < 3; i++) G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), G.escolhaRival(reg, r, [base]));
const ev = {}; P.ouvintes.push((t, d) => { if (d && d.fac && d.fac !== eu && !['recrutou','comprou','encomendou'].includes(t)) return; ev[t] = (ev[t] || 0) + 1; });
eu.recursos.dinheiro = 4000; eu.recursos.influencia = 120;
P.velocidade = 20;
const hora = () => { for (let k = 0; k < 1800; k++) G.passoDaPartida(P, .1); };
for (let h = 0; h < 6; h++) { hora(); for (let i = 0; i < 3; i++) { const alvo = reg.edificios.filter(e => !G.podeConvencer(P, eu, e) && e.tipo === 'casa').sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z))[0]; if (alvo) G.convence(P, eu, alvo); } eu.recursos.influencia = 120; }
console.log('voluntários:', G.zonasComVoluntarios(eu).map(v => v.zona.nome + ':' + v.n).join(', ') || '(nenhum)', '·', G.podeRecrutar(P, eu, 'voluntario'));
for (const v of G.zonasComVoluntarios(eu)) G.recrutaVoluntario(P, eu, v.zona);
const m = G.recrutaMercenario(P, eu); console.log('mercenário:', m && m.nome, m && m.arma, '→', m && m.sq.nome);
console.log('clã:', G.podeRecrutar(P, eu, 'cla'));
console.log('comprar 2 fuzis:', G.compra(P, eu, 'fuzil', 2), '· contrabando rpg:', G.encomenda(P, eu, 'rpg', 1), '· fabricar fuzil:', G.podeFabricar(P, eu, 'fuzil') || G.fabrica(P, eu, 'fuzil'));
console.log('emissário:', G.mandaEmissario(P, eu, 'sarabel'), JSON.stringify(eu.paises.sarabel.relacao));
const recrutas = P.esquadroes.filter(q => q.faccao === eu && q.recrutas);
for (const q of recrutas) console.log('  grupo', q.nome, G.ativos(q).length, 'sem arma:', G.semArma(q));
for (const q of recrutas) if (G.semArma(q)) G.ordenaRecuar(P, q);
for (let h = 0; h < 44; h++) hora();
for (const q of recrutas) console.log('  depois', q.nome, G.ativos(q).length, 'sem arma:', G.semArma(q), 'no QG:', G.pertoDoQG(eu, q), q.estado);
console.log('arsenal:', G.textoArsenal(eu.arsenal), '· cargas:', eu.cargas.length, '· produção:', eu.producao.length);
console.log('países:', G.PAISES.map(p => p.n + ' ' + eu.paises[p.id].relacao + (eu.paises[p.id].pedido ? ' (pedido: ' + eu.paises[p.id].pedido.alvo.tipo + ')' : '')).join(' | '));
console.log('eventos do jogador:', JSON.stringify(ev));
console.log(G.relogio(P));
for (const f of P.faccoes) { const rr = G.resumoFaccao(P, f); console.log(f.nome.padEnd(14), 'soldados', rr.ativos, 'esq', rr.esquadroes, 'prédios', rr.predios, f.recursos ? JSON.stringify(Object.fromEntries(Object.entries(f.recursos).map(([k, v]) => [k, Math.round(v)]))) : '', f.arsenal ? G.textoArsenal(f.arsenal) : ''); }

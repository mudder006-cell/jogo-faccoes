// Protótipo 19.2: suprimentos (médico, engenheiro, hospital), resistência dos prédios e determinismo.
// Uso: node testes/teste_suprimentos.js [semente]
const fs = require('fs');
const src = ['dados','base','relevo','caminhos','ocupacao','regiao','territorio','rotas','soldados','catalogo','simulacao','combate','percepcao','economia','comida','recrutamento','armas','acao','missoes','logistica','diplomacia','batalhoes','estoques','suprimentos','veiculos','comando','ia','ordens'].map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, HORA, ativos, ARMAS, SUPRIMENTO, PREDIO, TRATAMENTO_QG, danificaPredio, fortificacoes, trataNoCampo, temSuprimento, gastaTratamento, evacua, tratamentos, criaSoldado, entraNoEsquadrao, ocupa, tomaEdificio, batalhoesDe, tamanhoDoPredio, totalSuprimentos, cargaSuprimento, equipaNaBase };')();
const semente = process.argv[2] || 'B2';
let falhas = 0;
const confere = (nome, ok, detalhe) => { console.log((ok ? '  ok    ' : '  FALHOU ') + nome + (detalhe ? '  [' + detalhe + ']' : '')); if (!ok) falhas++; };

function novaPartida(sem, rivais) {
  const reg = G.geraRegiao(sem), P = G.criaPartida(reg);
  const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
  const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
  const sq = G.fundaFaccao(P, eu, base);
  const tom = [base];
  for (let i = 0; i < (rivais || 0); i++) { const b = G.escolhaRival(reg, P.r, tom); if (!b) break; tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
  return { reg, P, eu, base, sq };
}
const casaPequena = reg => reg.edificios.find(e => e.tipo === 'casa' && (e.andares || 1) === 1 && !e.dono && G.tamanhoDoPredio(e) <= G.PREDIO.tamanhoRef && G.tamanhoDoPredio(e) > 60);
const acertosAteCair = (P, e, arma) => { let n = 0; while (!e.destruido && n < 200) { G.danificaPredio(P, e, G.ARMAS[arma].danoPredio, null); n++; } return n; };

console.log('1) Resistência da casa pequena (semente ' + semente + ')');
{
  const { reg, P } = novaPartida(semente);
  const e = casaPequena(reg), reset = f => { e.dano = 0; e.destruido = false; e.fortificado = f; };
  reset(0); const n0 = acertosAteCair(P, e, 'rpg');
  confere('casa pequena sem fortificação cai com 3 acertos de RPG', n0 === 3, n0 + ' acertos');
  reset(1); const n100 = acertosAteCair(P, e, 'rpg');
  confere('fortificação 100 aguenta cerca de 3x mais (8 a 10 acertos)', n100 >= 8 && n100 <= 10, n100 + ' acertos');
  reset(.5); const n50 = acertosAteCair(P, e, 'rpg');
  confere('fortificação 50 fica no meio', n50 > n0 && n50 < n100, n50 + ' acertos');
  reset(0); const g0 = acertosAteCair(P, e, 'lancagranadas');
  reset(1); const g100 = acertosAteCair(P, e, 'lancagranadas');
  confere('granada também: fortificação 100 aguenta mais', g100 > g0 && g100 >= 2.5 * g0, g0 + ' contra ' + g100 + ' acertos');
  reset(1); G.danificaPredio(P, e, G.ARMAS.rpg.danoPredio, null);
  confere('o dano também derruba a fortificação', e.fortificado < 1 && e.fortificado > .8, 'fortificação ' + Math.round(e.fortificado * 100));
}

console.log('2) Médico sem suprimentos não trata; com suprimentos, gasta');
{
  const { P, eu, sq } = novaPartida(semente);
  const m = G.criaSoldado(P, eu, 'medico'); G.entraNoEsquadrao(sq, m); m.item = 'kit'; m.nivelItem = 1; m.x = sq.x; m.z = sq.z;
  const ferido = G.ativos(sq).find(s => s !== m && s.funcao === 'fuzileiro');
  ferido.vida = 'ferido'; ferido.caiuEm = P.tempo; ferido.x = m.x; ferido.z = m.z;
  m.suprimentos = 0;
  confere('médico com mochila vazia não tem suprimento', !G.temSuprimento(m, G.SUPRIMENTO.tratarCampo));
  G.trataNoCampo(P, m, ferido);
  confere('sem suprimentos o ferido continua ferido', ferido.vida === 'ferido' && m.suprimentos === 0);
  m.suprimentos = 3; ferido.vida = 'ferido'; m.usosKit = null;
  G.trataNoCampo(P, m, ferido);
  confere('com suprimentos, tratar gasta ' + G.SUPRIMENTO.tratarCampo, m.suprimentos === 3 - G.SUPRIMENTO.tratarCampo, 'sobraram ' + m.suprimentos);
  // na base, a mochila enche com o estoque (como a munição)
  const b = G.batalhoesDe(P, eu)[0]; b.municao.suprimento = 50; eu.municao.suprimento = 0; m.suprimentos = 2;
  m.bat = b; G.equipaNaBase(P, m, eu.base);
  confere('na base a mochila enche com o estoque', m.suprimentos === G.cargaSuprimento(m) && b.municao.suprimento === 50 - (G.cargaSuprimento(m) - 2), m.suprimentos + ' na mochila, ' + b.municao.suprimento + ' no estoque');
}

console.log('3) Tratamento no QG/hospital consome suprimentos; sem estoque, demora o dobro');
{
  const { P, eu, sq } = novaPartida(semente);
  const b = G.batalhoesDe(P, eu)[0];
  const tratar = (estoque) => {
    eu.municao.suprimento = 0; b.municao.suprimento = estoque;
    const s = G.ativos(sq).find(x => x.funcao === 'fuzileiro');
    s.vida = 'ferido'; s.caiuEm = P.tempo; eu.fila = eu.fila || [];
    G.evacua(P, s);
    if (s.ondeTrata === 'hospital') return { s, hospital: true };
    P.tempo += 1; G.tratamentos(P);
    return { s };
  };
  const t0 = P.tempo;
  const a = tratar(10);
  if (a.hospital) confere('facção nova não tem hospital seu (teste pressupõe tratamento no QG)', false);
  else {
    confere('com estoque: tratamento normal (6 h)', Math.abs((a.s.fimTrat - P.tempo) - (G.TRATAMENTO_QG)) < 1.01, (a.s.fimTrat - P.tempo) + ' s');
    confere('o estoque caiu em ' + G.SUPRIMENTO.tratarBase, b.municao.suprimento === 10 - G.SUPRIMENTO.tratarBase, 'sobraram ' + b.municao.suprimento);
    a.s.vida = 'ok';
    const c = tratar(0);
    confere('sem estoque: tratamento no dobro do tempo', Math.abs((c.s.fimTrat - P.tempo) - G.TRATAMENTO_QG * G.SUPRIMENTO.lentidao) < 1.01, (c.s.fimTrat - P.tempo) + ' s');
  }
}

console.log('4) Engenheiro reconstrói prédio destruído e gasta suprimentos');
{
  const { reg, P, eu, sq } = novaPartida(semente);
  const e = casaPequena(reg); G.tomaEdificio(P, e, eu);
  const eng = G.criaSoldado(P, eu, 'engenheiro'); G.entraNoEsquadrao(sq, eng); eng.item = 'explosivo'; eng.nivelItem = 1;
  G.ocupa(P, sq, e); sq.fixo = true;
  e.fortificado = 0; e.dano = 0; e.destruido = false; acertosAteCair(P, e, 'rpg');
  confere('prédio destruído', e.destruido && e.dano === 1);
  eng.suprimentos = 0;
  for (let i = 0; i < 600; i++) { P.tempo += 1; G.fortificacoes(P, 1); }
  confere('sem suprimentos o engenheiro não reconstrói', e.destruido && !(e.reconstrucao > 0), 'reconstrução ' + (e.reconstrucao || 0));
  eng.suprimentos = G.cargaSuprimento(eng);
  const antes = eng.suprimentos; let seg = 0;
  while (seg < 3000 && (e.destruido || e.dano > 0)) { P.tempo += 1; G.fortificacoes(P, 1); seg++; }
  const gasto = antes - eng.suprimentos;
  confere('reconstruído e consertado: de pé, sem dano', !e.destruido && e.dano === 0, seg + ' s de jogo');
  confere('gastou suprimentos (cerca de 25 para uma casa de 120 m²)', gasto > 15 && gasto <= 30, gasto.toFixed(1));
  const f0 = e.fortificado; for (let i = 0; i < 200; i++) { P.tempo += 1; G.fortificacoes(P, 1); }
  confere('depois de pronto, fortifica (e continua gastando)', e.fortificado > f0, 'fortificação ' + Math.round(e.fortificado * 100));
}

console.log('5) Determinismo: mesma semente duas vezes dá o mesmo resultado');
{
  const resumo = () => {
    const { reg, P, eu } = novaPartida(semente, 3);
    P.velocidade = 20; for (let k = 0; k < 4000; k++) G.passoDaPartida(P, .1);
    const por = f => ({ sup: G.totalSuprimentos(P, f), din: Math.round(f.recursos ? f.recursos.dinheiro : 0), mun: f.municao ? Object.values(f.municao).join(',') : '-' });
    const maos = Math.round(P.soldados.reduce((t, s) => t + (s.suprimentos || 0), 0) * 1000);
    const predios = reg.edificios.reduce((t, e) => t + Math.round(((e.dano || 0) * 1000 + (e.fortificado || 0) * 777)) + (e.destruido ? 5 : 0), 0);
    return JSON.stringify({ t: Math.round(P.tempo), maos, predios, f: P.faccoes.map(f => [f.nome, por(f)]) });
  };
  const a = resumo(), b = resumo();
  confere('duas rodadas iguais', a === b);
  console.log('   ' + a.slice(0, 300));
}
console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo certo');
process.exit(falhas ? 1 : 0);

// Protótipo 19 (ver ou saber): confere a regra "só atira se vê, se um colega avisou, se levou tiro ou se lembra do abrigo".
// Roda partidas sem tela (jogador + 3 rivais + governo), mede tiros por motivo e confere o determinismo.
// Uso: node testes/teste_percepcao.js [SEMENTES] [HORAS]      ex.: node testes/teste_percepcao.js B2,K7 24
const fs = require('fs');
const ARQS = require('./arquivos.js');
let src = ARQS.map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
// espiões: conferem o motivo de cada tiro na hora em que ele sai
src = src.replace('function dispara(P, s, alvo) {', 'function dispara(P, s, alvo) { __espia.dispara(P, s, alvo); return dispara__o(P, s, alvo); }\nfunction dispara__o(P, s, alvo) {')
         .replace('function suprime(P, s, k) {', 'function suprime(P, s, k) { __espia.suprime(P, s, k); return suprime__o(P, s, k); }\nfunction suprime__o(P, s, k) {');
const espia = { dispara() {}, suprime() {} };
const G = new Function('__espia', src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, HORA, resumoFaccao, PERCEPCAO, ARMAS, ultimasPosicoes, hostis };')(espia);

const SEMENTES = (process.argv[2] || 'B2,K7').split(','), HORAS = +(process.argv[3] || 24);
let falhas = 0;
const confere = (ok, txt) => { if (!ok) { falhas++; console.log('  FALHOU:', txt); } };

function partida(sem, espiao) {
  const reg = G.geraRegiao(sem), P = G.criaPartida(reg); P.dificuldade = 'normal';
  const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
  const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
  G.fundaFaccao(P, eu, base); const tom = [base];
  for (let i = 0; i < 3; i++) { const b = G.escolhaRival(reg, P.r, tom); if (!b) break; tom.push(b); G.fundaFaccao(P, G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000), b); }
  const st = { vendo: 0, aviso: 0, tiro: 0, abrigo: 0, semMotivo: 0, supSemMotivo: 0, supAcertos: 0, baixas: 0, disparosAntigos: 0, ultimas: 0, maxPasso: 0, somaPasso: 0, passos: 0 };
  espia.dispara = (P2, s, alvo) => {
    st.vendo++;
    if (G.PERCEPCAO.ligada && !(s.mira && s.mira.tipo === 'vendo' && s.mira.o === alvo)) st.semMotivo++;
    if (!G.PERCEPCAO.ligada) st.disparosAntigos++;
  };
  espia.suprime = (P2, s, k) => {
    if (k.o.vida !== 'ok' || s.municao <= 0 || !G.hostis(P2, s.faccao, k.o.faccao)) return;   // a função sai sem atirar
    const m = s.mira, idade = P2.tempo - k.t;
    const jan = k.origem === 'abrigo' ? G.PERCEPCAO.janelaAbrigo : G.PERCEPCAO.janelaSupressao;
    st[k.origem] = (st[k.origem] || 0) + 1;
    if (!(m && m.tipo === 'supressao' && s.sup === k && ['aviso', 'tiro', 'abrigo'].includes(k.origem) && idade <= G.PERCEPCAO.janelaAbrigo + 1 && k.o.vida === 'ok' && !G.ARMAS[s.arma].area)) st.supSemMotivo++;
    if (k.origem !== 'abrigo' && idade > jan + 1) st.supSemMotivo++;
  };
  P.ouvintes.push(t => { if (t === 'baixa') st.baixas++; });
  while (P.tempo < HORAS * G.HORA) {
    const t0 = process.hrtime.bigint(); G.passoDaPartida(P, .25); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    st.passos++; st.somaPasso += ms; if (ms > st.maxPasso) st.maxPasso = ms;
    if (P.tempo % 30 < .25) for (const f of P.faccoes) st.ultimas = Math.max(st.ultimas, G.ultimasPosicoes(P, f).length);
  }
  const sig = P.faccoes.map(f => { const r = G.resumoFaccao(P, f); return f.nome + ':' + r.predios + '/' + r.ativos + '/' + r.mortos; }).join(' ') + ' mun ' + P.soldados.reduce((n, s) => n + s.municao, 0).toFixed(0) + ' sup ' + P.soldados.reduce((n, s) => n + (s.supTiros || 0), 0);
  return { st, sig };
}

for (const sem of SEMENTES) {
  console.log('== semente', sem, HORAS + ' h');
  G.PERCEPCAO.ligada = true; G.PERCEPCAO.grade = true;
  const a = partida(sem, espia), b = partida(sem, espia);
  console.log('  ligada :', a.sig); console.log('  tiros: vendo', a.st.vendo, '| supressão por aviso', a.st.aviso, 'por tiro', a.st.tiro, 'por abrigo', a.st.abrigo, '| baixas', a.st.baixas, '| marcas de última posição de uma facção (máx)', a.st.ultimas,
    '| ms/passo', (a.st.somaPasso / a.st.passos).toFixed(3), 'pico', a.st.maxPasso.toFixed(0));
  confere(a.st.semMotivo === 0, 'tiro mirado sem estar vendo: ' + a.st.semMotivo);
  confere(a.st.supSemMotivo === 0, 'supressão sem motivo válido: ' + a.st.supSemMotivo);
  confere(a.sig === b.sig, 'mesma semente, resultados diferentes:\n    ' + a.sig + '\n    ' + b.sig);
  G.PERCEPCAO.ligada = false;
  const c = partida(sem, espia);
  console.log('  desligada:', c.sig, '| supressão', c.st.aviso + c.st.tiro + c.st.abrigo);
  confere(c.st.aviso + c.st.tiro + c.st.abrigo === 0, 'com o interruptor desligado ainda houve supressão');
  G.PERCEPCAO.grade = false;
  const d = partida(sem, espia);
  confere(d.sig === c.sig, 'grade espacial muda o resultado (desligada x ligada):\n    ' + c.sig + '\n    ' + d.sig);
  console.log('  grade desligada igual à ligada (interruptor da percepção desligado):', d.sig === c.sig);
}
console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo certo');
process.exitCode = falhas ? 1 : 0;

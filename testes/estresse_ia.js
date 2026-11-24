// Estresse da IA rival: roda muitas partidas sem tela (várias sementes, dificuldades e números de rivais),
// mede como cada rival se sai e aponta sinais de problema. Não muda nada no jogo.
//
// Uso (a partir da raiz do repositório):
//   node testes/estresse_ia.js                                   (rodada rápida: 3 sementes x 3 dificuldades, 48 h)
//   node testes/estresse_ia.js --sementes A1,B2,C3,D4 --dif normal --horas 96 --rivais 5
//   node testes/estresse_ia.js --pers agressiva                  (todas as rivais com a mesma personalidade)
//   node testes/estresse_ia.js --src /caminho/outra-versao/src   (compara outra versão do código)
//   node testes/estresse_ia.js --governo nenhum                  (sem o governo antigo desde o começo; "fim" = normal até --fimgoverno H horas, padrão 24)
//   node testes/estresse_ia.js --json resultado.json             (grava os números para comparar depois)
const fs = require('fs'), path = require('path');

const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 ? process.argv[i + 1] : padrao; };
const SRC = path.resolve(arg('src', path.join(__dirname, '..', 'src')));
const SEMENTES = arg('sementes', 'B2,K7,Q4').split(',');
const DIFS = arg('dif', 'facil,normal,dificil').split(',');
const HORAS = +arg('horas', 48);
const N_RIVAIS = +arg('rivais', 3);
const PERS = arg('pers', '');
const SAIDA = arg('json', '');
const GOVERNO = arg('governo', 'normal');            // normal | nenhum | fim
const FIM_GOV = +arg('fimgoverno', 24);
if (!['normal', 'nenhum', 'fim'].includes(GOVERNO)) { console.error('--governo deve ser normal, nenhum ou fim'); process.exit(2); }

const ARQS = require('./arquivos.js');
const codigo = ARQS.map(f => fs.readFileSync(path.join(SRC, f + '.js'), 'utf8')).join('\n');
const G = new Function(codigo + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, HORA, resumoFaccao, batalhoesDe, estadoEntre, contas, tomaEdificio, forcaDaFaccao, PERSONALIDADES };')();

// Limites dos alertas (provisórios, para o testador apontar; não são regras do jogo)
const LIM = { msPorHora: 1500, dominancia: 5, horasSemGuerra: 48 };

// Tira o governo antigo do jogo: soldados mortos, guarnições soltas e prédios sem dono (como os ~20% do mapa que já começam sem dono)
function removeGoverno(P) {
  const gov = P.governo;
  for (const sq of P.esquadroes) if (sq.faccao === gov) sq.guarda = null;
  for (const s of P.soldados) if (s.faccao === gov && s.vida === 'ok') s.vida = 'morto';
  for (const e of P.reg.edificios) if (e.dono === gov) G.tomaEdificio(P, e, null);
  P.govBats = []; gov.caixa = 0;
}

function umaPartida(semente, dif) {
  const res = { semente, dif, erro: null, ms: 0, rivais: [], eventos: {}, primeiraGuerraH: null, governo: {} };
  const t0 = Date.now();
  try {
    const reg = G.geraRegiao(semente), P = G.criaPartida(reg);
    P.dificuldade = dif;
    const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
    const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
    G.fundaFaccao(P, eu, base);
    const tom = [base];
    for (let i = 0; i < N_RIVAIS; i++) {
      const b = G.escolhaRival(reg, P.r, tom); if (!b) break; tom.push(b);
      const f = G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000); G.fundaFaccao(P, f, b);
      if (PERS) f.personalidade = PERS;
    }
    const rivais = P.faccoes.filter(f => !f.jogador && !f.governo);
    if (GOVERNO === 'nenhum') removeGoverno(P);
    let govRemovido = GOVERNO === 'nenhum';
    const extra = { paresGuerra: new Set(), pazes: 0, serie: {} }, estAnt = new Map(), proxSerie = [6, 12, 24, 48, 72, 96];
    const gov0 = { predios: G.resumoFaccao(P, P.governo).predios, sold: G.forcaDaFaccao(P, P.governo) };
    P.ouvintes.push((t, d) => { res.eventos[t] = (res.eventos[t] || 0) + 1; if (['reconstruido', 'consertado', 'fortificado'].includes(t) && d.sq && !d.sq.faccao.jogador) { res.obrasRivais = res.obrasRivais || {}; res.obrasRivais[t] = (res.obrasRivais[t] || 0) + 1; } });
    const caixaMin = new Map(rivais.map(f => [f, Infinity]));
    let estragado = null;
    while (P.tempo < HORAS * G.HORA) {
      G.passoDaPartida(P, .25);
      if (GOVERNO === 'fim' && !govRemovido && P.tempo >= FIM_GOV * G.HORA) { removeGoverno(P); govRemovido = true; }
      if (GOVERNO !== 'normal') {
        for (let i = 0; i < rivais.length; i++) for (let j = i + 1; j < rivais.length; j++) {
          const k = i + '-' + j, st = G.estadoEntre(P, rivais[i], rivais[j]);
          if (st === 'guerra') extra.paresGuerra.add(k);
          if (estAnt.get(k) === 'guerra' && st !== 'guerra') extra.pazes++;
          estAnt.set(k, st);
        }
        if (proxSerie.length && P.tempo >= proxSerie[0] * G.HORA) { const h = proxSerie.shift(); extra.serie[h] = { rivais: rivais.map(f => G.resumoFaccao(P, f).predios), semDono: P.reg.edificios.filter(e => !e.dono).length }; }
      }
      if (res.primeiraGuerraH === null && rivais.some(a => rivais.some(b => a !== b && G.estadoEntre(P, a, b) === 'guerra'))) res.primeiraGuerraH = +(P.tempo / G.HORA).toFixed(1);
      for (const f of rivais) {
        const r = f.recursos;
        if (!estragado && ![r.dinheiro, r.comida, r.influencia].every(v => v === undefined || Number.isFinite(v))) estragado = f.nome + ' com recurso inválido (NaN/infinito)';
        caixaMin.set(f, Math.min(caixaMin.get(f), r.dinheiro));
      }
    }
    res.engenheirosRivais = P.soldados.filter(x => !x.faccao.jogador && x.faccao.recursos && x.funcao === 'engenheiro' && x.vida === 'ok').length;
    res.fortificadosRivais = P.reg.edificios.filter(e => e.dono && !e.dono.jogador && e.dono.recursos && (e.fortificado || 0) > 0).length;
    if (estragado) res.erro = estragado;
    for (const f of rivais) {
      const r = G.resumoFaccao(P, f);
      res.rivais.push({ nome: f.nome, pers: f.personalidade, eliminada: !!f.eliminada, predios: r.predios, soldados: G.forcaDaFaccao(P, f),
        dinheiro: Math.round(f.recursos.dinheiro), caixaMin: Math.round(caixaMin.get(f)), comida: Math.round(f.recursos.comida),
        batalhoes: G.batalhoesDe(P, f).length, veiculos: (f.veiculos || []).length,
        guerras: rivais.filter(o => o !== f && G.estadoEntre(P, f, o) === 'guerra').length });
    }
    if (GOVERNO !== 'normal') { res.modoGoverno = GOVERNO; res.paresGuerra = extra.paresGuerra.size; res.pazes = extra.pazes; res.serie = extra.serie; res.paresPorPers = {};
      for (const k of extra.paresGuerra) for (const i of k.split('-')) { const p = rivais[+i].personalidade; res.paresPorPers[p] = (res.paresPorPers[p] || 0) + 1; } }
    res.governo = { predios0: gov0.predios, predios: G.resumoFaccao(P, P.governo).predios, sold0: gov0.sold, sold: G.forcaDaFaccao(P, P.governo) };
  } catch (e) { res.erro = (e && e.stack || String(e)).split('\n').slice(0, 3).join(' | '); }
  res.ms = Date.now() - t0;
  return res;
}

function alertas(res) {
  const a = [];
  if (res.erro) a.push('ERRO: ' + res.erro);
  const msH = res.ms / HORAS; if (msH > LIM.msPorHora) a.push('lento: ' + Math.round(msH) + ' ms por hora de jogo');
  const vivas = res.rivais.filter(r => !r.eliminada);
  if (vivas.length > 1) { const mx = Math.max(...vivas.map(r => r.predios)), mn = Math.max(1, Math.min(...vivas.map(r => r.predios))); if (mx / mn > LIM.dominancia) a.push('domínio: maior rival tem ' + (mx / mn).toFixed(1) + 'x os prédios da menor'); }
  if (HORAS >= LIM.horasSemGuerra && res.primeiraGuerraH === null) a.push('nenhuma guerra entre rivais em ' + HORAS + ' h');
  for (const r of res.rivais) {
    if (r.dinheiro < 0) a.push(r.nome + ' (' + r.pers + ') terminou com caixa negativo');
    if (r.veiculos === 0 && HORAS >= 72) a.push(r.nome + ' (' + r.pers + ') sem veículos');
    if (r.soldados === 0 && !r.eliminada) a.push(r.nome + ' viva sem soldados');
    if (r.eliminada && r.soldados > 0) a.push(r.nome + ' eliminada mas ainda com ' + r.soldados + ' soldados');
  }
  return a;
}

console.log('Estresse da IA | src:', path.relative(process.cwd(), SRC) || SRC, '| sementes', SEMENTES.join(','), '| dif', DIFS.join(','), '|', HORAS, 'h |', N_RIVAIS, 'rivais' + (PERS ? ' | pers ' + PERS : '') + (GOVERNO !== 'normal' ? ' | governo ' + GOVERNO + (GOVERNO === 'fim' ? '@' + FIM_GOV + 'h' : '') : ''));
const todos = [];
for (const s of SEMENTES) for (const d of DIFS) {
  const res = umaPartida(s, d); res.alertas = alertas(res); todos.push(res);
  console.log('\n== semente', s, '| dif', d, '|', (res.ms / 1000).toFixed(1), 's | 1ª guerra entre rivais:', res.primeiraGuerraH === null ? 'nunca' : res.primeiraGuerraH + ' h');
  console.log('   obras das rivais (eventos):', JSON.stringify(res.obrasRivais || {}), '| engenheiros vivos no fim:', res.engenheirosRivais, '| prédios de rivais com fortificação > 0:', res.fortificadosRivais);
  for (const r of res.rivais) console.log('  ', r.nome.padEnd(8), (r.pers || '?').padEnd(11), r.eliminada ? 'ELIMINADA' : '', 'prédios', String(r.predios).padStart(4), '| sold', String(r.soldados).padStart(3), '| $', r.dinheiro, '(mín', r.caixaMin + ') | bat', r.batalhoes, '| veíc', r.veiculos, '| guerras', r.guerras);
  if (res.governo.predios0 !== undefined) console.log('   governo: prédios', res.governo.predios0, '→', res.governo.predios, '| soldados', res.governo.sold0, '→', res.governo.sold);
  if (res.modoGoverno) console.log('   pares que já guerrearam:', res.paresGuerra, '| pazes:', res.pazes, '| prédios das rivais por hora:', Object.entries(res.serie).map(([h, x]) => h + 'h=' + x.rivais.join('/') + ' (sem dono ' + x.semDono + ')').join(' ; '));
  for (const a of res.alertas) console.log('   ⚠', a);
}

// Resumo geral
const n = todos.length, comErro = todos.filter(r => r.erro).length;
const porPers = {};
for (const res of todos) for (const r of res.rivais) { const p = porPers[r.pers] = porPers[r.pers] || { n: 0, predios: 0, dinheiro: 0, elim: 0, neg: 0 }; p.n++; p.predios += r.predios; p.dinheiro += r.dinheiro; p.elim += r.eliminada; p.neg += r.dinheiro < 0; }
console.log('\n=== RESUMO:', n, 'partidas |', comErro, 'com erro |', todos.filter(r => r.primeiraGuerraH === null).length, 'sem guerra entre rivais |', todos.reduce((s, r) => s + r.alertas.length, 0), 'alertas');
for (const [k, p] of Object.entries(porPers)) console.log('  ', k.padEnd(11), 'média prédios', Math.round(p.predios / p.n), '| média $', Math.round(p.dinheiro / p.n), '| eliminadas', p.elim + '/' + p.n, '| caixa negativo', p.neg + '/' + p.n);
if (SAIDA) { fs.writeFileSync(SAIDA, JSON.stringify({ quando: new Date().toISOString(), src: SRC, horas: HORAS, rivais: N_RIVAIS, pers: PERS || null, governo: GOVERNO, fimGoverno: GOVERNO === 'fim' ? FIM_GOV : null, partidas: todos }, null, 1)); console.log('gravado em', SAIDA); }
process.exitCode = comErro ? 1 : 0;

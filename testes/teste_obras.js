// Protótipo 19.4: equipe de obras, obras de comida da rival, facção zumbi e paz recente contra a coalizão.
// Uso: node testes/teste_obras.js [semente]
const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const G = new Function(src + 'return { geraRegiao, criaPartida, criaFaccao, fundaFaccao, escolhaRival, podeComecar, passoDaPartida, HORA, ativos, batalhoesDe, esquadroesDe, tamanhoDaEquipe, equipesDeObras, EQUIPE_OBRAS, contas, tomaEdificio, obrasRival, OBRAS, FAZENDA_NIVEL, POR_PLANTACAO, COMIDA, comidaDoPredio, ZONAS_DE_CAMPO, PERSONALIDADES, verificaZumbi, ZUMBI, horaDaEconomia, horaDaDiplomacia, rel, mudaEstado, apazigua, fimDoCessarFogo, COALIZAO, EXAUSTAO, fortificacaoDe, textoDoEngenheiroDeObras, basesDe, PRECO, SALARIO, totalEquipeDeObras, criaBatalhao, candidatosACmd, soltaPredioDoGoverno, eliminaFaccao, fortificacoes, entraNoEsquadrao, criaSoldado, SUPRIMENTO, tamanhoDoPredio, moveSoldado, novoEsquadrao };')();
const semente = process.argv[2] || 'B2';
let falhas = 0;
const confere = (nome, ok, detalhe) => { console.log((ok ? '  ok    ' : '  FALHOU ') + nome + (detalhe ? '  [' + detalhe + ']' : '')); if (!ok) falhas++; };

function novaPartida(sem, rivais) {
  const reg = G.geraRegiao(sem), P = G.criaPartida(reg);
  const eu = G.criaFaccao(1, 'Jogador', 0xf2b233, { jogador: true });
  const base = reg.edificios.filter(G.podeComecar).find(e => e.zona.tipo === 'vila') || reg.edificios.filter(G.podeComecar)[0];
  const sq = G.fundaFaccao(P, eu, base);
  const tom = [base], riv = [];
  for (let i = 0; i < (rivais || 0); i++) { const b = G.escolhaRival(reg, P.r, tom); if (!b) break; tom.push(b); const f = G.criaFaccao(2 + i, 'Rival ' + i, 0xff0000); G.fundaFaccao(P, f, b); riv.push(f); }
  const eventos = []; P.ouvintes.push((t, d) => eventos.push([t, d]));
  return { reg, P, eu, base, sq, riv, eventos };
}
const maisPerto = (lista, x, z) => lista.slice().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));

console.log('1) Tamanho da equipe de obras (semente ' + semente + ')');
{
  const t = n => G.tamanhoDaEquipe(n), esperado = [2, 2, 2, 2, 3, 3, 4, 4, 4, 4];
  const lista = esperado.map((_, n) => t(n));
  confere('2 com até 3 esquadrões, 3 com 4 e 5, 4 com 6 ou mais (máximo 4)', JSON.stringify(lista) === JSON.stringify(esperado), 'esquadrões 0..9: ' + lista.join(','));
  const { P, eu, riv } = novaPartida(semente, 2);
  const b = G.batalhoesDe(P, eu)[0];
  confere('o batalhão do jogador nasce com 2 engenheiros de obras', b.equipeObras.length === 2, b.equipeObras.length + ' engenheiros');
  confere('cada um custou o kit de explosivos ($ ' + G.PRECO.explosivo + '): caixa inicial 3000 → 2400', eu.recursos.dinheiro === 3000 - 2 * G.PRECO.explosivo, '$ ' + eu.recursos.dinheiro);
  const rb = G.batalhoesDe(P, riv[0])[0];
  confere('rival também: 2 engenheiros ao nascer o batalhão', rb && rb.equipeObras.length === 2, rb ? rb.equipeObras.length + '' : 'sem batalhão');
  confere('o governo antigo não tem equipe de obras', !(P.batalhoes || []).some(x => x.faccao === P.governo));
  const c = G.contas(P, eu);
  confere('o salário da equipe aparece nas contas ($ ' + G.SALARIO + '/h cada)', c.dinheiro.some(([r, v]) => /equipe de obras/i.test(r) && v === -2 * G.SALARIO), JSON.stringify(c.dinheiro.filter(([r]) => /equipe/i.test(r))));
  // sem dinheiro para o kit, não contrata; com dinheiro, completa
  const q2 = novaPartida(semente, 0), b2 = G.batalhoesDe(q2.P, q2.eu)[0];
  b2.equipeObras.length = 0; q2.eu.recursos.dinheiro = G.PRECO.explosivo - 1; G.equipesDeObras(q2.P, 1);
  confere('sem caixa para o kit ($ ' + (G.PRECO.explosivo - 1) + ') não contrata', b2.equipeObras.length === 0);
  q2.eu.recursos.dinheiro = 5000; G.equipesDeObras(q2.P, 1);
  confere('com caixa, volta a 2 engenheiros', b2.equipeObras.length === 2 && q2.eu.recursos.dinheiro === 5000 - 2 * G.PRECO.explosivo);
  // esquadrões a mais pedem mais gente
  for (let i = 0; i < 4; i++) { const s = G.criaSoldado(q2.P, q2.eu, 'fuzileiro'); const nq = G.moveSoldado(q2.P, s, 'novo'); nq.bat = b2; }
  const nEsq = G.esquadroesDe(q2.P, b2).length; q2.eu.recursos.dinheiro = 5000; G.equipesDeObras(q2.P, 1);
  confere('com ' + nEsq + ' esquadrões a equipe sobe para ' + G.tamanhoDaEquipe(nEsq), b2.equipeObras.length === G.tamanhoDaEquipe(nEsq), b2.equipeObras.length + ' engenheiros');
}

console.log('2) A equipe trabalha: bases primeiro, cada um num prédio, foge de tiro');
{
  const { reg, P, eu, base } = novaPartida(semente, 0);
  const b = G.batalhoesDe(P, eu)[0];
  const casas = maisPerto(reg.edificios.filter(e => e.tipo === 'casa' && !e.dono), base.x, base.z).slice(0, 3);
  for (const e of casas) G.tomaEdificio(P, e, eu);
  casas[0].dano = .5;   // um prédio danificado perto
  b.municao.suprimento = 200;
  const [u1, u2] = b.equipeObras;
  const iguais = []; let viuBase = false, tick = 0;
  for (; tick < 400; tick++) {
    P.tempo += 1; G.equipesDeObras(P, 1);
    if (u1.alvo && u1.alvo === u2.alvo) iguais.push(tick);
    if (u1.alvo === base || u2.alvo === base) viuBase = true;
  }
  confere('a base foi o primeiro destino', viuBase);
  confere('os dois nunca ficam no mesmo prédio', iguais.length === 0, iguais.length + ' segundos com o mesmo alvo');
  confere('a base chega a fortificação 100', G.fortificacaoDe(base) === 100, 'fortificação ' + G.fortificacaoDe(base));
  const gasto = 2 * 30 - (u1.suprimentos + u2.suprimentos), nasBases = b.municao.suprimento;
  confere('gastam suprimentos da mochila (15 por 100 de fortificação)', gasto >= 15 - 1e-6 || nasBases < 200, 'mochilas ' + (u1.suprimentos + u2.suprimentos).toFixed(1) + ', estoque ' + nasBases.toFixed(0));
  const fortOutros = casas.filter(e => G.fortificacaoDe(e) > 0 || !(e.dano > 0)).length;
  confere('o segundo engenheiro cuida de outros prédios (fronteira ou conserto)', fortOutros >= 1, 'prédios com obra: ' + fortOutros + '; dano da casa 1: ' + (casas[0].dano || 0).toFixed(2));
  confere('o texto da tela diz o que cada um faz', typeof G.textoDoEngenheiroDeObras(P, u1) === 'string' && G.textoDoEngenheiroDeObras(P, u1).length > 5, G.textoDoEngenheiroDeObras(P, u1) + ' | ' + G.textoDoEngenheiroDeObras(P, u2));
  // tiro: esquadrão do governo em combate colado ao engenheiro que trabalha
  const ativo = [u1, u2].find(u => u.estado === 'obra' || u.estado === 'indo');
  if (!ativo) { for (const e of casas) e.fortificado = 0; for (let i = 0; i < 20; i++) { P.tempo += 1; G.equipesDeObras(P, 1); } }
  const quem = [u1, u2].find(u => u.estado === 'obra' || u.estado === 'indo');
  confere('há um engenheiro trabalhando para o teste de tiro', !!quem, [u1.estado, u2.estado].join('/'));
  if (quem) {
    const gq = P.esquadroes.find(q => q.faccao === P.governo && G.ativos(q).length);
    const antes = { x: gq.x, z: gq.z, c: gq.combate, g: gq.guarda };
    gq.guarda = null; gq.estado = 'parado'; gq.x = quem.x + 30; gq.z = quem.z; gq.combate = true; for (const s of G.ativos(gq)) { s.x = quem.x + 30; s.z = quem.z; }
    P.tempo += 1; G.equipesDeObras(P, 1);
    confere('levou tiro (inimigo em combate a menos de ' + G.EQUIPE_OBRAS.raioTiro + ' m): foge para a base', quem.estado === 'foge', quem.estado);
    gq.combate = false; gq.x = antes.x; gq.z = antes.z; for (const s of G.ativos(gq)) { s.x = antes.x; s.z = antes.z; } gq.guarda = antes.g;
    for (let i = 0; i < 400; i++) { P.tempo += 1; G.equipesDeObras(P, 1); }
    confere('depois da fuga volta à base e retoma o trabalho', ['espera', 'indo', 'obra'].includes(quem.estado) && !!G.basesDe(P, eu).length, quem.estado);
  }
}

console.log('3) Obras de comida: valores novos e rival que constrói com caixa suficiente');
{
  const O = G.OBRAS;
  confere('custos: fazenda 800, armazém 600, plantação 400, melhorar II 1500 e III 3500',
    O.fazenda.custo === 800 && O.armazem.custo === 600 && O.plantacao.custo === 400 && O.melhorar.custo[1] === 1500 && O.melhorar.custo[2] === 3500,
    [O.fazenda.custo, O.armazem.custo, O.plantacao.custo, O.melhorar.custo.join('/')].join(' '));
  confere('produção: fazenda +30/h, armazém +10/h, plantação +8/h, níveis 1,8x e 2,8x',
    G.COMIDA.fazenda === 30 && G.COMIDA.armazem === 10 && G.POR_PLANTACAO === 8 && G.FAZENDA_NIVEL[1] === 1.8 && G.FAZENDA_NIVEL[2] === 2.8, [G.COMIDA.fazenda, G.COMIDA.armazem, G.POR_PLANTACAO, G.FAZENDA_NIVEL.join('/')].join(' '));
  const txtOk = /\+30/.test(O.fazenda.txt) && /\+10 de comida/.test(O.armazem.txt) && /\+8/.test(O.plantacao.txt) && /1,8x/.test(O.melhorar.txt) && /2,8x/.test(O.melhorar.txt);
  confere('os textos das obras mostram os números novos', txtOk);
  const reservas = { agressiva: 1000, oportunista: 700, defensiva: 500, comerciante: 300 };
  for (const [pers, reserva] of Object.entries(reservas)) {
    const monta = dinheiro => {
      const { reg, P, riv } = novaPartida(semente, 1), r = riv[0]; r.personalidade = pers;
      for (const e of reg.edificios.filter(e => e.tipo === 'casa' && !e.dono && G.ZONAS_DE_CAMPO.includes(e.zona.tipo)).slice(0, 3)) G.tomaEdificio(P, e, r);
      r.obras = []; r.recursos.dinheiro = dinheiro; G.obrasRival(P, r); return r;
    };
    const barato = G.OBRAS.armazem.custo + reserva, fazenda = G.OBRAS.fazenda.custo + reserva;
    const sem = monta(barato - 1), arm = monta(barato), faz = monta(fazenda);
    confere(pers + ' (reserva $ ' + reserva + '): abaixo de $ ' + barato + ' não constrói; com $ ' + barato + ' faz armazém; com $ ' + fazenda + ' faz fazenda',
      sem.obras.length === 0 && arm.obras.length >= 1 && arm.obras[0].tipo === 'armazem' && faz.obras.length >= 1 && faz.obras[0].tipo === 'fazenda' && faz.recursos.dinheiro === fazenda - G.OBRAS.fazenda.custo,
      'sem ' + sem.obras.length + ', ' + arm.obras.map(o => o.tipo) + ', ' + faz.obras.map(o => o.tipo) + ', caixa $ ' + faz.recursos.dinheiro);
  }
  {
    const mk = pers => { const { reg, P, riv } = novaPartida(semente, 1), r = riv[0]; r.personalidade = pers; r.obras = []; for (const e of reg.edificios.filter(e => e.tipo === 'casa' && !e.dono && G.ZONAS_DE_CAMPO.includes(e.zona.tipo)).slice(0, 4)) G.tomaEdificio(P, e, r); r.recursos.dinheiro = 20000; G.obrasRival(P, r); return r.obras.length; };
    const c = mk('comerciante'), a = mk('agressiva');
    confere('1 obra por vez (comerciante 2), sem precisar faltar comida', c === 2 && a === 1, 'comerciante ' + c + ', agressiva ' + a);
  }
}

console.log('4) Facção zumbi: menos de 5 prédios e caixa negativo por 12 h → se desfaz');
{
  const { reg, P, eu, riv, eventos } = novaPartida(semente, 2);
  const r = riv[0], tipos = () => eventos.map(([t]) => t);
  r.recursos.dinheiro = -200000;   // a economia horária continua somando contas; o caixa fica negativo
  const predios = () => reg.edificios.filter(e => e.dono === r).length;
  confere('a rival começa com menos de 5 prédios (' + predios() + ')', predios() < G.ZUMBI.predios);
  let horas = 0, caiu = -1;
  for (let i = 1; i <= 14 && !r.eliminada; i++) { P.tempo += G.HORA; G.horaDaEconomia(P); horas = i; if (r.eliminada) caiu = i; }
  confere('a contagem começa na 1ª hora e a facção se desfaz 12 h depois (na hora 13 da checagem)', r.eliminada && caiu === 13, 'eliminada na hora ' + caiu);
  confere('os prédios ficam sem dono e os soldados desertam', predios() === 0 && !P.soldados.some(s => s.faccao === r && ['ok', 'ferido', 'reserva'].includes(s.vida)));
  confere('avisos: contagem começou e 1 h antes do fim', eventos.some(([t, d]) => t === 'zumbi' && d.fac === r) && eventos.some(([t, d]) => t === 'zumbifim' && d.fac === r), tipos().filter(t => t.startsWith('zumbi')).join(','));
  // recupera antes de 12 h: a contagem zera
  const r1 = riv[1]; r1.recursos.dinheiro = -200000;
  for (let i = 0; i < 6; i++) { P.tempo += G.HORA; G.verificaZumbi(P, r1); }
  const contando = r1.zumbiDesde != null; r1.recursos.dinheiro = 50; P.tempo += G.HORA; G.verificaZumbi(P, r1);
  confere('caixa positivo antes das 12 h cancela a contagem', contando && r1.zumbiDesde == null && !r1.eliminada);
  for (let i = 0; i < 20; i++) { P.tempo += G.HORA; G.verificaZumbi(P, P.governo); }
  confere('não vale para o governo antigo', !P.governo.eliminada);
  // 5 prédios ou mais, mesmo com caixa negativo, não conta
  const r2 = riv[1]; for (const e of maisPerto(reg.edificios.filter(e => !e.dono), r2.base.x, r2.base.z).slice(0, 5)) G.tomaEdificio(P, e, r2);
  r2.recursos.dinheiro = -5000; for (let i = 0; i < 20; i++) { P.tempo += G.HORA; G.verificaZumbi(P, r2); }
  confere('com 5 prédios ou mais não se desfaz, mesmo no vermelho', !r2.eliminada && r2.zumbiDesde == null);
  // o jogador também: derrota
  const q = novaPartida(semente, 2), evJ = q.eventos; q.eu.recursos.dinheiro = -9999;
  for (let i = 0; i < 14 && !q.eu.eliminada; i++) { q.P.tempo += G.HORA; G.verificaZumbi(q.P, q.eu); }
  confere('vale para o jogador: avisa no começo, 1 h antes e dá derrota', q.eu.eliminada && ['zumbi', 'zumbifim', 'derrota'].every(t => evJ.some(([x]) => x === t)), evJ.map(([t]) => t).filter(t => /zumbi|derrota|eliminada/.test(t)).join(','));
}

console.log('5) Paz recente de 24 h vale também contra a coalizão');
{
  const { P, eu, riv } = novaPartida(semente, 3);
  const [a, b, alvo] = riv;
  const prepara = pazHoras => {
    P.coalizao = { alvo, desde: P.tempo };   // coalizão formada agora: fica 12 h
    const r = G.rel(P, a, alvo); r.estado = 'neutro'; r.valor = -80; r.pazAte = pazHoras ? P.tempo + pazHoras * G.HORA : 0;
    a.personalidade = 'agressiva'; a.exaustao = 0;
    return r;
  };
  let r = prepara(24);
  P.tempo += 1; G.horaDaDiplomacia(P);
  confere('dentro das 24 h de paz a coalizão não declara guerra (relação ' + Math.round(r.valor) + ')', G.rel(P, a, alvo).estado !== 'guerra', G.rel(P, a, alvo).estado);
  r = prepara(0);
  P.tempo += 1; G.horaDaDiplomacia(P);
  confere('sem paz recente, a mesma situação leva à guerra (controle)', G.rel(P, a, alvo).estado === 'guerra', G.rel(P, a, alvo).estado);
  // paz que veio de cessar-fogo também protege
  const r2 = G.rel(P, b, alvo); r2.estado = 'cessarfogo'; r2.fimCessar = P.tempo; r2.exCessar = 40; G.fimDoCessarFogo(P, b, alvo);
  confere('depois do cessar-fogo que vira paz, pazAte fica 24 h à frente', r2.estado === 'neutro' && Math.abs(r2.pazAte - (P.tempo + G.EXAUSTAO.pazHoras * G.HORA)) < 1e-6, r2.estado + ', faltam ' + ((r2.pazAte - P.tempo) / G.HORA).toFixed(1) + ' h');
  P.coalizao = { alvo, desde: P.tempo }; r2.valor = -80; b.personalidade = 'agressiva';
  P.tempo += 1; G.horaDaDiplomacia(P);
  confere('e a coalizão também respeita essa paz', G.rel(P, b, alvo).estado !== 'guerra', G.rel(P, b, alvo).estado);
  P.coalizao = { alvo, desde: P.tempo }; P.tempo += 25 * G.HORA; r2.valor = -80; G.rel(P, b, alvo).estado = 'neutro';
  P.coalizao.desde = P.tempo; G.horaDaDiplomacia(P);
  confere('passadas as 24 h ela volta a poder declarar', G.rel(P, b, alvo).estado === 'guerra', G.rel(P, b, alvo).estado);
}

console.log('6) Determinismo: mesma semente, mesma equipe de obras');
{
  const roda = () => {
    const { P, eu, riv } = novaPartida(semente, 2); P.velocidade = 20;
    for (let i = 0; i < 600; i++) G.passoDaPartida(P, .1);
    return JSON.stringify(P.batalhoes.map(b => [b.faccao.nome, (b.equipeObras || []).map(u => [u.estado, Math.round(u.x), Math.round(u.z), +u.suprimentos.toFixed(2)])])) + '|' + P.faccoes.map(f => f.recursos ? Math.round(f.recursos.dinheiro) : 0).join(',');
  };
  const a = roda(), b = roda();
  confere('duas rodadas de 10 min do jogo (velocidade 20) dão o mesmo resultado', a === b, a.slice(0, 120));
}

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\ntudo certo');
process.exit(falhas ? 1 : 0);

const fs = require('fs');
const src = require('./arquivos.js').map(f => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const fn = new Function(src + '\nreturn { geraRegiao, alturaEm, xDoRio, raioVelha, METADE, MUNDO, declive, escolhaRival };');
const G = fn();
const sd = process.argv[2] || 'A';
const t0 = Date.now(); const reg = G.geraRegiao(sd); const dt = Date.now() - t0;
const cnt = {}; reg.edificios.forEach(e => cnt[e.tipo] = (cnt[e.tipo] || 0) + 1);
const vt = {}; reg.vias.forEach(v => vt[v.tipo] = (vt[v.tipo] || 0) + 1);
const at = {}; reg.arvores.forEach(v => at[v.tipo] = (at[v.tipo] || 0) + 1);
console.log(sd, dt + 'ms', 'edif', reg.edificios.length, JSON.stringify(cnt));
console.log(' vias', JSON.stringify(vt), 'campos', reg.campos.length, 'arv', JSON.stringify(at));
console.log(' lugares', reg.lugares.map(l => l.nome + ' (' + l.sig + ')').join(' | '), '| bairros', reg.bairros.map(b => b.tipo).join(','));
if (process.argv[3]) {
  const out = { H: Array.from(reg.H), L: reg.L, rio: [], ed: reg.edificios.map(e => [e.tipo, +e.x.toFixed(1), +e.z.toFixed(1), +e.a.toFixed(3), +e.w.toFixed(1), +e.d.toFixed(1)]),
    vias: reg.vias.map(v => [v.tipo, v.larg, v.pts.map(p => [+p[0].toFixed(1), +p[1].toFixed(1)])]),
    campos: reg.campos.map(c => [c.tipo, c.cor, c.o.x, c.o.z, c.o.a, c.o.hw * 2, c.o.hd * 2]),
    arv: reg.arvores.map(a => [a.tipo, +a.x.toFixed(1), +a.z.toFixed(1)]), cem: reg.cemiterios.map(c => [c.x, c.z, c.a, c.hw * 2, c.hd * 2]),
    larg: reg.rio.larg, lugares: reg.lugares.map(l => [l.nome, l.x, l.z]) };
  for (let z = -1400; z <= 1400; z += 10) out.rio.push([G.xDoRio(reg, z), z]);
  out.velha = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * 6.2832; out.velha.push([Math.cos(a) * G.raioVelha(reg, a), Math.sin(a) * G.raioVelha(reg, a)]); }
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
}

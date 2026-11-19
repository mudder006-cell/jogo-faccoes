"use strict";
/* ============================================================
   CATÁLOGO: NÍVEIS DE ARMA E MUNIÇÃO
   - Arma básica: fuzil. Suporte: metralhadora (AR), lança-granadas e RPG (AT).
     Kits: kit médico e explosivos do engenheiro.
   - Cada arma e kit tem nível 1, 2 e 3: mais precisão e dano (ou kit melhor).
     Nível 2 custa 4x o nível 1; nível 3, 15x.
   - Munição em 4 tipos: balas (fuzil), cintas (AR), granadas e foguetes (RPG).
     Cada soldado carrega a sua; recarrega numa base, do estoque da facção.
     O governo antigo não compra munição: o que os soldados levam é o que tem.
   No arsenal, o nível 1 usa o nome da arma ("fuzil") e os outros "fuzil_2", "fuzil_3".
   Caixas de munição à venda: "cx-bala", "cx-cinta", "cx-granada", "cx-foguete".
   (Números provisórios.)
   ============================================================ */
const NIVEL = {
  preco: [1, 4, 15], precisao: [1, 1.2, 1.45], dano: [1, 1.2, 1.4], area: [1, 1.1, 1.2], pontos: [1, 3, 8],
  kitUsos: [3, 5, 8], kitLeve: [.6, .72, .85], fortificaHoras: [2, 1.4, 1], romano: ["I", "II", "III"]
};
const BASES_ARMA = ["fuzil", "metralhadora", "lancagranadas", "rpg", "kit", "explosivo"];
const CATEGORIA = { fuzil: "Básica", metralhadora: "Suporte", lancagranadas: "Suporte", rpg: "Suporte", kit: "Kits", explosivo: "Kits" };
const MUNICAO_DA = { fuzil: "bala", metralhadora: "cinta", lancagranadas: "granada", rpg: "foguete" };
const MUNICOES = {
  bala:    { n: "Balas de fuzil", curto: "Balas", carga: 120, caixa: 100, icone: "bullet" },
  cinta:   { n: "Cintas da AR", curto: "Cintas", carga: 400, caixa: 200, icone: "ammunition" },
  granada: { n: "Granadas", curto: "Granadas", carga: 8, caixa: 6, icone: "bomb" },
  foguete: { n: "Foguetes de RPG", curto: "Foguetes", carga: 4, caixa: 3, icone: "rocket" }
};
const MUNICAO_INICIAL = { bala: 600, cinta: 0, granada: 0, foguete: 0 };
const CARGA_GOVERNO = 1.5;      // soldados do governo levam 50% a mais, mas nunca recarregam
const POUCA_MUNICAO = .15;      // abaixo disso o soldado conta como "sem munição" para voltar à base

const chave = (b, n) => (n > 1 ? b + "_" + n : b);
const baseDe = k => k.split("_")[0];
const nivelDe = k => +(k.split("_")[1] || 1);
const ehCaixa = k => k.startsWith("cx-");
const tipoDaCaixa = k => k.slice(3);

function criaArsenal() { const a = {}; for (const b of BASES_ARMA) for (const n of [1, 2, 3]) a[chave(b, n)] = 0; return a; }
function noArsenal(fac, b) { return [1, 2, 3].reduce((t, n) => t + (fac.arsenal[chave(b, n)] || 0), 0); }
function melhorNivel(fac, b) { for (const n of [3, 2, 1]) if ((fac.arsenal[chave(b, n)] || 0) > 0) return n; return 0; }
function textoArsenal(a) {
  const l = [];
  for (const [k, n] of Object.entries(a)) if (n > 0) l.push(n + " " + nomeMin(k));
  return l.length ? l.join(" · ") : "vazio";
}
function nomeItem(k) {
  if (ehCaixa(k)) { const m = MUNICOES[tipoDaCaixa(k)]; return "Caixa de " + m.curto.toLowerCase() + " (" + m.caixa + ")"; }
  const b = baseDe(k), n = nivelDe(k);
  if (b === "veiculo") return VEICULOS[n - 1].n;
  const nome = ARMAS[b] ? ARMAS[b].n : ITENS[b];
  return n > 1 ? nome + " " + NIVEL.romano[n - 1] : nome;
}
/* nome em minúsculas, mas com o nível em algarismo romano: "fuzil II" */
function nomeMin(k) { const t = nomeItem(k), m = t.match(/^(.*?)( I{1,3})$/); return m ? m[1].toLowerCase() + m[2] : t.toLowerCase(); }
const cargaDe = s => (s.arma ? MUNICOES[MUNICAO_DA[s.arma]].carga * (s.faccao.governo ? CARGA_GOVERNO : 1) : 0);

/* põe no arsenal (ou no estoque de munição) o que chegou */
function guarda(fac, k, n) {
  if (baseDe(k) === "veiculo") { for (let i = 0; i < n; i++) novoVeiculo(fac, nivelDe(k)); return; }
  if (ehCaixa(k)) fac.municao[tipoDaCaixa(k)] += MUNICOES[tipoDaCaixa(k)].caixa * n;
  else fac.arsenal[k] = (fac.arsenal[k] || 0) + n;
}
/* devolve ao arsenal a arma (e a munição que sobrou) ou o kit do soldado */
function devolveArma(fac, s) {
  if (!s.arma) return;
  fac.arsenal[chave(s.arma, s.nivel || 1)]++;
  if (fac.municao && s.municao > 0) fac.municao[MUNICAO_DA[s.arma]] += Math.floor(s.municao);
  s.arma = null; s.nivel = 1; s.municao = 0;
}
function devolveItem(fac, s) { if (!s.item) return; fac.arsenal[chave(s.item, s.nivelItem || 1)]++; s.item = null; s.nivelItem = 1; s.usosKit = null; }

function poucaMunicao(sq) { return ativos(sq).filter(s => s.arma && s.municao < cargaDe(s) * POUCA_MUNICAO).length; }
/* vale a pena ir recarregar? (metade ou mais sem munição e tem estoque para eles) */
function precisaRecarregar(sq, P) {
  if (!sq.faccao.municao) return false;
  const l = ativos(sq).filter(s => s.arma && s.municao < cargaDe(s) * POUCA_MUNICAO);
  if (!l.length || l.length < Math.ceil(ativos(sq).length / 2)) return false;
  if (organizada(sq.faccao) && P) return !!baseParaRecarregar(P, sq);
  return l.some(s => sq.faccao.municao[MUNICAO_DA[s.arma]] > 0);
}
function municaoMedia(sq) { const l = ativos(sq).filter(s => s.arma); return l.length ? l.reduce((t, s) => t + Math.min(1, s.municao / cargaDe(s)), 0) / l.length : 1; }

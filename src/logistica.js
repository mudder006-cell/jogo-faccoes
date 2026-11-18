"use strict";
/* ============================================================
   BASES E PEDIDOS DE TROCA
   Mudar a função (e a arma) de um soldado ou passá-lo para outro
   esquadrão não acontece na hora: vira um pedido. O soldado avisa o
   líder e, assim que sai do combate, o esquadrão vai até a base mais
   perto, faz as trocas e volta à missão.
   - Bases: o QG e as casas de líder de clã que são suas (bases avançadas).
     Todas usam o mesmo arsenal do QG.
   - Transferência: o soldado vai com o esquadrão dele até uma base e fica
     esperando lá; o esquadrão de destino passa para buscar.
   - Nomear líder é na hora (não precisa de base).
   ============================================================ */
function basesDe(P, fac) {
  const l = fac.base ? [fac.base] : [];
  for (const e of P.reg.edificios) if (e.tipo === "lider" && e.dono === fac && e !== fac.base) l.push(e);
  return l;
}
function baseEm(P, fac, x, z) { return basesDe(P, fac).find(b => Math.hypot(b.x - x, b.z - z) < DISTANCIA_PARA_TROCAR) || null; }
function pertoDeBase(P, fac, sq) { const [x, z] = centroDoEsquadrao(sq); return baseEm(P, fac, x, z); }
function baseMaisPerto(P, fac, x, z) {
  let m = null, md = Infinity;
  for (const b of basesDe(P, fac)) { const d = Math.hypot(b.x - x, b.z - z); if (d < md) { md = d; m = b; } }
  return m;
}
const ondeEspera = s => s.esperaEm && s.esperaEm.dono === s.faccao ? s.esperaEm : s.faccao.base;
const nomeBase = (P, b) => b === b.dono.base ? "QG" : "base de " + b.zona.nome;

/* motivo para não poder trocar de função (só o arsenal; o lugar é a base) */
function motivoFuncao(P, s, funcao) {
  const f = FUNCOES[funcao], fac = estoqueDe(s);
  if (s.vida !== "ok" && s.vida !== "reserva") return "fora de combate";
  if (funcao === "lider") return !s.sq ? "precisa estar num esquadrão" : !podeLiderar(s) ? "precisa ser Veterano ou ter liderança " + LIDERANCA_PARA_LIDERAR : null;
  const tem = k => s.faccao.jogador ? !!baseComItem(P, s, k) : noArsenal(fac, k) > 0;
  if (f.arma !== s.arma && !tem(f.arma)) return "sem " + ARMAS[f.arma].n.toLowerCase() + " em nenhuma base";
  if (f.item && f.item !== s.item && !tem(f.item)) return "sem " + ITENS[f.item].toLowerCase() + " em nenhuma base";
  return null;
}

/* ---------- pedidos ---------- */
function pedeFuncao(P, s, funcao) {
  if (motivoFuncao(P, s, funcao)) return false;
  if (funcao === "lider") { trocaFuncao(P, s, "lider"); return true; }
  if (s.funcao === funcao && !(s.pedido && s.pedido.tipo === "funcao")) return false;
  s.pedido = s.funcao === funcao ? null : { tipo: "funcao", funcao };
  if (s.vida === "reserva" && s.pedido) { trocaFuncao(P, s, funcao); s.pedido = null; avisa(P, "trocou", { s, funcao, base: ondeEspera(s) }); return true; }
  if (s.pedido) avisa(P, "pedidotroca", { s, funcao });
  return true;
}
/* esquadrão novo precisa de líder: ou ele pode comandar, ou alguém do mesmo grupo que pode já pediu para ir ao novo */
function podeIrParaNovo(P, s) {
  if (podeLiderar(s)) return true;
  const grupo = s.sq ? ativos(s.sq) : s.faccao.reserva.filter(o => ondeEspera(o) === ondeEspera(s));
  return grupo.some(o => o !== s && o.pedido && o.pedido.destino === "novo" && podeLiderar(o));
}
function pedeTransferencia(P, s, destino) {
  if (destino === s.sq) { s.pedido = null; return false; }
  if (destino === "novo" && !podeIrParaNovo(P, s)) return false;
  s.pedido = { tipo: "transferir", destino };
  if (s.vida === "reserva" && destino === "novo") {   // já está na base: forma o esquadrão ali
    const base = ondeEspera(s); s.pedido = null;
    const sq = moveSoldado(P, s, "novo"); sq.x = base.x; sq.z = base.z; sq.manual = true; posicionaNoLugar(P, sq);
    return true;
  }
  avisa(P, "pedidotransfer", { s, destino });
  return true;
}
function cancelaPedido(s) { s.pedido = null; }

/* quem tem pedido no esquadrão, e quem está esperando numa base para entrar nele */
function pendencias(P, sq) {
  const proprios = ativos(sq).filter(s => s.pedido);
  const buscar = (sq.faccao.reserva || []).filter(s => s.pedido && s.pedido.destino === sq);
  return { proprios, buscar };
}

/* chamado na decisão do esquadrão (jogador). Devolve true se está cuidando de trocas. */
function logistica(P, sq) {
  if (!ativos(sq).length || sq.combate) return false;
  const fac = sq.faccao, { proprios, buscar } = pendencias(P, sq);
  if (!proprios.length && !buscar.length) { sq.indoABase = null; return false; }
  const aqui = pertoDeBase(P, fac, sq);
  if (aqui) {
    aplicaNaBase(P, sq, aqui);
    const resto = pendencias(P, sq);
    if (!resto.proprios.length && !resto.buscar.length) { sq.indoABase = null; return false; }
  }
  // para onde ir: com pedidos próprios, a base mais perto; só para buscar, onde o soldado espera
  const [x, z] = centroDoEsquadrao(sq);
  let alvo;
  const r = pendencias(P, sq);
  if (r.proprios.length) {
    // troca de função: vai à base que tem a arma ou o kit; o resto, à base mais perto
    const pf = r.proprios.find(s => s.pedido && s.pedido.tipo === "funcao");
    const f = pf && FUNCOES[pf.pedido.funcao], precisa = f && (f.arma !== pf.arma ? f.arma : f.item && f.item !== pf.item ? f.item : null);
    alvo = (precisa && baseComItem(P, pf, precisa)) || baseMaisPerto(P, fac, x, z);
  }
  else alvo = r.buscar.map(ondeEspera).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  if (!alvo) return false;
  if (sq.estado === "andando" && sq.indoABase === alvo) return true;
  const mm = sq.missao; ordenaPredio(P, sq, alvo, "defesa"); sq.missao = mm;
  if (sq.indoABase !== alvo) avisa(P, "vaibase", { sq, base: alvo });
  sq.indoABase = alvo;
  return true;
}

function aplicaNaBase(P, sq, base) {
  const fac = sq.faccao, novos = [];
  for (const s of ativos(sq).filter(s => s.pedido)) {
    const p = s.pedido;
    if (p.tipo === "funcao") {
      const m = motivoFuncao(P, s, p.funcao); s.pedido = null;
      if (m) avisa(P, "semtroca", { s, motivo: m });
      else { trocaFuncao(P, s, p.funcao); anota(P, s, "Virou " + FUNCOES[p.funcao].n.toLowerCase() + " na " + nomeBase(P, base)); avisa(P, "trocou", { s, funcao: p.funcao, base }); }
    } else if (p.tipo === "comandar") {
      s.pedido = null;
      if (batalhoesDe(P, fac).length < limiteBatalhoes(P, fac) && podeLiderar(s)) criaBatalhao(P, fac, s, base);
      continue;
    } else if (p.tipo === "transferir") {
      if (p.destino === "novo") { novos.push(s); continue; }
      if (p.destino === "bat") {   // muda de batalhão: fica na base esperando o novo batalhão
        s.pedido = null; sq.membros = sq.membros.filter(m => m !== s); s.sqAntes = sq; s.sq = null;
        s.vida = "reserva"; s.esperaEm = base; s.x = base.x; s.z = base.z; s.bat = p.bat; fac.reserva.push(s);
        if (sq.lider === s) escolheLider(P, sq);
        avisa(P, "mudoubatalhao", { s, b: p.bat });
        continue;
      }
      if (!p.destino.membros || !ativos(p.destino).length && p.destino.membros.every(m => m.vida === "morto")) { s.pedido = null; continue; }
      if (pertoDeBase(P, fac, p.destino) === base && !p.destino.combate) { s.pedido = null; moveSoldado(P, s, p.destino); avisa(P, "transferido", { s, sq: p.destino }); continue; }
      // fica esperando na base
      sq.membros = sq.membros.filter(m => m !== s); s.sqAntes = sq; s.sq = null;
      s.vida = "reserva"; s.esperaEm = base; s.x = base.x; s.z = base.z; fac.reserva.push(s);
      if (sq.lider === s) escolheLider(P, sq);
      anota(P, s, "Ficou na " + nomeBase(P, base) + " esperando " + p.destino.nome);
      avisa(P, "esperando", { s, sq: p.destino, base });
    }
  }
  if (novos.length) {
    novos.forEach(s => s.pedido = null);
    const chefe = novos.filter(podeLiderar).sort((a, b) => b.atr.lideranca - a.atr.lideranca)[0];
    if (!chefe) { avisa(P, "semlider", { sq }); return; }   // sem quem comande, ninguém sai
    const dest = moveSoldado(P, chefe, "novo");
    for (const s of novos) if (s !== chefe) moveSoldado(P, s, dest);
    dest.lider = chefe; anota(P, chefe, "Assumiu o comando de " + dest.nome);
    dest.x = base.x; dest.z = base.z; dest.manual = true; posicionaNoLugar(P, dest);
    avisa(P, "novoesquadrao", { sq: dest, base, de: sq });
  }
  // buscar quem espera aqui
  for (const s of (fac.reserva || []).slice()) {
    if (!s.pedido || s.pedido.destino !== sq || ondeEspera(s) !== base) continue;
    s.pedido = null; moveSoldado(P, s, sq);
    anota(P, s, "Entrou em " + sq.nome + " na " + nomeBase(P, base));
    avisa(P, "transferido", { s, sq });
  }
}

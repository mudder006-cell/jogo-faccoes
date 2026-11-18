"use strict";
/* ============================================================
   VEÍCULOS DE LOGÍSTICA
   Levam armas, kits e munição entre as bases. Nível I, II e III:
   quanto maior, mais carga e mais vida. Cada um é pilotado por um
   soldado do batalhão a que está atribuído; o líder decide as viagens:
   1) do QG para a base do líder (o que falta para o mínimo do batalhão);
   2) da base do líder para as bases avançadas perto dos esquadrões.
   No caminho podem ser atacados: destruído, a carga fica com quem
   destruiu; com o motorista morto, quem chegar perto leva o veículo.
   As rivais também mandam comboios do QG para a frente delas.
   (Números provisórios.)
   ============================================================ */
const VEICULOS = [
  { n: "Picape", carga: 12, vida: 120, vel: 9 },
  { n: "Caminhão", carga: 26, vida: 260, vel: 8 },
  { n: "Caminhão blindado", carga: 45, vida: 520, vel: 7 }
];
const ESPACO = { metralhadora: 2, lancagranadas: 2, rpg: 2 };   // o resto ocupa 1; cada caixa de munição ocupa 1
const LOGISTICA = {
  pensa: 3, alcanceTiro: 170, acerto: .35, dano: { fuzil: 6, metralhadora: 9, lancagranadas: 30, rpg: 90 },
  motorista: .04, motoristaRpg: .25, capturaPerto: 40, avancadaRaio: 700, guardaRota: 6 * HORA,
  rival: { aCada: [3, 6], alcance: 1200 }
};
let ultimoVeiculo = 0;
const capacidade = v => VEICULOS[v.nivel - 1].carga;
const espacoDe = k => ESPACO[baseDe(k)] || 1;
function volumeCarga(c) {
  let v = 0;
  for (const [k, n] of Object.entries(c.arsenal)) v += (n || 0) * espacoDe(k);
  for (const t of Object.keys(c.municao)) v += Math.ceil(c.municao[t] / MUNICOES[t].caixa);
  return v;
}
const cargaVazia = c => volumeCarga(c) === 0;
function textoCarga(c) {
  const l = [];
  for (const t of Object.keys(c.municao)) if (c.municao[t]) l.push(c.municao[t] + " " + MUNICOES[t].curto.toLowerCase());
  for (const [k, n] of Object.entries(c.arsenal)) if (n) l.push(n + " " + nomeMin(k));
  return l.join(", ") || "vazio";
}

function novoVeiculo(fac, nivel) {
  const b = fac.base;
  const v = { id: ++ultimoVeiculo, nivel, faccao: fac, bat: null, motorista: null, x: b ? entradaDe(b)[0] : 0, z: b ? entradaDe(b)[1] : 0, rumo: 0,
    em: b || null, estado: "parado", carga: criaEstoque(), vida: VEICULOS[nivel - 1].vida, plano: null, rota: null, i: 0, danoDe: new Map(), proxima: 0 };
  (fac.veiculos || (fac.veiculos = [])).push(v);
  return v;
}

/* ---------- carga ---------- */
function carrega(v, de, quer) {   // quer: { "fuzil": armas, "cx-bala": balas (unidades) }
  for (const [k, q] of Object.entries(quer)) {
    let livre = capacidade(v) - volumeCarga(v.carga); if (livre <= 0 || q <= 0) continue;
    if (ehCaixa(k)) {
      const t = tipoDaCaixa(k), cx = MUNICOES[t].caixa, ja = v.carga.municao[t];
      const p = Math.min(q, de.municao[t], livre * cx + (ja % cx ? cx - ja % cx : 0));
      if (p > 0) { de.municao[t] -= p; v.carga.municao[t] += p; }
    } else {
      let n = 0;
      while (n < q && livre >= espacoDe(k)) { const nv = melhorNivel(de, k); if (!nv) break; de.arsenal[chave(k, nv)]--; v.carga.arsenal[chave(k, nv)] = (v.carga.arsenal[chave(k, nv)] || 0) + 1; n++; livre -= espacoDe(k); }
    }
  }
}
function descarrega(v, para) {
  for (const [k, n] of Object.entries(v.carga.arsenal)) if (n) { para.arsenal[k] = (para.arsenal[k] || 0) + n; v.carga.arsenal[k] = 0; }
  for (const t of Object.keys(v.carga.municao)) { para.municao[t] += v.carga.municao[t]; v.carga.municao[t] = 0; }
}
const temAlgo = (de, quer) => Object.entries(quer).some(([k, q]) => q > 0 && (ehCaixa(k) ? de.municao[tipoDaCaixa(k)] > 0 : noArsenal(de, k) > 0));

/* ---------- motorista ---------- */
function pegaMotorista(P, v) {
  const b = v.bat, fac = v.faccao;
  const cands = (fac.reserva || []).filter(s => s.bat === b && s.vida === "reserva" && !s.pedido);
  for (const sq of esquadroesDe(P, b)) if (!sq.combate && ativos(sq).length > 3) for (const s of ativos(sq)) if (s !== sq.lider && s.funcao === "fuzileiro" && !s.pedido) cands.push(s);
  if (!cands.length) { if (!v.avisouMotorista) { v.avisouMotorista = true; avisa(P, "semmotorista", { v }); } return; }
  const s = cands.sort((a, c) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(c.x - v.x, c.z - v.z))[0];
  if (s.sq) { const sq = s.sq; sq.membros = sq.membros.filter(m => m !== s); s.sqAntes = sq; s.sq = null; if (sq.lider === s) escolheLider(P, sq); }
  fac.reserva = (fac.reserva || []).filter(o => o !== s);
  v.motoristaChega = P.tempo + Math.hypot(s.x - v.x, s.z - v.z) / VELOCIDADE_A_PE;
  s.vida = "motorista"; s.veiculo = v; s.dentro = null; v.motorista = s; v.avisouMotorista = false;
  anota(P, s, "Virou motorista de " + VEICULOS[v.nivel - 1].n.toLowerCase());
  avisa(P, "motorista", { v, s });
}
function soltaMotorista(P, v) {
  const s = v.motorista; v.motorista = null; if (!s || s.vida !== "motorista") return;
  const base = baseMaisPerto(P, s.faccao, v.x, v.z) || s.faccao.base;
  s.veiculo = null; s.vida = "reserva"; s.esperaEm = base; if (base) { s.x = base.x; s.z = base.z; } s.faccao.reserva.push(s);
}
function atribuiVeiculo(P, v, b) {
  if (v.bat === b) return;
  if (v.motorista && (!b || v.motorista.bat !== b)) soltaMotorista(P, v);
  v.bat = b || null; if (!v.rota) { v.plano = null; if (v.estado !== "abandonado") v.estado = "parado"; }
}

/* ---------- planos de viagem (o líder do batalhão decide) ---------- */
function querDoBatalhao(P, b) { const q = {}; for (const { k, falta } of faltaNoBatalhao(P, b)) if (k !== "soldados") q[k] = falta - (aCaminhoDe(b.faccao, b.base, k)); return q; }
function aCaminhoDe(fac, base, k) {
  let n = 0;
  for (const v of fac.veiculos || []) if (v.plano && v.plano.para === base) n += ehCaixa(k) ? v.carga.municao[tipoDaCaixa(k)] : noArsenal(v.carga, k);
  return n;
}
/* bases avançadas perto dos esquadrões do batalhão: quanto falta para uma recarga completa de cada um */
function necessidadeAvancadas(P, b) {
  const fac = b.faccao, m = new Map();
  for (const sq of esquadroesDe(P, b)) {
    const [x, z] = centroDoEsquadrao(sq), base = baseMaisPerto(P, fac, x, z);
    if (!base || base === b.base || base === fac.base || Math.hypot(base.x - x, base.z - z) > LOGISTICA.avancadaRaio) continue;
    const q = m.get(base) || {};
    for (const s of ativos(sq)) if (s.arma) { const k = "cx-" + MUNICAO_DA[s.arma]; q[k] = (q[k] || 0) + cargaDe(s); }
    m.set(base, q);
  }
  for (const [base, q] of m) { const est = estoqueDaBase(base); for (const k of Object.keys(q)) q[k] = Math.max(0, q[k] - est.municao[tipoDaCaixa(k)] - aCaminhoDe(fac, base, k)); }
  return m;
}
/* vale a viagem? leva pelo menos 1/4 da capacidade, ou o destino está com menos da metade do que precisa */
function valeViagem(v, de, quer, urgente) {
  let vol = 0;
  for (const [k, q] of Object.entries(quer)) {
    if (q <= 0) continue;
    if (ehCaixa(k)) vol += Math.ceil(Math.min(q, de.municao[tipoDaCaixa(k)]) / MUNICOES[tipoDaCaixa(k)].caixa);
    else vol += Math.min(q, noArsenal(de, k)) * espacoDe(k);
  }
  return vol > 0 && (urgente || vol >= Math.max(2, capacidade(v) * .25));
}
function planejaViagem(P, v) {
  const b = v.bat, fac = v.faccao; if (!b || !b.base) return;
  if (!cargaVazia(v.carga)) { if (v.em !== b.base) vaiPlano(P, v, { de: null, para: b.base }); else { descarrega(v, b); } return; }
  if (b.base !== fac.base) {
    const q = querDoBatalhao(P, b), urg = Object.keys(q).some(k => (b.minimo[k] || 0) && estoqueDoBatalhao(b, k) < b.minimo[k] / 2);
    if (valeViagem(v, fac, q, urg)) return vaiPlano(P, v, { de: fac.base, deEst: fac, para: b.base, quer: q, motivo: "abastecer" });
  }
  for (const [base, q] of necessidadeAvancadas(P, b)) {
    const est = estoqueDaBase(base), urg = Object.keys(q).some(k => est.municao[tipoDaCaixa(k)] === 0);
    if (valeViagem(v, b, q, urg)) return vaiPlano(P, v, { de: b.base, deEst: b, para: base, quer: q, motivo: "avancada" });
  }
}
function vaiPlano(P, v, pl) {
  v.plano = pl;
  if (pl.de && v.em !== pl.de) { v.estado = "buscando"; rotaVeiculo(P, v, pl.de); return; }
  if (pl.de) carrega(v, pl.deEst, pl.quer);
  if (cargaVazia(v.carga)) { v.plano = null; return; }
  v.estado = "levando"; rotaVeiculo(P, v, pl.para);
  if (v.faccao.jogador) avisa(P, "viagem", { v });
}
function rotaVeiculo(P, v, e) {
  const [x, z] = entradaDe(e);
  v.rota = rotaPelasRuas(P.reg, v.x, v.z, x, z, guarnicoesInimigas(P, v.faccao)); v.i = 0; v.em = null;
  (P.rotasLog || (P.rotasLog = [])).push({ fac: v.faccao, pts: v.rota, ate: P.tempo + LOGISTICA.guardaRota });
}
function chegouVeiculo(P, v) {
  const pl = v.plano, fac = v.faccao;
  if (!pl) { v.estado = "parado"; return; }
  if (v.estado === "buscando") {
    v.em = pl.de; v.estado = "parado";
    if (pl.de.dono !== fac) { v.plano = null; return; }
    vaiPlano(P, v, Object.assign({}, pl, { de: pl.de }));
    return;
  }
  if (v.estado === "voltando") { v.em = pl.para; v.estado = "parado"; v.plano = null; v.proxima = P.tempo + P.r.entre(...LOGISTICA.rival.aCada) * HORA; return; }
  // levando: descarrega na base de destino (se ainda for sua)
  v.estado = "parado";
  if (pl.para.dono !== fac) { v.plano = null; return; }
  v.em = pl.para;
  if (!completa(fac)) {   // comboio rival simples: entrega na frente e volta ao QG
    descarrega(v, fac);
    if (fac.base) { v.plano = { para: fac.base }; v.estado = "voltando"; rotaVeiculo(P, v, fac.base); } else v.plano = null;
    return;
  }
  const txt = textoCarga(v.carga);
  descarrega(v, estoqueDoLugar(P, fac, pl.para, v.bat));
  v.plano = null;
  avisa(P, "entregou", { v, base: pl.para, txt });
}
function andaVeiculo(P, v, dt) {
  if (!v.rota) return;
  if (completa(v.faccao) && (!v.motorista || P.tempo < (v.motoristaChega || 0))) return;
  let passo = VEICULOS[v.nivel - 1].vel * dt;
  while (passo > 0 && v.rota) {
    const [tx, tz] = v.rota[v.i], dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
    if (d > 1e-6) v.rumo = Math.atan2(dz, dx);
    if (d <= passo) { v.x = tx; v.z = tz; passo -= d; v.i++; if (v.i >= v.rota.length) { v.rota = null; chegouVeiculo(P, v); } }
    else { v.x += dx / d * passo; v.z += dz / d * passo; passo = 0; }
  }
  if (v.motorista) { v.motorista.x = v.x; v.motorista.z = v.z; }
}

/* ---------- tiros contra veículos ---------- */
function atiramNoVeiculo(P, v) {
  if (!v.rota && v.estado !== "abandonado") return;
  for (const sq of P.esquadroes) {
    if (sq.faccao === v.faccao || !hostis(P, sq.faccao, v.faccao) || !ativos(sq).length) continue;
    const [cx, cz] = centroDoEsquadrao(sq); if (Math.hypot(cx - v.x, cz - v.z) > LOGISTICA.alcanceTiro + 60) continue;
    for (const s of ativos(sq)) {
      if (!s.arma || s.municao <= 0 || s.vida !== "ok") continue;
      const w = ARMAS[s.arma], d = Math.hypot(s.x - v.x, s.z - v.z);
      if (d > Math.min(w.alcance, LOGISTICA.alcanceTiro) || !linhaLivre(P, s.x, s.z, v.x, v.z)) continue;
      s.municao--; const nv = (s.nivel || 1) - 1;
      P.efeitos.push({ tipo: w.area ? "granada" : "tiro", ax: s.x, az: s.z, bx: v.x + P.r.entre(-1.5, 1.5), bz: v.z + P.r.entre(-1.5, 1.5), cor: s.faccao.cor, arma: s.arma });
      if (P.r() > LOGISTICA.acerto * NIVEL.precisao[nv] * (.5 + s.atr.pontaria / 100) * (1 - .5 * d / w.alcance)) continue;
      const dano = LOGISTICA.dano[s.arma] * NIVEL.dano[nv];
      v.vida -= dano; v.danoDe.set(s.faccao, (v.danoDe.get(s.faccao) || 0) + dano);
      aprende(P, s, "pontaria", .05);
      if (!v.avisouAtaque || P.tempo - v.avisouAtaque > 60) { v.avisouAtaque = P.tempo; avisa(P, "veiculoatacado", { v, por: s.faccao }); }
      if (v.vida <= 0) { destroiVeiculo(P, v); return; }
      if (v.estado !== "abandonado" && P.r() < (s.arma === "rpg" ? LOGISTICA.motoristaRpg : LOGISTICA.motorista)) { abandona(P, v); }
    }
  }
}
function abandona(P, v) {
  const s = v.motorista;
  if (s) { s.vida = "morto"; s.caiuEm = P.tempo; s.veiculo = null; anota(P, s, "Morreu dirigindo"); avisa(P, "baixa", { o: s, fatal: true }); }
  v.motorista = null; v.rota = null; v.estado = "abandonado"; v.em = null;
  avisa(P, "veiculoparado", { v });
}
function destroiVeiculo(P, v) {
  const fac = v.faccao; let por = null, mx = 0;
  for (const [f, d] of v.danoDe) if (d > mx) { mx = d; por = f; }
  const txt = textoCarga(v.carga);
  if (por && !cargaVazia(v.carga)) {   // quem destruiu fica com a carga
    const base = completa(por) ? baseMaisPerto(P, por, v.x, v.z) : null;
    descarrega(v, base ? estoqueDoLugar(P, por, base) : por.municao ? por : criaEstoque());
  }
  const s = v.motorista;
  if (s && s.vida === "motorista") { if (P.r() < .5) { s.vida = "morto"; s.caiuEm = P.tempo; s.veiculo = null; avisa(P, "baixa", { o: s, fatal: true }); } else soltaMotorista(P, v); }
  fac.veiculos = fac.veiculos.filter(o => o !== v);
  (P.destrocos || (P.destrocos = [])).push({ x: v.x, z: v.z, rumo: v.rumo, nivel: v.nivel, ate: P.tempo + 3 * HORA });
  avisa(P, "veiculodestruido", { v, por, txt });
}
function captura(P, v, nova) {
  const antiga = v.faccao;
  antiga.veiculos = antiga.veiculos.filter(o => o !== v);
  v.faccao = nova; v.bat = null; v.plano = null; v.estado = "parado"; v.em = null; v.danoDe = new Map(); v.motorista = null;
  (nova.veiculos || (nova.veiculos = [])).push(v);
  const txt = textoCarga(v.carga);
  if (!completa(nova)) { descarrega(v, nova.municao ? nova : criaEstoque()); if (nova.base) { v.plano = { para: nova.base }; v.estado = "voltando"; rotaVeiculo(P, v, nova.base); } }
  avisa(P, "veiculocapturado", { v, de: antiga, por: nova, txt });
}

/* ---------- a cada segundo ---------- */
function veiculosDoSegundo(P) {
  if (P.rotasLog) P.rotasLog = P.rotasLog.filter(r => r.ate > P.tempo);
  if (P.destrocos) P.destrocos = P.destrocos.filter(d => d.ate > P.tempo);
  for (const fac of P.faccoes) {
    if (!fac.veiculos || !fac.veiculos.length) continue;
    for (const v of fac.veiculos.slice()) {
      atiramNoVeiculo(P, v); if (!fac.veiculos.includes(v)) continue;
      if (v.estado === "abandonado") {   // quem chegar perto primeiro leva
        let quem = null, md = LOGISTICA.capturaPerto;
        for (const sq of P.esquadroes) { if (!ativos(sq).length) continue; const [x, z] = centroDoEsquadrao(sq), d = Math.hypot(x - v.x, z - v.z); if (d < md) { md = d; quem = sq; } }
        if (quem && quem.faccao !== fac && hostis(P, quem.faccao, fac)) { captura(P, v, quem.faccao); continue; }
        // um esquadrão inimigo perto (e livre) vai buscar o veículo largado
        if (!v.buscadoPor || !ativos(v.buscadoPor).length || v.buscadoPor.combate) {
          let b = null, mb = 380;
          for (const sq of P.esquadroes) { if (sq.combate || !ativos(sq).length || sq.faccao === fac || !hostis(P, sq.faccao, fac) || sq.faccao.governo) continue; const [x, z] = centroDoEsquadrao(sq), d = Math.hypot(x - v.x, z - v.z); if (d < mb) { mb = d; b = sq; } }
          if (b) { v.buscadoPor = b; const m = b.missao; ordenaPonto(P, b, v.x, v.z, "ataque"); b.missao = m; b.proximaMissao = P.tempo + 60; }
        }
        if (!completa(fac)) continue;
      }
      if (completa(fac)) {
        if (!v.bat || v.bat.dissolvido) { const bs = porPrioridade(P, fac); v.bat = null; if (bs.length) { const nv = x => fac.veiculos.filter(o => o.bat === x).length, longe = x => x.base && x.base !== fac.base ? 0 : 1;
          const b = bs.slice().sort((x, y) => (longe(x) - longe(y)) || (nv(x) - nv(y)) || x.prioridade - y.prioridade)[0]; atribuiVeiculo(P, v, b); avisa(P, "veiculoatribuido", { v, b }); } continue; }
        if (!v.motorista || v.motorista.vida !== "motorista") { v.motorista = null; pegaMotorista(P, v); if (!v.motorista) continue; if (v.estado === "abandonado") v.estado = "parado"; }
        if (v.rota || P.tempo < (v.proxima || 0)) continue;
        v.proxima = P.tempo + LOGISTICA.pensa;
        if (!v.plano) planejaViagem(P, v);
        else if (!v.rota) vaiPlano(P, v, v.plano);
      } else if (!fac.governo && !v.rota && v.estado === "parado" && P.tempo >= (v.proxima || 0)) comboioRival(P, fac, v);
    }
  }
}
function comboioRival(P, fac, v) {
  v.proxima = P.tempo + P.r.entre(...LOGISTICA.rival.aCada) * HORA;
  if (!fac.base) return;
  if (v.em !== fac.base) { v.plano = { para: fac.base }; v.estado = "voltando"; rotaVeiculo(P, v, fac.base); return; }
  const l = P.reg.edificios.filter(e => e.dono === fac && Math.hypot(e.x - fac.base.x, e.z - fac.base.z) < LOGISTICA.rival.alcance).sort((a, b) => Math.hypot(b.x - fac.base.x, b.z - fac.base.z) - Math.hypot(a.x - fac.base.x, a.z - fac.base.z));
  const dest = l.length > 3 ? l[Math.floor(P.r() * Math.min(8, l.length))] : null;
  if (!dest) return;
  carrega(v, fac, { "cx-bala": 300, fuzil: 1, "cx-foguete": 3 });
  v.plano = { para: dest }; v.estado = "levando"; rotaVeiculo(P, v, dest);
}
function veiculosDoPasso(P, dt) { for (const f of P.faccoes) if (f.veiculos) for (const v of f.veiculos) andaVeiculo(P, v, dt); }

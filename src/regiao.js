"use strict";
/* ============================================================
   GERADOR DA REGIÃO (sem tela: só decide o que existe e onde)
   Padrões tirados de imagens de satélite de Aleppo, Mossul, Gaza, Nablus,
   Sanaa, Ramadi, Bint Jbeil e Kafr Nabl (ver claude/faccoes/analise-cidades-oriente-medio.md).
   ============================================================ */

function nomeLugar(r, usados, inicios) {
  for (let i = 0; i < 200; i++) {
    const a = r.de(inicios), b = r.de(NOME_FIM), nome = a + " " + b[0];
    if (usados.has(nome) || NOMES_EVITAR.includes(nome)) continue;
    usados.add(nome);
    return { nome, sig: NOME_INICIO[a] + " " + b[1] };
  }
  return { nome: "Kafr " + usados.size, sig: "" };
}
function nomeBairro(r, usados, prefixo, sig) {
  for (let i = 0; i < 200; i++) {
    const b = r.de(NOME_FIM), nome = prefixo + " " + b[0];
    if (usados.has(nome)) continue;
    usados.add(nome); return { nome, sig: sig + " " + b[1] };
  }
  return { nome: prefixo + " " + usados.size, sig };
}
function nomeUnico(r, A, B, usados) {
  for (let i = 0; i < 50; i++) { const n = r.de(A) + " " + r.de(B); if (!usados.has(n)) { usados.add(n); return n; } }
  return r.de(A) + " " + (usados.size + 1);
}

function novaVia(reg, tipo, larg, pts) {
  const via = { tipo, larg, pts, L: comprimentos(pts) };
  reg.vias.push(via); reg.oc.poeVia(via);
  return via;
}
function novoEdificio(reg, tipo, o, props) {
  const r = reg.r;
  const e = Object.assign({ tipo, x: o.x, z: o.z, a: o.a, w: o.hw * 2, d: o.hd * 2, var: r(), var2: r(), var3: r() }, props);
  e.o = o; o.e = e; reg.edificios.push(e); reg.oc.poe(o);
  return e;
}
/* Faz o edifício crescer até encostar nos vizinhos (deixa a cidade velha colada, como nas fotos) */
function cresce(reg, e, max, margem, folgaVia) {
  const o = e.o, w0 = o.hw, d0 = o.hd;
  for (let k = 0; k < 14; k++) {
    let cresceu = false;
    for (const [eixo, sinal] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
      if (eixo === 0 ? o.hw - w0 >= max / 2 : o.hd - d0 >= max / 2) continue;
      const [du, dv] = eixo === 0 ? [.5 * sinal, 0] : [0, .5 * sinal], [dx, dz] = gira(du, dv, o.a);
      const t = criaObb(o.x + dx, o.z + dz, o.a, (o.hw + (eixo === 0 ? .5 : 0)) * 2, (o.hd + (eixo === 1 ? .5 : 0)) * 2);
      if (reg.oc.livre(t, margem, folgaVia, o)) { o.x = t.x; o.z = t.z; o.hw = t.hw; o.hd = t.hd; cresceu = true; }
    }
    if (!cresceu) break;
  }
  e.x = o.x; e.z = o.z; e.w = o.hw * 2; e.d = o.hd * 2;
}

/* ---------- a cidade: limites, bairros ---------- */
function urbano(reg, x, z) {
  const d = Math.hypot(x, z), a = Math.atan2(z, x);
  if (d < raioVelha(reg, a) + 15 || d > reg.cidade.Rout(a)) return false;
  if (distRio(reg, x, z) < reg.rio.larg + 14) return false;
  return declive(reg, x, z).m < .55;
}
function bairroDe(reg, x, z) {
  let melhor = null, md = Infinity;
  for (const b of reg.bairros) {
    const d = Math.hypot(x - b.x, z - b.z) * (1 + .25 * reg.nBairro(x / 230 + b.k * 7.3, z / 230 - b.k * 3.1));
    if (d < md) { md = d; melhor = b; }
  }
  return melhor;
}
function densidade(reg, x, z) {
  const d = Math.hypot(x, z), a = Math.atan2(z, x), rv = raioVelha(reg, a), ro = reg.cidade.Rout(a);
  const f = limita((d - rv) / (ro - rv), 0, 1);
  return limita(1.15 - suave(.5, 1, f) * 1.05, .08, 1) * (.88 + .2 * reg.nDens(x / 170, z / 170));
}

function geraBairros(reg, r, usados) {
  const cid = reg.cidade, K = r.int(7, 9), a0 = r.entre(0, 6.28);
  reg.nBairro = criaRuido(r); reg.nDens = criaRuido(r); reg.nWarp = criaRuido(r);
  for (let k = 0; k < K; k++) {
    const a = a0 + k * 2 * Math.PI / K + r.entre(-.25, .25);
    const d = limita(r.entre(reg.Rv + 150, 500), reg.Rv + 130, cid.Rout(a) - 90);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    let m = 0; for (let i = 0; i < 16; i++) { const [u, v] = gira(r.entre(0, 90), 0, r.entre(0, 6.28)); m += declive(reg, x + u, z + v).m; }
    reg.bairros.push({ k, x, z, d, inc: m / 16, ang: r.entre(0, Math.PI / 2), tipo: null });
  }
  const livres = () => reg.bairros.filter(b => !b.tipo);
  for (const b of reg.bairros) if (b.inc > .21) b.tipo = "encosta";
  let l = livres().sort((p, q) => q.d - p.d);
  if (l.length) l[0].tipo = "industrial";
  l = livres().sort((p, q) => p.d - q.d);
  if (l.length && r() < .7) l[0].tipo = "informal";
  for (const b of livres()) if (b.d > 400 && r() < .5) b.tipo = "vilas";
  for (const b of livres()) b.tipo = "grade";
  for (const b of reg.bairros) {
    Object.assign(b, nomeBairro(r, usados, "Hayy", "Bairro"));
    const t = b.tipo;
    b.bw = t === "industrial" ? r.entre(100, 130) : t === "vilas" ? r.entre(80, 100) : t === "informal" ? r.entre(60, 75) : r.entre(55, 75);
    b.bd = t === "industrial" ? r.entre(120, 150) : t === "vilas" ? r.entre(100, 130) : t === "informal" ? r.entre(80, 100) : r.entre(80, 120);
    b.off = [r.entre(0, b.bw), r.entre(0, b.bd)];
  }
}

function noBairro(reg, x, z, b) { return urbano(reg, x, z) && bairroDe(reg, x, z) === b; }

function entorta(reg, x, z) {
  const W = reg.nWarp;
  x += 16 * W(x / 280, z / 280);
  z += 16 * W(x / 280 + 9.1, z / 280 + 4.7);
  return [x, z];
}
/* Ruas em grade torta (bairros planejados, industriais, de casas e densos) */
function ruasEmGrade(reg, b) {
  for (const eixo of [0, 1]) {
    const passo = eixo ? b.bd : b.bw;
    for (let k = -14; k <= 14; k++) {
      const off = k * passo + b.off[eixo];
      const principal = ((k % 3) + 3) % 3 === 0 && b.tipo !== "informal";
      let run = [];
      const fecha = () => {
        if (run.length * 6 >= 45) {
          const larg = b.tipo === "informal" ? 6 : principal ? 11 : b.tipo === "industrial" ? 10 : 7.5;
          novaVia(reg, principal ? "avenida" : "rua", larg, simplifica(run, .5));
        }
        run = [];
      };
      for (let t = -640; t <= 640; t += 6) {
        const [u, v] = eixo ? [t, off] : [off, t];
        const [gu, gv] = gira(u, v, b.ang), [x, z] = entorta(reg, gu + b.x, gv + b.z);
        if (noBairro(reg, x, z, b)) run.push([x, z]); else fecha();
      }
      fecha();
    }
  }
}

/* Quadras divididas em lotes: uma fileira de frente para cada rua e o miolo cheio */
function loteiaQuadras(reg, r, b) {
  const P = PERFIS[b.tipo], recuo = 5.5 + 1.4;
  const fileira = (U0, U1, Va, Vb, frente) => {
    let u = U0 + r.entre(0, 2);
    while (u < U1 - 4) {
      let f = r.entre(P.frente[0], P.frente[1]); if (u + f > U1) f = U1 - u; if (f < 6) break;
      const [gu, gv] = gira(u + f / 2, (Va + Vb) / 2, b.ang), [x, z] = entorta(reg, gu + b.x, gv + b.z);
      u += f;
      if (!noBairro(reg, x, z, b) || r() > densidade(reg, x, z) * P.dens) continue;
      const ang = b.ang + (frente < 0 ? Math.PI : frente > 0 ? 0 : (r() < .5 ? 0 : Math.PI));
      const o = criaObb(x, z, ang, f - P.vao, Vb - Va - .6);
      if (!reg.oc.livre(o, .2, .4)) continue;
      const tipo = r.pesado(P.tipos);
      novoEdificio(reg, tipo, o, propsDoPerfil(reg, r, P, tipo, x, z, { lugar: reg.cidade, bairro: b.nome }));
    }
  };
  for (let i = -14; i < 14; i++) for (let j = -14; j < 14; j++) {
    const u0 = i * b.bw + b.off[0], v0 = j * b.bd + b.off[1];
    const [cu, cv] = gira(u0 + b.bw / 2, v0 + b.bd / 2, b.ang);
    if (Math.hypot(cu, cv) > 680) continue;
    const U0 = u0 + recuo, U1 = u0 + b.bw - recuo, V0 = v0 + recuo, V1 = v0 + b.bd - recuo;
    const f1 = r.entre(P.fundo[0], P.fundo[1]), f2 = r.entre(P.fundo[0], P.fundo[1]);
    if (V1 - V0 < f1 + f2 + 2) { fileira(U0, U1, V0, V1, 0); continue; }
    fileira(U0, U1, V0, V0 + f1, -1);
    fileira(U0, U1, V1 - f2, V1, 1);
    const meio = V1 - f2 - (V0 + f1);
    if (meio > P.fundo[0] + 2) fileira(U0, U1, V0 + f1 + 1, V1 - f2 - 1, 0);
  }
}

/* Ruas que acompanham as curvas de nível (bairros de encosta, como Nablus) */
function ruasDeEncosta(reg, r, b) {
  const sementes = [];
  for (const sentido of [1, -1]) {
    let x = b.x, z = b.z, andado = 0, prox = sentido === 1 ? 0 : r.entre(40, 52);
    const subida = [];
    for (let k = 0; k < 120; k++) {
      const g = declive(reg, x, z); if (g.m < .01) break;
      x += g.gx / g.m * 6 * sentido; z += g.gz / g.m * 6 * sentido; andado += 6;
      if (!noBairro(reg, x, z, b)) break;
      subida.push([x, z]);
      if (andado >= prox) { sementes.push([x, z]); prox = andado + r.entre(40, 52); }
    }
    if (subida.length > 8) b["ladeira" + sentido] = subida;
  }
  for (const [x0, z0] of sementes) {
    if (reg.oc.viaPerto(x0, z0, 18)) continue;
    const lados = [];
    for (const sentido of [1, -1]) {
      let x = x0, z = z0, tx = null, tz = null; const l = [];
      for (let k = 0; k < 90; k++) {
        const g = declive(reg, x, z); let nx, nz;
        if (g.m < .015) { if (tx === null) break; nx = tx; nz = tz; }
        else { nx = -g.gz / g.m * sentido; nz = g.gx / g.m * sentido; if (tx !== null && nx * tx + nz * tz < 0) { nx = -nx; nz = -nz; } }
        x += nx * 6; z += nz * 6; tx = nx; tz = nz;
        if (!noBairro(reg, x, z, b) || reg.oc.viaPerto(x, z, 15)) break;
        l.push([x, z]);
      }
      lados.push(l);
    }
    const pts = lados[0].reverse().concat([[x0, z0]], lados[1]);
    if (pts.length >= 9) novaVia(reg, "rua", 6.5, simplifica(pts, .5));
  }
  for (const s of [1, -1]) if (b["ladeira" + s]) novaVia(reg, "rua", 6, simplifica(b["ladeira" + s], .5));
}

/* ---------- cidade velha ---------- */
function geraCidadeVelha(reg, r, usados) {
  const oc = reg.oc, nl = criaRuido(r);
  const fluxo = (x, z) => Math.PI * .8 * nl(x / 110 + 40, z / 110 + 40);
  const velha = Object.assign({ tipo: "velha" }, { nome: NOME_CIDADE_VELHA[0], sig: NOME_CIDADE_VELHA[1] });
  reg.velha = velha;
  const quarteiroes = [];
  const a0q = r.entre(0, 6.28);
  for (let q = 0; q < 4; q++) quarteiroes.push(Object.assign({ a: a0q + q * Math.PI / 2 }, nomeBairro(r, usados, "Harat", "Bairro")));
  velha.quarteiroes = quarteiroes;
  const quarteiraoDe = (x, z) => { const a = Math.atan2(z, x); let m = quarteiroes[0], md = 9; for (const q of quarteiroes) { const d = difAng(a, q.a); if (d < md) { md = d; m = q; } } return m; };
  const local = (x, z) => ({ lugar: reg.cidade, bairro: quarteiraoDe(x, z).nome, velha: true });

  // Grande mesquita no centro, com pátio
  const aM = r.entre(0, Math.PI), oM = criaObb(0, 0, aM, 66, 52);
  novoEdificio(reg, "mesquita", oM, Object.assign(local(0, 0), { grande: true }));
  const volta = cantosObb(oM, 5); volta.push(volta[0]);
  novaVia(reg, "beco", 5, volta);
  // Cidadela no morro
  if (reg.cidadela) {
    const c = reg.cidadela;
    novoEdificio(reg, "cidadela", criaObb(c.x, c.z, r.entre(0, 6.28), 84, 84), local(c.x, c.z));
  }
  // Becos principais: das portas da cidade até a grande mesquita
  const nG = r.int(6, 8), a0 = r.entre(0, 6.28), principais = [];
  for (let g = 0; g < nG; g++) {
    const a = a0 + g * 2 * Math.PI / nG + r.entre(-.2, .2);
    let x = Math.cos(a) * (raioVelha(reg, a) + 9), z = Math.sin(a) * (raioVelha(reg, a) + 9);
    const pts = [[x, z]];
    for (let k = 0; k < 70; k++) {
      const h = Math.atan2(-z, -x) + .75 * nl(k * .12 + g * 5.3, g * 2.1);
      x += Math.cos(h) * 5; z += Math.sin(h) * 5;
      if (reg.cidadela && Math.hypot(x - reg.cidadela.x, z - reg.cidadela.z) < 50) break;
      pts.push([x, z]);
      if (pontoNoObb(oM, x, z, 6)) break;
    }
    if (pts.length > 4) principais.push(novaVia(reg, "beco", 5, simplifica(pts, .4)));
  }
  // Becos secundários, tortos, que se ligam aos outros
  for (let t = 0, nB = r.int(22, 30); t < nB; t++) {
    const pai = r.de(principais); if (!pai) break;
    const p = pontoEm(pai, r.entre(10, pai.L[pai.L.length - 1] - 10));
    let h = Math.atan2(p.tz, p.tx) + (r() < .5 ? 1 : -1) * (Math.PI / 2 + r.entre(-.4, .4));
    let x = p.x, z = p.z; const pts = [[x, z]];
    for (let k = 0, nP = r.int(5, 14); k < nP; k++) {
      h += r.entre(-.35, .35); x += Math.cos(h) * 4.5; z += Math.sin(h) * 4.5;
      if (Math.hypot(x, z) > raioVelha(reg, Math.atan2(z, x)) + 7) break;
      if (pontoNoObb(oM, x, z, 3)) break;
      if (reg.cidadela && Math.hypot(x - reg.cidadela.x, z - reg.cidadela.z) < 48) break;
      pts.push([x, z]);
      if (k > 2 && oc.viaPerto(x, z, 2, null)) break;
    }
    if (pts.length > 3) novaVia(reg, "beco", 3, pts);
  }
  // Mercado coberto (suq) ao longo de um beco principal
  const suq = principais.slice().sort((p, q) => q.L[q.L.length - 1] - p.L[p.L.length - 1])[0];
  if (suq) {
    for (const lado of [-1, 1]) {
      let t = 6;
      while (t < suq.L[suq.L.length - 1] - 10) {
        const comp = r.entre(16, 24), c = pontoEm(suq, t + comp / 2), d = Math.hypot(c.x, c.z);
        if (d > 42 && d < reg.Rv * .85) {
          const ang = Math.atan2(c.tz, c.tx), off = 2.5 + .4 + 4.5;
          const o = criaObb(c.x - c.tz * lado * off, c.z + c.tx * lado * off, ang + (lado > 0 ? Math.PI : 0), comp - .6, 9);
          if (oc.livre(o, .3, .3)) novoEdificio(reg, "mercado", o, local(o.x, o.z));
        }
        t += comp;
      }
    }
  }
  // Mesquitas de bairro
  for (let i = 0, n = r.int(5, 7); i < n * 20 && reg.edificios.filter(e => e.tipo === "mesquita" && e.velha && !e.grande).length < n; i++) {
    const a = r.entre(0, 6.28), d = r.entre(50, raioVelha(reg, a) - 14), x = Math.cos(a) * d, z = Math.sin(a) * d, s = r.entre(17, 23);
    const o = criaObb(x, z, fluxo(x, z), s, s * r.entre(1, 1.2));
    if (oc.livre(o, 1, .5)) novoEdificio(reg, "mesquita", o, local(x, z));
  }
  // Em cada quarteirão: a casa grande do líder do clã e uma caixa d'água
  for (const q of quarteiroes) {
    for (const [tipo, w, d] of [["lider", 26, 22], ["caixadagua", 9, 9]]) {
      for (let t = 0; t < 300; t++) {
        const a = q.a + r.entre(-.6, .6), dd = r.entre(45, raioVelha(reg, a) - 18), x = Math.cos(a) * dd, z = Math.sin(a) * dd;
        const o = criaObb(x, z, fluxo(x, z), w, d);
        if (!oc.livre(o, 1, .5)) continue;
        novoEdificio(reg, tipo, o, Object.assign(local(x, z), { patio: tipo === "lider" })); break;
      }
      if (!reg.edificios.some(e => e.tipo === tipo && e.velha && quarteiraoDe(e.x, e.z) === q))
        colocaSolto(reg, r, tipo, w * .8, d * .8, Math.cos(q.a) * reg.Rv * .6, Math.sin(q.a) * reg.Rv * .6, reg.Rv * .45, (x, z) => quarteiraoDe(x, z) === q && Math.hypot(x, z) < raioVelha(reg, Math.atan2(z, x)) - 6, Object.assign(local(Math.cos(q.a), Math.sin(q.a)), { patio: tipo === "lider" }));
    }
  }
  // Casas coladas, de teto plano, muitas com pátio interno
  for (let t = 0; t < 26000; t++) {
    const a = r.entre(0, 6.28), d = Math.sqrt(r()) * (raioVelha(reg, a) - 3), x = Math.cos(a) * d, z = Math.sin(a) * d;
    const torre = r() < .04;
    const w = torre ? r.entre(7, 9.5) : r.entre(6, 14), dd = torre ? r.entre(7, 9.5) : r.entre(6, 13);
    const o = criaObb(x, z, fluxo(x, z) + (r() < .5 ? 0 : Math.PI / 2) + r.entre(-.06, .06), w, dd);
    if (!oc.livre(o, .35, .3)) continue;
    const viaP = oc.viaPerto(x, z, 6);
    const loja = viaP && viaP.via.larg >= 5 && r() < .35;
    const andares = torre ? r.int(4, 5) : r.pesado([[1, 3], [2, 5], [3, 2]]);
    novoEdificio(reg, loja ? "loja" : "casa", o, Object.assign(local(x, z), { andares, torre }));
  }
  // as casas crescem até encostar nas vizinhas; depois, casinhas nos vãos que sobraram
  const casas = reg.edificios.filter(e => e.velha && (e.tipo === "casa" || e.tipo === "loja"));
  for (const e of casas) if (!e.torre) cresce(reg, e, 9, .35, .3);
  for (let t = 0; t < 24000; t++) {
    const a = r.entre(0, 6.28), d = Math.sqrt(r()) * (raioVelha(reg, a) - 3), x = Math.cos(a) * d, z = Math.sin(a) * d;
    const o = criaObb(x, z, fluxo(x, z) + (r() < .5 ? 0 : Math.PI / 2), r.entre(3.5, 6.5), r.entre(3.5, 6.5));
    if (!oc.livre(o, .35, .3)) continue;
    const e = novoEdificio(reg, "casa", o, Object.assign(local(x, z), { andares: r.int(1, 2) }));
    cresce(reg, e, 6, .35, .3);
  }
  for (const e of reg.edificios) if (e.velha && e.tipo === "casa" && !e.torre) cresce(reg, e, 4, .35, .3);
  for (const e of reg.edificios) if (e.velha && e.tipo === "casa" && !e.torre) e.patio = Math.min(e.w, e.d) >= 10 && r() < .85;
}

/* ---------- ajudantes de colocação ---------- */
function loteNaVia(via, t, lado, f, fundo) {
  const c = pontoEm(via, t + f / 2), hw = via.larg / 2, off = hw + VIAS[via.tipo].recuo + fundo / 2;
  const ang = Math.atan2(c.tz, c.tx);
  return criaObb(c.x - c.tz * lado * off, c.z + c.tx * lado * off, ang + (lado > 0 ? Math.PI : 0), f, fundo);
}
function colocaNaVia(reg, r, vias, tipo, w, d, filtro, props, tentativas) {
  for (let i = 0; i < (tentativas || 400); i++) {
    const via = r.de(vias); if (!via) return null;
    const L = via.L[via.L.length - 1]; if (L < w + 10) continue;
    const o = loteNaVia(via, r.entre(4, L - w - 4), r() < .5 ? -1 : 1, w, d);
    if (filtro && !filtro(o)) continue;
    if (!reg.oc.livre(o, 1.5, .8)) continue;
    return novoEdificio(reg, tipo, o, typeof props === "function" ? props(o) : props);
  }
  return null;
}
function propsDoPerfil(reg, r, perfil, tipo, x, z, extra) {
  const d = Math.hypot(x, z), f = limita(d / reg.cidade.Rout(Math.atan2(z, x)), 0, 1);
  let andares = 1;
  if (tipo === "predio") andares = limita(Math.round(perfil.andares[1] - (perfil.andares[1] - perfil.andares[0]) * f + r.entre(-1.5, 1.5)), Math.max(2, perfil.andares[0]), perfil.andares[1]);
  else if (tipo === "casa") andares = r.pesado([[1, 4], [2, 5], [3, 2]]);
  else if (tipo === "loja") andares = r.pesado([[1, 5], [2, 3]]);
  return Object.assign({ andares, murada: tipo === "casa" && (perfil === PERFIS.vilas || perfil === PERFIS.beira) && r() < .85,
    inacabado: tipo === "predio" && r() < .22 }, extra);
}
function perfilNoPonto(reg, x, z) {
  if (urbano(reg, x, z)) {
    const b = bairroDe(reg, x, z);
    return { perfil: PERFIS[b.tipo], dens: densidade(reg, x, z) * PERFIS[b.tipo].dens, bairro: b, local: { lugar: reg.cidade, bairro: b.nome } };
  }
  const d = Math.hypot(x, z), ro = reg.cidade.Rout(Math.atan2(z, x));
  if (d < raioVelha(reg, Math.atan2(z, x)) + 15) return null;
  if (d > ro + 650 || distRio(reg, x, z) < reg.rio.larg + 12 || declive(reg, x, z).m > .35) return null;
  for (const l of reg.lugares) if (l.tipo === "vila" && Math.hypot(l.x - x, l.z - z) < 160) return null;
  const dens = .55 * Math.exp(-Math.max(0, d - ro) / 230);
  return { perfil: PERFIS.beira, dens, bairro: null, local: { lugar: reg.cidade, bairro: "Arredores" } };
}
function fachadas(reg, r, via) {
  const L = via.L[via.L.length - 1], hw = via.larg / 2;
  for (const lado of [-1, 1]) {
    let t = r.entre(2, 8);
    while (t < L - 6) {
      const p = pontoEm(via, t), sx = -p.tz * lado, sz = p.tx * lado;
      const pf = perfilNoPonto(reg, p.x + sx * (hw + 10), p.z + sz * (hw + 10));
      if (!pf) { t += 10; continue; }
      const P = pf.perfil, f = r.entre(P.frente[0], P.frente[1]), fundo = r.entre(P.fundo[0], P.fundo[1]);
      if (r() < pf.dens) {
        const o = loteNaVia(via, t, lado, f - P.vao, fundo);
        if (reg.oc.livre(o, .3, .4)) {
          const tipo = r.pesado(P.tipos);
          novoEdificio(reg, tipo, o, propsDoPerfil(reg, r, P, tipo, o.x, o.z, pf.local));
        }
      }
      t += f;
    }
  }
}
function preencheMiolo(reg, r) {
  const cid = reg.cidade;
  for (let t = 0; t < 70000; t++) {
    const a = r.entre(0, 6.28), d = Math.sqrt(r()) * 720, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!urbano(reg, x, z)) continue;
    const b = bairroDe(reg, x, z), P = PERFIS[b.tipo];
    if (r() > densidade(reg, x, z) * P.dens) continue;
    let ang = b.ang + (r() < .5 ? 0 : Math.PI / 2);
    if (b.tipo === "encosta") { const g = declive(reg, x, z); ang = Math.atan2(g.gx, -g.gz); }
    const o = criaObb(x, z, ang + r.entre(-.05, .05), r.entre(P.frente[0], P.frente[1]) - P.vao, r.entre(P.fundo[0], P.fundo[1]));
    if (!reg.oc.livre(o, P.margem * .8, .8)) continue;
    const tipo = r.pesado(P.tipos);
    novoEdificio(reg, tipo, o, propsDoPerfil(reg, r, P, tipo, x, z, { lugar: cid, bairro: b.nome }));
  }
}

/* Coloca um edifício solto (sem precisar de via) perto de um ponto */
function colocaSolto(reg, r, tipo, w, d, cx, cz, raio, filtro, props, angulo) {
  for (let t = 0; t < 500; t++) {
    const a = r.entre(0, 6.28), dd = Math.sqrt(r()) * raio, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd;
    const o = criaObb(x, z, angulo != null ? angulo : r.entre(0, 6.28), w, d);
    if (!filtro(x, z) || !reg.oc.livre(o, 1.5, 1)) continue;
    return novoEdificio(reg, tipo, o, props);
  }
  return null;
}
/* Caixa d'água: procura um lugar alto e livre perto do ponto dado */
function poeCaixaDagua(reg, r, cx, cz, raio, filtro, props) {
  let melhor = null, mh = -Infinity;
  for (let t = 0; t < 120; t++) {
    const a = r.entre(0, 6.28), d = Math.sqrt(r()) * raio, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const o = criaObb(x, z, r.entre(0, 6.28), 10, 10);
    if (!filtro(x, z) || !reg.oc.livre(o, 1.5, 1.5)) continue;
    const h = alturaEm(reg, x, z) + r.entre(0, 4);
    if (h > mh) { mh = h; melhor = o; }
  }
  return melhor ? novoEdificio(reg, "caixadagua", melhor, props) : null;
}

/* ---------- zonas: a unidade de controle do território ---------- */
function zonaDe(reg, x, z) {
  const d = Math.hypot(x, z), a = Math.atan2(z, x);
  if (d < raioVelha(reg, a) + 12) {
    let m = null, md = 9;
    for (const q of reg.velha.quarteiroes) { const dd = difAng(a, q.a); if (dd < md) { md = dd; m = q; } }
    return m.zona;
  }
  if (d < reg.cidade.Rout(a) + 120) return bairroDe(reg, x, z).zona;
  let m = null, md = Infinity;
  for (const v of reg.lugares) if (v.tipo === "vila") { const dd = Math.hypot(v.x - x, v.z - z) * (1 + .28 * reg.nBairro(x / 160 + 11, z / 160 - 7)); if (dd < 330 && dd < md) { md = dd; m = v.zona; } }
  if (m) return m;
  for (const s of reg.rurais) { const dd = Math.hypot(s.x - x, s.z - z) * (1 + .2 * reg.nBairro(x / 300 + s.k * 5.1, z / 300)); if (dd < md) { md = dd; m = s.zona; } }
  return m;
}
function criaZonas(reg, r, usados, sitios) {
  reg.zonas = [];
  const nova = (tipo, alvo, nome, sig, x, z) => { const zn = { id: reg.zonas.length, tipo, nome, sig, x, z, edificios: [], chaves: [], dono: null }; alvo.zona = zn; reg.zonas.push(zn); return zn; };
  for (const q of reg.velha.quarteiroes) nova("velha", q, q.nome, q.sig, Math.cos(q.a) * reg.Rv * .6, Math.sin(q.a) * reg.Rv * .6);
  for (const b of reg.bairros) nova("bairro", b, b.nome, b.sig, b.x, b.z);
  for (const v of reg.lugares) if (v.tipo === "vila") nova("vila", v, v.nome, v.sig, v.x, v.z);
  // setores rurais: o campo dividido em regiões com nome
  reg.rurais = [];
  for (let t = 0; t < 900 && reg.rurais.length < 8; t++) {
    const x = r.entre(-METADE + 150, METADE - 150), z = r.entre(-METADE + 150, METADE - 150);
    if (Math.hypot(x, z) < reg.cidade.Rout(Math.atan2(z, x)) + 300) continue;
    if (reg.lugares.some(l => l.tipo === "vila" && Math.hypot(l.x - x, l.z - z) < 480)) continue;
    if (reg.rurais.some(s => Math.hypot(s.x - x, s.z - z) < 650)) continue;
    const s = Object.assign({ k: reg.rurais.length, x, z }, nomeBairro(r, usados, r.de(["Wadi", "Marj", "Jabal"]), "Campo"));
    s.sig = { Wadi: "Vale", Marj: "Prado", Jabal: "Monte" }[s.nome.split(" ")[0]] + " " + s.sig.replace("Campo ", "");
    reg.rurais.push(s); nova("rural", s, s.nome, s.sig, x, z);
  }
}
function fechaZonas(reg) {
  for (const e of reg.edificios) { const zn = zonaDe(reg, e.x, e.z); e.zona = zn; zn.edificios.push(e); if (TIPOS_CHAVE.includes(e.tipo)) zn.chaves.push(e); }
  reg.zonas = reg.zonas.filter(zn => zn.edificios.length > 0);
  reg.zonas.forEach((zn, i) => zn.id = i);
}

/* ---------- sítios das vilas (no alto dos morros, como no sul do Líbano) ---------- */
function escolheSitiosVilas(reg, r) {
  const cands = [];
  for (let t = 0; t < 600; t++) {
    const a = r.entre(0, 6.28), d = r.entre(820, 1220), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) > METADE - 200 || Math.abs(z) > METADE - 200) continue;
    if (distRio(reg, x, z) < 220 || declive(reg, x, z).m > .22) continue;
    cands.push({ x, z, a, nota: alturaEm(reg, x, z) + r.entre(0, 50) });
  }
  cands.sort((p, q) => q.nota - p.nota);
  const sitios = [];
  for (const c of cands) {
    if (sitios.length >= 3) break;
    if (sitios.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 750 || difAng(s.a, c.a) < 1.1)) continue;
    sitios.push(c);
  }
  return sitios;
}

/* ---------- vilas ---------- */
function geraVila(reg, r, usados, s, viaChegada) {
  const oc = reg.oc, nv = criaRuido(r);
  const vila = Object.assign({ tipo: "vila", x: s.x, z: s.z, angCampo: r.entre(0, Math.PI) }, nomeLugar(r, usados, INICIO_VILA));
  reg.lugares.push(vila);
  const local = { lugar: vila, bairro: null };
  const fluxo = (x, z) => Math.PI * .6 * nv(x / 90, z / 90) + vila.angCampo;
  novoEdificio(reg, "mesquita", criaObb(s.x, s.z, fluxo(s.x, s.z), 19, 21), Object.assign({}, local));
  // Trilhas de terra saindo do centro, procurando o caminho menos íngreme
  const nT = r.int(5, 7), t0 = r.entre(0, 6.28), trilhas = [];
  for (let i = 0; i < nT; i++) {
    let h = t0 + i * 2 * Math.PI / nT + r.entre(-.3, .3), x = s.x + Math.cos(h) * 12, z = s.z + Math.sin(h) * 12;
    const pts = [[x, z]], passos = r.int(16, 36);
    for (let k = 0; k < passos; k++) {
      let melhor = null, mc = Infinity;
      for (const dh of [-.35, 0, .35]) {
        const hh = h + dh, nx = x + Math.cos(hh) * 6, nz = z + Math.sin(hh) * 6;
        const c = Math.abs(alturaEm(reg, nx, nz) - alturaEm(reg, x, z)) + r.entre(0, .6);
        if (c < mc) { mc = c; melhor = [hh, nx, nz]; }
      }
      [h, x, z] = melhor;
      if (Math.abs(x) > METADE - 40 || Math.abs(z) > METADE - 40 || distRio(reg, x, z) < reg.rio.larg + 15) break;
      pts.push([x, z]);
      if (k > 4 && oc.viaPerto(x, z, 3, null)) break;
    }
    if (pts.length > 5) trilhas.push(novaVia(reg, "trilha", 4, simplifica(pts, .4)));
  }
  vila.trilhas = trilhas;
  // Miolo denso em volta da mesquita
  const nMiolo = r.int(28, 42); let feitos = 0;
  for (let t = 0; t < 2500 && feitos < nMiolo; t++) {
    const a = r.entre(0, 6.28), d = 12 + Math.sqrt(r()) * 42, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
    const w = r.entre(7, 13), dd = r.entre(7, 12);
    const o = criaObb(x, z, fluxo(x, z) + (r() < .5 ? 0 : Math.PI / 2), w, dd);
    if (!oc.livre(o, .9, .6)) continue;
    const tipo = feitos < 2 ? "loja" : feitos === 2 ? "oficina" : "casa";
    const e = novoEdificio(reg, tipo, o, Object.assign({ andares: r.pesado([[1, 4], [2, 4]]), velha: true }, local));
    cresce(reg, e, 4, .9, .6);
    e.patio = tipo === "casa" && Math.min(e.w, e.d) >= 10 && r() < .4;
    feitos++;
  }
  // Casa do líder do clã perto do centro e caixa d'água no ponto mais alto
  if (!colocaNaVia(reg, r, trilhas.length ? trilhas : [viaChegada], "lider", 34, 28, o => Math.hypot(o.x - s.x, o.z - s.z) < 140, Object.assign({}, local), 300))
    colocaSolto(reg, r, "lider", 30, 26, s.x, s.z, 160, () => true, Object.assign({}, local));
  poeCaixaDagua(reg, r, s.x, s.z, 150, () => true, Object.assign({}, local));
  // Casas com quintal murado ao longo das trilhas e da estrada de chegada
  const ao = trilhas.slice(); if (viaChegada) ao.push(viaChegada);
  for (const via of ao) {
    const L = via.L[via.L.length - 1], doFim = via === viaChegada;
    for (const lado of [-1, 1]) {
      let t = r.entre(4, 12);
      while (t < L - 8) {
        const p = pontoEm(via, t), dc = Math.hypot(p.x - s.x, p.z - s.z), f = r.entre(15, 24);
        if (dc > 260 || (doFim && dc > 220)) { t += f; continue; }
        if (r() < .62 * Math.exp(-dc / 170)) {
          const o = loteNaVia(via, t, lado, f - 2, r.entre(15, 22));
          if (oc.livre(o, 1.5, .5)) novoEdificio(reg, "casa", o, Object.assign({ andares: r.pesado([[1, 3], [2, 4], [3, 1]]), murada: true }, local));
        }
        t += f;
      }
    }
  }
  // Fazendas muradas no fim das trilhas
  let faz = 0;
  for (let t = 0; t < 60 && faz < 3; t++) {
    const via = r.de(trilhas); if (!via) break;
    const L = via.L[via.L.length - 1];
    const o = loteNaVia(via, r.entre(L * .5, L - 34), r() < .5 ? -1 : 1, r.entre(28, 36), r.entre(22, 30));
    if (oc.livre(o, 2, .8)) { novoEdificio(reg, "fazenda", o, Object.assign({}, local)); faz++; }
  }
  return vila;
}

/* ---------- campos, pomares e olivais ---------- */
function poeCampo(reg, r, o, tipo, cor) {
  reg.oc.poeCampo(o);
  const c = { o, tipo, cor };
  reg.campos.push(c);
  if (tipo === "olival" || tipo === "pomar") {
    const esp = tipo === "pomar" ? 8 : 7;
    for (let u = -o.hw + esp / 2; u < o.hw - 1; u += esp) for (let v = -o.hd + esp / 2; v < o.hd - 1; v += esp) {
      if (r() < .08) continue;
      const [du, dv] = gira(u + r.entre(-.8, .8), v + r.entre(-.8, .8), o.a);
      reg.arvores.push({ tipo: tipo === "pomar" ? "palma" : "oliva", x: o.x + du, z: o.z + dv, s: r.entre(.8, 1.15) });
    }
  }
  return c;
}
function campoCabe(reg, o, margem) {
  if (!reg.oc.campoLivre(o, margem) || !reg.oc.livre(o, 3, 2)) return false;
  for (const [x, z] of cantosObb(o)) {
    if (Math.abs(x) > METADE - 10 || Math.abs(z) > METADE - 10) return false;
    if (distRio(reg, x, z) < reg.rio.larg + 6) return false;
    const d = Math.hypot(x, z); if (d < reg.cidade.Rout(Math.atan2(z, x)) + 20) return false;
  }
  return true;
}
/* Um bloco de terra dividido em parcelas coladas umas nas outras (como nas fotos de satélite).
   Nas encostas, as parcelas viram terraços compridos seguindo a curva de nível. */
function parcelamento(reg, r, cx, cz, W, D, angPlano, olival) {
  const g0 = declive(reg, cx, cz), terraco = g0.m > .08;
  const ang = terraco ? Math.atan2(g0.gx, -g0.gz) : angPlano;
  let u = -W / 2;
  while (u < W / 2 - 12) {
    const cw = terraco ? r.entre(45, 95) : r.entre(20, 58);
    let v = -D / 2;
    while (v < D / 2 - 8) {
      const ch = terraco ? r.entre(10, 18) : r.entre(15, 46);
      const [du, dv] = gira(u + cw / 2, v + ch / 2, ang), x = cx + du, z = cz + dv;
      v += ch;
      if (r() < .12) continue;   // terra em descanso
      const g = declive(reg, x, z); if (g.m > .34) continue;
      if (terraco && difAng(Math.atan2(g.gx, -g.gz), ang) > .5 && difAng(Math.atan2(g.gx, -g.gz), ang + Math.PI) > .5) continue;
      const o = criaObb(x, z, ang + r.entre(-.03, .03), cw - 1.8, ch - 1.6);
      if (!campoCabe(reg, o, .4)) continue;
      const ol = r() < olival;
      poeCampo(reg, r, o, ol ? "olival" : "roca", ol ? COR_OLIVAL : r.de(CORES_CAMPO));
    }
    u += cw;
  }
}
function geraCampos(reg, r) {
  // em volta das vilas
  for (const vl of reg.lugares) if (vl.tipo === "vila") for (let t = 0; t < 14; t++) {
    const a = r.entre(0, 6.28), d = r.entre(90, 400);
    parcelamento(reg, r, vl.x + Math.cos(a) * d, vl.z + Math.sin(a) * d, r.entre(140, 280), r.entre(100, 220), vl.angCampo + (r() < .3 ? Math.PI / 2 : 0), .3);
  }
  // em volta da cidade, nas partes mais planas
  for (let t = 0; t < 70; t++) {
    const a = r.entre(0, 6.28), d = reg.cidade.Rout(a) + r.entre(60, 520), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (declive(reg, x, z).m > .2) continue;
    parcelamento(reg, r, x, z, r.entre(150, 300), r.entre(110, 230), a + r.entre(-.3, .3), .22);
  }
  // faixas irrigadas nas margens do rio, com pomares de tamareiras
  for (let z = -METADE + 20; z < METADE - 20; z += r.entre(18, 30)) for (const lado of [-1, 1]) {
    if (r() < .2) continue;
    const Lc = r.entre(60, 170), xr = xDoRio(reg, z), dxdz = (xDoRio(reg, z + 10) - xr) / 10;
    const ang = Math.atan2(-dxdz, 1), off = lado * (reg.rio.larg + 9 + Lc / 2);
    const x = xr + Math.cos(ang) * off, zc = z + Math.sin(ang) * off;
    const o = criaObb(x, zc, ang, Lc, r.entre(16, 26));
    if (declive(reg, x, zc).m > .12 || !campoCabe(reg, o, 1)) continue;
    const pomar = r() < .15;
    poeCampo(reg, r, o, pomar ? "pomar" : "irrigado", pomar ? "#7c8a4e" : r.de(CORES_IRRIGADO));
  }
}

/* ---------- vegetação ---------- */
function geraArvores(reg, r) {
  const oc = reg.oc, nt = criaRuido(r);
  const foraDaCidade = (x, z) => Math.hypot(x, z) > reg.cidade.Rout(Math.atan2(z, x)) + 10;
  const longeDasVilas = (x, z, d) => !reg.lugares.some(l => l.tipo === "vila" && Math.hypot(l.x - x, l.z - z) < d);
  // tamareiras nas margens do rio
  for (let z = -METADE; z < METADE; z += r.entre(4, 9)) for (const lado of [-1, 1]) {
    if (nt(z / 120, lado * 3) < -.15) continue;
    const x = xDoRio(reg, z) + lado * (reg.rio.larg + r.entre(2, 9));
    if (oc.edificioPerto(x, z, 2) || oc.viaPerto(x, z, 2)) continue;
    reg.arvores.push({ tipo: "palma", x, z, s: r.entre(.8, 1.25) });
  }
  // árvores no pátio das casas e ao longo das avenidas
  for (const e of reg.edificios) if (e.patio && r() < .45) reg.arvores.push({ tipo: "citrico", x: e.x, z: e.z, s: r.entre(.7, 1), base: true });
  for (const via of reg.vias) if (via.tipo === "avenida" && via.larg >= 11) {
    const L = via.L[via.L.length - 1];
    for (let t = 5; t < L; t += r.entre(9, 14)) for (const lado of [-1, 1]) {
      const p = pontoEm(via, t), off = via.larg / 2 + 1.6, x = p.x - p.tz * lado * off, z = p.z + p.tx * lado * off;
      if (r() < .3 || oc.edificioPerto(x, z, 1.5)) continue;
      reg.arvores.push({ tipo: "citrico", x, z, s: r.entre(.75, 1) });
    }
  }
  // ciprestes nos cemitérios
  for (const c of reg.cemiterios) for (let i = 0; i < 26; i++) {
    const [u, v] = gira(r.entre(-c.hw + 2, c.hw - 2), r.entre(-c.hd + 2, c.hd - 2), c.a);
    reg.arvores.push({ tipo: "cipreste", x: c.x + u, z: c.z + v, s: r.entre(.8, 1.2) });
  }
  // pinheiros no alto dos morros
  for (let t = 0; t < 9000; t++) {
    const x = r.entre(-METADE + 20, METADE - 20), z = r.entre(-METADE + 20, METADE - 20);
    if (alturaEm(reg, x, z) < 115 || nt(x / 160, z / 160) < .15 || !foraDaCidade(x, z) || !longeDasVilas(x, z, 90)) continue;
    if (oc.noCampo(x, z) || oc.viaPerto(x, z, 4)) continue;
    reg.arvores.push({ tipo: "pinheiro", x, z, s: r.entre(.75, 1.3) });
  }
  // arbustos secos espalhados
  for (let t = 0; t < 14000; t++) {
    const x = r.entre(-METADE + 10, METADE - 10), z = r.entre(-METADE + 10, METADE - 10);
    if (nt(x / 90 + 30, z / 90) < -.1 || !foraDaCidade(x, z) || !longeDasVilas(x, z, 60)) continue;
    if (distRio(reg, x, z) < reg.rio.larg + 2 || oc.noCampo(x, z) || oc.viaPerto(x, z, 3) || oc.edificioPerto(x, z, 3)) continue;
    reg.arvores.push({ tipo: "arbusto", x, z, s: r.entre(.5, 1.3) });
  }
}

/* ---------- quartel e casas isoladas ---------- */
function geraQuartel(reg, r) {
  const rod = reg.vias.filter(v => v.tipo === "rodovia");
  for (let t = 0; t < 600; t++) {
    const via = r.de(rod); if (!via) return;
    const L = via.L[via.L.length - 1], p = pontoEm(via, r.entre(0, L)), d = Math.hypot(p.x, p.z), ro = reg.cidade.Rout(Math.atan2(p.z, p.x));
    if (d < ro + 60 || d > ro + 420) continue;
    const lado = r() < .5 ? -1 : 1, off = r.entre(110, 160), x = p.x - p.tz * lado * off, z = p.z + p.tx * lado * off;
    const o = criaObb(x, z, Math.atan2(p.tz, p.tx), 170, 128);
    if (desnivel(reg, o) > 9 || !reg.oc.livre(o, 6, 6) || distRio(reg, x, z) < 120) continue;
    if (reg.lugares.some(l => l.tipo === "vila" && Math.hypot(l.x - x, l.z - z) < 300)) continue;
    const e = novoEdificio(reg, "quartel", o, { lugar: reg.cidade, bairro: "Arredores" });
    const [gu, gv] = gira(0, -lado * 64, o.a);   // portão virado para a rodovia
    e.portao = -lado;
    novaVia(reg, "estrada", 7, [[x + gu, z + gv], [p.x, p.z]]);
    return e;
  }
}
function geraCasasIsoladas(reg, r) {
  let n = 0;
  for (let t = 0; t < 900 && n < 34; t++) {
    const x = r.entre(-METADE + 80, METADE - 80), z = r.entre(-METADE + 80, METADE - 80);
    if (Math.hypot(x, z) < reg.cidade.Rout(Math.atan2(z, x)) + 150) continue;
    if (reg.lugares.some(l => l.tipo === "vila" && Math.hypot(l.x - x, l.z - z) < 220)) continue;
    if (declive(reg, x, z).m > .14 || distRio(reg, x, z) < 60 || !reg.oc.viaPerto(x, z, 90)) continue;
    const faz = r() < .55, o = criaObb(x, z, r.entre(0, 6.28), faz ? r.entre(28, 36) : r.entre(16, 22), faz ? r.entre(22, 30) : r.entre(16, 22));
    if (!reg.oc.livre(o, 4, 4)) continue;
    novoEdificio(reg, faz ? "fazenda" : "casa", o, { lugar: null, bairro: "Campo", murada: true, andares: r.int(1, 2) });
    n++;
  }
}

/* ============================================================
   A REGIÃO INTEIRA
   ============================================================ */
function geraRegiao(semente) {
  const r = criaSorteio(semente);
  const usados = new Set();
  const reg = { semente, r, lugares: [], bairros: [], edificios: [], vias: [], campos: [], arvores: [], cemiterios: [] };
  reg.Rv = r.entre(112, 138);
  reg.nVelha = criaRuido(r);
  if (r() < .6) { const a = r.entre(0, 6.28); reg.cidadela = { x: Math.cos(a) * reg.Rv * .5, z: Math.sin(a) * reg.Rv * .5 }; }
  geraRelevo(reg, r);
  reg.oc = criaOcupacao();
  reg.nCor = criaRuido(r);

  const cidade = reg.cidade = Object.assign({ tipo: "cidade", x: 0, z: 0 }, nomeLugar(r, usados, INICIO_CIDADE));
  reg.lugares.push(cidade);
  const nOut = criaRuido(r), baseOut = r.entre(570, 670);
  cidade.Rout = a => baseOut * (.84 + .3 * nOut(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 3));

  // Anel viário em volta da cidade velha
  const anel = [];
  for (let k = 0; k <= 80; k++) { const a = k / 80 * 2 * Math.PI, rr = raioVelha(reg, a) + 10; anel.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  reg.anel = novaVia(reg, "avenida", 12, anel);

  // Rodovias até a borda do mapa e estradas até as vilas
  const sitios = escolheSitiosVilas(reg, r);
  const M = criaMalhaCaminhos(reg);
  const saiDoAnel = (tx, tz) => { const a = Math.atan2(tz, tx), rr = raioVelha(reg, a) + 10; return [Math.cos(a) * rr, Math.sin(a) * rr]; };
  const a0 = r.entre(0, 6.28), nSaidas = r.int(3, 4);
  for (let k = 0; k < nSaidas; k++) {
    const a = a0 + k * 2 * Math.PI / nSaidas + r.entre(-.3, .3), c = Math.cos(a), s = Math.sin(a);
    const f = (METADE - 4) / Math.max(Math.abs(c), Math.abs(s));
    const [sx, sz] = saiDoAnel(c, s), pts = caminho(reg, M, sx, sz, c * f, s * f);
    if (pts) novaVia(reg, "rodovia", 11, pts);
  }
  const chegadas = [];
  for (const sv of sitios) {
    const [sx, sz] = saiDoAnel(sv.x, sv.z), pts = caminho(reg, M, sx, sz, sv.x, sv.z);
    chegadas.push(pts ? novaVia(reg, "estrada", 8, pts) : null);
  }
  if (sitios.length >= 2) {   // uma estrada ligando duas vilas
    const pts = caminho(reg, M, sitios[0].x, sitios[0].z, sitios[1].x, sitios[1].z);
    if (pts) novaVia(reg, "estrada", 6.5, pts);
  }

  // Cidade
  geraBairros(reg, r, usados);
  geraCidadeVelha(reg, r, usados);
  for (const b of reg.bairros) { if (b.tipo === "encosta") ruasDeEncosta(reg, r, b); else ruasEmGrade(reg, b); }

  // Edifícios especiais da cidade
  const viasCidade = reg.vias.filter(v => v.tipo === "rua" || v.tipo === "avenida");
  const naCidade = o => urbano(reg, o.x, o.z);
  const local = o => { const b = bairroDe(reg, o.x, o.z); return { lugar: cidade, bairro: b ? b.nome : null }; };
  const perto = viasCidade.filter(v => v.pts.some(p => Math.hypot(p[0], p[1]) < reg.Rv + 160));
  if (!colocaNaVia(reg, r, [reg.anel], "governo", 46, 34, naCidade, local) && !colocaNaVia(reg, r, perto, "governo", 46, 34, o => naCidade(o) && Math.hypot(o.x, o.z) < reg.Rv + 180, local))
    colocaSolto(reg, r, "governo", 44, 32, 0, 0, reg.Rv + 220, (x, z) => urbano(reg, x, z), { lugar: cidade, bairro: null });
  if (!colocaNaVia(reg, r, viasCidade.filter(v => v.tipo === "avenida"), "hospital", 60, 40, o => naCidade(o) && Math.hypot(o.x, o.z) < 460, local))
    colocaSolto(reg, r, "hospital", 56, 38, 0, 0, 460, (x, z) => urbano(reg, x, z), { lugar: cidade, bairro: null });
  for (let i = 0, n = r.int(6, 9); i < n; i++) colocaNaVia(reg, r, viasCidade, "escola", 42, 32, o => naCidade(o) && bairroDe(reg, o.x, o.z).tipo !== "industrial", local);
  for (let i = 0; i < 3; i++) colocaNaVia(reg, r, viasCidade, "delegacia", 30, 26, naCidade, local);
  for (const b of reg.bairros) if (b.tipo !== "industrial") for (let i = 0; i < (b.tipo === "informal" ? 2 : 1); i++) {
    const s = r.entre(22, 28);
    colocaNaVia(reg, r, viasCidade, "mesquita", s, s * r.entre(1, 1.15), o => naCidade(o) && bairroDe(reg, o.x, o.z) === b, local, 200);
  }
  for (let i = 0, n = r.int(2, 3); i < n; i++) {   // cemitérios na beira da cidade velha
    const via = reg.anel, L = via.L[via.L.length - 1];
    for (let t = 0; t < 200; t++) {
      const o = loteNaVia(via, r.entre(0, L - 140), -1, r.entre(110, 150), r.entre(60, 85));
      if (!naCidade(o) || !reg.oc.livre(o, 3, 1)) continue;
      reg.oc.poe(o); reg.cemiterios.push(o); break;
    }
  }
  // Em cada bairro: casa do líder do clã e caixa d'água no alto
  for (const b of reg.bairros) {
    const doBairro = viasCidade.filter(v => v.pts.some(p => urbano(reg, p[0], p[1]) && bairroDe(reg, p[0], p[1]) === b));
    if (!colocaNaVia(reg, r, doBairro.length ? doBairro : viasCidade, "lider", 36, 30, o => naCidade(o) && bairroDe(reg, o.x, o.z) === b, local, 400))
      colocaSolto(reg, r, "lider", 32, 26, b.x, b.z, 300, (x, z) => urbano(reg, x, z) && bairroDe(reg, x, z) === b, { lugar: cidade, bairro: b.nome });
    poeCaixaDagua(reg, r, b.x, b.z, 260, (x, z) => urbano(reg, x, z) && bairroDe(reg, x, z) === b, { lugar: cidade, bairro: b.nome });
  }
  // Postos de combustível na saída das rodovias
  for (const via of reg.vias.filter(v => v.tipo === "rodovia")) {
    const L = via.L[via.L.length - 1];
    for (let t = 0; t < L; t += 10) {
      const p = pontoEm(via, t), d = Math.hypot(p.x, p.z), ro = cidade.Rout(Math.atan2(p.z, p.x));
      if (d < ro - 10) continue;
      let feito = false;
      for (const lado of [-1, 1]) { const o = loteNaVia(via, t, lado, 28, 22); if (reg.oc.livre(o, 2, .5)) { novoEdificio(reg, "posto", o, { lugar: cidade, bairro: "Arredores" }); feito = true; break; } }
      if (feito) break;
    }
  }
  geraQuartel(reg, r);

  // Fachadas ao longo das vias e o miolo dos quarteirões
  for (const b of reg.bairros) if (b.tipo !== "encosta") loteiaQuadras(reg, r, b);
  for (const via of reg.vias) if (via.tipo !== "beco" && via.tipo !== "trilha") fachadas(reg, r, via);
  preencheMiolo(reg, r);
  for (const e of reg.edificios) if (e.lugar === reg.cidade && !e.velha && e.bairro) {
    const b = reg.bairros.find(q => q.nome === e.bairro);
    if (b && b.tipo === "informal" && (e.tipo === "casa" || e.tipo === "predio")) cresce(reg, e, 4, .8, .5);
  }

  // Vilas, campos, casas isoladas e vegetação
  sitios.forEach((s, i) => geraVila(reg, r, usados, s, chegadas[i]));
  criaZonas(reg, r, usados, sitios);
  for (const s of reg.rurais) {   // no campo: o líder mora numa fazenda grande perto da estrada
    const vias = reg.vias.filter(v => v.tipo === "estrada" || v.tipo === "rodovia" || v.tipo === "trilha");
    if (!colocaNaVia(reg, r, vias, "lider", 40, 32, o => zonaDe(reg, o.x, o.z) === s.zona && declive(reg, o.x, o.z).m < .2, { lugar: null, bairro: s.nome }, 600))
      colocaSolto(reg, r, "lider", 40, 32, s.x, s.z, 450, (x, z) => zonaDe(reg, x, z) === s.zona && declive(reg, x, z).m < .2, { lugar: null, bairro: s.nome });
    poeCaixaDagua(reg, r, s.x, s.z, 420, (x, z) => zonaDe(reg, x, z) === s.zona, { lugar: null, bairro: s.nome });
  }
  geraCasasIsoladas(reg, r);
  geraCampos(reg, r);
  geraArvores(reg, r);

  reg.nome = "Província de " + cidade.nome;
  reg.edificios.forEach((e, i) => { e.id = i; e.dono = null; });
  fechaZonas(reg);
  reg.sorteio = r;
  return reg;
}


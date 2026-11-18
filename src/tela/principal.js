"use strict";
/* ============================================================
   ENTRADA (mouse e teclado), EVENTOS DA PARTIDA E FLUXO DO JOGO
   ============================================================ */
let estado = "menu", modoInicio = "escolher", comTutorial = true;

/* ---------- mouse e teclado ---------- */
const teclas = new Set();
function ligaEntrada(canvas) {
  let ativo = null, botaoAtivo = 0, andou = 0, ux = 0, uy = 0, x0 = 0, y0 = 0, inicioChao = null, agendado = null, modo = null;
  const caixa = $("selecao-caixa");
  canvas.addEventListener("contextmenu", ev => ev.preventDefault());
  canvas.addEventListener("pointerdown", ev => {
    ativo = ev.pointerId; botaoAtivo = ev.button; andou = 0; ux = x0 = ev.clientX; uy = y0 = ev.clientY;
    modo = ev.button === 1 || (ev.button === 0 && ev.altKey) ? "girar" : ev.button === 2 ? "linha" : ev.shiftKey ? "caixa" : "mover";
    if (modo === "linha") inicioChao = chaoSob(ev.clientX, ev.clientY);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  canvas.addEventListener("pointermove", ev => {
    if (ativo === ev.pointerId) {
      const dx = ev.clientX - ux, dy = ev.clientY - uy; ux = ev.clientX; uy = ev.clientY; andou += Math.abs(dx) + Math.abs(dy);
      if (andou < 7) return;
      if (modo === "girar") { cam.giro -= dx * .006; cam.incl = limita(cam.incl + dy * .005, .25, 1.45); }
      else if (modo === "mover") { canvas.style.cursor = "grabbing"; const k = cam.dist / 620; moveCam(-dx * k, -dy * k * 1.3); }
      else if (modo === "caixa") {
        caixa.classList.remove("oculto");
        caixa.style.left = Math.min(x0, ev.clientX) + "px"; caixa.style.top = Math.min(y0, ev.clientY) + "px";
        caixa.style.width = Math.abs(ev.clientX - x0) + "px"; caixa.style.height = Math.abs(ev.clientY - y0) + "px";
      } else if (modo === "linha" && inicioChao && estado === "jogo") {
        const fim = chaoSob(ev.clientX, ev.clientY);
        if (fim) { poeLinha(linhaPrevia, [inicioChao, fim], 2); linhaPrevia.material.color.setHex(modoOrdem === "ataque" ? 0xff7a45 : 0x5ab0ff); }
      }
    } else if (ativo === null && !agendado) {
      const cx = ev.clientX, cy = ev.clientY;
      agendado = setTimeout(() => { agendado = null; apontaPara(cx, cy); }, 70);
    }
  });
  const solta = ev => {
    if (ativo !== ev.pointerId) return;
    ativo = null; canvas.style.cursor = "";
    const clique = andou < 7 && ev.type === "pointerup";
    if (modo === "caixa") {
      caixa.classList.add("oculto");
      if (!clique) selecionaNaCaixa(x0, y0, ev.clientX, ev.clientY);
    } else if (modo === "linha") {
      linhaPrevia.visible = false;
      if (clique) ordemRapida(ev.clientX, ev.clientY);
      else if (estado === "jogo" && inicioChao) { const fim = chaoSob(ev.clientX, ev.clientY); if (fim && Math.hypot(fim[0] - inicioChao[0], fim[1] - inicioChao[1]) > 15) ordemLinha(inicioChao[0], inicioChao[1], fim[0], fim[1]); }
    } else if (clique && botaoAtivo === 0) clica(ev.clientX, ev.clientY, ev.shiftKey);
    modo = null;
  };
  canvas.addEventListener("pointerup", solta); canvas.addEventListener("pointercancel", solta);
  canvas.addEventListener("wheel", ev => { ev.preventDefault(); zoom(ev.deltaY > 0 ? 1.12 : .89); }, { passive: false });
  window.addEventListener("keydown", ev => {
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "SELECT") return;
    teclas.add(ev.key.toLowerCase());
    if (ev.key === " " && estado === "jogo") { ev.preventDefault(); mudaVelocidade(partida.pausado ? partida.velocidade : 0); }
    if (ev.key === "Escape") { if (esperaClique) cancelaClique(); else if (janela) abreJanela(null); else if (contexto) fechaContexto(); else { selBat = null; escolhaFaccao = null; atualizaSelecao(); } }
  });
  window.addEventListener("keyup", ev => teclas.delete(ev.key.toLowerCase()));
  window.addEventListener("blur", () => teclas.clear());
  document.querySelectorAll("#cam button").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.cam;
    if (a === "girE") cam.giro += .4; if (a === "girD") cam.giro -= .4;
    if (a === "mais") zoom(.7); if (a === "menos") zoom(1.4);
  }));
}
function teclado() {
  const v = cam.dist * .012;
  if (teclas.has("w") || teclas.has("arrowup")) moveCam(0, -v);
  if (teclas.has("s") || teclas.has("arrowdown")) moveCam(0, v);
  if (teclas.has("a") || teclas.has("arrowleft")) moveCam(-v, 0);
  if (teclas.has("d") || teclas.has("arrowright")) moveCam(v, 0);
  if (teclas.has("q")) cam.giro += .025;
  if (teclas.has("e")) cam.giro -= .025;
}
function apontaPara(cx, cy) {
  if (estado !== "escolher" && estado !== "jogo") return;
  const e = edificioSob(cx, cy);
  marca(anelFoco, caixaFoco, e && !(contexto && contexto.alvo === e) ? e : null);
  $("cena").style.cursor = e ? "pointer" : "";
}
function clica(cx, cy, shift) {
  if (estado !== "escolher" && estado !== "jogo") return;
  if (estado === "jogo") {
    const s = soldadoSob(cx, cy);
    if (s) { if (s.faccao.jogador && s.bat) selecionaBatalhao(s.bat); mostraSoldado(s); return; }
    const sq = esquadraoPerto(cx, cy);
    if (sq) { selecionaEsquadrao(sq, shift); return; }
  }
  const e = edificioSob(cx, cy);
  if (e && esperaClique) { resolveClique(e.zona); return; }
  if (e) mostraPredio(e);
  else { fechaContexto(); if (!shift && estado === "jogo") { selecao = []; atualizaSelecao(); } }
}
/* clique perto (na tela) do centro de um esquadrão seu também seleciona: os bonecos são pequenos */
function esquadraoPerto(cx, cy) {
  const f = eu(); if (!f) return null;
  let melhor = null, md = 26;
  for (const sq of partida.esquadroes) {
    if (sq.faccao !== f || !ativos(sq).length) continue;
    for (const s of ativos(sq)) { const [sx, sy, sz] = projetaNaTela(s.x, alturaEm(regiao, s.x, s.z) + 1.5, s.z); const d = Math.hypot(sx - cx, sy - cy); if (sz < 1 && d < md) { md = d; melhor = sq; } }
  }
  return melhor;
}
function ordemRapida(cx, cy) {
  if (estado !== "jogo" || !selecao.length) return;
  dica(null);
  const e = edificioSob(cx, cy), p = e ? [e.x, e.z] : chaoSob(cx, cy);
  if (p) ordemNoPonto(p[0], p[1], e);
}
function selecionaNaCaixa(x0, y0, x1, y1) {
  const f = eu(); if (!f || estado !== "jogo") return;
  const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
  const l = partida.esquadroes.filter(sq => {
    if (sq.faccao !== f || !ativos(sq).length || !sq.bat) return false;
    const [x, z] = centroDoEsquadrao(sq), [sx, sy, sz] = projetaNaTela(x, alturaEm(regiao, x, z) + 2, z);
    return sz < 1 && sx >= ax && sx <= bx && sy >= ay && sy <= by;
  });
  if (l.length) selecionaBatalhao(l[0].bat);
}

/* ---------- rótulos dos lugares, zonas, esquadrões e pontos importantes ---------- */
function rotuloDoBatalhao(b) {
  if (rotulos.some(r => r.bat === b)) return;
  const el = document.createElement("div"); el.className = "placa-in bat";
  const foto = cria("span", "p-foto"), txt = cria("div", "p-txt"), nome = cria("span", "p-nome"), est = cria("span", "p-est");
  txt.appendChild(nome); txt.appendChild(est); el.appendChild(foto); el.appendChild(txt);
  let antes = "";
  criaRotulo("placa minha bat", el, 0, 0, 0, {
    bat: b, perto: 0, clique: () => selecionaBatalhao(b),
    atualiza: r => {
      if (b.dissolvido || b.faccao.eliminada) return false;
      r.p.set(b.base.x, alturaEm(regiao, b.base.x, b.base.z) + 16, b.base.z);
      r.d.style.setProperty("--cor", corCss(b.faccao.cor)); r.d.classList.toggle("sel", selBat === b);
      const t = b.nome + "|" + textoOrdem(b) + "|" + (b.lider ? b.lider.id : "");
      if (t !== antes) { antes = t; limpa(foto); if (b.lider) foto.appendChild(retrato(b.lider, 30)); nome.textContent = b.nome; limpa(est); est.appendChild(ico("star")); est.appendChild(cria("span", null, "comando · " + textoOrdem(b))); }
      r.d.classList.toggle("longe", cam.dist > 1300 && selBat !== b);
    }
  });
}
function rotuloDoEsquadrao(sq) {
  if (rotulos.some(r => r.sq === sq)) return;
  const el = document.createElement("div"); el.className = "placa-in";
  const foto = cria("span", "p-foto"), txt = cria("div", "p-txt"), nome = cria("span", "p-nome"), est = cria("span", "p-est"), pips = cria("span", "p-pips");
  txt.appendChild(nome); txt.appendChild(est); txt.appendChild(pips);
  el.appendChild(foto); el.appendChild(txt);
  const fogo = ico("local_fire_department", "p-fogo"); el.appendChild(fogo);
  const meu = sq.faccao.jogador;
  let liderAntes = null, assinatura = "";
  criaRotulo("placa" + (meu ? " minha" : sq.faccao.governo ? " gov" : " rival"), el, 0, 0, 0, {
    sq, perto: meu ? 0 : sq.faccao.governo ? 380 : 900, clique: () => { if (meu && sq.bat) selecionaBatalhao(sq.bat); else if (sq.lider) mostraSoldado(sq.lider); },
    atualiza: r => {
      const l = ativos(sq), n = l.length; if (!n) return false;
      const [x, z] = centroDoEsquadrao(sq); r.p.set(x, alturaEm(regiao, x, z) + 7.5, z);
      r.sempre = meu || sq.combate && cam.dist < 1600;
      if (sq.lider !== liderAntes) { liderAntes = sq.lider; limpa(foto); if (sq.lider) foto.appendChild(retrato(sq.lider, meu ? 34 : 26)); }
      const [ic, t] = estadoDoEsquadrao(sq);
      const a = sq.nome + (sq.bat ? sq.bat.id : "") + "|" + t + "|" + sq.membros.map(s => s.vida[0] + (s.arma ? 1 : 0) + (s.arma && s.municao < cargaDe(s) * POUCA_MUNICAO ? "m" : "")).join("");
      if (a !== assinatura) {
        assinatura = a; nome.textContent = sq.nome + (sq.bat ? " · " + sq.bat.nome.replace(" Batalhão", "B") : "");
        limpa(est); est.appendChild(ico(ic)); est.appendChild(cria("span", null, t));
        limpa(pips); for (const s of sq.membros) pips.appendChild(cria("i", s.vida + (s.arma ? (s.municao < cargaDe(s) * POUCA_MUNICAO ? " semmun" : "") : " desarmado")));
      }
      r.d.style.setProperty("--cor", corCss(sq.faccao.cor));
      r.d.classList.toggle("sel", selecao.includes(sq)); r.d.classList.toggle("luta", sq.combate);
      r.d.classList.toggle("longe", cam.dist > 1100 && !selecao.includes(sq) && !sq.combate);
    }
  });
}
function poeRotulos(reg) {
  for (const l of reg.lugares) {
    const c = document.createElement("div"); c.appendChild(cria("div", "n", l.nome)); c.appendChild(cria("div", "t", (l.tipo === "cidade" ? "Cidade" : "Vila") + " · " + l.sig));
    criaRotulo("lugar", c, l.x, alturaEm(reg, l.x, l.z) + (l.tipo === "cidade" ? 140 : 45), l.z, l.tipo === "vila" ? { clique: () => mostraZona(l.zona) } : {});
  }
  for (const zn of reg.zonas) {
    if (zn.tipo === "vila") continue;
    const c = document.createElement("div"); const n = cria("div", "n"); n.appendChild(ico(ICONE_ZONA[zn.tipo])); n.appendChild(cria("span", null, zn.nome)); c.appendChild(n);
    criaRotulo("bairro", c, zn.x, alturaEm(reg, zn.x, zn.z) + 40, zn.z, {
      perto: zn.tipo === "velha" ? 700 : 1400, clique: () => mostraZona(zn),
      atualiza: r => { r.d.classList.toggle("destaque", zonaDestacada === zn); r.sempre = zonaDestacada === zn; r.d.style.borderColor = zn.dono ? corCss(zn.dono.cor) : ""; }
    });
  }
  // ícones dos pontos importantes no mapa
  for (const zn of reg.zonas) for (const e of zn.chaves) {
    const el = document.createElement("span"); el.appendChild(ico(ICONE_TIPO[e.tipo]));
    const escudo = ico("shield", "esc"); el.appendChild(escudo);
    criaRotulo("marca", el, e.x, (e.topo || alturaEm(reg, e.x, e.z)) + 6, e.z, {
      perto: 900, clique: () => mostraPredio(e),
      atualiza: r => {
        r.sempre = zonaDestacada === e.zona;
        r.d.style.background = e.dono ? corCss(e.dono.cor) : "#3a4048";
        r.d.classList.toggle("destaque", zonaDestacada === e.zona);
        if (!r.proxima || performance.now() > r.proxima) { r.proxima = performance.now() + 800; escudo.style.display = partida && guarnicaoDe(partida, e).length ? "" : "none"; }
      }
    });
  }
  for (const sq of partida.esquadroes) rotuloDoEsquadrao(sq);
}

/* ---------- eventos da partida ---------- */
function ouveA(P) {
  P.ouvintes.push((tipo, d) => {
    const meu = f => f && f.jogador;
    const onde = e => [e.x, e.z], nm = e => TIPOS[e.tipo].n.toLowerCase();
    if (tipo === "edificio") {
      repinta(d.e);
      camada.sujo = true;
      if (d.adesao) {}
      else if (meu(d.antes)) aviso(d.fac.nome + " tomou seu " + nm(d.e) + " em " + d.e.zona.nome, ICONE_TIPO[d.e.tipo], "perigo", onde(d.e));
      else if (meu(d.fac) && TIPOS_CHAVE.includes(d.e.tipo)) aviso("Você tomou " + nm(d.e) + " em " + d.e.zona.nome, ICONE_TIPO[d.e.tipo], "bom", onde(d.e));
    } else if (tipo === "zona") {
      camada.sujo = true;
      if (d.dono && meu(d.dono)) aviso("Controle total de " + d.zona.nome + "!", "flag", "bom", [d.zona.x, d.zona.z]);
      else if (d.dono) aviso(d.dono.nome + " tem o controle total de " + d.zona.nome, "flag", d.dono.cor, [d.zona.x, d.zona.z]);
      else if (meu(d.antes)) aviso("Você perdeu o controle total de " + d.zona.nome, "flag", "perigo", [d.zona.x, d.zona.z]);
    } else if (["motorista", "semmotorista", "veiculoatacado", "veiculoparado", "veiculodestruido", "veiculocapturado", "veiculoatribuido", "entregou"].includes(tipo) && d.v) {
      const v = d.v, nm = VEICULOS[v.nivel - 1].n, lugar = [v.x, v.z];
      if (tipo === "motorista" && meu(v.faccao)) aviso(d.s.nome + " virou motorista d" + (v.nivel === 1 ? "a " : "o ") + nm.toLowerCase() + " do " + v.bat.nome, "local_shipping", "seu", lugar);
      else if (tipo === "semmotorista" && meu(v.faccao)) aviso(v.bat.nome + ": ninguém livre para dirigir " + nm.toLowerCase() + " (precisa de um fuzileiro num esquadrão com mais de 3)", "person_off", "perigo", lugar);
      else if (tipo === "veiculoatacado" && meu(v.faccao)) aviso(nm + " do " + (v.bat ? v.bat.nome : "batalhão") + " sob fogo de " + d.por.nome + "!", "local_fire_department", "perigo", lugar);
      else if (tipo === "veiculoatacado" && meu(d.por)) aviso("Seus soldados estão atirando num veículo de " + v.faccao.nome, "local_shipping", "seu", lugar);
      else if (tipo === "veiculoparado" && meu(v.faccao)) aviso("O motorista d" + (v.nivel === 1 ? "a " : "o ") + nm.toLowerCase() + " morreu: o veículo parou no caminho", "warning", "perigo", lugar);
      else if (tipo === "veiculoparado" && v.faccao !== eu() && hostis(partida, v.faccao, eu())) aviso("Veículo de " + v.faccao.nome + " parado sem motorista: chegue perto para levar", "local_shipping", "bom", lugar);
      else if (tipo === "veiculodestruido" && meu(v.faccao)) aviso(nm + " destruído" + (d.por ? " por " + d.por.nome : "") + (d.txt !== "vazio" ? "; a carga (" + d.txt + ") ficou com eles" : ""), "local_fire_department", "perigo", lugar);
      else if (tipo === "veiculodestruido" && d.por && meu(d.por)) aviso("Você destruiu um veículo de " + v.faccao.nome + (d.txt !== "vazio" ? " e pegou a carga: " + d.txt : ""), "local_shipping", "bom", lugar);
      else if (tipo === "veiculocapturado" && meu(d.por)) aviso("Você capturou " + nm.toLowerCase() + " de " + d.de.nome + (d.txt !== "vazio" ? " com " + d.txt : ""), "local_shipping", "bom", lugar);
      else if (tipo === "veiculocapturado" && meu(d.de)) aviso(d.por.nome + " levou seu veículo (" + nm.toLowerCase() + ")", "local_shipping", "perigo", lugar);
      else if (tipo === "veiculoatribuido" && meu(v.faccao)) aviso(nm + " foi para o " + d.b.nome, "local_shipping", "seu");
      else if (tipo === "entregou" && meu(v.faccao)) aviso(nm + " entregou na " + nomeBase(partida, d.base) + ": " + d.txt, "local_shipping", "info", lugar);
    } else if (tipo === "estoqueperdido" && meu(d.antes)) {
      aviso(d.fac.nome + " tomou a " + nomeBase(partida, d.e) + " e ficou com o estoque: " + d.txt, "warehouse", "perigo", [d.e.x, d.e.z]);
    } else if (tipo === "semdinheiroauto" && meu(d.b.faccao)) {
      aviso(d.b.nome + ": sem dinheiro para comprar " + (ehCaixa(d.k) ? MUNICOES[tipoDaCaixa(d.k)].curto.toLowerCase() : nomeItem(d.k).toLowerCase()) + " para o mínimo", ICONE_RECURSO.dinheiro, "perigo");
    } else if (tipo === "faltadeposito" && meu(d.b.faccao)) {
      aviso(d.b.nome + ": abaixo do mínimo de " + (ehCaixa(d.k) ? MUNICOES[tipoDaCaixa(d.k)].curto.toLowerCase() : nomeItem(d.k).toLowerCase()) + " e o depósito está vazio", "inventory_2", "perigo");
    } else if (tipo === "semrecruta" && meu(d.b.faccao)) {
      aviso(d.b.nome + ": abaixo do mínimo de soldados, mas não há voluntários nem dinheiro para mercenários", "group_off", "perigo");
    } else if (tipo === "adesao") {
      const lugar = [d.zona.x, d.zona.z];
      if (d.inicio && meu(d.fac)) aviso("Os moradores de " + d.zona.nome + " vão passar para o seu lado, prédio por prédio", "how_to_reg", "bom", lugar);
      else if (d.fim && meu(d.fac)) aviso(d.zona.nome + " é todo seu", "flag", "bom", lugar);
      else if (d.perde && meu(d.perde)) aviso("Seus prédios em " + d.zona.nome + " estão passando para " + d.fac.nome + ": ela tem todos os pontos importantes", "flag", "perigo", lugar);
    } else if (tipo === "defendido" && meu(d.sq.faccao)) aviso(d.sq.nome + ": " + nm(d.e) + " está defendido. Combate!", "local_fire_department", "perigo", onde(d.e));
    else if (tipo === "combate" && meu(d.sq.faccao)) { const [x, z] = centroDoEsquadrao(d.sq); aviso(d.sq.nome + " entrou em combate", "local_fire_department", "perigo", [x, z]); }
    else if (tipo === "plano" && meu(d.sq.faccao) && d.sq.lider && d.plano === "recuar") aviso(d.sq.nome + ": o líder mandou recuar", "u_turn_left", "perigo");
    else if (tipo === "baixa" && meu(d.o.faccao)) aviso(d.o.nome + (d.fatal ? " morreu" : " foi ferido e vai para tratamento"), d.fatal ? "skull" : "healing", "perigo", [d.o.x, d.o.z]);
    else if (tipo === "rendicao" && meu(d.captor)) aviso("Um inimigo se rendeu: virou prisioneiro e as armas são suas", "person_off", "bom");
    else if (tipo === "rendicao" && meu(d.s.faccao)) aviso(d.s.nome + " se rendeu a " + d.captor.nome, "person_off", "perigo");
    else if (tipo === "convenceu" && meu(d.fac)) aviso("Os moradores de " + nm(d.e) + " (" + d.e.zona.nome + ") agora apoiam você", ICONE_RECURSO.influencia, "bom", onde(d.e));
    else if (tipo === "desercao" && meu(d.s.faccao)) aviso(d.s.nome + " desertou: sem salário", "directions_run", "perigo");
    else if (tipo === "comprouComida" && meu(d.fac)) aviso((d.manual ? "Comprou " : "Faltou comida: comprou ") + d.n + " por $ " + d.custo.toLocaleString("pt-BR") + (d.deQuem && d.deQuem.length ? " de " + d.deQuem.map(([f]) => f.nome).join(", ") : "") + (d.importou ? (d.deQuem && d.deQuem.length ? " e" : "") + " importado" : ""), ICONE_RECURSO.comida, "info");
    else if (tipo === "comprouComida" && d.deQuem && d.deQuem.some(([f]) => meu(f))) aviso(d.fac.nome + " comprou comida sua: " + d.deQuem.find(([f]) => meu(f))[1], ICONE_RECURSO.dinheiro, "bom");
    else if (tipo === "vendeuComida" && meu(d.fac)) aviso("Vendeu " + d.n + " de comida por $ " + d.ganho.toLocaleString("pt-BR"), ICONE_RECURSO.dinheiro, "bom");
    else if (tipo === "obra" && meu(d.fac)) aviso(OBRAS[d.tipo].n + " começou em " + d.e.zona.nome, OBRAS[d.tipo].icone, "seu", [d.e.x, d.e.z]);
    else if (tipo === "obrapronta" && meu(d.fac)) { retingeObra(d.e); aviso(OBRAS[d.tipo].n + " pronta em " + d.e.zona.nome + ": produz " + comidaDoPredio(d.e).toFixed(0) + " de comida/h", OBRAS[d.tipo].icone, "bom", [d.e.x, d.e.z]); }
    else if (tipo === "obrapronta") retingeObra(d.e);
    else if (tipo === "obraperdida" && meu(d.fac)) aviso("Obra perdida em " + d.e.zona.nome + ": o prédio não é mais seu", "warning", "perigo", [d.e.x, d.e.z]);
    else if (tipo === "confianca" && meu(d.fac)) aviso("A confiança em " + d.zona.nome + " ficou abaixo de 50%: paga menos imposto e não dá voluntários", "sentiment_dissatisfied", "perigo", [d.zona.x, d.zona.z]);
    else if (tipo === "falta" && meu(d.fac)) aviso(d.rec === "dinheiro" ? "Sem dinheiro: sem salário, há deserção" : "Sem comida: a moral cai", ICONE_RECURSO[d.rec], "perigo");
    else if (tipo === "tratado" && meu(d.s.faccao)) aviso(d.s.nome + " voltou do tratamento (reserva do QG)", "healing", "bom");
    else if (tipo === "desvio" && meu(d.sq.faccao)) aviso(d.sq.nome + " desviou para pegar " + nm(d.e), ICONE_TIPO[d.e.tipo], "seu", onde(d.e));
    else if (tipo === "zonaconcluida" && meu(d.sq.faccao)) aviso(d.sq.nome + " terminou de tomar " + d.zona.nome, "flag", "bom");
    else if (tipo === "eliminado" && meu(d.sq.faccao)) aviso(d.sq.nome + " está fora de combate", "skull", "perigo");
    else if (tipo === "recrutou" && meu(d.fac)) { aviso((d.n ? d.n + " homens do clã chegaram" : RECRUTA[d.tipo].n + " " + d.s.nome + " chegou") + " em " + d.e.zona.nome + (d.s.arma ? "" : " (sem arma)"), RECRUTA[d.tipo].icone, "bom", onde(d.e)); if (d.s.sq) rotuloDoEsquadrao(d.s.sq); }
    else if (tipo === "recrutou" && d.s.sq) rotuloDoEsquadrao(d.s.sq);
    else if (tipo === "ofensiva" && meu(d.contra)) aviso(d.fac.nome + " está atacando seu " + nm(d.e) + " em " + d.e.zona.nome, "swords", "perigo", onde(d.e));
    else if (tipo === "contraataque" && meu(d.contra)) aviso("O governo contra-ataca: quer retomar " + nm(d.e) + " em " + d.e.zona.nome, "swords", "perigo", onde(d.e));
    else if (tipo === "evento" && meu(d.fac)) { aviso(d.texto, d.icone, d.ruim ? "perigo" : "bom", d.e ? [d.e.x, d.e.z] : null); if (d.e && d.id === "desertores") for (const q of partida.esquadroes) rotuloDoEsquadrao(q); }
    else if (tipo === "refazer" && meu(d.sq.faccao)) aviso(d.sq.nome + " voltou ao QG para se refazer", "home", "info");
    else if (tipo === "dano") repinta(d.e);
    else if (tipo === "destruido") { repinta(d.e); camada.sujo = true; if (meu(d.e.dono)) aviso("Seu " + nm(d.e) + " em " + d.e.zona.nome + " foi destruído", "skull", "perigo", onde(d.e)); else if (meu(d.s.faccao)) aviso("Seus soldados destruíram " + nm(d.e) + " em " + d.e.zona.nome, ICONE_TIPO[d.e.tipo], "seu", onde(d.e)); }
    else if (tipo === "fogoamigo" && meu(d.o.faccao)) aviso("Fogo amigo: " + d.s.nome + " acertou " + d.o.nome + (d.fatal ? " (morreu)" : ""), "local_fire_department", "perigo", [d.o.x, d.o.z]);
    else if (tipo === "vaibase" && meu(d.sq.faccao)) aviso(d.sq.nome + " vai à " + nomeBase(partida, d.base) + " fazer as trocas", "swap_horiz", "seu", [d.base.x, d.base.z]);
    else if (tipo === "trocou" && meu(d.s.faccao)) aviso(d.s.nome + " virou " + NOME_CURTO_FUNCAO[d.funcao].toLowerCase(), "swap_horiz", "bom");
    else if (tipo === "semtroca" && meu(d.s.faccao)) aviso(d.s.nome + " não pôde trocar: " + d.motivo, "swap_horiz", "perigo");
    else if (tipo === "esperando" && meu(d.s.faccao)) aviso(d.s.nome + " está esperando " + d.sq.nome + " na " + nomeBase(partida, d.base), "hourglass", "info", [d.base.x, d.base.z]);
    else if (tipo === "transferido" && meu(d.s.faccao)) { aviso(d.s.nome + " entrou em " + d.sq.nome, "swap_horiz", "bom"); rotuloDoEsquadrao(d.sq); }
    else if (tipo === "novoesquadrao" && meu(d.sq.faccao)) { aviso("Novo esquadrão formado: " + d.sq.nome, "groups", "bom", [d.base.x, d.base.z]); rotuloDoEsquadrao(d.sq); }
    else if (tipo === "promovido" && meu(d.s.faccao) && nivelPatente(d.s) >= 2) aviso(d.s.nome + " foi promovido a " + patente(d.s), "military_tech", "bom", [d.s.x, d.s.z]);
    else if (tipo === "podeliderar" && meu(d.s.faccao)) aviso(d.s.nome + " pode comandar um esquadrão: em Esquadrões, faça dele líder de um novo", "star", "seu", [d.s.x, d.s.z]);
    else if (tipo === "semlider" && meu(d.sq.faccao)) aviso("Esquadrão novo não formado: ninguém do grupo pode liderar", "star", "perigo");
    else if (tipo === "diplomacia" && (meu(d.a) || meu(d.b))) { const o = meu(d.a) ? d.b : d.a; const txt = { guerra: o.nome + (d.porQuem && !meu(d.porQuem) ? " declarou guerra a você" : " e você estão em guerra"), pacto: "Pacto de não agressão com " + o.nome, alianca: "Aliança com " + o.nome + "!", neutro: d.antes === "guerra" ? "Paz com " + o.nome : o.nome + " voltou a ser neutra" }[d.estado]; aviso(txt, ESTADOS[d.estado].icone, d.estado === "guerra" ? "perigo" : "bom"); mostraNavDiplo(); }
    else if (tipo === "diplomacia") aviso(d.a.nome + " e " + d.b.nome + ": " + ESTADOS[d.estado].n.toLowerCase(), ESTADOS[d.estado].icone, "info");
    else if (tipo === "proposta" && meu(d.p.para)) { aviso(d.p.de.nome + " propõe " + { pacto: "um pacto de não agressão", alianca: "uma aliança", paz: "paz" }[d.p.tipo] + ": veja em Diplomacia", "handshake", "seu"); mostraNavDiplo(); }
    else if (tipo === "recusada" && meu(d.p.de)) aviso(d.p.para.nome + " recusou a proposta", "handshake", "info");
    else if (tipo === "propostavenceu" && meu(d.p.para)) { aviso("A proposta de " + d.p.de.nome + " venceu sem resposta", "handshake", "info"); mostraNavDiplo(); }
    else if (tipo === "presente" && meu(d.para)) aviso(d.de.nome + " mandou um presente: " + (d.tipo === "dinheiro" ? "$ " + d.qtd : d.tipo === "comida" ? d.qtd + " de comida" : d.qtd + " " + nomeMin(d.tipo)), "volunteer_activism", "bom");
    else if (tipo === "incidente" && (meu(d.a) || meu(d.b))) aviso("Incidente com " + (meu(d.a) ? d.b : d.a).nome + ": " + d.texto + " (" + (d.valor > 0 ? "+" : "") + d.valor + ")", "campaign", d.valor > 0 ? "bom" : "perigo");
    else if (tipo === "liderfugiu" && meu(d.fac)) aviso("O QG caiu! O líder da facção fugiu para a base de " + d.para.zona.nome, "directions_run", "perigo", [d.para.x, d.para.z]);
    else if (tipo === "liderfugiu") aviso("O QG de " + d.fac.nome + " caiu; o líder fugiu", "directions_run", "info");
    else if (tipo === "eliminada") { aviso(meu(d.fac) ? "Sua facção caiu." : d.fac.nome + " foi eliminada", "skull", meu(d.fac) ? "perigo" : "seu"); camada.sujo = true; for (const e of regiao.edificios) if (!e.dono) repinta(e); }
    else if (tipo === "vitoria") aviso("Vitória! Todas as facções rivais foram eliminadas.", "star", "bom");
    else if (tipo === "novobatalhao" && meu(d.b.faccao)) { aviso(d.b.nome + " criado: " + d.b.lider.nome + " comanda da base", "groups", "bom", [d.b.base.x, d.b.base.z]); rotuloDoBatalhao(d.b); }
    else if (tipo === "ordemcumprida" && meu(d.b.faccao)) aviso(d.b.nome + " tomou " + d.b.ordem.alvo.nome + "; agora protege a área", "flag", "bom");
    else if (tipo === "ataqueconjunto" && meu(d.b.faccao)) aviso(d.b.nome + ": o líder juntou os esquadrões contra " + nm(d.e) + " em " + d.e.zona.nome, "swords", "seu", onde(d.e));
    else if (tipo === "semfrente" && meu(d.b.faccao)) aviso(d.b.nome + ": você não tem fronteira com " + d.b.ordem.alvo.nome + " ainda", "wall", "info");
    else if (tipo === "semguerra" && meu(d.b.faccao)) aviso(d.b.nome + ": a guerra acabou, passou a segurar a frente", "handshake", "info");
    else if (tipo === "sugestaorecusada" && meu(d.s.faccao)) aviso("Líder do " + d.b.nome + " não aceitou a troca de " + d.s.nome + ": " + d.motivo, "record_voice_over", "info");
    else if (tipo === "sugestaoaceita" && meu(d.s.faccao)) aviso("Líder do " + d.b.nome + " aceitou a sugestão para " + d.s.nome, "record_voice_over", "bom");
    else if (tipo === "mudoubatalhao" && meu(d.s.faccao)) aviso(d.s.nome + " está numa base esperando o " + (d.b ? d.b.nome : "novo destino"), "swap_horiz", "info");
    else if (tipo === "pedidocomando" && meu(d.s.faccao)) aviso(d.s.nome + " vai a uma base assumir um batalhão novo", "star", "seu");
    else if (tipo === "juntou" && meu(d.sq.faccao)) aviso(d.de.nome + " (" + d.n + ") se juntou a " + d.sq.nome + " no QG", "groups", "bom");
    else if (tipo === "reforcado" && meu(d.sq.faccao)) aviso(d.s.nome + " saiu da reserva e entrou em " + d.sq.nome, "person_add", "bom");
    else if (tipo === "reacao" && meu(d.sq.faccao)) aviso(d.sq.nome + " (reação rápida) foi para cima de " + d.o.faccao.nome, "bolt", "seu", [d.e.x, d.e.z]);
    else if (tipo === "lidermandou" && meu(d.b.faccao)) aviso("Líder do " + d.b.nome + " mandou " + d.sq.nome + " reforçar " + textoUmaOrdem(d.o).toLowerCase(), "record_voice_over", "seu");
    else if (tipo === "socorro" && meu(d.sq.faccao)) aviso(d.sq.nome + " foi socorrer: " + d.o.faccao.nome + " atacando perto", "lifebuoy", "seu", [d.e.x, d.e.z]);
    else if (tipo === "caca" && meu(d.sq.faccao)) aviso(d.sq.nome + " está caçando " + d.o.nome + " (" + d.o.faccao.nome + ")", MISSOES.cacar.icone, "seu", [d.e.x, d.e.z]);
    else if (tipo === "semalvo" && meu(d.sq.faccao)) aviso(d.sq.nome + " não acha inimigo que dê para vencer por perto", MISSOES.cacar.icone, "info");
    else if (tipo === "ajuda" && meu(d.sq.faccao)) { const [x, z] = centroDoEsquadrao(d.sq); aviso(d.sq.nome + " pede reforço!", "lifebuoy", "perigo", [x, z]); }
    else if (tipo === "vaiajudar" && meu(d.sq.faccao)) aviso(d.sq.nome + " vai ajudar " + d.ajudado.nome, "lifebuoy", "seu");
    else if (tipo === "apoiofim" && meu(d.sq.faccao)) aviso(d.sq.nome + ": o esquadrão que ele apoiava caiu; está sem missão", MISSOES.apoiar.icone, "perigo");
    else if (tipo === "fortificado" && meu(d.sq.faccao)) aviso("Engenheiros terminaram de fortificar " + nm(d.e) + " em " + d.e.zona.nome, "wall", "bom", onde(d.e));
    else if (tipo === "tratadocampo" && meu(d.s.faccao)) aviso(d.m.nome + " tratou " + d.s.nome + " no campo: voltou a lutar", "medical_services", "bom");
    else if (tipo === "kitacabou" && meu(d.s.faccao)) aviso("O kit médico de " + d.s.nome + " acabou: precisa de outro no QG", "medical_services", "perigo");
    else if (tipo === "recusou" && meu(d.fac)) aviso(d.s.nome + " não aceitou mudar de lado", "lock", "info");
    else if (tipo === "armou" && meu(d.s.faccao)) aviso(d.s.nome + " pegou " + nomeMin(chave(d.s.arma, d.s.nivel || 1)) + " no arsenal", "inventory_2", "bom");
    else if (tipo === "recarregar" && meu(d.sq.faccao)) aviso(d.sq.nome + " está sem munição: foi recarregar na " + nomeBase(partida, d.base), "bullet", "info", [d.base.x, d.base.z]);
    else if (tipo === "semestoque" && meu(d.sq.faccao)) aviso(d.sq.nome + " está sem munição e o estoque de " + MUNICOES[d.tipo].curto.toLowerCase() + " acabou: compre em Armas", "bullet", "perigo");
    else if (tipo === "comprou" && meu(d.fac) && d.auto) {}
    else if (tipo === "comprou" && meu(d.fac)) aviso("Comprou " + d.n + " " + nomeMin(d.item) + " no mercado negro", "storefront", "seu");
    else if (tipo === "encomendou" && meu(d.fac)) aviso("Carga de contrabando a caminho: " + d.n + " " + nomeMin(d.item), "local_shipping", "seu");
    else if (tipo === "chegoucarga" && meu(d.fac)) aviso("A carga de contrabando chegou: " + d.c.n + " " + nomeMin(d.c.item), "local_shipping", "bom");
    else if (tipo === "apreendida" && meu(d.fac)) aviso("A carga de contrabando foi apreendida no caminho", "local_shipping", "perigo");
    else if (tipo === "fabricou" && meu(d.fac)) aviso("Ficou pronto: " + nomeMin(d.item), "precision_manufacturing", "bom");
    else if (tipo === "doacao" && meu(d.fac)) aviso(d.pais.n + " mandou " + [textoItens(d.itens), d.comida ? d.comida + " de comida" : ""].filter(Boolean).join(", "), d.pais.icone, "bom");
    else if (tipo === "pedido" && meu(d.fac)) aviso(d.pais.n + " pede: tome " + nm(d.pedido.alvo) + " em " + d.pedido.alvo.zona.nome, "assignment", "seu", onde(d.pedido.alvo));
    else if (tipo === "pedidocumprido" && meu(d.fac)) aviso(d.pais.n + " gostou: pedido cumprido (+" + PEDIDO.premio + " de relação)", d.pais.icone, "bom");
    else if (tipo === "pedidoperdido" && meu(d.fac)) aviso("O prazo do pedido de " + d.pais.n + " acabou (−" + PEDIDO.castigo + ")", d.pais.icone, "perigo");
    else if (tipo === "hora") mostraRecursos();
    if (MUDA_JANELA.has(tipo)) janelaSuja = true;
    if (tipo === "missao") atualizaSelecao();
    if (tipo === "ordem" && d.sq && meu(d.sq.faccao)) marcaTutorial.ordem = true;
    if (tipo !== "ordem") atualizaEmBreve();
  });
}
let agendado = false, janelaSuja = false;
const MUDA_JANELA = new Set(["hora", "recrutou", "armou", "comprou", "encomendou", "fabricou", "chegoucarga", "apreendida", "doacao", "baixa", "tratado", "rendicao", "pedido", "pedidocumprido", "pedidoperdido", "recusou", "eliminado", "chegou", "combate", "fimcombate", "evento", "reforcado", "tratadocampo", "kitacabou", "vaibase", "diplomacia", "proposta", "propostavenceu", "presente", "novobatalhao", "ordembatalhao", "mudoubatalhao", "recarregar", "comprou", "trocou", "semtroca", "esperando", "transferido", "novoesquadrao", "pedidotroca", "pedidotransfer", "entregou", "motorista", "veiculodestruido", "veiculocapturado", "veiculoatribuido", "viagem"]);
function atualizaEmBreve() {
  if (agendado) return; agendado = true;
  setTimeout(() => { agendado = false; mostraRecursos(); mostraCombates(); atualizaSelecao(); if (contexto) desenhaContexto(); if (janela && janela !== "ajuda" && janelaSuja && !document.querySelector(".tile.arrastando")) { janelaSuja = false; desenhaJanela(); } }, 500);
}

/* ---------- fluxo da partida ---------- */
function fundar(e, nome) {
  estado = "rivais"; dica(null);
  const f = criaFaccao(partida.faccoes.length, nome, COR_JOGADOR, { jogador: true });
  const sq = fundaFaccao(partida, f, e); marcaBase(f); rotuloDoEsquadrao(sq);
  for (const b of batalhoesDe(partida, f)) rotuloDoBatalhao(b);
  fechaContexto(); selBat = tutorial ? null : sq.bat; selecao = [];
  vaiPara(e.x, e.z, 600);
  const r = partida.r, usados = new Set([nome]), tomadas = [e];
  let i = 0;
  const proxima = () => {
    if (i >= regiao.nRivais) {
      estado = "jogo"; mudaVelocidade(tutorial ? 0 : 1); mostraRecursos(); atualizaSelecao();
      aviso(regiao.nRivais + " facções rivais entraram na região", "flag", "info");
      if (!tutorial) { dica("Clique com o botão direito no mapa para mandar seu esquadrão"); setTimeout(() => dica(null), 9000); }
      return;
    }
    const base = escolhaRival(regiao, r, tomadas); tomadas.push(base);
    const fr = criaFaccao(partida.faccoes.length, nomeUnico(r, NOMES_FAC_A, NOMES_FAC_B, usados), CORES_RIVAIS[i % CORES_RIVAIS.length]);
    const sqr = fundaFaccao(partida, fr, base); marcaBase(fr); rotuloDoEsquadrao(sqr);
    i++; setTimeout(proxima, 700);
  };
  setTimeout(proxima, 500);
}
function trocaRegiao(reg) {
  if (grupoMapa) { cena.remove(grupoMapa); descarta(grupoMapa); }
  limpa($("rotulos")); rotulos = []; selecao = []; selBat = null; escolhaFaccao = null; contexto = null; janela = null; zonaDestacada = null;
  for (const id of ["contexto", "modal", "ordens", "esquadroes"]) $(id).classList.add("oculto");
  limpa($("avisos-lista")); soldadoNaJanela = null;
  regiao = reg;
  grupoMapa = montaMapa(reg); cena.add(grupoMapa);
  partida = criaPartida(reg); partida.pausado = true; ouveA(partida);
  camada = criaCamadaTerritorio(reg, geoTerreno); grupoMapa.add(camada.malha); camada.atualiza();
  tropas = criaTropas(); grupoMapa.add(tropas.grupo); atualizaTropas(tropas, partida, reg, performance.now() / 1000);
  linhaRota = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COR_JOGADOR, depthTest: false, transparent: true, opacity: .9 }));
  linhaRota.visible = false; linhaRota.renderOrder = 5; grupoMapa.add(linhaRota);
  linhaPrevia = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff7a45, depthTest: false, transparent: true, opacity: .95 }));
  linhaPrevia.visible = false; linhaPrevia.renderOrder = 6; grupoMapa.add(linhaPrevia);
  marca(anelFoco, caixaFoco, null); marca(anelEscolha, caixaEscolha, null);
}
function novaPartida(semente, nRivais) {
  estado = "gerando";
  $("menu").classList.add("oculto"); $("carregando").classList.remove("oculto");
  setTimeout(() => {
    const reg = geraRegiao(semente); reg.nRivais = nRivais;
    reg.nomeSugerido = nomeUnico(reg.sorteio, NOMES_FAC_A, NOMES_FAC_B, new Set());
    trocaRegiao(reg); poeRotulos(reg);
    cam.ax = cam.x = 0; cam.az = cam.z = 0; cam.ad = 1700; cam.giro = .5; cam.incl = .9;
    $("carregando").classList.add("oculto"); for (const id of ["topo", "cam", "avisos"]) $(id).classList.remove("oculto");
    $("nome-regiao").textContent = reg.nome;
    mostraRecursos(); mudaVelocidade(0);
    estado = "escolher";
    if (comTutorial) iniciaTutorial(); else if (tutorial) terminaTutorial(false);
    if (modoInicio === "sortear") { fundar(escolhaRival(reg, partida.r, []), reg.nomeSugerido); return; }
    dica("Clique num prédio fora da área cinza (o governo antigo) para fundar sua facção.");
  }, 40);
}
function abreMenu() {
  estado = "menu"; if (partida) partida.pausado = true;
  for (const id of ["topo", "contexto", "modal", "ordens", "esquadroes", "cam", "dica", "avisos"]) $(id).classList.add("oculto");
  contexto = null; janela = null; selecao = [];
  if (tutorial) terminaTutorial(false);
  $("menu").classList.remove("oculto");
}
function sementeNova() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function inicia() {
  const canvas = $("cena");
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { const er = $("erro"); er.classList.remove("oculto"); er.textContent = "Este navegador não conseguiu abrir o modo 3D (WebGL)."; $("menu").classList.add("oculto"); return; }
  vTmp = new THREE.Vector3(); ponteiro = new THREE.Vector2();
  preparaFormas();
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cena = new THREE.Scene(); cena.background = new THREE.Color(0xcfd3cf); cena.fog = new THREE.Fog(0xcfd3cf, 2200, 7000);
  camera = new THREE.PerspectiveCamera(42, 1, 1, 12000);
  cena.add(new THREE.HemisphereLight(0xeef0ec, 0x8a7a5a, .78));
  sol = new THREE.DirectionalLight(0xfff0d4, .95);
  sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
  sol.shadow.bias = -.0006; sol.shadow.normalBias = .6;
  cena.add(sol); cena.add(sol.target);
  raio = new THREE.Raycaster();
  anelFoco = criaAnel(0xffffff); anelEscolha = criaAnel(COR_JOGADOR);
  caixaFoco = criaCaixaSel(0xffffff); caixaEscolha = criaCaixaSel(COR_JOGADOR);
  for (const o of [anelFoco, anelEscolha, caixaFoco, caixaEscolha]) cena.add(o);
  ligaEntrada(canvas);
  document.querySelectorAll("#tempo button").forEach(b => b.addEventListener("click", () => mudaVelocidade(+b.dataset.v)));
  document.querySelectorAll("[data-janela]").forEach(b => b.addEventListener("click", () => abreJanela(janela === b.dataset.janela ? null : b.dataset.janela)));
  $("bt-menu").addEventListener("click", abreMenu);
  $("av-recolhe").addEventListener("click", () => $("avisos").classList.toggle("aberto"));

  const ajusta = () => { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); };
  window.addEventListener("resize", ajusta); ajusta();

  let nRivais = 3;
  const cx = $("rivais");
  for (let n = 1; n <= 5; n++) {
    const b = cria("button", n === nRivais ? "ativo" : null, String(n)); b.type = "button";
    b.addEventListener("click", () => { nRivais = n; cx.querySelectorAll("button").forEach(o => o.classList.toggle("ativo", o === b)); });
    cx.appendChild(b);
  }
  document.querySelectorAll("#inicio button").forEach(b => b.addEventListener("click", () => {
    modoInicio = b.dataset.modo; document.querySelectorAll("#inicio button").forEach(o => o.classList.toggle("ativo", o === b));
  }));
  comTutorial = !tutorialJaVisto();
  const marcaTu = () => document.querySelectorAll("#op-tutorial button").forEach(o => o.classList.toggle("ativo", (o.dataset.tu === "1") === comTutorial));
  document.querySelectorAll("#op-tutorial button").forEach(b => b.addEventListener("click", () => { comTutorial = b.dataset.tu === "1"; marcaTu(); }));
  marcaTu();
  $("semente").value = sementeNova();
  $("sortear").addEventListener("click", () => { $("semente").value = sementeNova(); });
  $("gerar").addEventListener("click", () => novaPartida(($("semente").value.trim() || sementeNova()).toUpperCase(), nRivais));

  let antes = performance.now(), proximoPainel = 0;
  const quadro = agora => {
    requestAnimationFrame(quadro);
    agora = agora || performance.now();
    const dt = Math.max(0, (agora - antes) / 1000); antes = agora;
    if (estado === "menu") cam.giro += .0012;
    if (estado === "jogo" && partida) {
      passoDaPartida(partida, dt);
      $("relogio").textContent = relogio(partida);
      if (agora > proximoPainel) { proximoPainel = agora + 1000; mostraEsquadroes(); mostraRotaSelecionada(); mostraCombates(); }
    }
    if (tropas && partida) atualizaTropas(tropas, partida, regiao, agora / 1000);
    if (camada && camada.sujo && agora - ultimaCamada > 250) { ultimaCamada = agora; camada.atualiza(); }
    teclado(); atualizaCamera(); atualizaRotulos(); atualizaTutorial();
    renderer.render(cena, camera);
  };
  $("carregando").classList.remove("oculto");
  setTimeout(() => {
    trocaRegiao(geraRegiao("FUNDO"));
    $("carregando").classList.add("oculto");
    requestAnimationFrame(quadro);
  }, 40);
}

if (typeof THREE === "undefined") {
  const er = $("erro"); er.classList.remove("oculto"); $("menu").classList.add("oculto");
  er.textContent = "Não foi possível carregar a biblioteca 3D. Verifique a conexão e recarregue a página.";
} else inicia();

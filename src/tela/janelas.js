"use strict";
/* ============================================================
   JANELAS (uma de cada vez, no meio da tela)
   esquadrões · recrutar · armas · facções · economia · ajuda
   ============================================================ */
const TITULO_JANELA = { gestao: ["groups", "Batalhões"], recrutar: ["person_add", "Recrutar"], armas: ["inventory_2", "Armas e arsenal"],
  faccoes: ["handshake", "Diplomacia"], economia: ["account_balance_wallet", "Economia por hora"], ajuda: ["help", "Como jogar"] };
let soldadoNaJanela = null;
function abreJanela(nome) {
  janela = nome; desenhaJanela();
  document.querySelectorAll("[data-janela]").forEach(b => b.classList.toggle("ativo", b.dataset.janela === janela));
}
function desenhaJanela() {
  const p = $("modal");
  if (!janela) { p.classList.add("oculto"); limpa(p); return; }
  const corpoAntes = p.querySelector(".j-corpo"), rolagem = corpoAntes ? corpoAntes.scrollTop : 0;
  limpa(p); p.classList.remove("oculto");
  const h = cria("div", "cab"); h.appendChild(ico(TITULO_JANELA[janela][0], "grande"));
  const t = cria("div", "tt"); t.appendChild(cria("div", "titulo", TITULO_JANELA[janela][1])); h.appendChild(t);
  h.appendChild(botao("close", null, "mini fechar", () => abreJanela(null), "Fechar (Esc)")); p.appendChild(h);
  const c = cria("div", "j-corpo"); p.appendChild(c);
  ({ faccoes: janelaFaccoes, economia: janelaEconomia, gestao: janelaGestao, recrutar: janelaRecrutar, armas: janelaArmas, ajuda: janelaAjuda })[janela](c);
  c.scrollTop = rolagem;
}
const horasAte = t => Math.max(0, Math.ceil((t - partida.tempo) / HORA));
function depoisDe(acao) { return () => { const r = acao(); if (r === false) aviso("Não deu: falta recurso ou não é permitido agora", "info", "info"); mostraRecursos(); desenhaJanela(); mostraEsquadroes(); }; }

/* ---------- arsenal (faixa com ícones) ---------- */
function faixaArsenal(pai, f) {
  const a = cria("div", "arsenal");
  for (const b of BASES_ARMA) {
    const tot = noArsenal(f, b), c = cria("div", "a-item" + (tot ? "" : " zero")); c.title = nomeItem(b);
    c.appendChild(icoArma(b)); c.appendChild(cria("span", "a-nome", nomeItem(b).replace(" (RPG)", "")));
    const nv = cria("div", "a-niveis");
    for (const n of [1, 2, 3]) { const q = f.arsenal[chave(b, n)] || 0, x = cria("span", q ? "" : "zero"); x.appendChild(cria("i", null, NIVEL.romano[n - 1])); x.appendChild(cria("b", null, String(q))); nv.appendChild(x); }
    c.appendChild(nv); a.appendChild(c);
  }
  pai.appendChild(a);
  const m = cria("div", "arsenal municoes");
  const usam = t => partida.soldados.filter(s => s.faccao === f && s.vida === "ok" && s.arma && MUNICAO_DA[s.arma] === t);
  for (const [t, d] of Object.entries(MUNICOES)) {
    const l = t === "suprimento" ? partida.soldados.filter(s => s.faccao === f && s.vida === "ok" && cargaSuprimento(s)) : usam(t), carregado = l.reduce((x, s) => x + (t === "suprimento" ? s.suprimentos || 0 : s.municao), 0), c = cria("div", "a-item" + (f.municao[t] ? "" : " zero"));
    c.appendChild(ico(d.icone)); c.appendChild(cria("b", null, f.municao[t].toLocaleString("pt-BR"))); c.appendChild(cria("span", "a-nome", d.curto + " no estoque"));
    if (l.length) c.appendChild(cria("small", null, Math.round(carregado / Math.max(1, l.reduce((x, s) => x + (t === "suprimento" ? cargaSuprimento(s) : cargaDe(s)), 0)) * 100) + "% nas mãos de " + l.length));
    c.title = d.n + ": cada soldado leva " + d.carga + "; caixa com " + d.caixa;
    m.appendChild(c);
  }
  pai.appendChild(m);
}
/* ---------- esquadrões: arrastar soldados, trocar função ---------- */
/* ---------- batalhões: orçamento (soldados e equipamento) e esquadrões ---------- */
let batNaJanela = null;
const destinoTexto = d => d === "novo" ? "esquadrão novo" : d === "bat" ? "outro batalhão" : d.nome;
function tileSoldado(s, aoClicar, arrastavel) {
  const sq = s.sq, c = cria("div", "tile" + (soldadoNaJanela === s ? " sel" : "") + (sq && sq.lider === s ? " lider" : "") + (s.arma ? "" : " desarmado"));
  c.draggable = !!arrastavel;
  c.appendChild(retrato(s, 48));
  if (sq && sq.lider === s) { const st = ico("star", "estrela"); st.title = "Sargento"; c.appendChild(st); }
  else if (podeLiderar(s)) { const st = ico("star", "estrela apto"); st.title = "Pode comandar um batalhão"; c.appendChild(st); }
  c.appendChild(cria("div", "t-nome", s.nome));
  const fn = cria("div", "t-fun"); fn.appendChild(icoFuncao(s.funcao)); fn.appendChild(cria("span", null, sq && sq.lider === s ? "Sargento" : NOME_CURTO_FUNCAO[s.funcao])); c.appendChild(fn);
  c.appendChild(divisas(s));
  if (s.arma) { const mb = cria("div", "t-mun"), mf = cria("i"); mf.style.width = Math.min(100, s.municao / cargaDe(s) * 100) + "%"; if (s.municao < cargaDe(s) * POUCA_MUNICAO) mb.classList.add("pouca"); mb.appendChild(mf); c.appendChild(mb); }
  else { const w = cria("div", "t-sem"); w.appendChild(ico("block")); w.appendChild(cria("span", null, "sem arma")); c.appendChild(w); }
  if (s.pedido) {
    const w = cria("div", "t-pedido"); w.appendChild(ico("swap_horiz"));
    w.appendChild(cria("span", null, s.pedido.tipo === "funcao" ? NOME_CURTO_FUNCAO[s.pedido.funcao] : s.pedido.tipo === "comandar" ? "comandar" : s.pedido.destino === "bat" ? (s.pedido.bat ? s.pedido.bat.nome : "sem batalhão") : destinoTexto(s.pedido.destino)));
    if (!s.pedido.peloLider) w.appendChild(botao("close", null, "mini", ev => { ev.stopPropagation(); cancelaPedido(s); desenhaJanela(); mostraEsquadroes(); }, "Cancelar"));
    w.title = s.pedido.peloLider ? "Decisão do líder do batalhão (feita na base)" : "Pedido (feito na base)";
    c.appendChild(w); c.classList.add("com-pedido");
  }
  c.addEventListener("click", () => { soldadoNaJanela = s; if (aoClicar) aoClicar(s); desenhaJanela(); });
  return c;
}
function estadoVeiculo(v) {
  if (v.estado === "abandonado") return ["warning", "Parado sem motorista", "perigo"];
  if (v.motorista && partida.tempo < (v.motoristaChega || 0)) return ["directions_walk", "Motorista " + v.motorista.nome + " a caminho", "calmo"];
  if (!v.motorista) return ["person_off", "Sem motorista", "perigo"];
  if (v.rota && v.estado === "buscando") return ["local_shipping", "Indo buscar no " + nomeBase(partida, v.plano.de), "anda"];
  if (v.rota && v.estado === "levando") return ["local_shipping", "Levando para a " + nomeBase(partida, v.plano.para), "anda"];
  return ["garage", v.em ? "Parado na " + nomeBase(partida, v.em) : "Parado na estrada", "calmo"];
}
function painelLogistica(p, f, b) {
  const vs = (f.veiculos || []).filter(v => v.bat === b);
  p.appendChild(cria("div", "rotulo-peq", "Veículos de logística do batalhão"));
  if (!vs.length) p.appendChild(cria("div", "nota" + (b.base !== f.base ? " alerta" : ""), b.base !== f.base ? "Nenhum veículo: o que está no QG não chega à base deste batalhão. Compre um em Armas ou passe um de outro batalhão." : "Nenhum veículo. Com um, o líder também abastece as bases avançadas perto dos esquadrões."));
  for (const v of vs) p.appendChild(linhaVeiculo(f, v));
  const outros = (f.veiculos || []).filter(v => v.bat !== b);
  if (outros.length) {
    const d = cria("details", "outros-v"); d.appendChild(cria("summary", null, outros.length + " veículo(s) de outros batalhões"));
    for (const v of outros) d.appendChild(linhaVeiculo(f, v, b));
    p.appendChild(d);
  }
  // estoques das bases avançadas
  const avs = basesDe(partida, f).filter(e => tipoDaBase(partida, f, e) === "avancada");
  if (avs.length) {
    p.appendChild(cria("div", "rotulo-peq", "Bases avançadas (cada uma tem seu estoque)"));
    for (const e of avs) {
      const l = cria("div", "base-l"); l.appendChild(ico("warehouse")); l.appendChild(cria("b", null, nomeBase(partida, e)));
      l.appendChild(cria("span", null, textoCarga(estoqueDaBase(e))));
      l.appendChild(botao("my_location", null, "mini", () => vaiPara(e.x, e.z, 200), "Ir até a base"));
      p.appendChild(l);
    }
  }
}
function linhaVeiculo(f, v, passarPara) {
  const l = cria("div", "veic"), V = VEICULOS[v.nivel - 1];
  l.appendChild(icoArma(chave("veiculo", v.nivel)));
  const t = cria("div", "veic-t"); t.appendChild(cria("b", null, V.n + (v.bat ? " · " + v.bat.nome : "")));
  const [ic, txt, tom] = estadoVeiculo(v); const st = cria("span", "veic-st " + tom); st.appendChild(ico(ic)); st.appendChild(cria("span", null, txt)); t.appendChild(st);
  t.appendChild(cria("small", null, "Carga " + volumeCarga(v.carga) + "/" + V.carga + ": " + textoCarga(v.carga)));
  l.appendChild(t);
  const vb = cria("div", "veic-vida"), vf = cria("i"); vf.style.width = Math.max(0, v.vida / V.vida * 100) + "%"; vb.title = "Vida " + Math.round(v.vida) + "/" + V.vida; vb.appendChild(vf); l.appendChild(vb);
  l.appendChild(botao("my_location", null, "mini", () => vaiPara(v.x, v.z, 160), "Ir até o veículo"));
  if (passarPara) l.appendChild(botao("move_down", "Trazer", "mini", () => { atribuiVeiculo(partida, v, passarPara); desenhaJanela(); }, "Passar para o " + passarPara.nome + " (o motorista volta para o batalhão dele)"));
  return l;
}
function janelaGestao(p) {
  const f = eu(); if (!f) return;
  const bats = batalhoesDe(partida, f);
  if (!batNaJanela || !bats.includes(batNaJanela)) batNaJanela = bats[0] || null;
  let arrastando = null;
  const soltar = (el, aoSoltar, aceita) => {
    el.addEventListener("dragover", ev => { if (arrastando && aceita(arrastando)) { ev.preventDefault(); el.classList.add("sobre"); } });
    el.addEventListener("dragleave", () => el.classList.remove("sobre"));
    el.addEventListener("drop", ev => { ev.preventDefault(); el.classList.remove("sobre"); if (arrastando && aceita(arrastando)) { aoSoltar(arrastando); desenhaJanela(); mostraEsquadroes(); } });
  };
  const arrasta = c => { const s = soldadoNaJanela; return c; };
  const tile = (s, arrastavel) => {
    const c = tileSoldado(s, null, arrastavel);
    c.addEventListener("dragstart", ev => { arrastando = s; c.classList.add("arrastando"); ev.dataTransfer.setData("text/plain", String(s.id)); });
    c.addEventListener("dragend", () => { arrastando = null; c.classList.remove("arrastando"); });
    return c;
  };
  const duas = cria("div", "duas-col bats"); p.appendChild(duas);
  const esq = cria("div", "col-esq"), dir = cria("div", "col-dir larga"); duas.appendChild(esq); duas.appendChild(dir);
  // lista de batalhões (alvo para soltar soldados = passar para o batalhão)
  for (const b of porPrioridade(partida, f)) {
    const it = cria("div", "bat-item" + (b === batNaJanela ? " sel" : ""));
    const pr = cria("div", "prio"); pr.appendChild(cria("b", null, b.prioridade + "º"));
    if (bats.length > 1) { pr.appendChild(botao("expand_less", null, "mini", ev => { ev.stopPropagation(); mudaPrioridade(partida, b, -1); desenhaJanela(); }, "Mais prioridade")); pr.appendChild(botao("expand_more", null, "mini", ev => { ev.stopPropagation(); mudaPrioridade(partida, b, 1); desenhaJanela(); }, "Menos prioridade")); }
    pr.title = "Prioridade: quem é reposto primeiro quando falta no depósito ou no caixa"; it.appendChild(pr);
    if (b.lider) it.appendChild(retrato(b.lider, 32));
    const tt = cria("div"); tt.appendChild(cria("b", null, b.nome)); tt.appendChild(cria("small", null, soldadosDe(partida, b).length + " soldados · base: " + nomeBase(partida, b.base))); it.appendChild(tt);
    it.addEventListener("click", () => { batNaJanela = b; soldadoNaJanela = null; desenhaJanela(); });
    soltar(it, s => passaSoldado(partida, s, b), s => s.bat !== b && !s.cargo);
    esq.appendChild(it);
  }
  const lim = limiteBatalhoes(partida, f);
  esq.appendChild(cria("div", "nota", bats.length + " de " + lim + " batalhões (abre mais um a cada " + BATALHAO.prediosPorBatalhao + " prédios)"));
  // sem batalhão
  const semBat = partida.soldados.filter(s => s.faccao === f && !s.bat && !s.cargo && (s.vida === "ok" || s.vida === "reserva"));
  const sb = cria("div", "bat-item sem"); sb.appendChild(ico("person_off")); const tt = cria("div"); tt.appendChild(cria("b", null, "Sem batalhão")); tt.appendChild(cria("small", null, semBat.length + " soldados")); sb.appendChild(tt);
  soltar(sb, s => passaSoldado(partida, s, null), s => !!s.bat && !s.cargo);
  esq.appendChild(sb);
  if (semBat.length) { const gr = cria("div", "tiles mini"); for (const s of semBat) gr.appendChild(tile(s, true)); esq.appendChild(gr); }
  esq.appendChild(cria("div", "dica-j", "Arraste soldados para um batalhão: é o orçamento de gente. O líder monta os esquadrões."));
  // novo batalhão
  if (bats.length < lim) {
    const cand = candidatosACmd(partida, f);
    const nb = cria("div", "secao"); nb.appendChild(cria("div", "rotulo-peq", "Novo batalhão: escolha o comandante"));
    if (!cand.length) nb.appendChild(cria("div", "nota", "Ninguém pode comandar ainda: precisa ser Veterano ou ter liderança " + LIDERANCA_PARA_LIDERAR + "."));
    for (const s of cand.slice(0, 6)) {
      const l = cria("div", "preso"); l.appendChild(retrato(s, 30)); const t2 = cria("div", "pr-tt"); t2.appendChild(cria("b", null, s.nome)); t2.appendChild(cria("span", null, patente(s) + " · liderança " + Math.round(s.atr.lideranca))); l.appendChild(t2);
      l.appendChild(botao("star", "Comandar", null, () => { const r = pedeComando(partida, s); if (r) aviso(r, "info", "info"); desenhaJanela(); mostraEsquadroes(); }, "Ele vai a uma base e assume o batalhão novo (comanda de lá)"));
      nb.appendChild(l);
    }
    esq.appendChild(nb);
  }
  const b = batNaJanela; if (!b) return;
  // cabeçalho do batalhão
  const cab = cria("div", "ficha-cab"); if (b.lider) cab.appendChild(retrato(b.lider, 64));
  const ct = cria("div"); ct.appendChild(cria("div", "titulo", b.nome));
  ct.appendChild(cria("div", "sub", "Líder " + (b.lider ? b.lider.nome + " (" + patente(b.lider) + ", liderança " + Math.round(b.lider.atr.lideranca) + ")" : "?") + " · comanda da " + nomeBase(partida, b.base)));
  ct.appendChild(cria("div", "sub", textoOrdem(b) + " · postura " + POSTURAS[b.postura].n.toLowerCase()));
  cab.appendChild(ct); dir.appendChild(cab);
  if (f.batalhaoPadrao !== b) dir.appendChild(botao("person_add", "Recrutas novos vão para este batalhão", "largo", () => { f.batalhaoPadrao = b; desenhaJanela(); }));
  else dir.appendChild(cria("div", "nota", "Recrutas novos vêm para este batalhão."));
  // estoque do batalhão com mínimo: o jogo repõe sozinho do depósito geral
  dir.appendChild(cria("div", "rotulo-peq", "Estoque do batalhão (na base do líder) · defina o mínimo: o que faltar é comprado ou fabricado sozinho"));
  const tab = cria("div", "orc");
  const cabOrc = cria("div", "orc-l cab"); for (const [t, c] of [["", ""], ["Depósito", "orc-q dep"], ["Batalhão", "orc-q"], ["Mínimo", "orc-q min"]]) cabOrc.appendChild(cria("span", c, t)); tab.appendChild(cabOrc);
  b.minimo = b.minimo || {};
  const linhaMin = (k, icone, nome, noDep, noBat, passo, detalhe) => {
    const m = b.minimo[k] || 0, l = cria("div", "orc-l" + (m && noBat < m ? " falta" : ""));
    const n = cria("div", "orc-n"); n.appendChild(icone); const nt = cria("span", null, nome); if (detalhe) nt.appendChild(cria("small", null, " " + detalhe)); n.appendChild(nt); l.appendChild(n);
    l.appendChild(cria("span", "orc-q dep", noDep == null ? "–" : noDep.toLocaleString("pt-BR")));
    l.appendChild(cria("span", "orc-q", noBat.toLocaleString("pt-BR")));
    const mn = cria("div", "orc-min");
    const menos = botao("remove", null, "mini", () => { b.minimo[k] = Math.max(0, m - passo); desenhaJanela(); }, "Menos"); menos.disabled = !m; mn.appendChild(menos);
    mn.appendChild(cria("b", m ? null : "zero", m ? m.toLocaleString("pt-BR") : "—"));
    mn.appendChild(botao("add", null, "mini", () => { b.minimo[k] = m + passo; desenhaJanela(); }, "Mais"));
    l.appendChild(mn);
    l.title = m && noBat < m ? (k === "soldados" ? "Abaixo do mínimo: recruta voluntários e, sem eles, mercenários" : noDep ? "Abaixo do mínimo: repondo do depósito" : "Abaixo do mínimo e o depósito está vazio: compre em Armas") : "";
    tab.appendChild(l);
  };
  linhaMin("soldados", ico("groups"), "Soldados", null, soldadosDe(partida, b).length, 1, "(recruta sozinho)");
  for (const t of Object.keys(MUNICOES)) linhaMin("cx-" + t, ico(MUNICOES[t].icone), MUNICOES[t].curto, f.municao[t], b.municao[t], MUNICOES[t].caixa);
  for (const bb of BASES_ARMA) {
    const niveis = [1, 2, 3].map(n => b.arsenal[chave(bb, n)] || 0), det = niveis[1] || niveis[2] ? "(" + niveis.map((q, i) => q ? q + "×" + NIVEL.romano[i] : "").filter(Boolean).join(" ") + ")" : "";
    linhaMin(bb, icoArma(bb), nomeItem(bb), noArsenal(f, bb), noArsenal(b, bb), 1, det);
  }
  dir.appendChild(tab);
  dir.appendChild(cria("div", "nota", "O que faltar para o mínimo é fabricado (se tiver oficina com fila curta) ou comprado no mercado negro, e chega ao QG. " + (b.base === f.base ? "Este batalhão fica no QG: pega direto do depósito." : "Este batalhão fica na " + nomeBase(partida, b.base) + ": um veículo de logística leva do QG até lá.") + " Com pouco no QG, o batalhão de prioridade mais alta pega antes."));
  painelLogistica(dir, f, b);
  // esquadrões (você sugere; o líder decide)
  dir.appendChild(cria("div", "rotulo-peq", "Esquadrões: arraste para sugerir uma troca, clique para sugerir função"));
  for (const sq of esquadroesDe(partida, b)) {
    const caixa = cria("div", "secao-esq");
    const [ic, txt, tom] = estadoDoEsquadrao(sq);
    const t = cria("div", "esq-tit " + tom); t.appendChild(ico(ic)); t.appendChild(cria("b", null, sq.nome)); t.appendChild(cria("span", null, txt));
    t.appendChild(botao("my_location", null, "mini", () => { const [x, z] = centroDoEsquadrao(sq); vaiPara(x, z, 180); }, "Ir até o esquadrão")); caixa.appendChild(t);
    const gr = cria("div", "tiles"); for (const s of ativos(sq)) gr.appendChild(tile(s, true)); caixa.appendChild(gr);
    soltar(caixa, s => { const r = sugere(partida, s, { tipo: "transferir", destino: sq }); if (!r.ok && r.motivo) aviso("O líder não aceitou: " + r.motivo, "record_voice_over", "info"); }, s => s.bat === b && s.sq !== sq);
    dir.appendChild(caixa);
  }
  const esperando = f.reserva.filter(s => s.bat === b);
  if (esperando.length) { const c = cria("div", "secao-esq"); c.appendChild(cria("div", "esq-tit calmo", "Esperando nas bases: o líder vai buscar ou formar esquadrão")); const gr = cria("div", "tiles mini"); for (const s of esperando) gr.appendChild(tile(s, true)); c.appendChild(gr); dir.appendChild(c); }
  // soldado clicado: sugerir função
  const s = soldadoNaJanela && soldadoNaJanela.bat === b && soldadoNaJanela.vida === "ok" ? soldadoNaJanela : null;
  if (s) {
    const fx = cria("div", "secao sug");
    const fc = cria("div", "ficha-cab"); fc.appendChild(retrato(s, 48)); const ft = cria("div"); ft.appendChild(cria("b", null, s.nome)); ft.appendChild(cria("div", "sub", patente(s) + " · " + (s.sq ? s.sq.nome : "")));
    fc.appendChild(ft); fx.appendChild(fc);
    fx.appendChild(cria("div", "rotulo-peq", "Sugerir função ao líder do batalhão"));
    const fs = cria("div", "funcoes");
    for (const k of Object.keys(FUNCOES).filter(k => k !== "lider")) {
      const atual = k === s.funcao, motivo = atual ? null : motivoFuncao(partida, s, k);
      const bt = botaoGrande(icoFuncao(k), NOME_CURTO_FUNCAO[k], atual ? "atual" : null, () => { const r = sugere(partida, s, { tipo: "funcao", funcao: k }); if (!r.ok && r.motivo) aviso("O líder não aceitou: " + r.motivo, "record_voice_over", "info"); desenhaJanela(); }, motivo, atual ? "ativo" : "");
      if (atual) bt.disabled = true; fs.appendChild(bt);
    }
    fx.appendChild(fs);
    fx.appendChild(botao("person", "Ver ficha completa", "largo", () => { abreJanela(null); mostraSoldado(s); }));
    dir.appendChild(fx);
  }
}

/* ---------- recrutar ---------- */
function janelaRecrutar(p) {
  const f = eu(); if (!f) return;
  const g = cria("div", "rec-grade"); p.appendChild(g);
  const cartao = (tipo, titulo, linhas) => {
    const R = RECRUTA[tipo], c = cria("div", "rec-cartao");
    const t = cria("div", "rc-tit"); t.appendChild(ico(R.icone, "grande")); t.appendChild(cria("b", null, titulo)); c.appendChild(t);
    const custo = cria("div", "rc-custo");
    if (R.dinheiro) { custo.appendChild(ico(ICONE_RECURSO.dinheiro)); custo.appendChild(cria("span", null, "$ " + R.dinheiro)); }
    if (R.influencia) { custo.appendChild(ico(ICONE_RECURSO.influencia)); custo.appendChild(cria("span", null, R.influencia + " de influência")); }
    c.appendChild(custo);
    const ul = cria("div", "rc-info"); for (const [i, x] of linhas) { const l = cria("div"); l.appendChild(ico(i)); l.appendChild(cria("span", null, x)); ul.appendChild(l); } c.appendChild(ul);
    g.appendChild(c); return c;
  };
  // voluntários
  const cv = cartao("voluntario", "Voluntários", [["home_pin", "Moradores dos seus bairros"], ["block", "Chegam sem arma"], ["location_on", "Aparecem no bairro deles"]]);
  const vz = zonasComVoluntarios(f);
  if (!vz.length) cv.appendChild(cria("div", "motivo", "Nenhum bairro seu tem voluntários agora. Quanto mais casas e influência, mais gente aparece."));
  for (const { zona, n } of vz) {
    const m = podeRecrutar(partida, f, "voluntario", zona);
    const b = botao("person_add", "Recrutar em " + zona.nome + " (" + n + ")", "principal largo", depoisDe(() => { const s = recrutaVoluntario(partida, f, zona); if (s && s.sq) rotuloDoEsquadrao(s.sq); }));
    if (m) { b.disabled = true; b.title = m; } cv.appendChild(b);
  }
  // mercenários
  const cm = cartao("mercenario", "Mercenários", [["military_tech", "Já vêm armados e treinados"], [ICONE_RECURSO.dinheiro, "Salário de $ " + RECRUTA.mercenario.salario + "/h (os outros: $ " + SALARIO + ")"], ["location_on", "Chegam pelo prédio seu mais perto da borda do mapa"]]);
  const mm = podeRecrutar(partida, f, "mercenario");
  const bm = botao("paid", "Contratar um", "principal largo", depoisDe(() => { const s = recrutaMercenario(partida, f); if (s && s.sq) rotuloDoEsquadrao(s.sq); }));
  if (mm) { bm.disabled = true; cm.appendChild(cria("div", "motivo", mm)); } cm.appendChild(bm);
  // clã
  const cc = cartao("cla", "Homens do clã", [["diversity_3", RECRUTA.cla.qtd + " homens armados de uma vez"], ["schedule", "Uma vez por dia por casa"], ["location_on", "Aparecem na casa do líder"]]);
  const casas = partida.reg.edificios.filter(e => e.tipo === "lider" && e.dono === f);
  if (!casas.length) cc.appendChild(cria("div", "motivo", "Você precisa ter a casa de um líder de clã (ícone de medalha no mapa)."));
  for (const e of casas) {
    const pronto = (e.claPronto || 0) <= partida.tempo, m = podeRecrutar(partida, f, "cla", e);
    const b = botao("diversity_3", e.zona.nome + (pronto ? "" : " (em " + horasAte(e.claPronto) + " h)"), "principal largo", depoisDe(() => { const l = recrutaCla(partida, f, e); if (l && l[0].sq) rotuloDoEsquadrao(l[0].sq); }));
    if (m) { b.disabled = true; b.title = m; } cc.appendChild(b);
  }
  // prisioneiros
  const cp = cartao("prisioneiro", "Prisioneiros", [["swap_horiz", "Podem mudar de lado"], ["casino", "Nem todos aceitam"], ["home", "Chegam sem arma, no QG"]]);
  const presos = f.prisioneiros.filter(s => s.vida === "rendido");
  if (!presos.length) cp.appendChild(cria("div", "motivo", "Você não tem prisioneiros. Inimigos com moral baixa se rendem."));
  const lp = cria("div", "presos");
  for (const s of presos) {
    const l = cria("div", "preso"); l.appendChild(retrato(s, 36));
    const tt = cria("div", "pr-tt"); tt.appendChild(cria("b", null, s.nome)); tt.appendChild(cria("span", null, "era de " + s.faccao.nome + (s.recusou ? " · recusou " + s.recusou + "×" : ""))); l.appendChild(tt);
    const m = podeRecrutar(partida, f, "prisioneiro", s);
    const b = botao("handshake", "Convencer", null, depoisDe(() => { const r = convencePrisioneiro(partida, f, s); if (r && s.sq) rotuloDoEsquadrao(s.sq); })); if (m) { b.disabled = true; b.title = m; }
    l.appendChild(b); lp.appendChild(l);
  }
  cp.appendChild(lp);
}

/* ---------- armas ---------- */
let nivelNaJanela = 1;
function janelaArmas(p) {
  const f = eu(); if (!f) return;
  p.appendChild(cria("div", "rotulo-peq", "Depósito do QG: compras, fábricas e doações chegam aqui · os veículos levam para as bases dos batalhões"));
  faixaArsenal(p, f);
  const ns = partida.soldados.filter(s => s.faccao === f && s.vida === "ok" && !s.arma).length;
  if (ns) { const a = cria("div", "dica-j alerta"); a.appendChild(ico("warning")); a.appendChild(cria("span", null, ns + " soldado(s) sem arma. Mande o esquadrão para uma base que eles pegam sozinhos.")); p.appendChild(a); }
  // nível: escolhe qual nível aparece na tabela
  const nv = cria("div", "niveis");
  nv.appendChild(cria("span", "rotulo-peq", "Nível"));
  for (const n of [1, 2, 3]) {
    const b = botao(null, null, "nivel-bt" + (nivelNaJanela === n ? " ativo" : ""), () => { nivelNaJanela = n; desenhaJanela(); });
    b.appendChild(cria("b", null, NIVEL.romano[n - 1]));
    b.appendChild(cria("small", null, n === 1 ? "preço base" : NIVEL.preco[n - 1] + "x o preço · +" + Math.round((NIVEL.precisao[n - 1] - 1) * 100) + "% precisão · +" + Math.round((NIVEL.dano[n - 1] - 1) * 100) + "% dano"));
    nv.appendChild(b);
  }
  p.appendChild(nv);
  const pts = pontosDeFabrica(partida, f), risco = riscoContrabando(partida, f);
  const tab = cria("div", "armas-tab");
  const cab = cria("div", "at-linha cab");
  for (const [i, t, sub] of [[null, "", ""], ["storefront", "Mercado negro", "chega na hora"], ["local_shipping", "Contrabando", CONTRABANDO.horas + " h · risco " + Math.round(risco * 100) + "%"], ["precision_manufacturing", "Fabricar", pts.leve ? pts.leve + " pontos/h" + (pts.pesada ? "" : " (sem fábrica)") : "sem oficina"]]) {
    const c = cria("div", "at-cab"); if (i) c.appendChild(ico(i)); c.appendChild(cria("b", null, t)); c.appendChild(cria("small", null, sub)); cab.appendChild(c);
  }
  tab.appendChild(cab);
  const linhaItem = k => {
    const l = cria("div", "at-linha");
    const n = cria("div", "at-item"); n.appendChild(icoItem(k)); n.appendChild(cria("span", null, nomeItem(k).replace(" (RPG)", ""))); l.appendChild(n);
    const preco = precoDe(k);
    const bm = botao(null, "$ " + preco.toLocaleString("pt-BR"), "at-bt", depoisDe(() => compra(partida, f, k)), "Comprar 1"); bm.disabled = f.recursos.dinheiro < preco; l.appendChild(bm);
    const pc = Math.round(preco * CONTRABANDO.desconto);
    const bc = botao(null, "$ " + pc.toLocaleString("pt-BR"), "at-bt", depoisDe(() => encomenda(partida, f, k)), "Encomendar 1 pelo contrabando"); bc.disabled = f.recursos.dinheiro < pc; l.appendChild(bc);
    const mf = podeFabricar(partida, f, k), pf = Math.round(preco * FABRICACAO.material);
    const h = Math.ceil(pontosDoItem(k) / Math.max(1, itemPesado(k) ? pts.pesada : pts.leve));
    const bf = botao(null, mf ? "—" : "$ " + pf.toLocaleString("pt-BR") + " · ~" + h + " h", "at-bt", depoisDe(() => fabrica(partida, f, k)), mf || "Fabricar 1 (paga o material)"); bf.disabled = !!mf; l.appendChild(bf);
    return l;
  };
  for (const cat of ["Básica", "Suporte", "Kits"]) {
    tab.appendChild(cria("div", "at-sec", cat === "Kits" ? "Kits (médico e engenheiro)" : cat === "Suporte" ? "Suporte (AR, granadeiro, AT)" : "Básica"));
    for (const b of BASES_ARMA.filter(b => CATEGORIA[b] === cat)) tab.appendChild(linhaItem(chave(b, nivelNaJanela)));
  }
  tab.appendChild(cria("div", "at-sec", "Munição (caixas)"));
  for (const t of Object.keys(MUNICOES)) if (t !== "suprimento") tab.appendChild(linhaItem("cx-" + t));
  tab.appendChild(cria("div", "at-sec", "Suprimentos (médico trata, engenheiro fortifica e reconstrói) · caixa de " + MUNICOES.suprimento.caixa + ": " + (totalSuprimentos(partida, f)) + " no total"));
  tab.appendChild(linhaItem("cx-suprimento"));
  const vn = VEICULOS[nivelNaJanela - 1];
  tab.appendChild(cria("div", "at-sec", "Veículo de logística · " + vn.n + ": leva " + vn.carga + " volumes, aguenta " + vn.vida + " de dano"));
  tab.appendChild(linhaItem(chave("veiculo", nivelNaJanela)));
  p.appendChild(tab);
  p.appendChild(cria("div", "nota", "Níveis melhores: o soldado troca sozinho pela melhor arma da função quando passa numa base. Kit médico melhor: mais usos e cura mais; explosivos melhores: o engenheiro fortifica mais rápido. Nível III e armas de suporte só saem de fábrica. Cada posto de gasolina seu diminui o risco do contrabando."));
  // a caminho
  if (f.cargas.length || f.producao.length) {
    const b = cria("div", "secao"); b.appendChild(cria("div", "rotulo-peq", "A caminho"));
    for (const c of f.cargas) { const l = cria("div", "caminho"); l.appendChild(ico("local_shipping")); l.appendChild(icoItem(c.item, "peq")); l.appendChild(cria("span", null, c.n + " " + nomeMin(c.item) + " · chega em " + horasAte(c.chega) + " h · risco " + Math.round(c.risco * 100) + "%")); b.appendChild(l); }
    for (const o of f.producao) { const l = cria("div", "caminho"); l.appendChild(ico("precision_manufacturing")); l.appendChild(icoItem(o.item, "peq")); l.appendChild(cria("span", null, nomeItem(o.item))); const bb = cria("div", "fundo"), ff = cria("div", "cheio"); ff.style.width = o.feito / pontosDoItem(o.item) * 100 + "%"; bb.appendChild(ff); l.appendChild(bb); b.appendChild(l); }
    p.appendChild(b);
  }
  // países
  p.appendChild(cria("div", "rotulo-peq", "Países que podem doar"));
  const g = cria("div", "paises");
  for (const pais of PAISES) {
    const rel = f.paises[pais.id], c = cria("div", "pais");
    const t = cria("div", "rc-tit"); t.appendChild(ico(pais.icone, "grande")); t.appendChild(cria("b", null, pais.n)); c.appendChild(t);
    const r = cria("div", "relacao"); const ch = cria("div", "cheio"); ch.style.width = rel.relacao + "%"; r.appendChild(ch);
    for (const m of [ENTREGA.minimo, 60, 85]) { const k = cria("i"); k.style.left = m + "%"; r.appendChild(k); }
    c.appendChild(r);
    c.appendChild(cria("div", "nota", "Relação " + Math.round(rel.relacao) + " de 100 · doa a partir de " + ENTREGA.minimo));
    const ent = entregaDoPais(rel, pais), gosta = cria("div", "gosta");
    gosta.appendChild(cria("span", null, Object.keys(ent).length ? "Manda por dia:" : "Costuma mandar:"));
    for (const k of Object.keys(ent).length ? Object.keys(ent) : [...new Set(pais.gosta.concat(pais.municao))]) { const ii = icoItem(k, "peq"); ii.title = nomeItem(k); gosta.appendChild(ii); if (ent[k]) gosta.appendChild(cria("b", null, "×" + ent[k])); }
    c.appendChild(gosta);
    if (Object.keys(ent).length) c.appendChild(cria("div", "nota", "Próxima entrega em " + horasAte(rel.proximaEntrega) + " h, no QG."));
    if (rel.pedido) {
      const pd = cria("div", "pedido"); pd.appendChild(ico("assignment"));
      const e = rel.pedido.alvo;
      pd.appendChild(cria("span", null, "Pedido: tomar " + TIPOS[e.tipo].n.toLowerCase() + " em " + e.zona.nome + " (" + horasAte(rel.pedido.prazo) + " h) · +" + PEDIDO.premio));
      pd.appendChild(botao("my_location", null, "mini", () => { abreJanela(null); vaiPara(e.x, e.z, 260); mostraPredio(e); }, "Ver no mapa"));
      c.appendChild(pd);
    }
    const be = botao(ICONE_RECURSO.influencia, "Mandar emissário (" + EMISSARIO.influencia + ") · +" + EMISSARIO.relacao, "largo", depoisDe(() => mandaEmissario(partida, f, pais.id)));
    be.disabled = f.recursos.influencia < EMISSARIO.influencia || rel.relacao >= 100; c.appendChild(be);
    g.appendChild(c);
  }
  p.appendChild(g);
}

/* ---------- facções, economia, ajuda ---------- */
function janelaFaccoes(p) {
  if (!partida) return;
  const f = eu();
  // propostas para você
  const props = (partida.propostas || []).filter(x => x.para === f);
  if (props.length) {
    p.appendChild(cria("div", "rotulo-peq", "Propostas para você"));
    for (const pr of props) {
      const c = cria("div", "proposta"); c.appendChild(chip(pr.de.cor, pr.de.nome));
      c.appendChild(cria("span", null, "propõe " + { pacto: "um pacto de não agressão", alianca: "uma aliança", paz: "paz", cessar: "um cessar-fogo (" + EXAUSTAO.cessarHoras + " h; depois vira paz ou volta a guerra)" }[pr.tipo] + " · vence em " + horasAte(pr.expira) + " h"));
      c.appendChild(botao("check", "Aceitar", "principal", () => { respondeProposta(partida, pr, true); desenhaJanela(); mostraNavDiplo(); }));
      c.appendChild(botao("close", "Recusar", null, () => { respondeProposta(partida, pr, false); desenhaJanela(); mostraNavDiplo(); }));
      p.appendChild(c);
    }
  }
  // 19.3: aviso de alvo do governo, coalizão e a sua exaustão de guerra
  if (f.alvoDoGoverno) p.appendChild(cria("div", "aviso-diplo perigo", "O governo antigo escolheu você como alvo: está contra-atacando porque você cresceu demais."));
  const co = partida.coalizao;
  if (co && !co.alvo.eliminada) p.appendChild(cria("div", "aviso-diplo " + (co.alvo === f ? "perigo" : ""), co.alvo === f ? "Coalizão contra você: as outras facções se aproximam entre si e pioram com você, e podem declarar guerra juntas." : "Coalizão contra " + co.alvo.nome + ": cresceu demais; as outras facções se aproximam entre si e pioram com ela."));
  if ((f.exaustao || 0) >= 1) p.appendChild(cria("div", "nota", "Sua exaustão de guerra: " + Math.round(f.exaustao) + " de 100" + (f.exaustao > EXAUSTAO.efeito ? " · moral máxima −" + Math.round(moralExaustao(f)) + " e voluntários −" + Math.round(fracaoExaustao(f) * EXAUSTAO.voluntarios * 100) + "%" : " (acima de " + EXAUSTAO.efeito + " a tropa perde moral e voluntários)")));
  p.appendChild(cria("div", "rotulo-peq", "Facções"));
  for (const o of partida.faccoes) {
    if (o === f) continue;
    const r = resumoFaccao(partida, o), c = cria("div", "dip" + (o.eliminada ? " morta" : ""));
    const cab = cria("div", "dip-cab"); cab.appendChild(chip(o.cor, o.nome));
    const est = o.governo ? "guerra" : estadoEntre(partida, f, o);
    const e = cria("span", "est " + est); e.appendChild(ico(ESTADOS[est].icone)); e.appendChild(cria("span", null, o.eliminada ? "Eliminada" : o.governo ? "Em guerra com todos" : ESTADOS[est].n)); cab.appendChild(e);
    cab.appendChild(cria("span", "dip-num", r.predios + " prédios · " + r.ativos + " soldados"));
    if (o.base && !o.eliminada) cab.appendChild(botao("my_location", null, "mini", () => vaiPara(o.base.x, o.base.z, 260), "Ir até o QG"));
    c.appendChild(cab);
    if (!o.governo && !o.eliminada) {
      const rv = rel(partida, f, o);
      const barra = cria("div", "rel"); const meio = cria("i", "meio"); barra.appendChild(meio);
      const ch = cria("i", "val " + (rv.valor >= 0 ? "pos" : "neg")); ch.style.left = (rv.valor >= 0 ? 50 : 50 + rv.valor / 2) + "%"; ch.style.width = Math.abs(rv.valor) / 2 + "%"; barra.appendChild(ch);
      for (const m of [DIPLO.aceitaPacto, DIPLO.aceitaAlianca, DIPLO.declaraGuerra]) { const k = cria("i", "marca"); k.style.left = (50 + m / 2) + "%"; barra.appendChild(k); }
      c.appendChild(barra);
      c.appendChild(cria("div", "nota", "Relação " + Math.round(rv.valor) + " (−100 a 100) · tendência " + (rv.tendencia > .15 ? "de se aproximar" : rv.tendencia < -.15 ? "de se afastar" : "estável") + (o.alvoDoGoverno ? " · alvo do governo antigo" : "") + (co && co.alvo === o ? " · alvo da coalizão" : "")));
      const exMeu = exaustaoEm(partida, f, o), exDele = exaustaoEm(partida, o, f);
      if (est === "guerra" || est === "cessarfogo" || exMeu >= 1 || exDele >= 1) {   // exaustão de guerra: barras da sua e da dele nesta guerra
        const bx = cria("div", "exa"); for (const [rot, v] of [["Você", exMeu], [o.nome.split(" ")[0], exDele]]) { const l = cria("div", "exa-lin"); l.appendChild(cria("span", null, "Exaustão " + rot.toLowerCase() + " " + Math.round(v))); const b = cria("div", "exa-barra"); const i = cria("i", v >= EXAUSTAO.busca ? "alta" : ""); i.style.width = Math.min(100, v) + "%"; b.appendChild(i); l.appendChild(b); bx.appendChild(l); }
        c.appendChild(bx);
      }
      if (est === "cessarfogo") c.appendChild(cria("div", "nota", "Cessar-fogo: termina em " + horasAte(rv.fimCessar) + " h; depois vira paz (se estiverem cansados ou a relação melhorou) ou volta a guerra."));
      const ac = cria("div", "dip-ac");
      const resultado = rr => { if (!rr.ok) aviso(o.nome + " recusou: " + rr.motivo, "handshake", "info"); desenhaJanela(); mostraNavDiplo(); };
      if (est === "neutro") { ac.appendChild(botao("handshake", "Propor pacto", null, () => resultado(jogadorPropoe(partida, f, o, "pacto")), "Aceita com relação " + DIPLO.aceitaPacto + "+")); ac.appendChild(botao("swords", "Declarar guerra", "perigo", () => { declaraGuerra(partida, f, o); desenhaJanela(); })); }
      if (est === "pacto") { ac.appendChild(botao("shield_home", "Propor aliança", null, () => resultado(jogadorPropoe(partida, f, o, "alianca")), "Aceita com relação " + DIPLO.aceitaAlianca + "+")); ac.appendChild(botao("close", "Romper pacto", null, () => { rompe(partida, f, o); desenhaJanela(); })); ac.appendChild(botao("swords", "Declarar guerra", "perigo", () => { declaraGuerra(partida, f, o); desenhaJanela(); }, "Romper um pacto com guerra pega mal com todas as facções")); }
      if (est === "alianca") ac.appendChild(botao("close", "Romper aliança", null, () => { rompe(partida, f, o); desenhaJanela(); }));
      if (est === "guerra") { ac.appendChild(botao("pause_circle", "Propor cessar-fogo", null, () => resultado(jogadorPropoe(partida, f, o, "cessar")), "Aceita se ela já estiver cansada da guerra (exaustão " + Math.round(limiteAceita(partida, o, f)) + "+)")); ac.appendChild(botao("handshake", "Propor paz", null, () => resultado(jogadorPropoe(partida, f, o, "paz")), "Aceita com relação " + DIPLO.aceitaPaz + "+")); }
      if (est === "cessarfogo") ac.appendChild(botao("swords", "Romper cessar-fogo", "perigo", () => { declaraGuerra(partida, f, o); desenhaJanela(); }, "Volta a guerra na hora"));
      ac.appendChild(botao(ICONE_RECURSO.dinheiro, "Presente $ 500", null, depoisDe(() => presenteia(partida, f, o, "dinheiro", 500)), "Melhora a relação"));
      ac.appendChild(botao(ICONE_RECURSO.comida, "100 de comida", null, depoisDe(() => presenteia(partida, f, o, "comida", 100)), "Melhora a relação"));
      if (est === "alianca") {
        ac.appendChild(botao("bullet", "Caixa de balas", null, depoisDe(() => presenteia(partida, f, o, "cx-bala", 1)), "Do depósito geral"));
        ac.appendChild(botao("inventory_2", "1 fuzil", null, depoisDe(() => presenteia(partida, f, o, "fuzil", 1)), "Do depósito geral"));
      }
      c.appendChild(ac);
    }
    p.appendChild(c);
  }
  p.appendChild(cria("div", "nota", "Só quem está em guerra luta e toma prédios um do outro. A guerra cansa (tempo, mortes, prédios perdidos, dinheiro gasto) e quem está cansado aceita cessar-fogo. Fronteira e ataques pioram a relação; lutar contra o mesmo inimigo e presentes melhoram; quem cresce demais assusta os outros. O governo antigo está em guerra com todos e tem o caixa negativo."));
}
function mostraNavDiplo() {
  const bt = document.querySelector('[data-janela="faccoes"]'); if (!bt || !partida) return;
  const n = (partida.propostas || []).filter(x => x.para === eu()).length;
  let badge = bt.querySelector(".badge"); if (!badge) { badge = cria("i", "badge"); bt.appendChild(badge); }
  badge.textContent = n || ""; badge.style.display = n ? "" : "none";
}
function janelaEconomia(p) {
  const f = eu(); if (!f) return;
  const c = contas(partida, f);
  for (const rec of ["dinheiro", "influencia", "comida"]) {
    const b = cria("div", "secao");
    const t = cria("div", "rec-tit"); t.appendChild(ico(ICONE_RECURSO[rec])); t.appendChild(cria("b", null, NOMES_RECURSO[rec]));
    t.appendChild(cria("span", null, fmt(rec, f.recursos[rec]))); t.appendChild(cria("span", c.total[rec] < 0 ? "ruim" : "bom", fmtH(c.total[rec]))); b.appendChild(t);
    if (!c[rec].length) b.appendChild(cria("div", "nota", "Nada entrando nem saindo."));
    const max = Math.max(1, ...c[rec].map(([, v]) => Math.abs(v)));
    for (const [rotulo, v] of c[rec]) {
      const l = cria("div", "item"); l.appendChild(cria("span", "r", rotulo));
      const bb = cria("div", "fundo"), ff = cria("div", "cheio " + (v < 0 ? "neg" : "pos")); ff.style.width = Math.abs(v) / max * 100 + "%"; bb.appendChild(ff); l.appendChild(bb);
      l.appendChild(cria("span", v < 0 ? "ruim" : "bom", fmtH(v))); b.appendChild(l);
    }
    p.appendChild(b);
  }
  // suprimentos (19.2): onde estão e para onde vão
  const sup = cria("div", "secao"), st = cria("div", "rec-tit"); st.appendChild(ico(MUNICOES.suprimento.icone)); st.appendChild(cria("b", null, "Suprimentos")); st.appendChild(cria("span", null, totalSuprimentos(partida, f).toLocaleString("pt-BR") + " em estoque")); sup.appendChild(st);
  const linhasSup = [["QG (depósito)", f.municao.suprimento]];
  for (const b of batalhoesDe(partida, f)) linhasSup.push([b.nome + (b.base === f.base ? " (no QG)" : ""), b.municao.suprimento]);
  for (const e of partida.reg.edificios) if (e.dono === f && e.estoque && e.estoque.municao.suprimento) linhasSup.push(["Base avançada em " + e.zona.nome, e.estoque.municao.suprimento]);
  const mochila = partida.soldados.filter(s => s.faccao === f && s.vida === "ok" && cargaSuprimento(s));
  linhasSup.push(["Na mochila de " + mochila.length + " médico(s) e engenheiro(s)", Math.floor(mochila.reduce((t, s) => t + (s.suprimentos || 0), 0))]);
  for (const [r, v] of linhasSup) { const l = cria("div", "item"); l.appendChild(cria("span", "r", r)); l.appendChild(cria("span", null, String(v))); sup.appendChild(l); }
  sup.appendChild(cria("div", "nota", "Gastam: médico 1 por ferido tratado no campo; hospital e QG " + SUPRIMENTO.tratarBase + " por ferido (sem estoque, tratam no dobro do tempo); engenheiro " + Math.round(SUPRIMENTO.fortificarPorPonto * 100) + " para fortificar 100 pontos, mais para consertar e reconstruir. Compre, fabrique ou receba dos países em Armas."));
  if (mochila.length && !totalSuprimentos(partida, f)) { const a = cria("div", "dica-j alerta"); a.appendChild(ico("warning")); a.appendChild(cria("span", null, "Sem suprimentos: médicos não tratam e engenheiros não trabalham.")); sup.appendChild(a); }
  p.appendChild(sup);
  const d = botao(ICONE_RECURSO.comida, "Distribuir comida: " + DISTRIBUIR.comida + " → +" + DISTRIBUIR.influencia + " de influência", "principal largo", depoisDe(() => distribuiComida(partida, f)));
  d.disabled = f.recursos.comida < DISTRIBUIR.comida; p.appendChild(d);
  // mercado de comida
  const m = cria("div", "secao mercado");
  const preco = partida.precoComida || precoDaComida(partida);
  const mt = cria("div", "rec-tit"); mt.appendChild(ico("storefront")); mt.appendChild(cria("b", null, "Mercado de comida")); mt.appendChild(cria("span", null, "$ " + preco.toFixed(2) + " por unidade")); m.appendChild(mt);
  const h = partida.historicoComida || [];
  if (h.length > 1) {
    const W = 300, H = 46, mx = MERCADO_COMIDA.importa;
    const pts = h.map((v, i) => (i / (h.length - 1) * W).toFixed(1) + "," + (H - v / mx * H).toFixed(1)).join(" ");
    const sv = document.createElement("div"); sv.className = "graf-preco"; sv.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg><small>últimas ${h.length} h · teto $ ${mx} (importar dos países)</small>`;
    m.appendChild(sv);
  }
  const vend = vendedores(partida).filter(v => v.f !== f && !hostis(partida, f, v.f));
  m.appendChild(cria("div", "nota", vend.length ? "Vendendo agora: " + vend.map(v => v.f.nome + " (" + Math.round(v.tem) + ")").join(", ") : "Nenhuma facção em paz com você tem comida sobrando: a compra vem de fora, a $ " + MERCADO_COMIDA.importa + "."));
  const ac = cria("div", "dip-ac");
  ac.appendChild(botao(ICONE_RECURSO.comida, "Comprar 100", null, depoisDe(() => compraComida(partida, f, 100, true)), "De quem vende; se ninguém vender, importa"));
  ac.appendChild(botao(ICONE_RECURSO.dinheiro, "Vender 100", null, depoisDe(() => vendeComida(partida, f, 100) > 0), "Para quem está precisando e não está em guerra com você"));
  m.appendChild(ac);
  f.vendaAcima = f.vendaAcima || 400;
  const va = cria("div", "venda-auto");
  va.appendChild(botao(f.vendeComida ? "toggle_on" : "toggle_off", f.vendeComida ? "Venda automática ligada" : "Venda automática desligada", f.vendeComida ? "ativo" : "", () => { f.vendeComida = !f.vendeComida; desenhaJanela(); }));
  va.appendChild(cria("span", null, "vende o que passar de"));
  va.appendChild(botao("remove", null, "mini", () => { f.vendaAcima = Math.max(100, f.vendaAcima - 100); desenhaJanela(); }));
  va.appendChild(cria("b", null, String(f.vendaAcima)));
  va.appendChild(botao("add", null, "mini", () => { f.vendaAcima += 100; desenhaJanela(); }));
  m.appendChild(va);
  m.appendChild(cria("div", "nota", "Quando a comida fica abaixo de " + MERCADO_COMIDA.reserva + " (mais " + MERCADO_COMIDA.horasDeFolga + " h do que falta por hora), o jogo compra sozinho. O preço sobe quando falta comida no mapa e cai quando sobra. Comércio só com quem não está em guerra com você; vender e comprar melhora a relação."));
  p.appendChild(m);
  // bairros: alimentar e confiança
  const zs = [...new Set(partida.reg.edificios.filter(e => e.dono === f).map(e => e.zona))];
  if (zs.length) {
    const z = cria("div", "secao"); z.appendChild(cria("div", "rotulo-peq", "Bairros: quem você alimenta"));
    for (const zn of zs.sort((a, b) => a.nome.localeCompare(b.nome))) {
      const mor = zn.edificios.filter(e => e.dono === f).reduce((t, e) => t + moradoresDe(e), 0), conf = confiancaEm(f, zn), sim = alimenta(f, zn);
      const l = cria("div", "z-al" + (sim ? "" : " nao"));
      l.appendChild(botao(sim ? ICONE_RECURSO.comida : "no_food", null, "mini" + (sim ? " ativo" : ""), () => { trocaAlimentar(f, zn); desenhaJanela(); mostraRecursos(); }, sim ? "Parar de alimentar" : "Voltar a alimentar"));
      l.appendChild(cria("b", null, zn.nome));
      l.appendChild(cria("span", null, mor + " moradores · " + (sim ? (mor * COME_MORADOR).toFixed(1) + "/h" : "sem comida")));
      const bc = cria("div", "conf"), fc = cria("i"); fc.style.width = conf + "%"; if (conf < 50) fc.className = "baixa"; bc.appendChild(fc); bc.title = "Confiança " + Math.round(conf) + "%"; l.appendChild(bc);
      z.appendChild(l);
    }
    p.appendChild(z);
  }
  if ((f.obras || []).length) {
    const o = cria("div", "secao"); o.appendChild(cria("div", "rotulo-peq", "Obras"));
    for (const ob of f.obras) { const l = cria("div", "caminho"); l.appendChild(ico(OBRAS[ob.tipo].icone)); l.appendChild(cria("span", null, OBRAS[ob.tipo].n + " em " + ob.e.zona.nome + " · " + horasAte(ob.fim) + " h")); l.appendChild(botao("my_location", null, "mini", () => vaiPara(ob.e.x, ob.e.z, 200))); o.appendChild(l); }
    p.appendChild(o);
  }
  p.appendChild(cria("div", "nota", "Sem dinheiro: sem salário, a moral cai e há deserção. Sem comida: a moral cai rápido e os bairros alimentados perdem confiança. Bairro sem comida paga menos imposto e não dá voluntários. Fazendas e armazéns: clique numa casa sua de vila ou setor rural."));
}
function janelaAjuda(p) {
  const blocos = [
    ["Mapa", [["left_click", "Clique", "Seleciona esquadrão, soldado, prédio ou o nome de um bairro"], ["pan_tool", "Arrastar", "Move o mapa (também WASD)"], ["3d_rotation", "Botão do meio ou Q/E", "Gira a câmera"], ["zoom_in", "Rolagem", "Aproxima e afasta"], ["pause", "Espaço", "Pausa"]]],
    ["Ordens", [["right_click", "Botão direito", "Manda os selecionados até o ponto ou prédio"], ["gesture", "Arrastar com o direito", "Desenha uma linha de ataque ou de defesa"], ["select", "Shift + arrastar", "Seleciona vários esquadrões"], ["swords", "Atacar", "Avança tomando as casas do caminho"], ["shield", "Defender", "Ocupa o prédio mais perto e segura"]]],
    ["Gente e armas", [["person_add", "Recrutar", "Voluntários, mercenários, clã e prisioneiros"], ["bullet", "Munição", "Cada tiro gasta; o esquadrão recarrega numa base, do estoque"], ["block", "Sem arma", "Mande ao QG: pegam sozinhos no arsenal"], ["inventory_2", "Armas", "Comprar, contrabandear, fabricar ou ganhar de países"], ["star", "Pontos importantes", "Com todos de uma zona, o controle total é seu"]]]
  ];
  p.appendChild(botao("school", "Ver o tutorial de novo", "principal largo", () => { abreJanela(null); iniciaTutorial(); }));
  for (const [tit, itens] of blocos) {
    p.appendChild(cria("div", "rotulo-peq", tit));
    const g = cria("div", "ajuda");
    for (const [icn, a, b] of itens) { const l = cria("div", "aj"); l.appendChild(ico(icn)); l.appendChild(cria("b", null, a)); l.appendChild(cria("span", null, b)); g.appendChild(l); }
    p.appendChild(g);
  }
}

"use strict";
/* ============================================================
   PAINÉIS
   - Barra do topo: recursos, combates agora, tempo e botões (com nome).
   - Esquerda: cartões dos seus esquadrões, com o retrato do líder.
   - Esquerda embaixo: acontecimentos (lista que fica, com ícone e hora).
   - Direita: um painel só, do que estiver selecionado.
   - Embaixo: barra de ordens, só quando há esquadrão selecionado.
   - Janelas (esquadrões, recrutar, armas, facções, economia, ajuda): uma de cada vez.
   ============================================================ */
let selecao = [], modoOrdem = "ataque", contexto = null, janela = null, zonaDestacada = null;
const eu = () => partida && partida.faccoes.find(f => f.jogador);

function limpa(el) { while (el.firstChild) el.removeChild(el.firstChild); }
function cria(tag, classe, texto) { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; }
function botao(icone, texto, classe, acao, titulo) {
  const b = cria("button", classe || null); b.type = "button";
  if (icone) b.appendChild(typeof icone === "string" ? ico(icone) : icone); if (texto) b.appendChild(cria("span", null, texto));
  if (titulo) b.title = titulo; if (acao) b.addEventListener("click", acao); return b;
}
/* botão grande: ícone em cima, nome embaixo, e um motivo quando não dá */
function botaoGrande(icone, texto, sub, acao, motivo, classe) {
  const b = cria("button", "grande-bt" + (classe ? " " + classe : "")); b.type = "button";
  b.appendChild(typeof icone === "string" ? ico(icone) : icone); b.appendChild(cria("b", null, texto));
  if (sub) b.appendChild(cria("small", null, sub));
  if (motivo) { b.disabled = true; b.title = motivo; b.appendChild(cria("small", "motivo", motivo)); }
  else if (acao) b.addEventListener("click", acao);
  return b;
}
function chip(cor, texto) { const c = cria("span", "chip"); const p = cria("i", "ponto"); p.style.background = cor == null ? "transparent" : corCss(cor); c.appendChild(p); c.appendChild(cria("span", null, texto)); return c; }
function linha(pai, icone, rotulo, valor) {
  const l = cria("div", "linha"); l.appendChild(typeof icone === "string" ? ico(icone) : icone); l.appendChild(cria("span", "r", rotulo));
  const v = cria("span", "v"); if (typeof valor === "string") v.textContent = valor; else v.appendChild(valor); l.appendChild(v);
  pai.appendChild(l); return l;
}
function barra(pai, icone, rotulo, v, max, cor) {
  const l = cria("div", "barra"); l.appendChild(ico(icone)); l.appendChild(cria("span", "r", rotulo));
  const b = cria("div", "fundo"), f = cria("div", "cheio"); f.style.width = limita(v / (max || 100) * 100, 0, 100) + "%"; if (cor) f.style.background = cor; b.appendChild(f); l.appendChild(b);
  l.appendChild(cria("span", "num", max === 1 ? Math.round(v * 100) + "%" : String(Math.round(v)))); pai.appendChild(l);
}
const escapa = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ---------- acontecimentos (lista que fica no canto) ---------- */
const TIPO_AVISO = { perigo: "#ff6a4a", bom: "#8fd18f", seu: "#f2b233", info: "#9aa6b4" };
let avisosRecolhidos = false;
function aviso(texto, icone, tipoOuCor, onde) {
  const caixa = $("avisos-lista"); if (!caixa) return;
  const cor = typeof tipoOuCor === "string" ? TIPO_AVISO[tipoOuCor] : tipoOuCor != null ? corCss(tipoOuCor) : TIPO_AVISO.info;
  const a = cria("div", "aviso-item novo");
  a.style.borderLeftColor = cor;
  const i = ico(icone || "info"); i.style.color = cor; a.appendChild(i);
  a.appendChild(cria("span", "txt", texto));
  a.appendChild(cria("span", "hora", partida && estado === "jogo" ? relogio(partida).split("· ")[1] : ""));
  if (onde) { a.classList.add("clicavel"); a.title = "Clique para ir até lá"; a.appendChild(ico("my_location", "ir")); a.addEventListener("click", () => vaiPara(onde[0], onde[1], Math.min(cam.ad, 300))); }
  caixa.prepend(a);
  while (caixa.children.length > 15) caixa.lastChild.remove();
  setTimeout(() => a.classList.remove("novo"), 2500);
  $("avisos").classList.add("piscando"); setTimeout(() => $("avisos").classList.remove("piscando"), 1200);
}
function dica(texto) { const d = $("dica"); if (!texto) { d.classList.add("oculto"); return; } d.textContent = texto; d.classList.remove("oculto"); }

/* ---------- barra do topo ---------- */
const NOMES_RECURSO = { dinheiro: "Dinheiro", influencia: "Influência", comida: "Comida" };
const fmt = (rec, v) => rec === "dinheiro" ? "$ " + Math.round(v).toLocaleString("pt-BR") : Math.round(v).toLocaleString("pt-BR");
const fmtH = v => (v >= 0 ? "+" : "−") + Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "/h";
function mostraRecursos() {
  const f = eu(), bar = $("recursos"); limpa(bar);
  if (!f || !f.recursos) return;
  const c = contas(partida, f);
  for (const rec of ["dinheiro", "influencia", "comida"]) {
    const b = cria("button", "rec rec-" + rec); b.type = "button"; b.title = NOMES_RECURSO[rec] + ": clique para ver de onde vem e para onde vai";
    b.appendChild(ico(ICONE_RECURSO[rec]));
    const t = cria("span", "t"); t.appendChild(cria("span", "n", NOMES_RECURSO[rec]));
    const v = cria("span", "v" + (f.recursos[rec] <= 0 ? " ruim" : "")); v.textContent = fmt(rec, f.recursos[rec]);
    v.appendChild(cria("span", "d" + (c.total[rec] < 0 ? " ruim" : ""), " " + fmtH(c.total[rec]))); t.appendChild(v); b.appendChild(t);
    b.addEventListener("click", () => abreJanela(janela === "economia" ? null : "economia"));
    bar.appendChild(b);
  }
}
let indiceCombate = 0;
function mostraCombates() {
  const f = eu(), b = $("combates"); if (!b) return;
  const l = f ? partida.esquadroes.filter(q => q.faccao === f && q.combate && ativos(q).length) : [];
  b.classList.toggle("oculto", !l.length);
  const txt = l.length === 1 ? "1 combate agora" : l.length + " combates agora";
  if (b.lastChild && b.lastChild.textContent !== txt) b.lastChild.textContent = txt;
  b.onclick = () => { if (!l.length) return; const sq = l[indiceCombate++ % l.length]; const [x, z] = centroDoEsquadrao(sq); vaiPara(x, z, 160); selecionaEsquadrao(sq, false); };
}
function mudaVelocidade(v) {
  if (!partida) return;
  if (v === 0) partida.pausado = true; else { partida.pausado = false; partida.velocidade = v; }
  document.querySelectorAll("#tempo button").forEach(b => b.classList.toggle("ativo", partida.pausado ? b.dataset.v === "0" : +b.dataset.v === partida.velocidade));
  document.body.classList.toggle("pausado", partida.pausado);
}

/* ---------- cartões dos esquadrões ---------- */
const TEXTO_PLANO = { segurar: "segurando", cobrir: "trocando tiros", avancar: "avançando", flanquear: "flanqueando", recuar: "recuando" };
function estadoDoEsquadrao(sq) {
  if (!ativos(sq).length) return ["skull", "Fora de combate", "perigo"];
  if (sq.combate) return ["local_fire_department", "Em combate, " + TEXTO_PLANO[sq.plano], "perigo"];
  if (sq.indoABase && sq.estado === "andando") return ["swap_horiz", "Indo à " + (sq.indoABase === sq.faccao.base ? "QG" : "base") + " fazer trocas", "anda"];
  const m = sq.missao;
  if (m) {
    if (m.tipo === "frente") return ["wall", "Segurando a frente", sq.estado === "andando" ? "anda" : "calmo"];
    if (m.tipo === "ronda") return ["route", "Ronda na fronteira" + (m.contra ? " (" + m.contra.nome + ")" : ""), sq.estado === "andando" ? "anda" : "calmo"];
    if (m.tipo === "reacao") return ["bolt", "Reação rápida", "calmo"];
    const verbo = { expandir: m.zona ? "Tomando " + m.zona.nome : m.contra ? "Avançando contra " + m.contra.nome : "Expandindo", defender: "Protegendo " + (m.alvo ? m.alvo.nome : ""), cacar: sq.caca ? "Caçando " + sq.caca.alvo.nome.toLowerCase() : "Caçando: procurando alvo", apoiar: "Apoiando " + (m.alvo ? m.alvo.nome : "") }[m.tipo];
    return [MISSOES[m.tipo].icone, verbo, sq.estado === "andando" ? "anda" : "calmo"];
  }
  if (sq.indoABase && sq.estado === "andando") return ["swap_horiz", "Indo à base fazer trocas", "anda"];
  if (sq.caca) return ["lifebuoy", "Indo socorrer", "anda"];
  if (sq.estado === "andando" && precisaRecarregar(sq, partida)) return ["bullet", "Indo recarregar", "anda"];
  if (sq.estado === "guarnição" && sq.guarda) return ["shield", (sq.faccao.base === sq.guarda ? "No QG" : "Guardando " + TIPOS[sq.guarda.tipo].n.toLowerCase()), "calmo"];
  if (sq.estado === "andando") {
    if (sq.ordem.tipo === "zona") return ["flag", "Tomando " + sq.ordem.zona.nome, "anda"];
    if (sq.sub) return ["directions_run", "Desviando para " + TIPOS[sq.sub.tipo].n.toLowerCase(), "anda"];
    if (sq.ordem.alvo && sq.ordem.alvo === sq.faccao.base) return ["home", "Voltando ao QG", "anda"];
    return [sq.ordem.tipo === "defender" ? "shield" : "directions_walk", sq.ordem.tipo === "defender" ? "Indo defender" : "Avançando", "anda"];
  }
  return ["pause_circle", "Parado", "calmo"];
}
/* ---------- batalhões (esquerda) ---------- */
let selBat = null, assinaturaEsq = "";
function estadoDoBatalhao(b) {
  const sqs = esquadroesDe(partida, b), luta = sqs.filter(q => q.combate).length;
  if (luta) return ["local_fire_department", luta + " esquadrão(ões) em combate", "perigo"];
  const os = b.ordens || [];
  if (!os.length) return ["home", "Sem ordem: protege a área da base", "calmo"];
  return [os.length > 1 ? "format_list_bulleted" : ORDENS_BATALHAO[os[0].tipo].icone, textoOrdem(b), sqs.some(q => q.estado === "andando") ? "anda" : "calmo"];
}
function mostraEsquadroes() {
  const p = $("esquadroes"), f = eu();
  if (!f) { p.classList.add("oculto"); assinaturaEsq = ""; return; }
  const bats = batalhoesDe(partida, f);
  const ass = bats.map(b => b.id + textoOrdem(b) + (selBat === b) + b.postura + esquadroesDe(partida, b).map(q => q.id + estadoDoEsquadrao(q)[1] + q.membros.map(s => s.vida[0] + (s.arma ? 1 : 0) + (s.pedido ? "p" : "") + (s.arma && s.municao < cargaDe(s) * .35 ? "m" : "")).join("") + q.combate + (q.lider ? q.lider.id : "")).join(",")).join("|")
    + f.reserva.length + partida.esquadroes.filter(q => q.faccao === f && !q.bat && ativos(q).length).length;
  if (ass === assinaturaEsq && !p.classList.contains("oculto")) return;
  assinaturaEsq = ass; limpa(p); p.classList.remove("oculto");
  for (const b of bats) {
    const [ic, txt, tom] = estadoDoBatalhao(b);
    const c = cria("div", "card bat " + tom + (selBat === b ? " sel" : ""));
    c.title = "Clique para selecionar e dar ordens · duplo clique vai até a base";
    if (b.lider) c.appendChild(retrato(b.lider, 40));
    const meio = cria("div", "c-meio");
    meio.appendChild(cria("div", "nome", b.nome));
    const est = cria("div", "c-txt"); est.appendChild(ico(ic)); est.appendChild(cria("span", null, txt)); meio.appendChild(est);
    const sqs = esquadroesDe(partida, b), nSold = sqs.reduce((n, q) => n + ativos(q).length, 0);
    const res = cria("div", "c-res"); res.appendChild(ico("groups")); res.appendChild(cria("span", null, sqs.length + " esq. · " + nSold + " soldados")); res.appendChild(ico(POSTURAS[b.postura].icone)); meio.appendChild(res);
    c.appendChild(meio);
    const mun = sqs.length ? sqs.reduce((t, q) => t + municaoMedia(q), 0) / sqs.length : 1;
    if (mun < .35) { const w = ico("bullet", "alerta"); w.title = "Munição baixa no batalhão"; c.appendChild(w); }
    if (sqs.some(semArma)) { const w = ico("warning", "alerta"); w.title = "Há soldados sem arma: passe armas ao batalhão em Batalhões"; c.appendChild(w); }
    c.addEventListener("click", () => selecionaBatalhao(b));
    c.addEventListener("dblclick", () => vaiPara(b.base.x, b.base.z, 220));
    p.appendChild(c);
    // os esquadrões, em linhas pequenas
    if (selBat === b || bats.length === 1) {
      const lista = cria("div", "sub-esq");
      for (const sq of sqs) {
        const [ic2, txt2, tom2] = estadoDoEsquadrao(sq), l = cria("div", "linha-esq " + tom2);
        if (sq.lider) l.appendChild(retrato(sq.lider, 22));
        l.appendChild(cria("b", null, sq.nome)); l.appendChild(ico(ic2)); l.appendChild(cria("span", null, txt2));
        const pips = cria("span", "pips"); for (const s of sq.membros) pips.appendChild(cria("i", "pip " + s.vida + (s === sq.lider ? " lider" : "") + (s.arma ? "" : " desarmado"))); l.appendChild(pips);
        l.title = "Sargento " + (sq.lider ? sq.lider.nome : "?") + " · clique para ver no mapa";
        l.addEventListener("click", ev => { ev.stopPropagation(); const [x, z] = centroDoEsquadrao(sq); vaiPara(x, z, 160); if (sq.lider) mostraSoldado(sq.lider); });
        lista.appendChild(l);
      }
      if (!sqs.length) lista.appendChild(cria("div", "nota", "Sem esquadrões: passe soldados a este batalhão em Batalhões."));
      p.appendChild(lista);
    }
  }
  const semBat = partida.soldados.filter(s => s.faccao === f && !s.bat && !s.cargo && (s.vida === "ok" || s.vida === "reserva")).length;
  if (semBat) { const r = cria("div", "nota clicavel", semBat + " soldado(s) sem batalhão: clique para distribuir."); r.addEventListener("click", () => abreJanela("gestao")); p.appendChild(r); }
  if (bats.length < limiteBatalhoes(partida, f)) { const r = cria("div", "nota clicavel novo-bat"); r.appendChild(ico("add_circle")); r.appendChild(cria("span", null, "Dá para abrir mais um batalhão")); r.addEventListener("click", () => abreJanela("gestao")); p.appendChild(r); }
}
function selecionaBatalhao(b) {
  if (esperaClique) cancelaClique();
  selBat = b; selecao = b ? esquadroesDe(partida, b) : [];
  atualizaSelecao();
}
function selecionaEsquadrao(sq) { if (sq.bat) selecionaBatalhao(sq.bat); }
function atualizaSelecao() {
  if (selBat && (selBat.dissolvido || selBat.faccao.eliminada)) selBat = null;
  selecao = selBat ? esquadroesDe(partida, selBat) : [];
  mostraEsquadroes(); mostraOrdens(); mostraRotaSelecionada();
}

/* ---------- barra de ordens do batalhão ---------- */
let esperaClique = null;   // { tipo: "tomar" | "proteger", b } esperando o clique numa zona
let escolhaFaccao = null;  // "frente" | "avancar": mostra a lista de facções
function pedeClique(tipo) {
  esperaClique = { tipo, b: selBat };
  dica("Clique no bairro (nome ou um prédio dele) para " + (tipo === "tomar" ? "tomar" : "proteger") + " · Esc cancela");
}
function cancelaClique() { if (esperaClique) { esperaClique = null; dica(null); } }
function resolveClique(zn) {
  const e = esperaClique; if (!e || !zn || !zn.chaves) return false;
  esperaClique = null; dica(null);
  ordenaBatalhao(partida, e.b, e.tipo, zn); atualizaSelecao(); return true;
}
function mostraOrdens() {
  const p = $("ordens"); limpa(p);
  const b = selBat;
  if (!b || estado !== "jogo") { p.classList.add("oculto"); return; }
  p.classList.remove("oculto");
  const tit = cria("div", "o-titulo");
  if (b.lider) tit.appendChild(retrato(b.lider, 30));
  tit.appendChild(cria("span", null, b.nome));
  p.appendChild(tit);
  const grupo = (rot, filhos) => { const g = cria("div", "o-grupo"); g.appendChild(cria("span", "o-rot", rot)); const seg = cria("div", "seg"); for (const f of filhos) seg.appendChild(f); g.appendChild(seg); return g; };
  const os = b.ordens || [];
  const bo = Object.entries(ORDENS_BATALHAO).map(([k, o]) => botao(o.icone, o.n, "missao" + (os.some(x => x.tipo === k) ? " ativo" : ""), () => {
    if (o.pede === "zona") { if (contexto && contexto.tipo === "zona") { ordenaBatalhao(partida, b, k, contexto.alvo); atualizaSelecao(); } else pedeClique(k); return; }
    escolhaFaccao = escolhaFaccao === k ? null : k; mostraOrdens();
  }, o.dica));
  p.appendChild(grupo("Acrescentar ordem", bo));
  // ordens atuais (o líder divide os esquadrões entre elas)
  if (os.length) {
    const lo = cria("div", "o-lista");
    for (const o of os) {
      const t = (b.tarefas || []).find(x => x.o === o), c = cria("span", "o-ordem"); c.appendChild(ico(ORDENS_BATALHAO[o.tipo].icone));
      c.appendChild(cria("span", null, textoUmaOrdem(o) + (t ? " · " + t.sqs.length + " esq." : "")));
      if (t && t.setor.defesa && t.perigo > 1) { const pe = cria("span", "o-perigo"); pe.appendChild(ico("warning")); pe.title = "Perigo: inimigos perto da borda"; c.appendChild(pe); }
      c.appendChild(botao("close", null, "mini", () => { tiraOrdem(partida, b, o); atualizaSelecao(); }, "Tirar esta ordem"));
      lo.appendChild(c);
    }
    p.appendChild(lo);
  }
  const bp = Object.entries(POSTURAS).map(([k, m]) => botao(m.icone, m.n, "postura " + k + (b.postura === k ? " ativo" : ""), () => { b.postura = k; for (const q of esquadroesDe(partida, b)) q.postura = k; atualizaSelecao(); },
    { agressivo: "Ataca até defesas fortes e só recua no fim", equilibrado: "Meio-termo", cauteloso: "Só pega o que está fraco e recua cedo" }[k]));
  p.appendChild(grupo("Postura", bp));
  p.appendChild(botao("home", "Limpar", "acao" + (!os.length ? " ativo" : ""), () => { ordenaBatalhao(partida, b, null); atualizaSelecao(); }, "Tira todas as ordens: o batalhão protege a área da base"));
  const aj = cria("span", "o-ajuda"); aj.appendChild(ico("right_click"));
  aj.title = "Botão direito num bairro: acrescenta tomar (ou proteger, se já é seu)\nBotão direito num prédio de uma facção em guerra: acrescenta avançar contra ela\nA mesma ordem de novo tira a ordem\nO líder divide os esquadrões entre as ordens, conforme o perigo"; p.appendChild(aj);
  if (escolhaFaccao) {
    const lista = cria("div", "o-faccoes");
    lista.appendChild(cria("span", "o-rot", escolhaFaccao === "frente" ? "Segurar a frente contra" : "Avançar contra"));
    for (const f of rivaisVivas(partida).filter(x => !x.jogador)) {
      const est = estadoEntre(partida, b.faccao, f), bt = botao(null, null, "fac-bt", null);
      bt.appendChild(chip(f.cor, f.nome)); const e2 = cria("small", "est " + est, ESTADOS[est].curto || ESTADOS[est].n); bt.appendChild(e2);
      if (escolhaFaccao === "avancar" && est !== "guerra") {
        bt.title = "Não estão em guerra: clicar declara guerra a " + f.nome;
        bt.appendChild(cria("small", "aviso-guerra", "declarar guerra"));
      }
      bt.addEventListener("click", () => {
        if (escolhaFaccao === "avancar" && est !== "guerra") declaraGuerra(partida, b.faccao, f);
        const r = ordenaBatalhao(partida, b, escolhaFaccao, f); if (r) aviso(r, "info", "info");
        escolhaFaccao = null; atualizaSelecao();
      });
      lista.appendChild(bt);
    }
    p.appendChild(lista);
  }
}
function ordemNoPonto(x, z, e) {
  const b = selBat; if (!b) return;
  if (e && e.dono && e.dono !== b.faccao && !e.dono.governo) {
    if (hostis(partida, b.faccao, e.dono)) { ordenaBatalhao(partida, b, "avancar", e.dono); marcaDestino(x, z); atualizaSelecao(); return; }
    aviso(e.dono.nome + " não está em guerra com você: use Segurar frente ou declare guerra na Diplomacia", "handshake", "info"); return;
  }
  const zn = e ? e.zona : zonaDe(partida.reg, x, z); if (!zn) return;
  ordenaBatalhao(partida, b, zn.dono === b.faccao ? "proteger" : "tomar", zn);
  marcaDestino(zn.x, zn.z); atualizaSelecao();
}
function ordemLinha() { aviso("Agora as ordens são por área: clique com o botão direito num bairro", "info", "info"); }
let destinoMarcado = null;
function marcaDestino(x, z) { destinoMarcado = { x, z, ate: performance.now() + 1500 }; }
function mostraRotaSelecionada() {
  const pts = [];
  for (const sq of selecao) if (sq.rota) { const [x, z] = [sq.x, sq.z]; pts.push([x, z]); for (let i = sq.passo; i < sq.rota.length; i++) pts.push(sq.rota[i]); break; }
  poeLinha(linhaRota, pts);
}

/* ---------- painel de contexto (direita) ---------- */
function fechaContexto() { contexto = null; $("contexto").classList.add("oculto"); marca(anelEscolha, caixaEscolha, null); zonaDestacada = null; }
function cabecalho(p, icone, titulo, sub, cor) {
  const h = cria("div", "cab");
  if (typeof icone === "string") { const i = ico(icone, "grande"); if (cor != null) i.style.color = corCss(cor); h.appendChild(i); } else h.appendChild(icone);
  const t = cria("div", "tt"); t.appendChild(cria("div", "titulo", titulo)); if (sub) { if (typeof sub === "string") t.appendChild(cria("div", "sub", sub)); else t.appendChild(sub); }
  h.appendChild(t); h.appendChild(botao("close", null, "mini fechar", fechaContexto, "Fechar (Esc)")); p.appendChild(h);
}
function abreContexto(tipo, alvo) { contexto = { tipo, alvo }; desenhaContexto(); }
function desenhaContexto() {
  const p = $("contexto"); if (!contexto) { p.classList.add("oculto"); return; }
  const rolagem = p.scrollTop;
  limpa(p); p.classList.remove("oculto");
  if (contexto.tipo === "predio") painelPredio(p, contexto.alvo);
  else if (contexto.tipo === "zona") painelZona(p, contexto.alvo);
  else painelSoldado(p, contexto.alvo);
  p.scrollTop = rolagem;
}
function linkZona(zn) {
  const a = cria("a", "link"); a.href = "#"; a.appendChild(ico(ICONE_ZONA[zn.tipo])); a.appendChild(cria("span", null, zn.nome));
  a.addEventListener("click", ev => { ev.preventDefault(); mostraZona(zn); }); return a;
}
function mostraPredio(e) { zonaDestacada = null; marca(anelEscolha, caixaEscolha, e); abreContexto("predio", e); }
function painelPredio(p, e) {
  const sub = cria("div", "sub"); sub.appendChild(linkZona(e.zona));
  cabecalho(p, ICONE_TIPO[e.tipo], TIPOS[e.tipo].n + (e.grande ? " (grande)" : ""), sub, e.dono ? e.dono.cor : null);
  const tags = cria("div", "tags");
  tags.appendChild(chip(e.dono ? e.dono.cor : null, e.dono ? (e.dono.jogador ? "Seu" : e.dono.nome) : "Sem dono"));
  if (TIPOS_CHAVE.includes(e.tipo)) { const k = cria("span", "chip chave"); k.appendChild(ico("star")); k.appendChild(cria("span", null, "Ponto importante")); tags.appendChild(k); }
  if (partida && e === (eu() || {}).base) { const k = cria("span", "chip chave"); k.appendChild(ico("home")); k.appendChild(cria("span", null, "Seu QG")); tags.appendChild(k); }
  p.appendChild(tags);
  const g = partida ? guarnicaoDe(partida, e) : [];
  const corpo = cria("div", "grade");
  if (g.length) linha(corpo, "shield", "Guarnição", g.map(s => s.nome + " (" + ativos(s).length + ")").join(", "));
  if (impostoDe(e)) linha(corpo, ICONE_RECURSO.dinheiro, "Imposto", "$ " + impostoDe(e).toFixed(1) + "/h");
  if (comidaDoPredio(e)) linha(corpo, ICONE_RECURSO.comida, "Comida", comidaDoPredio(e).toFixed(0) + "/h" + (e.tipo === "fazenda" ? " · nível " + NIVEL.romano[(e.nivel || 1) - 1] + (e.plantacao ? " · " + e.plantacao + " expansão(ões) de plantação" : "") : ""));
  if (INFLUENCIA[e.tipo]) linha(corpo, ICONE_RECURSO.influencia, "Influência", INFLUENCIA[e.tipo] + "/h");
  if (moradoresDe(e)) linha(corpo, "groups", "Moradores", String(moradoresDe(e)));
  if (e.destruido) linha(corpo, "skull", "Destruído", "escombros: sem imposto, sem moradores, quase não protege");
  else if (e.dano) linha(corpo, "local_fire_department", "Dano", Math.round(e.dano * 100) + "% (protege menos)");
  if (e.fortificado) linha(corpo, "wall", "Fortificado", Math.round(e.fortificado * 100) + "% (defensores mais protegidos)");
  if (FABRICACAO.pontos[e.tipo]) linha(corpo, "precision_manufacturing", "Fabrica armas", FABRICACAO.pontos[e.tipo] + " ponto(s)/h" + (e.tipo === "fabrica" ? ", inclusive pesadas" : ""));
  if (e.tipo === "lider") linha(corpo, "diversity_3", "Clã", "manda " + RECRUTA.cla.qtd + " homens armados por dia a quem tem a casa");
  if (e.tipo === "lider") linha(corpo, "home_pin", "Base avançada", "quem tem a casa troca função, arma e esquadrão aqui, com o arsenal do QG");
  if (e.tipo === "posto") linha(corpo, "local_shipping", "Contrabando", "cada posto seu diminui o risco das cargas");
  if (e.andares && ["casa", "predio", "loja"].includes(e.tipo)) linha(corpo, "layers", "Andares", String(e.andares));
  p.appendChild(corpo);
  if (estado === "escolher") {
    if (!podeComecar(e)) { p.appendChild(cria("div", "aviso-txt", "Esta área é do governo antigo. Escolha um prédio fora da área cinza.")); return; }
    const lb = cria("label", null, "Nome da sua facção"); lb.htmlFor = "nomeFac"; p.appendChild(lb);
    const inp = cria("input"); inp.type = "text"; inp.id = "nomeFac"; inp.maxLength = 32; inp.value = regiao.nomeSugerido; p.appendChild(inp);
    p.appendChild(botao("flag", "Fundar facção aqui", "principal largo", () => fundar(e, inp.value.trim() || regiao.nomeSugerido)));
    return;
  }
  if (estado !== "jogo") return;
  const f = eu(), ac = cria("div", "acoes-grade");
  if (e.dono && !e.dono.governo && e.dono !== f && f) { const est = estadoEntre(partida, f, e.dono); const k = cria("div", "nota"); k.textContent = "Relação com " + e.dono.nome + ": " + (ESTADOS[est].n) + (est === "guerra" ? "" : " · sem guerra, ninguém toma prédio do outro"); p.appendChild(k); }
  if (selBat && e.zona.dono !== f) ac.appendChild(botaoGrande("flag", "Tomar a zona", selBat.nome, () => { ordenaBatalhao(partida, selBat, "tomar", e.zona); atualizaSelecao(); }, null, "ataque"));
  if (f && e.dono !== f) {
    const motivo = podeConvencer(partida, f, e);
    ac.appendChild(botaoGrande(ICONE_RECURSO.influencia, "Convencer", custoConvencer(e) + " de influência", () => { convence(partida, f, e); desenhaContexto(); mostraRecursos(); }, motivo));
  }
  if (ac.children.length) p.appendChild(ac);
  if (!selBat && e.dono !== f) p.appendChild(cria("div", "nota", "Para tomar à força, selecione um batalhão à esquerda."));
  // obras (paga e espera) nas vilas e setores rurais
  if (f && e.dono === f) {
    const obra = (f.obras || []).find(o => o.e === e);
    if (obra) { const k = cria("div", "obra-em"); k.appendChild(ico(OBRAS[obra.tipo].icone)); k.appendChild(cria("span", null, OBRAS[obra.tipo].n + ": pronta em " + horasAte(obra.fim) + " h")); const bb = cria("div", "fundo"), ff = cria("div", "cheio"); ff.style.width = Math.min(100, (partida.tempo - obra.inicio) / (obra.fim - obra.inicio) * 100) + "%"; bb.appendChild(ff); k.appendChild(bb); p.appendChild(k); }
    else {
      const tipos = obrasPossiveis(partida, f, e);
      if (tipos.length) {
        const og = cria("div", "acoes-grade");
        for (const t of tipos) {
          const o = OBRAS[t], custo = custoObra(t, e), horas = horasObra(t, e);
          if (t === "melhorar" && (e.nivel || 1) >= 3) continue;
          const nome = t === "melhorar" ? "Melhorar para nível " + NIVEL.romano[e.nivel || 1] : o.n;
          og.appendChild(botaoGrande(o.icone, nome, "$ " + custo.toLocaleString("pt-BR") + " · " + horas + " h", () => { comecaObra(partida, f, e, t); desenhaContexto(); mostraRecursos(); }, motivoObra(partida, f, e, t), "obra"));
        }
        p.appendChild(og);
        p.appendChild(cria("div", "nota", tipos.map(t => OBRAS[t].txt).join(" · ")));
      } else if (!ZONAS_DE_CAMPO.includes(e.zona.tipo) && ["casa", "loja", "fazenda"].includes(e.tipo)) p.appendChild(cria("div", "nota", "Obras de fazenda e armazém só em vilas e setores rurais."));
    }
  }
}

function mostraZona(zn) {
  if (resolveClique(zn)) return;
  zonaDestacada = zn; marca(anelEscolha, caixaEscolha, null);
  vaiPara(zn.x, zn.z, Math.max(320, Math.min(cam.ad, 700)));
  abreContexto("zona", zn);
}
const NOME_TIPO_ZONA = { velha: "Quarteirão da cidade velha", bairro: "Bairro", vila: "Vila", rural: "Campo" };
function painelZona(p, zn) {
  cabecalho(p, ICONE_ZONA[zn.tipo], zn.nome, NOME_TIPO_ZONA[zn.tipo] + " · " + zn.sig.toLowerCase(), zn.dono ? zn.dono.cor : null);
  const tags = cria("div", "tags");
  tags.appendChild(chip(zn.dono ? zn.dono.cor : null, zn.dono ? "Controle total: " + zn.dono.nome : "Ninguém tem o controle total"));
  p.appendChild(tags);
  const b = cria("div", "barra-zona");
  for (const k of zn.chaves) { const s = cria("i"); s.style.background = k.dono ? corCss(k.dono.cor) : "rgba(255,255,255,.12)"; s.title = TIPOS[k.tipo].n; b.appendChild(s); }
  p.appendChild(b);
  const f = eu(), meus = f ? zn.chaves.filter(k => k.dono === f).length : 0;
  p.appendChild(cria("div", "nota", meus + " de " + zn.chaves.length + " pontos importantes são seus. Com todos: +25% de imposto, +" + INFLUENCIA_ZONA + " de influência por hora e a comida das roças."));
  const lista = cria("div", "chaves");
  for (const k of zn.chaves) {
    const l = cria("div", "chave");
    const i = ico(ICONE_TIPO[k.tipo]); i.style.color = k.dono ? corCss(k.dono.cor) : "#9aa6b4"; l.appendChild(i);
    l.appendChild(cria("span", "n", TIPOS[k.tipo].n));
    l.appendChild(cria("span", "d", k.dono ? (k.dono.jogador ? "seu" : k.dono.nome) : "sem dono"));
    const g = partida ? guarnicaoDe(partida, k) : [];
    if (g.length) { const s = ico("shield", "def"); s.title = "Defendido por " + g.map(q => q.nome + " (" + ativos(q).length + ")").join(", "); l.appendChild(s); }
    l.addEventListener("click", () => { vaiPara(k.x, k.z, Math.min(cam.ad, 220)); mostraPredio(k); });
    lista.appendChild(l);
  }
  p.appendChild(lista);
  // alimentar este bairro
  if (estado === "jogo" && f && zn.edificios.some(e => e.dono === f)) {
    const mor = zn.edificios.filter(e => e.dono === f).reduce((t, e) => t + moradoresDe(e), 0), conf = confiancaEm(f, zn), sim = alimenta(f, zn);
    const cx = cria("div", "alimentar" + (sim ? "" : " nao"));
    const t = cria("div", "al-tit"); t.appendChild(ico(ICONE_RECURSO.comida)); t.appendChild(cria("b", null, sim ? "Alimentando os moradores" : "Sem comida para os moradores"));
    t.appendChild(cria("span", null, mor + " moradores seus · " + (mor * COME_MORADOR).toFixed(1) + " de comida/h")); cx.appendChild(t);
    const bc = cria("div", "conf"), fc = cria("i"); fc.style.width = conf + "%"; fc.className = conf < 50 ? "baixa" : ""; bc.appendChild(fc); cx.appendChild(bc);
    cx.appendChild(cria("div", "nota", "Confiança " + Math.round(conf) + "% · imposto " + Math.round(fatorImposto(f, zn) * 100) + "% do normal" + (conf < CONFIANCA.voluntarios ? " · sem voluntários" : "")));
    cx.appendChild(botao(sim ? "no_food" : ICONE_RECURSO.comida, sim ? "Parar de alimentar" : "Voltar a alimentar", "largo", () => { trocaAlimentar(f, zn); desenhaContexto(); mostraRecursos(); }, sim ? "Economiza comida, mas a confiança cai " + CONFIANCA.caiSemComida + "% por hora" : "A confiança volta a subir " + CONFIANCA.sobeAlimentado + "% por hora"));
    p.appendChild(cx);
  }
  if (estado === "jogo" && selBat) {
    const ac = cria("div", "acoes-grade");
    if (zn.dono !== f) ac.appendChild(botaoGrande("flag", "Tomar esta zona", selBat.nome, () => { ordenaBatalhao(partida, selBat, "tomar", zn); atualizaSelecao(); }, null, "ataque"));
    ac.appendChild(botaoGrande("shield_home", "Proteger esta zona", selBat.nome, () => { ordenaBatalhao(partida, selBat, "proteger", zn); atualizaSelecao(); }, null, "defesa"));
    p.appendChild(ac);
  }
}

const VIDA = { ok: "Pronto", ferido: "Ferido", morto: "Morto", rendido: "Prisioneiro", tratando: "Em tratamento", fila: "Esperando tratamento", reserva: "Esperando numa base", desertou: "Desertou", comando: "No comando, numa base", motorista: "Motorista de veículo de logística" };
function mostraSoldado(s) { zonaDestacada = null; marca(anelEscolha, caixaEscolha, null); abreContexto("soldado", s); }
function fichaArma(s) {
  const d = cria("div", "ficha-arma" + (s.arma ? "" : " sem"));
  if (s.arma) {
    d.appendChild(icoArma(chave(s.arma, s.nivel || 1))); d.appendChild(cria("span", null, nomeItem(chave(s.arma, s.nivel || 1))));
    const mb = cria("div", "f-mun"), mf = cria("i"); mf.style.width = Math.min(100, s.municao / cargaDe(s) * 100) + "%"; mb.appendChild(mf);
    if (s.municao < cargaDe(s) * POUCA_MUNICAO) mb.classList.add("pouca");
    const mm = cria("span", "f-mun-n"); mm.appendChild(ico(MUNICOES[MUNICAO_DA[s.arma]].icone)); mm.appendChild(cria("span", null, Math.floor(s.municao) + "/" + Math.round(cargaDe(s))));
    d.appendChild(mb); d.appendChild(mm);
  }
  else { d.appendChild(ico("block")); d.appendChild(cria("span", null, "Sem arma: precisa ir ao QG")); }
  if (s.item) { d.appendChild(icoArma(chave(s.item, s.nivelItem || 1), "peq")); d.appendChild(cria("span", "peq", nomeItem(chave(s.item, s.nivelItem || 1)) + (s.item === "kit" ? " · " + (s.usosKit == null ? NIVEL.kitUsos[(s.nivelItem || 1) - 1] : s.usosKit) + " usos" : ""))); }
  return d;
}
function painelSoldado(p, s) {
  const sub = cria("div", "sub"); sub.appendChild(chip(s.faccao.cor, s.faccao.jogador ? "Seu" : s.faccao.nome)); if (s.sq) sub.appendChild(cria("span", null, " " + s.sq.nome));
  cabecalho(p, retrato(s, 72), s.nome, sub);
  const tags = cria("div", "tags");
  const fn = cria("span", "chip"); fn.appendChild(icoFuncao(s.funcao)); fn.appendChild(cria("span", null, s.cargo === "faccao" ? "Líder da facção" : s.cargo === "batalhao" ? "Líder do " + s.bat.nome : s.sq && s.sq.lider === s ? "Sargento" : NOME_CURTO_FUNCAO[s.funcao])); tags.appendChild(fn);
  if (s.bat && s.cargo !== "batalhao") { const bc = cria("span", "chip"); bc.appendChild(ico("groups")); bc.appendChild(cria("span", null, s.bat.nome)); tags.appendChild(bc); }
  const pt = cria("span", "chip"); pt.appendChild(divisas(s, true)); pt.appendChild(cria("span", null, patente(s))); tags.appendChild(pt);
  if (s.origem) { const o = cria("span", "chip"); o.appendChild(ico(RECRUTA[s.origem].icone)); o.appendChild(cria("span", null, RECRUTA[s.origem].n)); tags.appendChild(o); }
  p.appendChild(tags);
  p.appendChild(fichaArma(s));
  const bp = bonusDe(s);
  if (nivelPatente(s) > 0) { const b = cria("div", "bonus-pat"); b.appendChild(ico("military_tech")); b.appendChild(cria("span", null, patente(s) + ": +" + bp.moral + " de moral · +" + Math.round((bp.precisao - 1) * 100) + "% de precisão · " + Math.round((1 - bp.calma) * 100) + "% mais calmo sob fogo · " + Math.round((1 - bp.fatal) * 100) + "% menos chance de morrer ao ser atingido")); p.appendChild(b); }
  if (podeLiderar(s) && !(s.sq && s.sq.lider === s)) { const b = cria("div", "bonus-pat apto"); b.appendChild(ico("star")); b.appendChild(cria("span", null, "Pode comandar um esquadrão")); p.appendChild(b); }
  const proxima = PATENTES[nivelPatente(s) + 1];
  const g = cria("div", "grade");
  if (proxima) barra(g, "military_tech", "Até " + proxima[1], s.xp, proxima[0]);
  linha(g, s.vida === "ok" ? "check_circle" : "healing", "Situação", s.vida === "ok" && s.sq && s.sq.combate ? "Lutando" : VIDA[s.vida] + (s.vida === "tratando" ? " (" + s.ondeTrata + ", falta " + Math.max(0, Math.ceil((s.fimTrat - partida.tempo) / HORA * 10) / 10) + " h)" : ""));
  if (s.vida === "ok") barra(g, "mood", "Moral", s.moral, 130, s.moral < 30 ? "#ff6a4a" : null);
  p.appendChild(g);
  const at = cria("div", "secao"); at.appendChild(cria("div", "rotulo-peq", "Atributos (sobem com a prática)"));
  for (const [k, n] of Object.entries(ATRIBUTOS)) barra(at, ICONE_ATR[k], n, s.atr[k]);
  p.appendChild(at);
  const pr = cria("div", "secao"); pr.appendChild(cria("div", "rotulo-peq", "Jeito de lutar"));
  barra(pr, "shield", PREFS.cobertura, s.pref.cobertura, 1); barra(pr, "turn_right", PREFS.flanco, s.pref.flanco, 1); barra(pr, "record_voice_over", PREFS.obedece, s.pref.obedece, 1);
  p.appendChild(pr);
  const hi = cria("div", "secao"); hi.appendChild(cria("div", "rotulo-peq", "Histórico"));
  const nums = cria("div", "nums");
  for (const [icn, n, v] of [["swords", "combates", s.combates], ["my_location", "acertos", s.acertos], ["skull", "abates", s.abates], ["healing", "ferido", s.ferimentos]]) {
    const c = cria("div", "num-caixa"); c.appendChild(ico(icn)); c.appendChild(cria("b", null, String(v))); c.appendChild(cria("span", null, n)); nums.appendChild(c);
  }
  hi.appendChild(nums);
  if (s.diario.length) { const ul = cria("ul", "diario"); for (const t of s.diario) ul.appendChild(cria("li", null, t)); hi.appendChild(ul); }
  p.appendChild(hi);
  if (s.vida === "ok" || s.vida === "ferido") p.appendChild(botao("center_focus_strong", "Ir até ele", "largo", () => vaiPara(s.x, s.z, 120)));
}

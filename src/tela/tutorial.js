"use strict";
/* ============================================================
   TUTORIAL
   Um cartão no alto da tela explica um passo de cada vez e um anel
   pisca em volta do que é para clicar. Os passos de ação avançam
   sozinhos quando o jogador faz o que foi pedido; os de explicação
   têm o botão "Entendi". Dá para pular a qualquer momento.
   ============================================================ */
let tutorial = null;   // { i, feitos }
const marcaTutorial = { ordem: false };
const PASSOS_TUTORIAL = [
  { icone: "flag", titulo: "Funde sua facção", texto: "A área cinza é do governo antigo. Clique num prédio fora dela e depois em \"Fundar facção aqui\". Casas grandes e vilas afastadas são mais seguras.",
    pronto: () => estado === "jogo" || estado === "rivais" },
  { icone: "payments", titulo: "Seus recursos", texto: "Dinheiro paga salários e armas. Influência convence moradores e recruta voluntários. Comida alimenta soldados e moradores. O número pequeno mostra quanto entra ou sai por hora.",
    alvo: "#recursos", entendi: true, aoEntrar: () => mudaVelocidade(0) },
  { icone: "groups", titulo: "Seu batalhão", texto: "Você comanda líderes de batalhão. O líder fica numa base e os sargentos levam os esquadrões. Clique no cartão do 1º Batalhão para selecionar.",
    alvo: "#esquadroes .card", pronto: () => !!selBat },
  { icone: "flag", titulo: "Dê uma ordem", texto: "Clique com o botão direito num bairro do mapa: o batalhão vai tomar a área (ou proteger, se já for sua). Também dá para usar os botões Tomar área, Proteger área, Segurar frente e Avançar fronteira. Um batalhão pode ter até 4 ordens: o líder divide os esquadrões entre elas, faz rondas na fronteira e manda reforço para onde o inimigo aparece.",
    pronto: () => !!(selBat && selBat.ordens && selBat.ordens.length) },
  { icone: "scale_balance", titulo: "Postura", texto: "Agressivo arrisca mais e ataca até prédios defendidos. Cauteloso só pega o que está fraco e recua cedo. O líder decide o resto: monta os esquadrões, escolhe sargentos e distribui armas.",
    alvo: "#ordens .postura", entendi: true },
  { icone: "location_city", titulo: "Bairros e pontos importantes", texto: "Clique no nome de um bairro no mapa. Ele mostra os pontos importantes (os ícones redondos). Quem tem todos eles tem o controle total do bairro e ganha bônus.",
    alvo: ".rot.bairro", pronto: () => contexto && contexto.tipo === "zona" },
  { icone: "fast_forward", titulo: "O tempo", texto: "O jogo está pausado. Aperte a velocidade 5x para as coisas acontecerem mais rápido. Espaço pausa. Uma hora do jogo dura 1 minuto na velocidade normal.",
    alvo: '#tempo button[data-v="5"]', pronto: () => !partida.pausado && partida.velocidade >= 5 },
  { icone: "campaign", titulo: "Acontecimentos", texto: "Aqui aparecem as novidades: vermelho é perigo, verde é coisa boa, dourado é ação sua. Clique numa linha para ir até o lugar; a setinha mostra a lista inteira.",
    alvo: "#avisos", entendi: true },
  { icone: "person_add", titulo: "Recrutar", texto: "Abra Recrutar. Voluntários vêm dos seus bairros sem arma; mercenários custam dinheiro e já vêm armados; o clã e os prisioneiros também dão gente.",
    alvo: '[data-janela="recrutar"]', pronto: () => janela === "recrutar" },
  { icone: "inventory_2", titulo: "Armas", texto: "Agora abra Armas. Toda arma tem nível I, II e III (mais precisão e dano, bem mais cara). Cada tiro gasta munição: balas, cintas da AR, granadas e foguetes. Compre no mercado negro, encomende no contrabando, fabrique ou ganhe de países. Os soldados recarregam e trocam de arma numa base.",
    alvo: '[data-janela="armas"]', pronto: () => janela === "armas" },
  { icone: "groups", titulo: "Orçamento dos batalhões", texto: "Em Batalhões você define o mínimo de soldados, armas e munição de cada batalhão: o que faltar é comprado ou fabricado sozinho, chega ao QG e os veículos de logística levam até a base do líder. Os soldados também são recrutados sozinhos. O líder monta os esquadrões; você pode sugerir trocas, e ele decide. Com mais território, abre outro batalhão.",
    alvo: '[data-janela="gestao"]', pronto: () => janela === "gestao" },
  { icone: "handshake", titulo: "Diplomacia", texto: "Todas as facções começam neutras; o governo está em guerra com todas. Só quem está em guerra luta. Em Diplomacia você vê a relação, aceita propostas, propõe pactos e alianças ou declara guerra. A guerra cansa as facções (exaustão): cansada, ela aceita cessar-fogo. Quem cresce demais vira alvo do governo e de uma coalizão das outras facções.",
    alvo: '[data-janela="faccoes"]', pronto: () => janela === "faccoes" },
  { icone: "star", titulo: "Pronto!", texto: "Para vencer, elimine todas as facções rivais. O governo antigo enfraquece com o tempo, mas contra-ataca. Os esquadrões se viram sozinhos: voltam ao QG para se refazer e pedem ajuda quando apertar. O botão Ajuda tem o resumo dos controles.",
    entendi: true, fim: true }
];

function iniciaTutorial() {
  tutorial = { i: 0 };
  document.body.classList.add("com-tutorial");
  if (estado === "jogo") tutorial.i = 1;
  mostraPassoTutorial();
}
function terminaTutorial(pulou) {
  tutorial = null; document.body.classList.remove("com-tutorial");
  $("tutorial").classList.add("oculto"); $("tutorial-anel").classList.add("oculto");
  try { localStorage.setItem("faccoes-tutorial-visto", "1"); } catch (e) {}
  if (pulou) aviso("Tutorial pulado. Dá para ver de novo em Ajuda.", "help", "info");
}
function mostraPassoTutorial() {
  const p = PASSOS_TUTORIAL[tutorial.i], c = $("tutorial"); limpa(c); c.classList.remove("oculto");
  if (p.aoEntrar) p.aoEntrar();
  const cab = cria("div", "tu-cab"); cab.appendChild(ico(p.icone)); cab.appendChild(cria("b", null, p.titulo));
  cab.appendChild(cria("span", "tu-num", (tutorial.i + 1) + " de " + PASSOS_TUTORIAL.length)); c.appendChild(cab);
  c.appendChild(cria("div", "tu-txt", p.texto));
  const pe = cria("div", "tu-pe");
  if (!p.fim) pe.appendChild(botao(null, "Pular tutorial", "tu-pular", () => terminaTutorial(true)));
  if (p.entendi) pe.appendChild(botao("check", p.fim ? "Começar a jogar" : "Entendi", "principal", () => avancaTutorial()));
  else pe.appendChild(cria("span", "tu-espera", "faça o que foi pedido para continuar"));
  c.appendChild(pe);
  c.classList.remove("pulo"); void c.offsetWidth; c.classList.add("pulo");
}
function avancaTutorial() {
  if (!tutorial) return;
  if (PASSOS_TUTORIAL[tutorial.i].fim) { terminaTutorial(false); return; }
  tutorial.i++; mostraPassoTutorial();
}
/* chamado a cada quadro: confere se o passo foi feito e põe o anel no alvo */
function atualizaTutorial() {
  if (!tutorial) return;
  const p = PASSOS_TUTORIAL[tutorial.i];
  if (p.pronto && p.pronto()) { avancaTutorial(); return; }
  const anel = $("tutorial-anel"), el = p.alvo && [...document.querySelectorAll(p.alvo)].find(x => x.offsetParent !== null);
  if (!el) { anel.classList.add("oculto"); return; }
  const r = el.getBoundingClientRect(), m = 6;
  anel.classList.remove("oculto");
  anel.style.left = (r.left - m) + "px"; anel.style.top = (r.top - m) + "px"; anel.style.width = (r.width + 2 * m) + "px"; anel.style.height = (r.height + 2 * m) + "px";
}
function tutorialJaVisto() { try { return localStorage.getItem("faccoes-tutorial-visto") === "1"; } catch (e) { return false; } }

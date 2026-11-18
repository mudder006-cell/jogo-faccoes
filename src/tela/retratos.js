"use strict";
/* ============================================================
   RETRATOS E ÍCONES DESENHADOS
   - Cada soldado tem um rosto desenhado a partir de s.rosto (pele,
     barba, lenço, capacete...). O lenço ou a bandana pode ter a cor
     da facção, e o fundo do retrato sempre tem.
   - As armas têm silhuetas próprias (a fonte de ícones não tem armas).
   ============================================================ */
const PELES = ["#e3b892", "#cf9f73", "#b8865b", "#9e6c45", "#80553a", "#d9a87b"];
const CABELOS = ["#1c1612", "#2e2118", "#4a3424", "#131313"];
const PANOS = [["#f1efe8", "#b8352f"], ["#f1efe8", "#22201d"], ["#5b6640", "#3d4530"], ["#2d3440", "#1d222a"], ["#7a5c3a", "#4d3a24"]];
const ROUPAS = ["#4c5a3a", "#5a4a3a", "#3a4552", "#6b5b45", "#444a3c"];
const cacheRetrato = new Map();

function clareia(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const m = c => Math.round(c + (255 - c) * f);
  return "#" + ((m(r) << 16) | (m(g) << 8) | m(b)).toString(16).padStart(6, "0");
}
function escurece(hex, f) {
  const n = parseInt(hex.slice(1), 16), m = c => Math.round(c * (1 - f));
  return "#" + ((m(n >> 16) << 16) | (m(n >> 8 & 255) << 8) | m(n & 255)).toString(16).padStart(6, "0");
}

/* desenho do rosto num quadrado 64×64 */
function svgRetrato(s, tam) {
  const chave = s.id + ":" + tam + ":" + s.faccao.id + ":" + s.vida;
  if (cacheRetrato.has(chave)) return cacheRetrato.get(chave);
  const R = s.rosto || { pele: 1, cabelo: 0, barba: 1, cabeca: "nada", pano: 0 };
  const corFac = corCss(s.faccao.cor), pele = PELES[R.pele], cab = R.grisalho ? "#9d978c" : CABELOS[R.cabelo];
  const gov = s.faccao.governo, roupa = gov ? "#55603f" : ROUPAS[(s.id * 7) % ROUPAS.length];
  let pano = PANOS[R.pano];
  if (R.corDaFaccao) pano = [corFac, escurece(corFac, .35)];
  const rx = 14 * (1 + (R.rosto || 0)), ox = R.olhos || 0, sb = R.sobrancelha || 0;
  let h = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 64 64" class="retrato">`;
  h += `<defs><clipPath id="c${s.id}_${tam}"><circle cx="32" cy="32" r="31"/></clipPath></defs>`;
  h += `<circle cx="32" cy="32" r="31" fill="${clareia(corFac, .55)}"/><g clip-path="url(#c${s.id}_${tam})">`;
  // ombros e roupa (com a faixa da facção no ombro)
  h += `<path d="M6 66 Q8 47 32 46 Q56 47 58 66Z" fill="${roupa}"/>`;
  h += `<path d="M10 56 Q14 50 21 48 L23 54 Q16 55 12 60Z" fill="${corFac}"/>`;
  if (s.funcao === "medico") h += `<rect x="38" y="52" width="9" height="9" rx="1.5" fill="#fff"/><path d="M42.5 53.5v6M39.5 56.5h6" stroke="#d33" stroke-width="2"/>`;
  // pescoço e rosto
  h += `<rect x="27" y="38" width="10" height="11" fill="${escurece(pele, .12)}"/>`;
  h += `<ellipse cx="32" cy="29" rx="${rx}" ry="16" fill="${pele}"/>`;
  h += `<ellipse cx="${32 - rx}" cy="30" rx="2.6" ry="4" fill="${escurece(pele, .1)}"/><ellipse cx="${32 + rx}" cy="30" rx="2.6" ry="4" fill="${escurece(pele, .1)}"/>`;
  // cabelo atrás (quando não cobre)
  if (R.cabeca === "nada" || R.cabeca === "bone") h += `<path d="M${32 - rx} 26 Q${32 - rx} 11 32 11 Q${32 + rx} 11 ${32 + rx} 26 Q${30 + rx} 17 32 17 Q${34 - rx} 17 ${32 - rx} 26Z" fill="${cab}"/>`;
  // barba e bigode
  if (R.barba === 2) h += `<path d="M${33 - rx} 30 Q${34 - rx} 46 32 47 Q${30 + rx} 46 ${31 + rx} 30 Q${27 + rx} 38 32 38.5 Q${37 - rx} 38 ${33 - rx} 30Z" fill="${cab}"/>`;
  else if (R.barba === 1) h += `<path d="M${34 - rx} 33 Q${35 - rx} 43 32 44 Q${29 + rx} 43 ${30 + rx} 33 Q${27 + rx} 39 32 39.5 Q${37 - rx} 39 ${34 - rx} 33Z" fill="${cab}" opacity=".85"/>`;
  if (R.bigode || R.barba) h += `<path d="M26.5 35.5 Q32 33 37.5 35.5 Q32 34.8 26.5 35.5Z" fill="${cab}" stroke="${cab}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // boca, nariz, olhos e sobrancelhas
  h += `<path d="M29 38.5 Q32 ${R.barba ? 39.3 : 40} 35 38.5" stroke="${escurece(pele, .45)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  h += `<path d="M32 28 L30.6 33.2 Q32 34 33.6 33.2" stroke="${escurece(pele, .3)}" stroke-width="1.1" fill="none" stroke-linejoin="round"/>`;
  h += `<ellipse cx="${26.3 + ox}" cy="27.5" rx="2" ry="1.7" fill="#fff"/><ellipse cx="${37.7 - ox}" cy="27.5" rx="2" ry="1.7" fill="#fff"/>`;
  h += `<circle cx="${26.6 + ox}" cy="27.6" r="1.3" fill="#2a1d14"/><circle cx="${37.4 - ox}" cy="27.6" r="1.3" fill="#2a1d14"/>`;
  h += `<path d="M${22.8 + ox} ${24 - sb * .4} L${29.5 + ox} ${23.5 + sb * .5}M${34.5 - ox} ${23.5 + sb * .5} L${41.2 - ox} ${24 - sb * .4}" stroke="${cab}" stroke-width="2" stroke-linecap="round"/>`;
  // o que leva na cabeça
  if (R.cabeca === "keffiyeh") {
    h += `<path d="M${30 - rx} 34 Q${29 - rx} 8 32 8 Q${35 + rx} 8 ${34 + rx} 34 L${36 + rx} 52 Q${30 + rx} 44 ${31 + rx} 30 Q${30 + rx} 15 32 15 Q${34 - rx} 15 ${33 - rx} 30 Q${34 - rx} 44 ${28 - rx} 52Z" fill="${pano[0]}"/>`;
    h += `<path d="M${33 - rx} 18 H${31 + rx}M${32 - rx} 13.5 H${32 + rx}" stroke="${pano[1]}" stroke-width="1.6" stroke-dasharray="2.2 1.6"/>`;
    h += `<path d="M${33 - rx} 16 Q32 13 ${31 + rx} 16" stroke="#1d1a17" stroke-width="2.4" fill="none"/>`;
  } else if (R.cabeca === "bandana") {
    h += `<path d="M${32 - rx} 24 Q${32 - rx} 11 32 11 Q${32 + rx} 11 ${32 + rx} 24 Q32 19.5 ${32 - rx} 24Z" fill="${pano[0]}"/>`;
    h += `<path d="M${32 + rx - 1} 21 l7 4 l-2 4Z" fill="${pano[1]}"/>`;
  } else if (R.cabeca === "gorro") {
    const g = R.corDaFaccao ? corFac : ["#2b2b2b", "#5a1f24", "#26324a", "#4a3d2a", "#3a3a3a"][R.pano];
    h += `<path d="M${31 - rx} 24 Q${30 - rx} 9 32 6 Q${34 + rx} 9 ${33 + rx} 24Z" fill="${g}"/><circle cx="32" cy="6.5" r="2.6" fill="${escurece(g, .2)}"/>`;
    h += `<rect x="${31 - rx}" y="19" width="${2 * rx + 2}" height="6" rx="2.5" fill="${escurece(g, .22)}"/>`;
    h += `<path d="M${33 - rx} 19.5v5M${36 - rx} 19.5v5M${39 - rx} 19.5v5M${25 + rx} 19.5v5M${28 + rx} 19.5v5M${31 + rx} 19.5v5" stroke="${escurece(g, .4)}" stroke-width=".8"/>`;
  } else if (R.cabeca === "capacete") {
    const c = gov ? "#5b6640" : "#58604a";
    h += `<path d="M${30 - rx} 25 Q${30 - rx} 6 32 6 Q${34 + rx} 6 ${34 + rx} 25Z" fill="${c}"/><rect x="${28 - rx}" y="23" width="${2 * rx + 8}" height="4" rx="2" fill="${escurece(c, .2)}"/>`;
    h += `<path d="M${33 - rx} 25 V33M${31 + rx} 25 V33" stroke="${escurece(c, .4)}" stroke-width="1.2"/>`;
  } else if (R.cabeca === "bone") {
    const c = gov ? "#5b6640" : pano[0] === "#f1efe8" ? "#2d3440" : pano[0];
    h += `<path d="M${32 - rx} 21 Q${32 - rx} 9 32 9 Q${32 + rx} 9 ${32 + rx} 21Z" fill="${c}"/><path d="M${30 - rx} 21 H${38 + rx} Q${38 + rx} 24 ${34 + rx} 24 H${31 - rx}Z" fill="${escurece(c, .25)}"/>`;
  }
  h += `</g>`;
  if (s.vida === "morto") h += `<circle cx="32" cy="32" r="31" fill="#000" opacity=".55"/>`;
  else if (s.vida === "rendido") h += `<circle cx="32" cy="32" r="31" fill="#000" opacity=".35"/>`;
  h += `<circle cx="32" cy="32" r="30.5" fill="none" stroke="${corFac}" stroke-width="2.5"/></svg>`;
  if (cacheRetrato.size > 3000) cacheRetrato.clear();
  cacheRetrato.set(chave, h);
  return h;
}
function retrato(s, tam, classe) {
  const d = document.createElement("span"); d.className = "ret" + (classe ? " " + classe : "");
  d.innerHTML = svgRetrato(s, tam || 48); return d;
}

/* ---------- silhuetas das armas (viewBox 48×20) ---------- */
const DESENHO_ARMA = {
  veiculo: '<path d="M1 5h27v10H1z"/><path d="M28 8h9l6 5v3H28z"/><circle cx="8" cy="16.5" r="3"/><circle cx="36" cy="16.5" r="3"/>',
  fuzil: `<path d="M2 9h7l2-2h20v-1h11v2h4v2h-4v1H31l-1 2h-3l1.5 6h-4L22 12h-6l-2 4H7l1-4H2z"/>`,
  metralhadora: `<path d="M1 8h8l2-2h22v-1h13v3h1v2h-1v1H33l-1 2h-4v2l3 6h-4l-3-5h-4l-1 2h-3l1-4h-4l-2 4H8l1-4H1z"/><path d="M36 11l2 6M42 11l-2 6" stroke="currentColor" stroke-width="1.5"/>`,
  lancagranadas: `<path d="M3 8h8l2-2h19a4 4 0 0 1 0 8H28l-1 2h-3l1 5h-4l-2-6h-4l-2 3H8l1-3H3z"/><rect x="33" y="6" width="12" height="7" rx="3"/>`,
  rpg: `<path d="M2 8h27v4H2z"/><path d="M29 5l9-3 8 6v4l-8 6-9-3z"/><path d="M10 12h3v5h-3zM18 12h3l2 6h-3z"/>`,
  kit: `<rect x="12" y="3" width="24" height="16" rx="3"/><path d="M24 6v10M19 11h10" stroke="#fff" stroke-width="3"/>`,
  explosivo: `<rect x="8" y="5" width="7" height="14" rx="1"/><rect x="17" y="5" width="7" height="14" rx="1"/><rect x="26" y="5" width="7" height="14" rx="1"/><path d="M33 9q6-6 10-2" stroke="currentColor" stroke-width="1.6" fill="none"/>`
};
function icoArma(k, classe) {
  const s = document.createElement("span"); s.className = "arma-ico" + (classe ? " " + classe : "");
  const n = nivelDe(k);
  s.innerHTML = `<svg viewBox="0 0 48 20" fill="currentColor" aria-hidden="true">${DESENHO_ARMA[baseDe(k)] || ""}</svg>` + (n > 1 ? `<em class="nv nv${n}">${NIVEL.romano[n - 1]}</em>` : "");
  return s;
}
function icoItem(k, classe) { if (ehCaixa(k)) { const i = ico(MUNICOES[tipoDaCaixa(k)].icone, "mun-ico"); return i; } return icoArma(k, classe); }
/* ícone de cada função (as de arma usam a silhueta da arma) */
const ICONE_FUNCAO = { lider: "star", medico: "medical_services", engenheiro: "construction" };
function icoFuncao(f) { return ICONE_FUNCAO[f] ? ico(ICONE_FUNCAO[f]) : icoArma(FUNCOES[f].arma); }
const NOME_CURTO_FUNCAO = { lider: "Líder", fuzileiro: "Fuzileiro", metralhador: "Metralhador", granadeiro: "Granadeiro", antitanque: "Anti-tanque", medico: "Médico", engenheiro: "Engenheiro" };
/* divisas da patente */
function divisas(s, soIcones) {
  const n = PATENTES.reduce((k, [xp], i) => (s.xp >= xp ? i : k), 0), d = document.createElement("span"); d.className = "divisas";
  if (!n) { if (!soIcones) { d.textContent = "recruta"; d.classList.add("recruta"); } return d; }
  for (let i = 0; i < n; i++) d.appendChild(ico("keyboard_arrow_up"));
  d.title = patente(s); return d;
}

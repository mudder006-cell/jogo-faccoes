"use strict";
/* ============================================================
   DADOS: tamanhos, tipos de edifício, nomes e cores
   ============================================================ */
const MUNDO = 2800, METADE = MUNDO / 2;   // lado do mapa, em metros
const GRADE = 8;                           // lado de cada célula do relevo, em metros

const TIPOS = {
  casa:      { n: "Casa" },
  predio:    { n: "Prédio residencial" },
  loja:      { n: "Loja" },
  mercado:   { n: "Mercado coberto" },
  mesquita:  { n: "Mesquita" },
  armazem:   { n: "Armazém" },
  fabrica:   { n: "Fábrica" },
  oficina:   { n: "Oficina" },
  posto:     { n: "Posto de combustível" },
  delegacia: { n: "Delegacia" },
  hospital:  { n: "Hospital" },
  escola:    { n: "Escola" },
  governo:   { n: "Sede do governo" },
  quartel:   { n: "Quartel" },
  cidadela:  { n: "Cidadela" },
  fazenda:   { n: "Fazenda murada" },
  caixadagua:{ n: "Caixa d'água" },
  lider:     { n: "Casa do líder do clã" }
};
/* Pontos importantes: quem tiver todos os de uma zona tem o controle total dela */
const TIPOS_CHAVE = ["mesquita", "escola", "delegacia", "hospital", "posto", "governo", "quartel", "cidadela", "caixadagua", "lider"];

/* Nomes de lugares: palavras árabes reais (transliteradas), combinadas em nomes inventados.
   Cada palavra traz o significado em português, mostrado embaixo do nome no mapa. */
const NOME_INICIO = {
  Tell: "Colina", Ain: "Fonte", Kafr: "Aldeia", Deir: "Mosteiro", Jabal: "Monte", Wadi: "Vale",
  Bir: "Poço", Beit: "Casa", Ras: "Topo", Marj: "Prado", Khirbet: "Ruína", Qasr: "Palácio"
};
const INICIO_CIDADE = ["Tell", "Jabal", "Ras", "Qasr", "Wadi", "Ain", "Deir"];
const INICIO_VILA = ["Kafr", "Ain", "Beit", "Khirbet", "Deir", "Bir", "Marj"];
const NOME_FIM = [
  ["al-Zaytun", "das oliveiras"], ["al-Rumman", "das romãs"], ["al-Nakhil", "das palmeiras"], ["al-Tin", "dos figos"],
  ["al-Ward", "das rosas"], ["al-Hajar", "da pedra"], ["al-Ramla", "da areia"], ["al-Rih", "do vento"],
  ["al-Ghazal", "da gazela"], ["al-Nasr", "da águia"], ["al-Qamar", "da lua"], ["al-Najm", "da estrela"],
  ["al-Asal", "do mel"], ["al-Milh", "do sal"], ["al-Hadid", "do ferro"], ["al-Fidda", "da prata"],
  ["al-Sindiyan", "dos carvalhos"], ["al-Ghurab", "do corvo"], ["al-Shams", "do sol"], ["al-Thalj", "da neve"],
  ["al-Inab", "das uvas"], ["al-Lawz", "das amêndoas"], ["al-Hamam", "das pombas"], ["al-Jisr", "da ponte"],
  ["al-Sabil", "da fonte pública"], ["al-Qantara", "do arco"], ["al-Bustan", "do pomar"], ["al-Burj", "da torre"]
];
const NOMES_EVITAR = ["Deir al-Hajar", "Ain al-Tin", "Beit al-Hajar"];   // existem lugares reais com esses nomes
const NOME_CIDADE_VELHA = ["al-Madina al-Qadima", "a cidade velha"];

const NOMES_FAC_A = ["Frente", "Milícia", "Brigada", "Guarda", "Movimento", "Coluna", "Legião", "Comando"];
const NOMES_FAC_B = ["Popular", "Livre", "do Vale", "da Fronteira", "do Norte", "da Serra", "do Povo", "Independente", "de Libertação", "Nacional"];

const COR_JOGADOR = 0xf2b233;
const COR_GOVERNO = 0x8a8a84;
const PARTE_DO_GOVERNO = .8;     // fração dos edifícios que o governo antigo controla no começo
const CORES_RIVAIS = [0xd9534f, 0x4a90d9, 0x9b6bd6, 0x2bb3a3, 0xe07bb5];

// Cores dos edifícios (tons de pedra, reboco e concreto vistos nas imagens de satélite)
const CORES_PEDRA = [0xd9c9a3, 0xcbb890, 0xe2d5b5, 0xc4b08a, 0xd4c4a8, 0xbfae8c, 0xe0d2b4];
const CORES_CONCRETO = [0xc8c1b2, 0xbdb6a6, 0xd2cab8, 0xb3ab9a, 0xc9bda5, 0xd8d0c0, 0xaea594];
const CORES_CAMPO = ["#a88f60", "#b49b66", "#9c8a58", "#8f8a52", "#b9a370", "#a3925f", "#c2ad7a"];
const CORES_IRRIGADO = ["#6f8a44", "#7f9a4c", "#5f7c3c", "#8ba356", "#6a8440"];
const COR_OLIVAL = "#a8956a";

// Recuo dos edifícios em relação à beira de cada tipo de via (metros)
const VIAS = {
  rodovia: { recuo: 5 },
  avenida: { recuo: 3.5 },
  estrada: { recuo: 3 },
  rua:     { recuo: 1.4 },
  beco:    { recuo: .5 },
  trilha:  { recuo: 1.5 }
};

/* Perfis de bairro: tamanho dos lotes e tipos de edifício */
const PERFIS = {
  grade:      { n: "planejado", frente: [10, 17], fundo: [12, 20], vao: 1.2, dens: 1, margem: 1.1,
                tipos: [["predio", 58], ["casa", 20], ["loja", 16], ["oficina", 6]], andares: [2, 8] },
  encosta:    { n: "de encosta", frente: [9, 14], fundo: [9, 14], vao: 1.4, dens: .95, margem: 1.4,
                tipos: [["casa", 50], ["predio", 42], ["loja", 6], ["oficina", 2]], andares: [2, 5] },
  informal:   { n: "denso", frente: [6, 10], fundo: [7, 11], vao: .9, dens: 1, margem: .8,
                tipos: [["casa", 52], ["predio", 41], ["loja", 7]], andares: [2, 4] },
  industrial: { n: "industrial", frente: [26, 52], fundo: [22, 40], vao: 6, dens: .75, margem: 5,
                tipos: [["armazem", 48], ["fabrica", 28], ["oficina", 24]], andares: [1, 1] },
  vilas:      { n: "de casas", frente: [17, 25], fundo: [17, 24], vao: 2, dens: .8, margem: 2,
                tipos: [["casa", 86], ["predio", 9], ["loja", 5]], andares: [1, 3] },
  beira:      { n: "beira de estrada", frente: [15, 26], fundo: [15, 24], vao: 3, dens: .5, margem: 3,
                tipos: [["casa", 66], ["oficina", 18], ["loja", 12], ["armazem", 4]], andares: [1, 2] }
};

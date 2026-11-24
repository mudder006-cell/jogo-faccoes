Diagnóstico do mandato (protótipo 19.5) · ramo prototipo-19-5 · nenhum arquivo de src/ alterado
Ferramenta: `node testes/teste_mandato.js --horas 12|48 --json ...` (instrumenta por embrulho; não muda o jogo). 6 sementes (B2,K7,Q4,A1,D4,E5), 1 batalhão do jogador com 3 esquadrões (12 mercenários), guerra com a rival mais perto. Cenários: proteger (zona da base), proteger + incursão (6 inimigos com munição cheia mandados contra um ponto da zona a cada 2 h de jogo), tomar (zona vizinha mais perto). Rivais medidas nas mesmas partidas (3 rivais, normal).
Unidades: 1 h de jogo = 60 s do relógio (P.tempo). Amostrei a cada 10 s (não 30 s: um deslocamento de 400 m leva ~170 s). "Dentro" = centro do esquadrão na zona da ordem ou a menos de 120 m da borda (proteger), 100 m da zona (tomar), 200 m do ponto (frente), 150 m de prédio do alvo (avançar). Saídas em segundos do relógio; "fora médio" abaixo em h de jogo = s/60.

% do tempo dentro do setor (12 h / 48 h)
- Jogador proteger, sem pressão: 100% / 93,9%.  Com incursões: 61,3% / 63,8% (fora: 12,7% em combate, 21% andando, 4,9% na base).
- Jogador tomar: 93,8% enquanto a zona não era tomada; depois que a zona é tomada a ordem vira "proteger" e cai para 80% / 59,6%. Ordem "tomar" nunca levou o esquadrão para prédio fora da zona (filtroMissao segura).
- Rivais: proteger 83,3% / 72,7%; tomar 55,8% / 28,9% (48 h: 31,9% do tempo na base, 38% andando); frente 61,4% / 40,2%; avançar 0% (nunca chegam perto: 45% na base, 53% andando).

Ranking das causas de saída (48 h, só quem já tinha chegado ao setor)
- Proteger com incursão (24 saídas, 12 não voltaram, fora médio 1.245 s = 20 h de jogo): reação rápida 54% (missaoReacao, fora 1.365 s), correção de rumo da caçada 29% (pensaMissao passo 2), socorro de ronda 12,5%. Ou seja, 96% das saídas são perseguir esquadrão inimigo; o esquadrão sai do setor e só volta se o alvo morrer.
- Tomar jogador (68 saídas, 21 não voltaram, fora médio 573 s = 9,6 h): ir à base por logística (troca/pedido) 20,6%; socorro de ronda 19,1%; ir à base por pensaMissao (refazer/recarregar) 13,2% (fora 870 s); sem ordem registrada (andando) 13,2%; reação 11,8%; "vai à base" dentro de missaoExpandir 8,8% (20 s, irrelevante); rumo da caçada 7,4%.
- Rivais (73 saídas, 29 não voltaram, fora médio 393 s): ir à base por pensaMissao 31,5% (fora 646 s); logística 21,9%; andando sem ordem 17,8%; socorro de ronda 9,6%; atacar prédio fora do setor via missaoExpandir 9,6% (avançar/tomar).
- Causa 1 (socorro/caçada): confirmada, dominante na defesa. Causa 2 (refazer/recarregar à base inteiro): confirmada, 13% das saídas de tomar e 31% das das rivais, e é a de maior tempo fora (870 s e 646 s); nenhum esquadrão fica no lugar (revezamento não existe). Eventos: jogador refazer 71 + recarregar 9 em 48 h; rivais refazer 424.
- Causa 3 (líder troca esquadrões): NÃO confirmada no jogador (0 trocas de tarefa com 1 ordem); rivais 3 "lidermandou" em 48 h e 336 trocas de tarefa (quase todas replanejamento de ordens da IA). Pouco peso.
- Causa 4: "tomar" não sai da zona pedida (0 saídas por prédio fora da zona no jogador); mas, tomada a zona, vira "proteger" e a cobertura cai de 94% para 80% (12 h) e 60% (48 h). Prédios tomados na zona da ordem: 51 de 112 no 12 h.
- Causa 5 (nova): perseguição não tem coleira. vaiAtacarEsquadrao manda ao ponto do inimigo com "ataque" e o esquadrão captura prédios no caminho: em proteger + incursão, 5 de 108 prédios tomados pelo jogador (12 h) e 29 de 191 (48 h) ficaram na zona; o resto é fora ("ataca no lugar errado"). Em proteger sem pressão (48 h) o jogador tomou 217 prédios, só 2 na zona protegida.

Pontos tomados que ficaram vazios e foram perdidos (nenhum esquadrão nosso a menos de 100 m)
- Jogador tomar, 12 h: 112 prédios, 24% perdidos; 13 de 27 perdidos estavam vazios; vazio em 35,6% do tempo. Pontos importantes: 17, 2 perdidos. 48 h: 505, 71,7% perdidos, 263 vazios na hora da perda (66,9% do tempo vazio); pontos importantes 60, 44 perdidos (73%), 37 vazios.
- Proteger + incursão, 48 h: 191 tomados, 95% perdidos; incursões: perdeu o ponto atacado em 75 de 132 (por esquadrões já reduzidos a ~0,8 vivos; em 12 h 2 de 24). 3,3 h depois da incursão havia em média 0,1 a 0,6 esquadrão a menos de 150 m do ponto (48 h).
- Rivais 48 h: 3.628 tomados, 42,9% perdidos; 1.059 vazios na perda; vazio 68,6% do tempo. 12 h: 946, 31,9%, 54,8% vazio.
- Guarnição ("segura") não existe para o jogador: o ponto fica vazio por ~36% a 67% do tempo.

Jogador x rivais
- Mesma lógica (pensaMissao/cumpreOrdem), mas o jogador com poucas ordens tem 0 trocas de tarefa; rivais mudam de ordem o tempo todo (336 trocas) e gastam mais tempo indo à base (31,9% do tempo em "tomar", 23% em "frente") (eventos refazer: 424 nas rivais contra 71 no jogador, em 48 h; não medi o porquê).
- Rivais "avançar" nunca chega ao setor (0%); "tomar" rival 29% dentro em 48 h: a IA fica pouco no lugar.
- Pontos perdidos e vazios: jogador 267/66,9% (tomar 48 h) contra rivais 42,9%/68,6%: a diferença está na taxa de perda (jogador 72% x rivais 43%), não no vazio.

Não consegui medir / limites
- Não medi com esquadrões de 2 (só 3 iniciais) nem com mais de 1 ordem no jogador. Incursões são sintéticas (6 homens, munição 999), não vêm das rivais; contam também combate letal: em 48 h os 3 esquadrões morrem (esq vivos 0,3 a 1,3), o que mistura "não segurou" com "morreu".
- Em 48 h muitas rodadas do jogador acabam sem esquadrão; % dentro refere-se só a quem estava vivo. Saídas "sem ordem de movimento" (~13 a 18%) são movimento do combate/estado, não registrado por mim.
- O "motivo" é a última ordem de movimento com destino fora do setor (até 400 s antes); em perseguição longa o motivo inicial (socorro/reação) pode ser trocado por "rumo" da correção de rumo. Não medi tempo por esquadrão a menos de 100 m separando guarnição e assalto (não existe papel). Zona vizinha às vezes é do governo, o que muda a dureza.
- Sugestão de ajuste (quem decide é o Renan): coleira na perseguição (raio e tempo, não capturar prédio fora do setor, voltar ao setor) e revezamento no refazer/recarregar (um fica), mais guarnição nos pontos tomados.

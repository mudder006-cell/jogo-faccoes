Diagnóstico da IA rival: por que há poucas guerras entre rivais e pouca obra, fortificação e conserto. Nada foi alterado no jogo; os números vêm de scripts de medição fora do repositório (6 sementes de 48 h, normal, 3 rivais; no caso das obras e fortificações, 6 sementes x 3 rivais = 18 rivais; o `testes/estresse_ia.js` deu o mesmo quadro nas sementes B2, K7 e Q4).

Termos usados: "relação" é uma nota de -100 a 100 que cada par de facções tem (acima de zero se gostam, abaixo se não). "Limiar" é a nota em que algo acontece (por exemplo, declarar guerra). "Fronteira" são prédios de duas facções a menos de 90 m um do outro.

# Problema 1: poucas guerras entre rivais

Resultado medido: das 18 combinações de rival com rival (6 partidas x 3 pares), só 5 chegaram a uma relação abaixo de -45, que é o nível em que a guerra começa para a maioria. Nas 3 partidas do testador, só 1 teve guerra em 48 h.

## Causa 1 (a de maior peso): a relação entre rivais quase não se mexe

A relação de cada par começa entre -12 e +12 (`diplomacia.js:40`) e depois só sofre empurrões pequenos a cada hora (`diplomacia.js:121-143`):
- uma "tendência" fixa do par, entre -0,55 e +0,55 por hora (`diplomacia.js:40`, aplicada em `:140`). Exemplo: um par com tendência -0,3 perde 14 pontos em 48 h; para chegar a -45 precisaria de uns -0,7 por hora, valor que nenhum par tem;
- um desgaste de 0,2% por hora em direção a zero (`:143`), que puxa de volta ao meio;
- incidentes aleatórios (um tiroteio, um acordo de comida), 1 a cada 7 horas no mapa todo, ou seja, cerca de 1 a cada 21 horas por par, de valor médio perto de zero (`:146`; a lista está em `:30-37`);
- o efeito de fronteira (`:128-133`), que seria o empurrão forte para baixo, mas está zerado: as bases das rivais ficam a 1.180 a 3.300 m uma da outra (medido nas 6 sementes) e, na hora 12, nenhum par tinha um único prédio colado ao do outro. Sem vizinhança, não há atrito.

Número que prova: relação mínima atingida pelos 18 pares em 48 h: 5 abaixo de -45, 4 entre -45 e -10, 9 acima de -10. A máxima ficou entre -12 e +52. Resumindo: a relação anda de forma aleatória em volta de zero e a guerra depende de sorte.

Caminhos:
- A) Aproximar o limiar: baixar `declaraGuerra` de -45 para algo como -20. Pró: uma linha, resultado imediato. Contra: a guerra continua sendo sorte da tendência, só mais frequente, e a diferença entre personalidades fica pequena.
- B) Dar atrito de verdade: começar rivais vizinhas com relação pior, ou somar um desgaste por "disputa de zona" (duas rivais querendo a mesma região livre). Pró: guerra com motivo visível. Contra: mexe na leitura do mapa e precisa de mais testes.
- C) Guerra por decisão da IA, não só por relação: a rival escolhe um alvo (a mais fraca ou a mais próxima) e declara quando acha que ganha, usando a personalidade. Pró: o comportamento fica legível ("a agressiva ataca a mais fraca"). Contra: é a mudança maior. Recomendação (só sugestão): A como remendo rápido e C como solução de fundo.

## Causa 2: as rivais não precisam de guerra para crescer, o governo antigo é alvo fácil

O general escolhe alvos entre zonas com prédios que "podeTomar" (`ia.js:126`). Essa função (`diplomacia.js:54`) aceita prédio sem dono, do governo ou de facção em guerra com ela. O governo tem 1.400 a 1.900 prédios e está sempre em guerra com todos (`diplomacia.js:48`), então sempre sobra alvo e a ordem "tomar" gasta o interesse da rival. Medido: nas ordens ativas às 24 h, 17 eram "tomar" (quase todas contra o governo), 13 "proteger" e só 1 "frente" (a ordem de segurar a frente contra rival em guerra, `ia.js:136-149`). Além disso, só olha alvos a menos de 900 m dos seus bairros (`ia.js:30` e `:127`), e as rivais estão a mais de 1.200 m uma da outra. Nenhuma ordem de ataque da IA jamais mira uma rival neutra.

Caminhos:
- A) Manter assim e deixar a guerra surgir só da diplomacia (causa 1). Pró: nada novo. Contra: o jogo continua com rivais que só brigam com o governo.
- B) Quando o governo local acabar ou ficar longe, a rival passa a ver a vizinha mais próxima como alvo e declara guerra a ela. Pró: guerra aparece sozinha no meio da partida. Contra: precisa decidir o que é "acabar" (por exemplo, menos de N prédios do governo no alcance).
- C) Aumentar `alcanceAlvo` para as rivais se alcançarem mais cedo. Pró: aproxima as rivais. Contra: sozinho não declara guerra, só aumenta o contato; efeito de fronteira só aparece quando já há vizinhança.

## Causa 3: a personalidade quase não pesa

Só um campo muda por personalidade: `guerra` (`ia.js:20-23`): agressiva +15, oportunista 0, defensiva -15, comerciante -20. O limiar efetivo de guerra vira -30, -45, -60 e -65 (`diplomacia.js:175`), mas como a relação quase não passa de -30, até a agressiva raramente chega nele. O oportunista tem um bônus de -15/+20 conforme a razão de força (`diplomacia.js:168-169`), mas essa força vem do `forcaDaFaccao` do `ia.js:36` (só soldados prontos), pois há duas funções com o mesmo nome (`diplomacia.js:120` conta prédios + soldados x 8; `ia.js:36` conta só soldados). Como o `ia.js` é carregado depois, a dele vence e a diplomacia usa a versão de soldados. Com 6 a 8 soldados por rival, a razão varia bastante de um instante para o outro, e a regra de "medo de quem cresce" (`:123`, `:136-137`) olha soldados e não território.

Caminhos:
- A) Renomear uma das duas funções e decidir qual conta (prédios + soldados, como a diplomacia queria). Pró: remove uma fonte de comportamento estranho. Contra: muda um pouco as decisões já medidas; requer repetir o estresse.
- B) Dar a cada personalidade uma "vontade" própria de guerra (agressiva procura briga cedo; comerciante busca pacto), em vez de só deslocar o limiar. Pró: personalidade visível. Contra: mais um parâmetro para balancear.

## Causa 4: a comerciante e a defensiva fecham pacto cedo e o pacto bloqueia a guerra

O limiar para propor pacto é 25 + `acordo` (`diplomacia.js:171`): comerciante 10, defensiva 17, oportunista 25, agressiva 37. Como a relação inicial vai até +12 e a tendência é aleatória, pares com comerciante viram pacto cedo (visto na semente B2, hora 6). Do pacto só se sai com relação abaixo de -60 + `guerra` (`:176`), quase impossível. Medido: o testador viu comerciante sem guerra em 3 de 3 partidas de 72 h.

Caminhos: (A) deixar como está, pois é coerente com o design de uma comerciante pacífica; (B) pactos com prazo (acabam em 12 a 24 h se ninguém renovar), o que reabre a chance de guerra; (C) a comerciante corta pacto se o parceiro cresce demais. B e C contra: ainda mais regras de diplomacia para o jogador entender.

## Causa 5: a paz e a guerra se anulam pouco

Guerra termina em paz se a relação subir a -15 + `guerra` e passarem 6 h (`diplomacia.js:173`). Durante a guerra a relação cai com cada prédio tomado e cada ferido (`:27`), e ela só sobe se houver "inimigo em comum" (`:134`). Na semente B2 as duas guerras estavam em -42 e -67 até a hora 48: sem rota de volta. É um efeito colateral desejado de não "piorar domínio", mas explica por que nunca se viu paz. Caminho: deixar a paz depender também de cansaço (muitas baixas ou caixa negativo) em vez de só da relação.

# Problema 2: pouca obra, fortificação e conserto

Resultado medido (18 rivais x 48 h, 810 horas-rival): 0 obras de comida terminadas, 1 a 2 engenheiros por rival, 4 a 7 prédios com fortificação parcial por rival, "consertado" e "reconstruído" em 0 partidas.

## Obras de comida/economia (protótipo 17)

Regra da rival (`comida.js:90-98`, chamada a cada hora em `economia.js:97`): só constrói se a comida do saldo horário for menor ou igual a 4 E o dinheiro for pelo menos 4.000 (2.500 para comerciante, `ia.js:21-24`) E não tiver obra em andamento.

Causa 1 (a de maior peso): o dinheiro nunca chega no preço de entrada. Entre 810 horas-rival, o caixa esteve em 1.200 ou mais em 7,8%, em 2.500 ou mais em 2,2% e em 4.000 ou mais em 0%. Cada rival começa com 3.000 e gasta quase tudo nas primeiras horas na compra automática do estoque mínimo (`estoques.js:82-99`, `ia.js:66-90`). Medido nas 12 primeiras horas (média por rival, 12 rivais): explosivo 600, fuzil 800, suprimento 250, kit 230, bala 250 e cinta 60, ou cerca de 2.200 dos 3.000. Depois a renda líquida é de 50 a 100 por hora e o caixa fica entre 200 e 1.000.

Causa 2: a comida está sobrando, então a regra nem olha o dinheiro. O saldo horário de comida foi maior que 4 em 74% das horas-rival (`comida.js:92`), situação em que a função retorna logo. Uma obra de plantação custa 600 e uma fazenda 1.200 (`comida.js:20-23`), preços que a rival pagaria algumas vezes, mas só pelo critério de falta de comida, que quase nunca acontece.

Causa 3: as duas condições juntas: em nenhuma das 810 horas coincidiram comida baixa e dinheiro alto. Ou seja: o ajuste de qualquer um dos dois sozinho não basta se o outro continua igual.

Caminhos:
- A) Baixar o preço de entrada para custo da obra + uma reserva (por exemplo, 250 a 400 de reserva): a rival constrói quando pode pagar e não quando tem 4.000. Pró: simples, usa o que já existe. Contra: gasta o caixa que hoje vai para tropa; precisa vigiar caixa negativo e domínio.
- B) Reservar uma fatia da renda para obras (por exemplo, 20% por hora vão para um "cofre de obras") antes da compra automática. Pró: obras regulares, previsível. Contra: tropa e estoque ficam menores, a rival pode perder combates.
- C) Tirar a regra de "comida baixa" e trocar por "quero crescer": construir também para vender (comerciante) ou para ter caixa (fazenda dá imposto e comida vendável). Pró: comerciante finalmente age como comerciante. Contra: precisa de uma regra clara de quanto construir por personalidade.
Recomendação (só sugestão): A com reserva por personalidade, mais C só para a comerciante.

## Fortificação e conserto

Regra (`suprimentos.js:129-146`, chamada a cada segundo em `simulacao.js:378`): só trabalha o esquadrão com engenheiro que NÃO está em combate e está parado ou em guarnição. Em guarnição, fortifica o prédio que guarda; parado fora disso, só conserta prédio danificado a até 45 m, ou vai até um danificado a até 220 m se estiver sem missão (`suprimentos.js:134-143`). Medido, para os esquadrões com engenheiro (632 esquadrão-horas): 70% andando, 22% em guarnição, 3% parado, 5% em combate.

Causa 1 (maior peso): o engenheiro passa a maior parte do tempo andando. Esquadrão que anda para tomar prédio do governo ou proteger zona não trabalha (`suprimentos.js:131`). O que sobra são cerca de 25% do tempo, em um único prédio por vez (`:134`). Exemplo: fortificar até 100 pontos leva 2 h de trabalho para engenheiro nível I (`catalogo.js:18`), e ele só consegue de vez em quando; por isso há 4 a 7 prédios por rival com fortificação parcial e raros eventos "fortificado" (que só dispara ao chegar a 100%, `suprimentos.js:106`).

Causa 2: poucos engenheiros. Só aparece um se o esquadrão tiver 5 ou mais membros e houver explosivo no estoque (`batalhoes.js:196`, `ia.js:81`); as rivais têm em média 7,4 soldados em 1 a 3 esquadrões, e o estoque do explosivo foi 0 ou 1 em quase todas as medições. Medido: 0 a 2 engenheiros vivos por rival, quase sempre 1.

Causa 3: quase nada para consertar. Prédios de rival danificados foram só 78 prédios-hora em 6 partidas (quase nada perto de 100 a 120 prédios por rival x 48 h), porque as rivais quase não brigam entre si (problema 1) e o governo é fraco. "Consertado" e "reconstruído" em 0 é o reflexo disso, não um defeito do conserto.

Causa 4: o suprimento não é gargalo. Cada engenheiro tinha 29 a 30 suprimentos e o estoque das rivais ficou em 60 a 150; falta tempo parado, não material.

Caminhos:
- A) Dar a cada rival uma ordem de "fortificar" para um esquadrão com engenheiro: ele fica parado numa base ou prédio de fronteira até chegar a 100. Pró: fortificação previsível e visível. Contra: um esquadrão a menos para atacar.
- B) Deixar o engenheiro trabalhar andando ou parando alguns minutos em prédio seu antes de seguir (por exemplo, quando o esquadrão passa por um prédio seu com menos de 100 de fortificação). Pró: usa o tempo que hoje se perde. Contra: mexe nas regras do jogador também, que seguem as mesmas.
- C) Mais engenheiros: pedir explosivo no estoque mínimo desde 3 soldados e exigir 1 engenheiro por base. Pró: simples. Contra: gasta caixa (explosivo já foi 600 por rival nas primeiras horas).
Recomendação (só sugestão): A para bases e fronteira, combinada com C.

# Resumo das medições

- Pares rival-rival com relação abaixo de -45 em 48 h: 5 de 18. Distância entre bases: 1.180 a 3.300 m. Prédios em fronteira entre rivais na hora 12: 0.
- Ordens de rival às 24 h: 17 tomar, 13 proteger, 1 frente.
- Caixa das rivais: 1.200 ou mais em 7,8% das horas, 4.000 ou mais em 0%. Obras prontas: 0. Comida com saldo maior que 4: 74% das horas.
- Esquadrões com engenheiro: 70% andando, 22% em guarnição, 3% parados, 5% em combate. Engenheiros por rival: 0 a 2. Prédios danificados de rival: 78 prédios-hora em 6 partidas.

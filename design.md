# Salam Aleikum (nome provisório, decidido pelo Renan em 18/11/2026): decisões de design

Segundo jogo do projeto, separado do Vapor & Mercado. Última atualização: 24/11/2026 (protótipo 19.3 no main).

## Ideia
O jogador comanda uma facção numa zona de guerra. Administra a região que controla (leis, construções, população, modos de produção como fábricas e fazendas) e o exército (recrutamento, squads, arsenal). As tropas agem sozinhas; o jogador dá missões e ordens gerais. A IA rival deve ser esperta. Terá drones, mísseis e blindados.

Origens de armamento: compra, doação de uma nação, doação de facção aliada, fabricação, contrabando.

## Decidido pela Ana
- Cenário: região e facções geradas a cada partida.
- Visão: mapa estratégico 3D, com a câmera descendo para ver as batalhas de perto.
- Jogadores: um jogador contra a IA agora, feito de modo que dê para acrescentar multiplayer depois.
- Formato: navegador, tempo real com pausa.
- Visual: 3D simples, de blocos, como o vídeo de referência (reel de @cidade_em_jogo, "City Builder Multijogador"). Aprovou o visual do protótipo 1.
- Mapa: 1 cidade grande e 3 vilas afastadas, inspirado em cidades reais que são ou foram zona de guerra (Síria, sul do Líbano, Gaza, Cisjordânia, Iraque, Iêmen). Vilas também seguem um padrão da região, à escolha do Claude.
- Mapa 4x maior que o protótipo 1 (2,8 × 2,8 km), mais parecido com a vida real, com morros.
- Nomes de lugares: inventados a partir de palavras árabes reais.
- Sem sinais de guerra (destruição, barricadas) no começo da partida.
- Tipos de edifício: manter os do protótipo 2, mais caixa d'água e casa do líder do clã.
- O edifício escolhido muda o começo da partida. As vantagens de cada tipo ainda não foram definidas.

### Território (17/11/2026)
- Território misto: cada zona tem pontos importantes. Quem controla todos os pontos importantes de uma zona tem o controle total dela, que dá bônus (imposto, produção, influência etc.). Sem o controle total, vale o controle prédio por prédio.
- Pontos importantes: mesquita, escola, delegacia, hospital, posto, sede do governo, quartel, cidadela, caixa d'água e casa do líder do clã.
- A área de cada facção fica demarcada no mapa.
- O controle muda de mão com tropas e com influência (a população também conta).
- Tomar um prédio: basta o esquadrão entrar nele.
- Vitória: eliminar todas as facções rivais.
- Governo antigo: força da IA com exército, que defende o centro. Começa com cerca de 80% do mapa, a partir da cidade velha. Enfraquece porque está com o caixa muito negativo: não consegue comprar armamento nem repor soldados.
- Começo: cada facção recebe um esquadrão só com armamento básico, em áreas que o governo antigo não controla. O jogador pode escolher o edifício ou sortear.

### Combate e soldados (17/11/2026)
- Combate soldado por soldado: cada um mira, atira e pode errar; quem está atrás de muro ou dentro de prédio é mais difícil de acertar.
- Combate totalmente automático. O jogador só dá ordens aos esquadrões.
- Cada soldado tem campo de visão e decide atirar, se abrigar, avançar, flanquear ou recuar conforme a situação e o que o líder mandar; pode obedecer ou não.
- Soldados aprendem: atributos sobem com a prática, e o jeito de lutar (preferências) muda conforme o que deu certo ou errado para ele. Os mais experientes podem virar líder de esquadrão. (Aprendizado de máquina de verdade não é viável no navegador; a Ana aprovou essa forma.)
- A experiência vale só para a partida atual.
- Tiro fatal: morre. Ferido: vai para tratamento e volta. Sem hospital, tratamento no QG da facção, lento e limitado.
- Moral baixa: o soldado pode se render. Quem se rende larga as armas e vira prisioneiro; as armas vão para o arsenal de quem capturou.
- O jogador mexe na formação dos esquadrões: quem está em cada um e a função de cada soldado (líder, fuzileiro, metralhador AR, granadeiro, anti-tanque AT, médico, engenheiro...).

### Recursos (17/11/2026)
- Só três recursos para o jogador: dinheiro, influência e comida.
- Dinheiro: entra por impostos dos prédios controlados (fixo por tipo de prédio, por enquanto) e bônus do controle total; sai com salário dos soldados, recrutamento, compra de armas e munição.
- Influência: entra pelos pontos importantes, controle total e distribuição de comida; sai para convencer moradores e tomar prédios sem tropa, conseguir voluntários e pedir doações.
- Comida: entra por fazendas, roças, olivais e armazéns; sai porque todos comem (soldados e moradores dos prédios controlados).
- Sem dinheiro: soldados sem salário perdem moral e alguns desertam. Sem comida: a moral cai rápido e a população perde a confiança. Sem influência: não dá para convencer nem recrutar.

### Interface e comando (17/11/2026)
- Interface mais limpa, com ícones indicando o que é cada coisa; menos painéis abertos ao mesmo tempo, menos texto, mais visual, e mais claro o que dá para clicar.
- Clicar no nome de um bairro mostra os pontos importantes dele.
- Comando por arrastar e soltar: selecionar e mandar com o botão direito.
- Ordem "meio que por zona": o esquadrão avança até um ponto e, no caminho, vai tomando as casas, dando preferência aos pontos importantes dos bairros. Pode ser como uma linha de ataque ou de defesa.
- A tela ainda estava poluída no protótipo 8 (print da Ana: barra de ordens e lista de acontecimentos grandes demais) → compactadas no protótipo 9.
- Tutorial do jogo (pedido da Ana no protótipo 11).

### Exército: recrutamento e armas (17/11/2026)
- Interface ainda mais amigável: ícone em tudo e retrato desenhado em cada soldado. A Ana aprovou o estilo de retrato do rascunho (rosto simples, com lenço, capacete, gorro, bandana ou nada, barba variando).
- O que estava difícil de identificar: soldados no mapa, botões e painéis, e o que está acontecendo.
- No mapa, as duas coisas juntas: uma plaquinha sobre cada esquadrão com o retrato do líder, e soldados maiores com a cor da facção.
- Recrutamento por quatro fontes: voluntários (moradores, custam influência), mercenários (dinheiro, já treinados), homens do clã (quem tem a casa do líder recebe um grupo) e prisioneiros que mudam de lado.
- Os recrutas aparecem onde foram recrutados (voluntários no bairro deles, clã na casa do líder, prisioneiros no QG).
- Armas por quatro fontes, além da captura: mercado negro, contrabando, fabricação e doação estrangeira.
- As armas ficam no arsenal do QG; para receber ou trocar de arma, o soldado precisa ir até uma base (ver "Bases e trocas").
- Doação estrangeira: a relação com cada país sobe gastando influência (emissários) e cumprindo pedidos dele.

### Ritmo (17/11/2026)
- O jogo estava lento e pouco dinâmico: pouca coisa acontecia, a economia era devagar e os soldados demoravam (não era travamento).
- Uma hora do jogo dura 1 minuto na velocidade 1x (antes, uma hora de verdade).
- Soldados andam 1,5 vez mais rápido (resposta "1.5").
- Mais ação: rivais atacam você e umas às outras, o governo contra-ataca para retomar o que perdeu, e há eventos aleatórios.

### Esquadrões independentes (17/11/2026)
- A Ana sentia que controlava demais os esquadrões; quer que eles façam ações e missões sozinhos.
- Comando por missão + postura: o jogador dá uma missão geral e escolhe a postura (agressivo, equilibrado, cauteloso); o esquadrão decide o resto.
- Missões: expandir, defender bairro, caçar inimigos, escoltar/apoiar outro esquadrão.
- Iniciativa sem missão: socorrer vizinhos, voltar para se refazer, pegar o que está fácil, pedir ajuda.
- Cada função age do seu jeito: médico de verdade (corre até o ferido; ferimento leve volta a lutar sem ir ao hospital), metralhador cobre o avanço, AT caça quem está em prédios, e os engenheiros fortificam os abrigos (resposta da Ana: "os engenheiros fortificam abrigações").

### Explosões (17/11/2026)
- RPG vira a arma contra prédios; a granada fica melhor em campo aberto.
- Paredes protegem: quem tem prédio ou muro entre ele e a explosão não se machuca.
- Explosões danificam prédios; prédio destruído deixa de proteger.
- Fogo amigo: explosão também fere soldados do próprio lado.
- Explosão mais visível: clarão maior e fumaça.
- A Ana não pediu para enfraquecer a granada nem a metralhadora (mesmo sendo o que mais mata).

### Bases e trocas (17/11/2026)
- Mudar a função, a arma ou o esquadrão de um soldado não é na hora: o jogador dá a ordem, o soldado avisa o líder e o esquadrão recua até o QG ou até uma base avançada para fazer a troca.
- Bases avançadas: as casas de líder de clã que a facção controla.
- Quando: assim que puder; se estiver em combate, termina a luta primeiro, depois vai à base mais perto, troca e volta à missão.
- Transferência: encontro na base; o soldado vai com o esquadrão dele até uma base, fica esperando lá, e o outro esquadrão passa para buscar.
- As bases avançadas usam o mesmo arsenal do QG.

### Munição e níveis de arma (17/11/2026)
- A Ana achava a economia "meio quebrada": quer coisas caras, que levem bastante tempo para conseguir tudo.
- Munição gasta a cada tiro; repõe com dinheiro ou produção em fábricas.
- Cada soldado carrega a sua munição; quando acaba, o esquadrão volta a uma base para recarregar do estoque da facção.
- Quatro tipos de munição: balas de fuzil, cintas da metralhadora AR, granadas e foguetes do RPG.
- Armas: básica (fuzil) e de suporte (AR, lança-granadas, AT), além dos kits do médico e do engenheiro, com níveis 1, 2 e 3. Quanto maior o nível, mais dano e mais precisão (kits: melhores).
- Nível 2 e 3 se conseguem comprando ou fabricando (cada nível é um item à venda).
- Preço: nível 2 = 4x o nível 1, nível 3 = 15x; nível 1 também mais caro que antes.

### Evolução dos soldados (18/11/2026)
- Veteranos sobrevivem mais: quanto mais experiente, menor a chance de um ferimento ser fatal.
- Patente dá bônus além dos atributos.
- Promoção a líder: soldados experientes ganham liderança aos poucos; quando um se destaca, o jogador é avisado e pode fazer dele líder de um esquadrão novo.
- Todo esquadrão precisa de um líder: não dá para criar esquadrão sem líder (resposta da Ana).
- Correção de defeito (feita pelo Claude, a Ana pode pedir para desfazer): a experiência estava vindo de esquadrões que só avistavam o inimigo (um soldado chegou a Elite com 138 "combates" e nenhum abate); agora o combate só conta se houve troca de tiros.

### Batalhões e diplomacia (18/11/2026)
- Cada batalhão tem um só líder. Dentro dele, os esquadrões são comandados por sargentos, que seguem o líder do batalhão.
- O jogador só dá ordens ao líder do batalhão: tomar área, proteger área, segurar a frente contra uma facção, avançar na fronteira de uma facção.
- O jogador controla o orçamento de cada batalhão: armas, kits, munição e soldados. O líder monta os esquadrões e distribui o equipamento.
- Dentro dos esquadrões o jogador só sugere; o líder decide (pode recusar e diz o motivo).
- O número de batalhões abre conforme a facção cresce. O líder do batalhão fica numa base.
- Todas as facções começam neutras, menos o governo central, que está em guerra com todas. A diplomacia vai se formando durante o jogo.
- A diplomacia é feita por propostas.
- A relação muda com: fronteira e ataques, inimigo em comum, presentes e desconfiança de quem fica forte demais.
- Pacto e aliança: não se atacam; o aliado ajuda; aliados trocam armas. Não há vitória compartilhada.
- Os líderes de facção ficam em bases avançadas ou no QG. Se a base do líder cai, ele foge para outra base; sem outra base, a facção cai.

### Bairro inteiro (18/11/2026)
- Quem controla todos os pontos importantes de um bairro passa a controlar o bairro inteiro.
- Os prédios comuns passam aos poucos (como se os moradores aderissem), não todos de uma vez.
- Só passam prédios de inimigos (e os sem dono); prédios de facções neutras, com pacto ou aliança ficam com elas.
- Se depois perder um ponto importante, os prédios que já passaram continuam seus (perde só o controle total e o bônus).

### Estoque mínimo dos batalhões (18/11/2026)
- Em vez de o jogador passar cada item, cada batalhão tem uma lista de estoque onde ele define um mínimo de cada arma, kit e munição.
- O mínimo fica no batalhão; o líder continua distribuindo para os esquadrões.
- Quando cai abaixo do mínimo, a reposição vem do depósito geral (onde chegam as compras). O jogo não compra sozinho.
- Prioridade entre batalhões: o jogador escolhe qual é reposto primeiro quando falta.
- Também há mínimo de soldados: o batalhão recruta sozinho, primeiro voluntários e, se não houver, mercenários.

### Logística, economia e comando (18/11/2026)
- Compra automática do mínimo do batalhão (ex.: mínimo de 1.000 armas, o jogo compra sozinho): fabrica se der, senão compra no mercado negro.
- Economia: dinheiro estava fácil demais → salários maiores e manutenção das bases por hora. Na falta de comida, compra com dinheiro, com preço que sobe com a guerra. Gastos de influência 3x mais caros.
- Cada base tem o seu estoque. Três tipos de base: QG da facção, base do líder do batalhão e base avançada. Tudo chega ao QG (compras, fábricas, doações); o estoque do batalhão fica na base onde o líder está; o líder faz sozinho o manejo para as bases avançadas.
- Quando o esquadrão vai recarregar ou trocar de arma, só usa o estoque daquela base.
- Os itens são levados por veículos de logística nível 1, 2 e 3 (nível 1 leva menos e tem menos vida; vai escalonando). O veículo é pilotado por um soldado do batalhão e fica atribuído ao batalhão; o batalhão gerencia pegar a carga no QG e levar até a base.
- Veículos: compra no mercado, fabricação, captura e doação de países.
- Veículo pode ser atacado: o inimigo que destruir fica com a carga.
- Várias ordens por batalhão (ex.: segurar tal bairro e tal bairro, ou a linha contra tal facção e contra tal). O líder divide os esquadrões.
- Defesa: os soldados ficam na fronteira da região, fazendo rondas pela borda, com reação rápida. O líder tem autonomia: vê de onde o inimigo está atacando ou onde é mais vantajoso avançar e posiciona os esquadrões; põe mais gente para proteger as ruas de logística suas e apoia o avanço sobre as ruas de logística do inimigo.

### Comida, obras e comércio (18/11/2026)
- Problema visto pela Ana: no fim do jogo a comida nunca bastava e o dinheiro sempre faltava (era a comida). Medido: um bairro da cidade come ~80/h e todo o campo do mapa produzia ~115/h; a comida comprada chegava a ~$ 10 por unidade.
- O campo produz mais.
- Só come quem você alimenta (assumido pelo Claude, pergunta sem resposta: botão "alimentar" em cada bairro; quem não é alimentado perde confiança aos poucos e paga menos imposto).
- Sistema de construção: nas vilas e regiões rurais produz mais; dá para construir fazendas e armazéns, expandir plantação e melhorar fazendas (níveis I, II, III). (Assumido: paga e espera.)
- Comércio entre facções: quem tem mais produção vende para quem está faltando, com preço dinâmico. (Assumido: com quem não está em guerra, mais importação dos países; entrega na hora.)
- Países doam comida.
- Caminhos das tropas: não precisam sempre andar nas estradas; podem fazer caminhos alternativos.

### IA das rivais (19/11/2026)
- Passar todas as mecânicas do jogador para as IAs inimigas.
- Mesmas regras do jogador, mais nível de dificuldade no menu: fácil (IA erra mais), normal, difícil (IA recebe bônus de renda).
- Cada facção rival tem um jeito próprio de jogar, sorteado: agressiva, defensiva, comerciante, oportunista.
- O governo antigo ganha batalhões também (organiza as guarnições, com rondas e reação rápida), mas continua sem dinheiro.
- O jogador não vê nada além do mapa (a personalidade e os planos das rivais não aparecem).

### Soldados com vivência e cadeia de comando (decidido pelo Renan em 24/11/2026)
- O jogador é o líder da facção e não comanda a guerra soldado por soldado: quem luta decide sozinho; o jogador dá intenções aos generais e líderes. Proposta completa: `propostas/2026-11-24-soldados-com-vivencia.md`.
- Cada soldado tem percepção, memória e habilidades próprias; vivências únicas por partida. Sem rede neural: regras e números por soldado.
- Só atira se vê o inimigo, se um colega avisou, se levou tiro de lá ou se lembra onde o inimigo se abrigou (tiro de supressão).
- Última posição conhecida do inimigo aparece no mapa, para os soldados usarem e para o jogador ver.
- Ódio por facção muda só escolha de alvo e aceitar rendição; nunca desobediência nem fogo contra aliado.
- Névoa de guerra: o jogador vê só onde tem controle (território) e o que os soldados estão vendo; certas construções dão visão de uma área. Futuro: sistema de espionagem.
- O jogador pode ordenar direto a um esquadrão passando por cima do general, com custo (influência e confiança do general).
- Plataforma: continua no navegador; reavaliar Godot no protótipo 21 com 1.000 soldados.
- Suprimentos (24/11/2026): vêm de fábricas, compra (mercado), comércio e tratados com grandes potências pagos com influência. Novo: comércio de armas e munição entre facções (só com quem não está em guerra, como a comida) e tratado formal com os países (paga influência, recebe entregas fixas). Entra depois da névoa (19.1).
- Ordem: 19 percepção e última posição conhecida; 19.1 névoa de guerra; 20 marcas e ódio; 21 habilidades e mapa; 22 general; 23 vínculos (opcional).

### Suprimentos (decidido pelo Renan em 24/11/2026)
- Recurso novo: **suprimentos**, guardados no estoque do QG e das bases como a munição.
- Médico gasta suprimentos para tratar ferido no campo; ferido tratado no hospital ou no QG também gasta.
- Engenheiro gasta suprimentos para fortificar prédios, reconstruir casas danificadas ou destruídas e reconstruir estradas.
- Fortificação de 0 a 100: quanto mais fortificado, mais acertos de RPG e granada (e, no futuro, metralhadoras superpesadas) o prédio aguenta.
- Casa sem fortificação cai com 3 acertos de RPG (hoje ~7); com fortificação 100 aguenta bem mais (número provisório).
- Fontes: fábricas, compra no mercado, comércio entre facções e tratados com grandes potências pagos com influência.

### Engenheiros e obras (decidido pelo Renan em 24/11/2026)
- Dois tipos de engenheiro: equipe de obras separada (2 a 4 engenheiros por batalhão, fora dos esquadrões; só fortifica e conserta; prioridade: bases, fronteira, danificados) e 1 engenheiro de combate no esquadrão (explosivos e fortificar onde o esquadrão para).
- Obras devem ser mais vantajosas, para valer a pena construir (hoje a rival só constrói com $ 4.000 e falta de comida, e nunca constrói). Quanto e como: a propor.
- Governo antigo: a função dele é só impedir as facções de crescerem demais. Teste de 24/11 (`propostas/2026-11-24-diagnostico-ia-rival.md`): com ele quase não há guerra entre rivais; sem ele uma rival engole o mapa.
- Governo antigo revisto (Renan, 24/11): **enfraquece aos poucos** (solta prédios e guarnições com o tempo, sem soltar tudo de uma vez) e **reage a quem cresce demais** (contra-ataca a facção que passar de um tamanho; vale também para o jogador).
- **Exaustão de guerra** (Renan, 24/11): cada facção tem exaustão por guerra que sobe com o tempo de guerra, as mortes, o dinheiro gasto e as regiões perdidas. Exaustão alta leva a cessar-fogo e paz (efeitos exatos: provisório).
- **Coalizão** (Renan, 24/11): as outras facções se aproximam e se unem contra a facção que cresce demais, pela diplomacia que já existe.

### Fim das facções e paz (decidido pelo Renan em 24/11/2026)
- **Facção "zumbi" desmorona:** a facção com menos de 5 prédios e caixa negativo por 12 h seguidas se desfaz (opção A). Vale para o jogador. A fazer no protótipo 19.4.
- **Paz recente protegida 24 h também contra a coalizão:** depois de uma paz (comum ou vinda de cessar-fogo), ninguém declara guerra àquela facção por 24 h, nem a coalizão. A fazer no protótipo 19.4.
- 19.3 juntado ao main em 24/11/2026.

## Em aberto
- Valores dos bônus do controle total.
- Vantagem inicial de cada tipo de edifício.
- Outros usos para prisioneiros (troca, resgate).
- Doação de facção aliada: hoje o jogador pode mandar armas ao aliado, e o aliado às vezes ajuda; falta decidir se rivais aliadas doam armas ao jogador e quanto.
- Balanço da economia nova: começa com dinheiro negativo por hora até expandir; ver se agrada.
- Quais construções dão visão na névoa de guerra e de que tamanho; como funciona a espionagem.
- Eventos com escolha do jogador (hoje acontecem sozinhos).
- Combate muito letal para os esquadrões iniciais; a metralhadora mata 3x mais que o fuzil em campo aberto (medido no protótipo 11). A Ana ainda não decidiu se quer menos letal.
- Conserto e reconstrução de estradas (hoje nada danifica estrada; só prédios sofrem dano). Comércio de suprimentos entre facções e tratado com potências.
- Escolher quem recebe a arma melhor (hoje o soldado troca sozinho na base).
- Nomes das facções (ainda em português).

## Provisório (Claude escolheu só para o protótipo funcionar; o Renan ainda não aprovou)
- Zonas: 4 quarteirões da cidade velha, 7 a 9 bairros, 3 vilas e até 8 setores rurais. Cada zona tem pelo menos uma caixa d'água e uma casa de líder.
- Governo antigo: cor cinza; caixa começa em −$ 250.000 e piora $ 2.000 por hora. Guarnições: 6 soldados nos pontos fortes (cidade velha, quartel, cidadela) e 4 nos outros; metade dos pontos comuns sem guarnição. Coragem 25% menor (sem salário). Soldados levam 50% a mais de munição, mas nunca recarregam.
- Esquadrão inicial das facções: líder + 5 fuzileiros nível 1 com munição cheia, recrutas (atributos de 25 a 55). Arsenal inicial: 1 kit médico; estoque inicial: 600 balas.
- Atributos, patentes (recruta 0 XP, soldado 60, veterano 180, elite 400), preferências (mudam 7% por resultado).
- Evolução: XP = soma dos pontos de atributo ganhos. Combate só conta se o esquadrão disparou ou foi atingido. Ao sair de um combate de verdade: +2 de reação para quem sobreviveu; +1 de liderança para quem é Soldado ou mais e não é o líder; +3 para o líder se não perdeu todos. Líder ganha +0,1 de liderança por decisão de plano sob fogo. Medido em 2 dias do jogo: os melhores chegaram a Soldado (~80 XP), nenhum Veterano ainda.
- Bônus de patente (Soldado / Veterano / Elite): moral máxima +5 / +10 / +15; precisão +5% / +10% / +15%; perda de moral e de pontaria sob fogo −10% / −20% / −30%; chance de morrer ao ser atingido ×0,85 / ×0,7 / ×0,55.
- Liderar: pode comandar quem é Veterano ou tem liderança 60+. Quando alguém passa a poder, aviso "pode comandar um esquadrão" (uma vez) e estrela verde no cartão. Esquadrão novo: o primeiro soldado arrastado para "novo esquadrão" precisa poder comandar; depois dele, os outros do mesmo grupo podem ir junto; botão "Fazer líder de um esquadrão novo" na ficha da janela Esquadrões; na base, o mais apto vira o líder. Nomear líder de um esquadrão existente também exige poder comandar. Quando o líder cai, assume quem pode comandar (o de mais liderança); se ninguém pode, o de mais liderança. Esquadrões criados sozinhos pelo jogo (recrutas, desertores) seguem com o de mais liderança, mesmo sem poder comandar. A ficha do soldado mostra os bônus da patente, se pode comandar e uma barra até a próxima patente.
- Armas: fuzil 260 m, metralhadora 300 m (suprime), lança-granadas 170 m (área 5 m), RPG 200 m (área 4 m). Morte por acerto 30% (14% com médico com kit a até 40 m), vezes o bônus de dano do nível de quem atirou (máximo 60%). Tratamento: 1,5 h no hospital, 6 h no QG com 2 vagas.
- Níveis: precisão ×1 / ×1,2 / ×1,45; dano (chance de matar) ×1 / ×1,2 / ×1,4; raio de explosão ×1 / ×1,1 / ×1,2. Kit médico: 3 / 5 / 8 usos e 60% / 72% / 85% de chance de o ferido voltar a lutar. Explosivos do engenheiro: fortifica em 2 / 1,4 / 1 hora. Medido a 100 m em campo aberto: fuzil I ~17% de baixa por tiro, fuzil III ~22%.
- Preços nível 1 (mercado negro): fuzil $ 400, metralhadora $ 1.500, lança-granadas $ 1.800, RPG $ 2.500, kit médico $ 200, explosivos $ 300; nível 2 = 4x, nível 3 = 15x (ex.: fuzil $ 400 → $ 1.600 → $ 6.000; RPG $ 2.500 → $ 10.000 → $ 37.500). Contrabando: 55% do preço, 6 h, risco de 25% de apreensão (−5% por posto de gasolina seu, mínimo 5%). Fabricar: paga 30% do preço em material; oficina dá 1 ponto/h e fábrica 3; pontos por item: fuzil 8, kit 3, explosivos 5, metralhadora 18, lança-granadas 22, RPG 26, vezes 1 / 3 / 8 pelo nível; armas de suporte, granadas, foguetes e todo nível 3 só em fábrica.
- Munição: cada soldado leva 120 balas (fuzil), 400 de cinta (AR), 8 granadas ou 4 foguetes; cada disparo gasta 1. Caixas: 100 balas $ 60, 200 de cinta $ 150, 6 granadas $ 240, 3 foguetes $ 450 (também por contrabando e fabricação: 2 / 4 / 4 / 6 pontos). Sem munição, o soldado age como desarmado (se abriga ou recua). Quando metade ou mais do esquadrão tem menos de 15% da carga e há estoque, ele volta à base mais perto para recarregar; sem estoque, avisa uma vez. Na base, cada soldado pega a melhor arma da função que houver no arsenal (devolvendo a antiga) e enche a munição. Quem se rende entrega arma (com o nível) e munição ao captor. Referência: com uns 45 prédios a renda é de $ 150 a 185 por hora do jogo; encher a munição de um esquadrão vazio de 6 fuzileiros custa uns $ 430.
- Percepção (protótipo 19, `src/percepcao.js`, constante `PERCEPCAO`): alcance do aviso "contato" de um colega 60 m; a lembrança de cada inimigo esmaece em 60 s; tiro de supressão só enquanto a informação for mais nova que 20 s (aviso ou tiro sofrido) ou 40 s (viu o inimigo se abrigar: visto dentro ou a menos de 4 m de um prédio e não visto de novo); vale por "visto agora" até 1,5 s. Quem leva tiro sabe a direção com erro de 12% da distância mais 4 m. Supressão: gasta 1 bala, cai a até 3 m mais 5% da distância do ponto lembrado, só acerta quem está a até 6 m do impacto, com 20% da chance de acerto de mirar de verdade (máximo 30%); o inimigo que sente o tiro perde 0,8 de moral (antes da coragem e da calma da patente) e fica sob fogo por 2 s. Granadeiro e AT (armas de área) não fazem supressão. Grade espacial: quadradinhos de 120 m (esquadrões em quadradinhos de 240 m). Medido em 6 sementes e 48 h (sem ordens do jogador): baixas 433 sem percepção, 300 com; munição restante 275.702 sem, 268.322 com.
- Ajustes do protótipo 19: supressão só contra quem ainda está em guerra com o soldado (pacto e aliança param o tiro); a memória é podada a cada 5 s, também fora de combate; "abrigo" = visto dentro de prédio, parado a menos de 4 m dele por mais de uma leitura ou chegando nele (visto saindo deixa de valer); o alvo da supressão só sabe a direção do tiro (com erro), não a posição exata; na tela, olho = visto há até 10 s, orelha = aviso ou tiro, interrogação = abrigo, só anel = visto e sumiu. Facção eliminada: os soldados que sobram (feridos, em tratamento, na reserva) desertam e ela não recebe mais desertores do governo nem eventos.
- Doações: além das armas, os países mandam caixas de munição (Sarabel: balas e cintas; Toveria: foguetes e granadas; Ostlan: balas); com relação 85+, o primeiro item vem em nível II. O evento "esconderijo" pode dar caixas de balas.
- Bases e trocas: "estar na base" = centro do esquadrão a até 60 m do prédio. Nomear líder continua na hora. Pedido de função confere só se há a arma/item no arsenal; na base, se faltar, o pedido é cancelado com aviso. Pedido feito a quem está esperando numa base é aplicado na hora. Quem é transferido para "esquadrão novo" forma o esquadrão na própria base; esquadrões criados assim não são juntados automaticamente a outros, mesmo pequenos. O esquadrão que vai buscar sai até de Segurar. Pedidos podem ser cancelados no cartão do soldado. Feridos tratados esperam no QG. Para se refazer, o esquadrão vai à base mais perto (não só ao QG); lá pega armas e os soldados que esperam ali sem pedido.
- Explosões: quem está no mesmo prédio do impacto é atingido num raio 1,5x maior, com força 0,85 no RPG e 0,25 na granada (fortificação reduz até 30%); quem está em outro prédio leva só 25%; quem está do lado de fora com prédio ou muro no meio não é atingido. RPG mira no prédio (erra pela metade quando o alvo está dentro). Medido a 100 m contra 4 soldados: dentro de casa, RPG ~1,1 baixa por disparo e granada ~0,28; em campo aberto, granada ~0,75 e RPG ~0,6. Dano ao prédio: granada 0,03 e RPG 0,15 por acerto, divididos pelo tamanho do prédio (casa pequena cai com ~7 RPG); dano tira proteção de quem está dentro e escurece o prédio; destruído = achatado, escuro, sem imposto, sem moradores e quase sem proteção; fortificação cai com o dano. Fogo amigo: antes de disparar explosivo com amigo perto do alvo, o soldado segura o tiro com chance de 35% + disciplina/150; acerto em amigo não dá experiência e gera aviso. Visual: bola laranja, clarão claro no começo e 4 bolas de fumaça que sobem por 4 a 6 s; RPG 40% maior; de longe a explosão aparece maior.
- Tempo: combate e movimento em segundos reais na 1x; tudo que é "por hora" (economia, tratamento, entregas, pedidos, clã) usa a hora de 60 s. Velocidades: pausa, 1x, 5x, 20x. Andando: 2,4 m/s (antes 1,6). Mortos ficam no mapa por 3 horas do jogo.
- Ofensivas das rivais: a cada 3 a 6 horas do jogo, uma rival sorteada manda o esquadrão mais forte (4+ soldados armados) atacar o prédio de outra facção mais perto (pontos importantes e o jogador têm preferência), até 1,6 km.
- Contra-ataque do governo: o primeiro só depois de 10 horas do jogo; depois a cada 2 a 4 horas, a guarnição com 4+ soldados mais perto (até 700 m) de um ponto importante que era do governo sai para retomá-lo; no máximo 2 ao mesmo tempo; as guarnições da cidadela e da sede do governo não saem.
- Eventos a cada 3 a 6 horas (para o jogador sempre, para cada rival com 50% de chance): 2 desertores do governo se juntam a você, com fuzil (tirados de uma guarnição do governo); esconderijo de armas ou munição; comerciantes pagam proteção ($ 120 + $ 40 por loja/mercado, até $ 800); protesto quando falta comida ou influência (−8 de influência); funeral traz +2 voluntários num bairro.
- Missões (decide a cada 3 s): Expandir = pega o ponto importante mais vantajoso a até 260 m da sua área que dá para tomar (prefere zonas onde já tem pontos), senão prédios comuns colados. Defender bairro = ataca inimigos dentro do bairro, retoma pontos dele que eram seus, senão guarda o ponto importante seu mais central sem guarnição. Caçar = ataca o esquadrão inimigo mais perto (até 900 m) que dá para vencer, preferindo rivais ao governo; entrincheirados só na postura agressiva; corrige o rumo se o alvo anda. Apoiar = segue o outro esquadrão a ~35 m e entra no combate dele; se ele cai, fica sem missão. Pedidos de troca vêm antes da missão.
- "Dá para tomar": defensores dentro de prédio contam 1,3x (agressivo), 1,8x (equilibrado); o cauteloso só pega o que está sem defesa. Fortificação aumenta isso em até 40%.
- Posturas: recua com moral abaixo de 25/35/45 (agressivo/equilibrado/cauteloso) ou em desvantagem depois de 3/2/1 baixas; avança com vantagem de 0,9x/1,2x/1,6x; desvio para pontos importantes até 220/150/80 m; volta para se refazer com 34%/50%/67% ou menos do tamanho.
- Iniciativa: volta à base mais perto se ficou com menos de 3 armados, abaixo do limite da postura, com alguém sem arma ou sem munição; na base completa até 6 com quem espera ali e, se ficou com menos de 3, se junta a outro esquadrão na mesma base. Sem missão: pega prédios sem defesa colados aos seus, a até 120/90/50 m e sem se afastar mais de 160 m de onde parou (não pega pontos importantes do governo). Socorre: ataca inimigos a até 380 m que estão atacando prédios ou esquadrões seus, se não forem muito mais fortes. Pede ajuda quando recua ou está em desvantagem com 1 baixa; respondem quem o apoia e os esquadrões sem compromisso a até 570 m.
- Ordem direta (botão direito, linha, tomar zona, botões do prédio) tira a missão. Segurar tira a missão e desliga a iniciativa de pegar e socorrer. Botão direito num prédio seu = defender; em outro lugar = avançar tomando as casas. Linha: defesa se todos são cautelosos, senão ataque.
- Funções: médico com kit corre até ferido do esquadrão a até 70 m, trata em 4 s; o kit se repõe na base; com médico por perto o ferido espera até 30 s antes de sair (sem médico, 5 s). Metralhador não avança quando tem alvo: fica atirando para cobrir. AT escolhe primeiro quem está dentro de prédio. Engenheiro em guarnição fortifica o prédio até 100% (gasta suprimentos desde o 19.2): defensores até 40% mais difíceis de acertar; ao trocar de dono, a fortificação cai pela metade.
- Ordens antigas: modo Ataque avança tomando casas a até 12 m do caminho e desvia para pontos importantes sem defesa perto do caminho. "Tomar esta zona" pega os pontos importantes da zona um a um. Voltar ao QG: pega armas e reserva.
- Controles: clique seleciona (também clicando perto do esquadrão); Shift + arrastar seleciona vários; arrastar move o mapa; botão do meio, Alt + arrastar ou Q/E giram; Esc fecha/limpa/cancela; espaço pausa.
- Contato a 190 m. Ao entrar em combate, os soldados se viram para onde o inimigo foi visto.
- Recrutamento: voluntário 6 de influência, sem arma; aparecem 0,012 por morador por hora em cada zona onde você tem prédios (mais com influência alta), até 3 por zona. Mercenário $ 450, armado (fuzil I com munição cheia), já com experiência, salário $ 5/h (os outros $ 2), chega pelo prédio seu mais perto da borda do mapa. Clã: 20 de influência, 3 homens armados, uma vez por dia por casa. Prisioneiro: 10 de influência; a chance de aceitar depende da disciplina dele; quem recusa 2 vezes não aceita mais. Recrutas que chegam no mesmo prédio formam um esquadrão de recrutas ali.
- Sem arma: o soldado foge ou se abriga em combate. Esquadrão numa base pega sozinho no arsenal a arma da função de cada um.
- Países (nomes inventados): Reino de Sarabel (fuzis e metralhadoras), República de Toveria (RPG e lança-granadas), Federação de Ostlan (kits, fuzis, explosivos). Relação começa entre 5 e 20; emissário: 15 de influência → +8. Pedido a cada 12 h: tomar um ponto importante em até 48 h (+25 se cumprir, −10 se não). Entrega diária no QG a partir de relação 40, maior a partir de 60 e 85.
- IA rival: recruta voluntários, mercenários, clã e prisioneiros quando sobra recurso; compra ou encomenda fuzis para quem está sem arma (até 6 no estoque); mantém estoque de munição de pelo menos meia carga por soldado; fabrica caixas de balas ou fuzis; compra RPG com mais de $ 8.000 e fuzil II com mais de $ 12.000; manda emissário quando tem muita influência; manda ao QG o esquadrão que precisa recarregar. (As rivais ainda não usam missões nem pedidos de troca.)
- Tutorial: dentro do jogo, 13 passos num cartão no alto da tela, com um anel piscando no que é para clicar. Passos de ação avançam sozinhos quando o jogador faz o que foi pedido (fundar, selecionar o esquadrão, dar ordem com o botão direito, dar a missão Expandir, abrir um bairro, acelerar para 5x, abrir Recrutar, Armas e Esquadrões); passos de explicação têm "Entendi" (recursos, postura, acontecimentos, final). O jogo fica pausado até o passo do tempo. Opção "Com tutorial / Sem tutorial" no menu (vem marcado "Com" até o tutorial ser visto uma vez neste navegador); "Pular tutorial" em todos os passos; "Ver o tutorial de novo" na Ajuda.
- Layout: barra no topo com recursos, aviso vermelho de "combate agora", tempo e botões com nome (Esquadrões, Recrutar, Armas, Facções, Ajuda, Menu); em telas menores somem o nome da região e os nomes dos recursos. Cartões dos esquadrões à esquerda com retrato do líder, missão atual, cor por situação, ícone dourado de troca quando há pedidos e ícone de bala quando a munição está abaixo de 35%. Acontecimentos no canto: só os 3 últimos; a setinha abre a lista. Barra de ordens numa linha: retrato e nome · Missão (Expandir, Defender, Caçar, Apoiar; clicar de novo tira) · Postura (Agressivo, Equilibrado, Cauteloso) · Segurar · QG · ícone de mouse com as dicas. "Defender" e "Apoiar" pedem um clique (no bairro ou no esquadrão); se o painel de um bairro está aberto, Defender usa esse bairro. O painel do bairro também tem "Defender este bairro".
- Janela de armas: faixa do arsenal com cada arma e quantas há de cada nível (I, II, III); faixa da munição com o estoque de cada tipo e quanto os soldados têm nas mãos; seletor de nível (I, II, III, com o preço e o bônus); tabela em seções (Básica, Suporte, Kits, Munição) com mercado negro, contrabando e fabricar; lista "A caminho"; países.
- Janela de esquadrões: soldados em cartões com retrato, função, patente e barrinha de munição; arrastar um soldado para outro esquadrão ou para "novo esquadrão" cria um pedido (faixa dourada no cartão com o destino e um X para cancelar); clicar mostra as funções como botões com ícone (a pedida fica marcada "pedido: troca na base"); cada esquadrão mostra quantas trocas tem e se é "depois do combate" ou "na base"; quem espera aparece agrupado por base. O painel da casa do líder mostra "Base avançada". Ficha do soldado mostra a arma com o nível, a munição (atual/total) e os usos do kit.
- No mapa: plaquinha sobre cada esquadrão com retrato do líder, nome, situação e bolinhas dos soldados (laranja vazada = sem munição; fica vermelha com fogo em combate); soldados 40% maiores com um disco da cor da facção embaixo; quem está sem arma aparece sem o fuzil na mão. Ícone de arma com selo I/II/III. Painel do prédio mostra fortificação, dano e se está destruído.
- Batalhões (protótipo 15): limite de 1 batalhão + 1 a cada 60 prédios; esquadrões de até 6; o líder pensa a cada 5 s. Ele distribui funções nesta ordem: AR, médico, AT, granadeiro, engenheiro. Esquadrão formado pelo líder escolhe como sargento o melhor apto, e se ninguém é apto usa o de mais liderança (sargento improvisado). Sem ordem, o batalhão protege a zona da base. "Tomar área" vira "proteger" quando a zona é tomada; "avançar" vira "segurar frente" se fizerem paz. Comandante inicial: liderança 64+, patente Soldado. Recrutas vão para o batalhão escolhido como padrão. As compras chegam ao depósito geral; o jogador passa para os batalhões. Sugestão aceita com 55% de chance-base, conforme a liderança e o motivo. Facções rivais ainda não usam batalhões.
- Diplomacia (protótipo 15): relação de −100 a 100, começa sorteada entre −12 e 12, com uma tendência própria sorteada. Propõem pacto com relação 25+, aliança 55+, paz −15+; declaram guerra abaixo de −45; aceitam pacto 15+, aliança 45+, paz −25+. Por hora: fronteira −0,45; inimigo em comum +1,1; medo de quem é muito maior −0,6; inimigo do meu inimigo +0,6. Tomar prédio −6, ponto importante −15, ferir −2, matar −4, romper acordo −12 com todos. Incidentes aleatórios (cerca de 1 a cada 7 horas). Proposta vale 6 horas; depois de recusar, esperam 8 horas. Presentes: $500 ou 100 de comida; aliados também podem receber caixa de balas e fuzil. Base do líder caiu: −20 de influência e −15 de moral.
- Bairro inteiro (protótipo 15.1): passa 1 prédio a cada 4 minutos do jogo em cada bairro, começando pelos vizinhos dos que já são seus. Não passam: prédio com soldados de outra facção dentro, destruído, base (QG ou base de batalhão) nem ponto importante. Passar assim não piora a relação diplomática. O governo antigo não faz isso nos bairros dele (se fizesse, desfaria toda casa que as facções tomam na área do governo). Avisos: um quando começa, um quando o bairro fica todo seu e um quando seus prédios começam a passar para outra facção.
- Estoque mínimo (protótipo 15.2): mínimo de armas conta qualquer nível que está no estoque do batalhão (não nas mãos dos soldados) e a reposição pega primeiro o melhor nível do depósito; munição em unidades, de caixa em caixa. Confere a cada 5 s, na ordem de prioridade. Recruta no máximo 1 soldado a cada 5 minutos do jogo por batalhão; voluntário do bairro com voluntários mais perto da base do batalhão. Todos os mínimos começam em zero. Aviso uma vez quando o depósito não tem o item, e uma vez quando não há voluntários nem dinheiro para mercenários. As setas manuais de passar item foram trocadas pelos botões − e + do mínimo.
- Economia (protótipo 16): salário $ 5/h (antes 2), mercenário $ 12/h (antes 5). Manutenção: QG $ 15/h, base de líder $ 8/h, base avançada $ 4/h. Comida comprada quando fica abaixo de 30: $ 2 por unidade, +20% por par de facções em guerra (o governo conta em guerra com todas), +0,2% por unidade comprada recentemente (esquece 10% por hora). Influência 3x: voluntário 18, clã 60, prisioneiro 30, emissário 45, convencer casa 24 / prédio 36 / ponto importante 120. Rivais com limites de influência subidos na mesma proporção. Medido: jogador com ~38 prédios e 6-11 soldados fica entre +54 e +79 $/h; começa negativo (−43/h) até expandir.
- Compra automática (protótipo 16): fabrica nível I se tiver oficina/fábrica e a fila tiver menos de 3 h de trabalho; senão compra nível I no mercado negro. Conta o que já está no QG, o que está sendo fabricado para o batalhão e o que vem nos veículos, para não comprar em dobro. Sem dinheiro: aviso uma vez.
- Estoques (protótipo 16): na base do líder o soldado usa o estoque do batalhão e o da base; no QG, o depósito; numa base avançada, o estoque dela. Troca de função vai à base mais perto que tem a arma ou o kit. Quem toma uma base fica com o estoque guardado nela (inclusive o do batalhão).
- Veículos (protótipo 16): Picape (12 volumes, 120 de vida, 9 m/s), Caminhão (26, 260, 8 m/s), Caminhão blindado (45, 520, 7 m/s); preço $ 2.500 / $ 10.000 / $ 37.500 (4x e 15x); fabricação 30 pontos x nível, só em fábrica. Metralhadora, lança-granadas e RPG ocupam 2 volumes; o resto e cada caixa de munição, 1. Veículo novo vai sozinho para o batalhão que fica longe do QG e tem menos veículos (dá para trazer de outro batalhão na janela). Motorista: soldado do batalhão esperando numa base, ou um fuzileiro de esquadrão com mais de 3; ele vai a pé até o veículo. O líder planeja a cada 3 s: primeiro QG → base do líder (o que falta para o mínimo), depois base do líder → bases avançadas perto dos esquadrões (até 700 m), levando munição para uma recarga completa. Só viaja com pelo menos 1/4 da carga cheia ou se o destino estiver com menos da metade. Os veículos desviam das guarnições inimigas. Tiros: esquadrões inimigos até 170 m atiram (fuzil 6 de dano, AR 9, granada 30, RPG 90, vezes o nível); a cada acerto 4% de chance de matar o motorista (RPG 25%); sem motorista o veículo para, e quem chegar a 40 m primeiro leva (esquadrão inimigo livre até 380 m vai buscar). Destruído: quem deu mais dano leva a carga; o motorista morre ou foge (50%). Destroços ficam 3 h. As rivais começam com uma picape e mandam comboio a cada 3 a 6 h para a frente delas. Ostlan doa uma picape a cada 3 entregas com relação 85+.
- Comando (protótipo 16): até 4 ordens por batalhão; a mesma ordem de novo tira; uma zona ou facção só tem uma ordem. O líder pensa a cada 5 s: perigo = soldados inimigos até 450 m da borda (mais perto pesa mais; em combate 1,5x), mais 1 se uma rua de logística sua passa ali; ataque pesa 1,6. Cada ordem recebe pelo menos um esquadrão; os outros vão para onde precisa mais; se o perigo de uma defesa passar da força dela, o líder puxa um esquadrão da ordem mais calma (que esteja nela há mais de 90 s). Defesa: até 10 pontos de ronda na borda (prédios seus com prédio de outro dono a até 55 m; sem borda, a beirada do bairro), com mais peso para ruas de logística suas; espera de 12 a 28 s em cada ponto; com 3 ou mais esquadrões, um fica de reação rápida num ponto importante perto do meio e vai atrás de inimigo a até 360 m da borda. A ronda fica longe (215 m) de guarnições inimigas paradas e dá a volta nelas. Segurar frente sem fronteira colada: segura os prédios seus mais perto da área da facção. Avançar: pontos importantes e prédios perto das ruas de logística do inimigo valem mais.
- Comida (protótipo 17): fazenda 20/h (antes 8), armazém 6 (antes 3), mercado 4 (antes 2), roça em zona com controle total 0,4 (antes 0,15). Confiança por bairro começa em 100: +3/h alimentado, −4/h sem alimentar, −6/h se a comida acabar; imposto = 30% + 70% × confiança; abaixo de 50% não dá voluntários; aviso quando cai abaixo de 50%. Sem comida: −10 de moral nos soldados (não tira mais influência). Medido: a vila inicial inteira dá +62/h; 2 bairros inteiros + a vila, todos alimentados, ficam em ~−60/h até construir fazendas.
- Obras (protótipo 17): só em vilas e setores rurais, em prédio seu que não seja base. Fazenda (casa → fazenda) $ 1.200, 6 h; armazém (casa ou loja) $ 900, 4 h; expandir plantação $ 600, 4 h, +5/h, até 3 vezes por fazenda; melhorar fazenda para II $ 2.400 / 8 h (1,7x) e para III $ 6.000 / 12 h (2,6x). O prédio pronto fica esverdeado (fazenda) ou marrom (armazém). Rivais constroem e melhoram fazendas quando falta comida e sobram $ 4.000.
- Mercado de comida (protótipo 17): preço = $ 2 × (procura + 60) / (oferta + 60), entre $ 1 e $ 6 (teto = importar dos países). Quem está abaixo de 40 (mais 3 h do que falta por hora) compra sozinho, primeiro de quem vende e não está em guerra com ele, depois importa. Rivais vendem o que passa de 180 (guardam 120) e só distribuem comida acima de 450. O jogador tem Comprar 100, Vender 100 e venda automática acima de um valor (começa desligada, 400). Cada 100 negociados melhora a relação em +1 (até +3 por vez). Gráfico do preço das últimas 48 h na janela de economia. Países doam comida em cada entrega: 40 (relação 40+), 80 (60+), 150 (85+).
- Caminhos a pé (protótipo 17): grade do terreno de 8 m; não passa por prédio ou muro nem em subida acima de 45%; estrada custa 15% menos, morro custa mais; desvia de guarnições inimigas (para quem vai defender); depois liga direto os pontos com linha livre. Medido: rotas 16% mais curtas em média. Veículos continuam nas ruas.
- IA das rivais (protótipo 18): as rivais começam como o jogador (1º batalhão com comandante e o estoque inicial; sem veículo) e usam batalhões, várias ordens, rondas e reação rápida, estoque mínimo com compra automática, estoque por base, veículos, alimentar por bairro, obras e comércio. O "general" de cada rival pensa a cada 20 s (fácil 45 s com 30% de chance de não fazer nada; difícil 12 s e +25% da renda positiva). Ele: abre batalhão novo quando o território deixa; põe a postura da personalidade; manda os recrutas para o batalhão mais vazio; define o mínimo de cada batalhão (soldados conforme a personalidade, mas só cresce se a renda aguenta o salário; balas para os fuzileiros + 2; 2 fuzis de reserva; 1 kit; metralhadora e cintas com 8+ soldados; foguetes se tiver RPG); compra veículo com mais de $ 4.000 quando um batalhão fica longe do QG; para de alimentar o bairro que mais come quando falta comida e dinheiro, e volta quando sobra; compra RPG e fuzil II quando sobra dinheiro; a cada 3 min (ou quando um inimigo chega perto de um bairro sem defesa) escolhe até 3 ordens por batalhão: proteger a zona da base e a mais ameaçada, segurar ou avançar contra quem está em guerra, e tomar as zonas perto com mais pontos importantes e menos defesa. Mantém as ordens que continuam, para não embaralhar os esquadrões. As ofensivas sorteadas antigas saíram.
- Personalidades (protótipo 18): agressiva (ataque 1,5x, 2 ordens de ataque, postura agressiva, guerra 15 pontos de relação antes, acordo 12 depois, 12 soldados por batalhão); defensiva (ataque 0,7x, defesa 1,5x, cautelosa, guerra 15 depois, acordo 8 antes, 10 soldados); comerciante (vende comida acima de 120, constrói fazendas com $ 2.500, guerra 20 depois, acordo 15 antes, 9 soldados); oportunista (prefere alvos de quem tem menos de 70% da força dela, propõe acordo a quem tem 1,5x a força dela e guerra a quem tem menos de 60%).
- Governo (protótipo 18): um batalhão por tipo de área (cidade velha, bairros, vilas, campo). Ronda: 2 soldados de cada uma das maiores guarnições (até 3, que ficam com 4+) formam um esquadrão que anda entre os pontos importantes da região, parando 15 a 30 s. Reação rápida: inimigo a até 320 m de um ponto do governo faz a guarnição mais perto (3+ soldados, não a cidadela nem a sede) sair para atacar, no máximo 3 ao mesmo tempo; quando não há mais inimigo a 380 m, ela volta ao posto. O contra-ataque para retomar pontos continua como antes. Veículo capturado pelo governo é queimado.
- Janela de batalhões: à esquerda a lista de batalhões, "Sem batalhão" e "Novo batalhão" com os candidatos a comandante; à direita líder, base, ordem, a tabela Depósito ⇄ Batalhão com setas, e os esquadrões (arrastar = sugerir troca, clicar = sugerir função). Janela de diplomacia: propostas com Aceitar/Recusar, e para cada facção o estado, a barra de relação e os botões possíveis. Contador vermelho no botão Diplomacia quando há proposta.
- Ícones: desenhos do Material Design Icons (licença Apache 2.0) embutidos na página, sem depender de fonte da internet. Armas com silhuetas próprias.
- Suprimentos (protótipo 19.2, `src/suprimentos.js`, constante `SUPRIMENTO`): entram no estoque como o 5º "tipo de munição" (`cx-suprimento`): caixa de 20 por $ 80 (contrabando 55%), fabricação 2 pontos (oficina serve), 1 volume por caixa no veículo, estoque mínimo e compra automática iguais aos da munição; começam com 40 no estoque inicial. Países: Sarabel e Toveria mandam 1 caixa por entrega, Ostlan 2 (a partir de relação 40; mais 1 ou 2 com 85+). Rivais: mínimo = 20 + mochila de cada médico e engenheiro; fabricam caixas se o total estiver abaixo de 60. Médico leva 8 e engenheiro 30 (repõem na base como a munição; aviso "sem suprimentos" a cada 90 s no máximo). Esquadrão com médico ou engenheiro de mochila vazia volta a uma base com estoque (como no recarregar munição).
- Médico (19.2): tratar no campo gasta 1 suprimento (o kit continua com os usos de antes). Sem suprimentos NÃO trata (escolhido em vez de "trata pior"), não corre até o ferido e não reduz o risco de morte. Hospital ou QG: 2 suprimentos do estoque do QG (ou do batalhão que está no QG) por ferido; sem estoque o tratamento leva o dobro do tempo (hospital 3 h, QG 12 h) e sai aviso uma vez por hora.
- Engenheiro (19.2): fortificar gasta 15 suprimentos por 100 pontos (a velocidade não mudou: 2 / 1,4 / 1 h). Consertar prédio danificado: 10 suprimentos e 2 h por 100% de dano; reconstruir destruído: 20 suprimentos e 4 h, e o prédio volta de pé com 50% de dano e fortificação 0 (depois é só consertar). Custos de uma casa de 120 m², vezes a área / 120 (de 0,6 a 3). Esquadrão parado ou em guarnição, fora de combate, com engenheiro com suprimentos conserta o prédio da guarda primeiro, depois prédios seus a até 45 m; esquadrão parado sem missão e sem ordem direta vai até um prédio seu danificado a até 220 m (ordem de defesa). O jogador também tem o botão "Reconstruir"/"Consertar" no painel do prédio (manda o esquadrão com engenheiro mais perto). A obra segura o esquadrão sem missão no lugar (não pega prédio fácil enquanto trabalha).
- Resistência do prédio (19.2, `PREDIO` em combate.js): cada arma tem uma fração do prédio que um acerto derruba (`danoPredio`: RPG 0,34; lança-granadas 0,068, 1/5 do RPG). Casa de até 120 m² de área (largura x fundo x andares) sem fortificação cai com 3 acertos de RPG (antes ~7); prédio maior divide pelo fator 120/área (mínimo 0,12; antes a casa pequena demais valia até 1,5). Fortificação (0 a 1 por dentro, 0 a 100 na tela) divide o dano por 1 + 2 x fortificação: 100 aguenta 3x (9 acertos de RPG no teste; 3x o número geral `multFortificado` serve para armas futuras). O estrago também derruba a fortificação (25% do dano aplicado).
- Governo antigo (19.2, sem dinheiro): sem estoque de suprimentos. Médico e engenheiro dele nascem com a mochila cheia (x1,5), nunca repõem, e o hospital dele trata sempre no dobro do tempo. Rendição: os suprimentos da mochila ficam com quem capturou, como a munição.
- Ajustes do 19.2: o jogador começa com mínimo de 40 suprimentos por batalhão (editável na janela de Batalhões). Rivais: com 5 ou mais soldados no batalhão o mínimo inclui 1 explosivo (para o líder pôr um engenheiro; antes nenhuma rival tinha). Rival só fabrica caixa de suprimento se o estoque está abaixo da soma dos mínimos, não há caixa na fila e o caixa passa de $ 1.500 (antes: sempre que passava de $ 600, o que drenava o caixa). Prédio destruído zera a fortificação. Esquadrão que só falta suprimento vai à base que tem suprimento. `testes/arquivos.js` é a lista única de módulos dos testes.
- Estradas (19.2): verificado, nenhuma regra danifica estrada hoje; por isso não há reconstrução de estrada.
- Governo antigo revisto, exaustão de guerra e coalizão (protótipo 19.3; `ia.js` GOV, `diplomacia.js` EXAUSTAO e COALIZAO, `acao.js` CONTRA; todos os números abaixo são provisórios):
  - Enfraquece: depois de 4 h solta 1,5% dos prédios iniciais por hora (cerca de 25 por hora): primeiro os bairros que ficam entre as facções (soma das distâncias às duas facções mais perto), pontos importantes antes das casas; a guarnição do prédio solto é dispensada (os soldados desertam). A cidade velha e os prédios de força (governo, quartel, cidadela, delegacia) nunca são soltos. A cada 6 h cada guarnição de fora do centro perde 1 soldado, até 3; o centro mantém a guarnição inteira.
  - Reage: facção (jogador também) com 80 prédios ou mais e (2x a média das outras rivais ou 10% do mapa) vira alvo do governo; deixa de ser abaixo de 80% disso. Aviso ao jogador ao virar e ao deixar de ser alvo. Contra o alvo: a reação rápida vê de 2x mais longe (640 m) e aceita 2 reações a mais ao mesmo tempo; o contra-ataque vem a cada 0,5 a 1,5 h (antes 2 a 4 h), de até 1.400 m (antes 700 m), com guarnições de 3 ou mais soldados (antes 4), 2 por vez para o mesmo ponto, até 5 em curso (antes 2). Corrigido: esquadrão do governo que terminou o contra-ataque pode sair de novo (a marca `contra` nunca era limpa).
  - Exaustão de guerra (0 a 100, por facção e por guerra com outra facção; o governo fica de fora porque não negocia): sobe 1 por hora em guerra, 0,8 por soldado morto, 0,25 por prédio perdido (1,5 por ponto importante) e 1 por $ 500 gasto em armas e munição durante a guerra; desce 3 por hora fora de guerra (4 em cessar-fogo). Acima de 40: moral máxima cai até 12 e voluntários até 50% (efeito leve). Aparece na janela de Diplomacia (barras sua e dela por guerra, mais a pior no topo).
  - Cessar-fogo (novo estado, 12 h): depois de 4 h de guerra, quem tem exaustão de 40 + guerra da personalidade (agressiva 55, oportunista 40, defensiva 25, comerciante 20) pede; o outro aceita com 25 + guerra (agressiva 40 ... comerciante 5) ou se a relação deixa. Entre quem está na coalizão contra um terceiro os limites caem 15. Com a IA propondo ao jogador, ele aceita ou recusa; o jogador propõe pelo botão "Propor cessar-fogo". Só luta e toma prédio quem está em guerra, então o cessar-fogo para tudo; "Romper cessar-fogo" volta a guerra na hora. No fim: vira paz (neutro) se a exaustão média era 20 ou mais, ou se a relação ficou em -25 ou mais; senão volta a guerra. Paz (de cessar-fogo ou de paz comum): a relação sobe a pelo menos -10 e ninguém declara guerra por diplomacia por 24 h (a coalizão pode).
  - Coalizão: uma facção com força (prédios + 8 por soldado) de 1,8x a média das outras e 60 prédios ou mais é o alvo (só com 3 ou mais vivas; sai abaixo de 1,4x). Por hora: relação entre as outras +1,5, delas com o alvo -2, e quem não é o jogador, está neutra com o alvo e com relação -20 ou menos (metade da guerra da personalidade) e exaustão abaixo de 30 declara guerra a ele. Pactos e alianças saem pela diplomacia que já existia. Avisos ao jogador quando forma e quando desfaz.
  - Ajustes da revisão (19.3): o ritmo de soltar prédios cai pela metade a cada 36 h e o governo nunca solta abaixo de 30% dos prédios iniciais (abaixo disso só perde por conquista); não solta prédio com guarnição em combate; prédio solto é marcado e o contra-ataque não o "retoma". Coalizão e alvo do governo ficam pelo menos 12 h em cada estado (coalizão: sai abaixo de 1,25x; alvo: sai abaixo de 70% do limite). Propostas da IA ao jogador: no mínimo 20 h entre propostas iguais do mesmo par; a IA cansada sem poder propor ao jogador não trava as outras decisões do par. Exaustão desce 3 por hora em paz e 4 em cessar-fogo (antes 1,5 e 2). Facção eliminada zera exaustão, alvo do governo e cessar-fogos.
  - Correção: havia duas `forcaDaFaccao` (`diplomacia.js` prédios + 8 por soldado e `ia.js` só soldados); a de `ia.js` vencia e a diplomacia (medo de quem cresce, oportunista) usava só soldados. A de `ia.js` virou `soldadosProntos`; a diplomacia usa a sua (prédios + soldados). Os testes usam `soldadosProntos`.

## Protótipos
- 3: relevo, cidade com cidade velha e bairros de vários tipos, rodovias que contornam morros, vilas no alto, ~2.000 edifícios.
- 4: zonas, pontos importantes, governo antigo, esquadrão inicial, tomada de prédios, controle total, camada de território.
- 5: combate automático soldado por soldado, aprendizado, líder, moral, feridos, rendição, arsenal, gestão de esquadrões, ficha do soldado.
- 6: dinheiro, influência e comida, painel de economia, convencer moradores, distribuir comida, deserção e fome.
- 7: interface nova com ícones, ícones dos pontos importantes no mapa, clique no bairro, seleção múltipla, ordens de ataque/defesa, linha de frente, tomar zona.
- 8: retratos dos soldados, plaquinha do esquadrão no mapa, interface com botões nomeados e lista de acontecimentos, recrutamento (voluntários, mercenários, clã, prisioneiros), armas (mercado negro, contrabando, fabricação, países) e armar no QG, ícones embutidos.
- 9: hora do jogo de 60 s, soldados mais rápidos, ofensivas das rivais, contra-ataque do governo, eventos aleatórios, barra de ordens e acontecimentos compactos.
- 10: missões (expandir, defender bairro, caçar, apoiar), postura, iniciativa (refazer no QG, juntar restos, pegar o fácil, socorrer, pedir ajuda), médico que trata no campo, metralhador que cobre, AT que caça prédios, engenheiro que fortifica.
- 11: explosões novas (RPG contra prédios, paredes protegem, dano e destruição de prédios, fogo amigo, clarão e fumaça) e tutorial dentro do jogo.
- 12: trocas de função, arma e esquadrão viram pedidos feitos numa base (QG ou casa de líder de clã = base avançada); transferência por encontro na base.
- 13: munição (4 tipos, carregada por soldado, recarga na base) e armas e kits com níveis I, II e III; preços novos bem mais altos.
- 14: evolução corrigida (só combate com tiros conta), bônus de patente, veteranos morrem menos, promoção a líder e esquadrão novo só com líder.
- 15: batalhões (ordens ao líder, orçamento de armas, munição e soldados, sargentos, sugestões) e diplomacia (neutro, pacto, aliança, guerra; propostas, relação, presentes, fuga do líder da facção).
- 15.1: quem tem todos os pontos importantes de um bairro leva o bairro inteiro, aos poucos.
- 15.2: estoque mínimo dos batalhões, reposição sozinha do depósito, prioridade entre batalhões e recrutamento sozinho.
- 16: compra automática, economia nova (salários, manutenção, comida comprada, influência 3x), estoque por base, veículos de logística nível I a III (atacar, destruir, capturar), várias ordens por batalhão, rondas na fronteira e reação rápida.
- 17: comida (campo produz mais, alimentar por bairro, confiança), obras (fazenda, armazém, plantação, níveis), mercado de comida com preço dinâmico, países doam comida, caminhos a pé fora da estrada.
- 18: rivais com as mesmas mecânicas do jogador, personalidades sorteadas, dificuldade no menu, governo com batalhões (rondas e reação rápida).
- 19: ver ou saber: o soldado só atira em quem vê, em quem um colega avisou (60 m), de onde levou tiro ou onde viu o inimigo se abrigar (os três últimos são tiro de supressão); memória por soldado; última posição conhecida do inimigo no mapa (anel na cor da facção, esmaece em 60 s) e ícones de olho, orelha e interrogação; grade espacial; picos de 125 a 148 ms cortados para ~60 ms; interruptor `PERCEPCAO.ligada`.
- 19.2: suprimentos (recurso no estoque, fabricação, compra, doação dos países), médico e hospital gastam, engenheiro fortifica, conserta e reconstrói gastando; fortificação 0 a 100 e casa pequena cai com 3 RPG (fortificação 100 aguenta 3x); rivais usam as mesmas regras; governo sem estoque.
- 19.3: governo antigo revisto (enfraquece aos poucos e reage a quem cresce demais), exaustão de guerra com cessar-fogo e coalizão contra quem cresce demais; `forcaDaFaccao` duplicada corrigida.

## Ordem de construção sugerida
1. Mapa + território + combate + recursos + interface (protótipos 1 a 7).
2. Exército: recrutamento, voluntários, compra e fabricação de armas, prisioneiros (protótipo 8), autonomia dos esquadrões (protótipo 10), bases (protótipo 12), munição e níveis (protótipo 13).
3. Gestão da região: construções, modos de produção, leis.
4. IA rival completa.
5. Drones, mísseis e blindados.

## Código
Uma página HTML só, com three.js r128 (cdnjs). O código fica em arquivos separados (dados, base, relevo, caminhos, ocupação, região, território, rotas, soldados, catálogo, simulação, combate, percepção, economia, comida, recrutamento, armas, ação, missões, logística, diplomacia, batalhões, estoques, veículos, comando, ia, ordens; tela: retratos, edifícios, terreno, território, tropas, cena, painéis, janelas, tutorial, principal) e é juntado por um script, que também embute os ícones. O documento de design também fica salvo em design.md na pasta do código. Artefato: https://claude.ai/artifact/LeMqJJtyxpGtTkQ3ZWSyA8

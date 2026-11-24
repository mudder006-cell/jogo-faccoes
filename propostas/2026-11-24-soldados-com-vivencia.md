Proposta do Setor Jogo (Game design + Código) para o Renan, em 24/11/2026. Nada aqui foi construído: é plano para você aprovar, cortar ou mudar. Números marcados "provisório" são palpite meu; os marcados "medido" saíram de partidas rodadas hoje.

Resumo em cinco linhas: o jogo já tem a base (soldados que aprendem, esquadrões, batalhões com líder e sargentos). Falta o soldado ter percepção própria, memória própria e uma cadeia de comando com general. Dá para fazer tudo isso no navegador, em fases pequenas, sem gastar nada. Migrar para Godot só vale se o seu objetivo mudar (jogo para baixar, milhares de soldados). Três decisões suas estão na seção 5.

## 1. O que já existe hoje

**No design.md**
- "Combate e soldados": combate automático, cada soldado tem campo de visão e decide atirar, abrigar-se, avançar, flanquear ou recuar; pode obedecer ou não ao líder. Aprendizado "de verdade" (aprendizado de máquina, aquele em que um programa treina uma rede neural) foi descartado no navegador; a Ana aprovou a forma atual: atributos que sobem + preferências que mudam.
- "Evolução dos soldados": veteranos sobrevivem mais, patente dá bônus, soldado experiente pode virar líder.
- "Esquadrões independentes": esquadrão age por missão e postura (agressivo, equilibrado, cauteloso), com iniciativa própria.
- "Batalhões e diplomacia": o jogador já só ordena o líder do batalhão; dentro dele, sargentos comandam os esquadrões; o jogador só sugere e o líder pode recusar.

**No código**
- `src/soldados.js`: 5 atributos (pontaria, reação, coragem, disciplina, liderança), 4 patentes (Recruta, Soldado, Veterano, Elite) com bônus, 3 preferências (se abrigar, flanquear, obedecer o líder) e um diário de 8 linhas por soldado. A função `avaliaEpisodio` olha 6 segundos depois de uma escolha, vê se deu certo e ajusta a preferência.
- `src/combate.js`: o soldado vê um inimigo se ele está perto (160 + reação x 1,2), dentro de um cone de visão (cerca de 66 graus para cada lado) e sem morro ou prédio no meio (`linhaLivre`). O esquadrão guarda por 8 segundos onde viu cada inimigo (`conhecidos`). Mas essa memória é do esquadrão, não do soldado, e dura pouco.
- `src/batalhoes.js`: líder de batalhão e sargentos já existem. Não existe general acima do líder de batalhão.

**O que não existe:** ódio ou apego por facção ou por pessoa, lembrança de eventos (ver um amigo morrer), conhecimento do mapa por soldado, vínculo entre soldados, nem a regra "só atira se vê ou sabe onde está". Hoje o esquadrão compartilha tudo que qualquer um vê, e a decisão de cobertura é um sorteio contra uma preferência.

## 2. Proposta

Ideia única: cada soldado passa a ter uma "cabeça" pequena com três gavetas: o que ele **percebe agora**, o que ele **lembra** e o que ele **sabe fazer**. A decisão dele sai das três. Nada de rede neural: são regras e números guardados por soldado (barato, previsível, fácil de testar). Isso respeita o que a Ana aprovou e dá a sensação que você descreveu.

### 2.1 Percepção: só atira se vê ou sabe onde está
- **O que o jogador vê:** um ícone pequeno sobre o soldado (olho = está vendo; orelha = ouviu; ponto de interrogação = atira num lugar suspeito). No painel do soldado: "Mirando em: Karim M. (vendo)" ou "atirando no prédio onde viu a facção X há 20 s". Prédio de onde vieram tiros fica marcado no mapa como "suspeito".
- **Por baixo:** o soldado só pode escolher alvo em quatro casos: (a) vê com linha de visão, como hoje; (b) um colega gritou "contato" e deu a posição (aviso por rádio ou voz, alcance de voz provisório: 60 m); (c) levou tiro e sabe de onde veio (direção do tiro, com erro); (d) lembra de ter visto o inimigo entrar num abrigo e ainda não viu sair. Em (b), (c) e (d) o tiro é "supressão": gasta munição, tem pouca chance de acertar e serve para segurar a cabeça do inimigo. Isso cria o "atirar em cobertura sabendo onde está". Sem nenhum dos quatro, não atira.
- **Som:** tiro e explosão geram um "ruído" com alcance; quem está dentro do alcance sabe a direção aproximada, não a posição exata. Provisório: fuzil 250 m, explosão 500 m.
- **Decisão sua:** o jogador também deve ficar sem ver o que seus soldados não veem (névoa de guerra, aquele escurecido sobre o que ninguém seu enxerga)? Dá tensão e combina com "não controlo a guerra", mas é mudança grande de tela (ver pergunta 2).

### 2.2 Memória e vivência: eventos marcantes que mudam o soldado
- **O que o jogador vê:** a ficha do soldado ganha uma lista "Marcas", por exemplo: "Viu a facção Y matar Omar (amigo) no dia 3" e "Sobreviveu sozinho a um tiroteio". O diário atual já mostra aprendizado; as marcas mostram a história. Quando uma marca pesa, aparece um aviso curto: "Samir odeia a facção Y".
- **Por baixo:** cada soldado guarda no máximo uns 12 eventos (provisório) com tipo, quem, quando e peso. Tipos: viu amigo morrer, viu quem matou, foi ferido por X, salvo por médico, comandante caiu, venceu com poucos, rendeu-se, foi poupado, viu civil sofrer. O peso esmaece com o tempo, mas eventos fortes ficam. Cada evento mexe em poucos números guardados no soldado: ódio por facção (0 a 100, um número por facção), medo, confiança no líder, apego a colegas.
- **Efeito no jogo:** ódio alto faz o soldado preferir alvo daquela facção, ser mais ousado contra ela, e recusar rendição ou proposta de paz mais vezes (aqui aparece conflito com a diplomacia do jogador: tropa que odeia o aliado de ontem). Medo alto faz abrigar-se mais e recuar antes. Marcas são únicas por partida, como você pediu; nada persiste entre partidas.
- **Decisão sua:** quanto o ódio pode contrariar o jogador (soldado atira em quem a diplomacia diz ser aliado? só desobedece rendição? só afeta preferência de alvo?). Recomendo o mais leve: afeta alvo e rendição, nunca fogo contra aliado.

### 2.3 Aprendizado de combate: atributos e comportamentos que destravam
- **O que o jogador vê:** além de "Pontaria subiu para 50", aparecem habilidades destravadas na ficha, com nome: "Sabe escolher cobertura", "Atira onde o inimigo vai estar", "Segura o fogo até ter alvo claro", "Dá ordem curta e clara (liderança)". Soldado com a habilidade passa a se comportar visivelmente diferente (por exemplo, para atrás de meia parede em vez de ficar de pé no meio da rua).
- **Por baixo:** hoje a escolha de cobertura é um sorteio. Passa a ser uma pontuação: o soldado compara os abrigos próximos por proteção, distância e se tem visão do alvo. Recruta olha 1 ou 2 opções e erra; veterano olha mais, escolhe melhor e também escolhe o ângulo (não se expõe ao flanco). "Sabe onde atirar" é: veterano mira em partes do prédio onde o inimigo costuma aparecer (janelas e quinas) e dá o primeiro tiro mais cedo. Habilidades destravam por uso repetido e resultado bom (mesma lógica do `avaliaEpisodio`, que já existe), em vez de só subir um número. Provisório: 6 habilidades no começo.
- **Liderança que melhora:** o líder passa a decidir com mais informação (soma o que os colegas viram) e dá o plano mais cedo. Líder ruim demora e escolhe errado; os soldados dele obedecem menos (já existe a preferência "obedece").

### 2.4 Conhecimento do mapa
- **O que o jogador vê:** na ficha, "Conhece: bairro Norte (bem), Cidade velha (pouco)". Esquadrão com soldado que conhece o bairro chega mais rápido e por ruas menos expostas, e o aviso diz "usou atalho conhecido".
- **Por baixo:** o mapa é dividido em bairros (as zonas que já existem). Cada soldado guarda um número de familiaridade por zona (0 a 100), que sobe ao andar, lutar e morar ali, e cai devagar com o tempo. O cálculo de caminho (`caminhos.js` e `rotas.js`) passa a ter dois níveis: o esquadrão escolhe o caminho usando o soldado mais familiarizado como "guia". Soldado de fora segue o guia. Recrutado da região começa conhecendo a região (liga com recrutamento de voluntários e clã).

### 2.5 Relações e ódio entre facções
Já descrito em 2.2 como número por facção por soldado. A parte nova de design: o somatório dos soldados vira o "clima" de cada facção (quanto a tropa odeia X), mostrado ao jogador num indicador simples ao lado da diplomacia. O jogador negocia, mas a tropa pode não gostar (a tropa que odeia perde moral ao receber ordem de pacto com X). Provisório.

### 2.6 Sistema social (opcional, só depois do resto)
- **O que o jogador vê:** pares ligados por uma linha fina na ficha ("Amigo de Ali; rival de Hamza"). Perder um amigo derruba a moral; dois amigos no mesmo esquadrão lutam melhor juntos; rivais internos atrapalham.
- **Por baixo:** cada soldado guarda no máximo 3 vínculos (provisório), criados por tempo juntos, vida salva e origem comum. Custa pouco: são só 3 números por soldado. O risco é de design (ver seção 6), por isso é a última fase e pode ser cortada.

### 2.7 Cadeia de comando: general, líder de batalhão, sargento, soldado
O que o jogador ordena e o que cada nível decide sozinho:

| Nível | O jogador ordena | O nível decide sozinho |
|---|---|---|
| Jogador | Intenção grande: "tomar o bairro Norte", "segurar a frente contra X", orçamento, quem é general | Nada no campo |
| **General (novo)** | recebe a intenção | divide a guerra entre batalhões, escolhe qual batalhão ataca e qual defende, pede reforço, propõe recuo geral; só um por facção no começo |
| Líder de batalhão (já existe) | recebe do general (ou do jogador, se não houver general) | monta esquadrões, escolhe sargentos, distribui armas e função, transforma ordem em missões |
| Sargento (já existe) | recebe missão e postura | rota, formação, quando recuar, quem socorre quem |
| Soldado | nada direto | percepção, cobertura, quando atira, obedece ou não (2.1 a 2.4) |

- **O que o jogador vê:** a árvore de comando numa tela só (nomes, patente, quanto cada um confia no de cima). Ele escolhe o general entre os líderes mais experientes. Se o general é bom, as ordens grandes funcionam; se é ruim, atrasa e erra. O jogador pode "tirar o general", e o general pode discordar: "não recomendo atacar agora, 40% de munição".
- **Informação sobe, ordem desce:** o que um soldado viu vira relatório do sargento ao líder e ao general. Se o sargento morre, a informação para de subir e o líder fica no escuro por um tempo. Isso é o que torna o comando "de verdade" e dá importância a proteger o comando.
- **Decisão sua:** quanto o jogador pode intervir "por cima" (ordenar direto a um esquadrão passando por cima do general, com custo de confiança?). Ver pergunta 3.

## 3. Custo e plataforma

### 3.1 Medições de hoje (24/11/2026)
Rodei partidas sem tela com o próprio teste do projeto e com um medidor que escrevi só para isto (guardado fora do repositório). Condições: mapa de 2,8 x 2,8 km, jogador + 3 rivais + governo, dificuldade normal, **jogador sem dar nenhuma ordem** (por isso há pouco combate; o combate real do jogador não está medido).
- Soldados numa partida típica: cerca de **200 criados no começo** (medido: 200, 214, 217, 218 e 221 nas sementes B2, K7 e Q4), dos quais cerca de **165 a 205 vivos**, sendo mais de 160 do governo antigo. Cai para cerca de 125 a 145 vivos depois de 2 a 4 dias de jogo. No pico, 12 a 17 soldados em combate ao mesmo tempo (medido a cada 10 s de jogo, aproximadamente).
- Tempo da simulação: cada passo de 0,25 s de jogo custou em média **0,26 a 0,45 ms** (3 sementes). Uma partida de 96 h de jogo (96 min reais a 1x) calculou em **18,5 s** de computador, ou seja, 300 vezes mais rápido que o tempo real. Comando do teste do projeto: `node testes/estresse_ia.js --sementes B2 --dif normal --horas 24` rodou em 4,6 s (24 h de jogo).
- Picos: o pior passo isolado levou **125 a 148 ms** (medido), bem acima da média. Provavelmente é o cálculo de segundo em segundo (IA, batalhões, capturas); não investiguei a causa. Em tela cheia a 60 quadros por segundo cada quadro tem cerca de 16 ms, então esses picos já seriam percebidos como travadinha. Vale checar na fase 19.
- Não medi o desenho 3D na tela, só a lógica. A parte de tela tem cerca de 2.600 linhas (`src/tela/`) e usa three.js (a biblioteca que desenha 3D no navegador).

### 3.2 Custo estimado da proposta (tudo provisório)
- **Memória por soldado:** eventos (12) + ódio por facção (uns 6 números) + familiaridade por zona (uns 20 números) + vínculos (3) = algumas centenas de bytes a poucos KB. Para 1.000 soldados, alguns MB: irrelevante.
- **Tempo por soldado:** a parte cara é a percepção. Hoje cada soldado olha só até 6 inimigos mais próximos. Com ouvido, memória e linha de visão para mais alvos, estimo 3 a 5 vezes o custo atual de decisão por soldado em combate. Como hoje há poucos soldados em combate (12 a 17 nas minhas partidas), mesmo 5 vezes não passa de 1 a 2 ms por passo (provisório). Memória, ódio e mapa só atualizam em eventos, custo desprezível.
- **O que pesa de verdade:** mais soldados. Se a partida passar de 200 para 1.000, a comparação "todos contra todos" para saber quem vê quem explode (mil vezes mil). Resolve-se com uma grade espacial (dividir o mapa em quadradinhos e só comparar com quem está nos quadradinhos vizinhos). É trabalho de código, não de motor.
- **Cadeia de comando:** custo desprezível (decide a cada alguns segundos, para poucas dezenas de comandantes).

### 3.3 Navegador ou motor de jogo (Godot, Unity)

| | Continuar no navegador (three.js + Web Workers) | Godot (grátis) | Unity |
|---|---|---|---|
| Custo | zero | zero (licença livre, sem royalties) | grátis até um limite de faturamento; as regras mudaram no passado, conferir antes de usar; pode virar gasto |
| Link que abre em qualquer lugar | sim, é o que você tem hoje | exporta para web, mas pesa mais e tem limites; o foco é baixar o jogo | idem, web é secundário |
| Código atual (cerca de 5.300 linhas de lógica + 2.600 de tela) | todo aproveitado | reescrever tudo (outra linguagem, GDScript ou C#) | reescrever tudo (C#) |
| Teste automático sem tela | já existe e é rápido (`testes/`) | dá, mas teríamos de refazer a base de testes | idem |
| Muitos soldados (milhares) | exige otimizar (grade espacial, Worker); possível até alguns milhares | melhor desempenho nativo, mas a lógica pesada continua sendo nossa | idem, com mais ferramentas prontas |
| Gráficos e animação | simples (caixas e cilindros hoje) | bem melhores, editor visual | idem, mais pesado |
| Distribuição | colar um link | exportar e distribuir arquivos (e loja, se for o caso) | idem |

- **Web Workers** (processo paralelo do navegador, como "um segundo cérebro" que roda a simulação enquanto a tela desenha): permitem tirar o cálculo da guerra da thread que desenha, e acabam com a travadinha dos picos. Esforço: pequeno a médio (provisório), porque a simulação já roda sem tela (os testes provam). Custo: zero.
- **Esforço de migrar para Godot (provisório):** refazer lógica e tela, por volta de 5 a 10 vezes o trabalho de uma fase nova deste plano, sem jogo jogável durante a troca, e perde-se o link universal que o time usa para você testar. O ganho principal (gráficos e desempenho) não é o problema de hoje: o gargalo atual é design, não velocidade.

### 3.4 Recomendação (uma)
**Ficar no navegador por enquanto.** O que você quer (soldados com percepção, memória e comando) é regra de jogo, não gráfico; a simulação mede 0,3 ms por passo com 200 soldados, ou seja, sobra folga enorme; migrar custaria o jogo funcionando e o link que você usa para testar. Revisamos no fim da fase 21 com uma medição de 1.000 soldados: só se ela falhar, ou se você decidir que o jogo vai para baixar ou loja, a migração para Godot passa a valer (grátis, e a lógica já estará bem especificada nas propostas). Gasto novo: nenhum, e como hoje é 24/11/2026 e a regra de só ferramentas grátis venceu em 20/11, qualquer coisa paga exigiria falar de orçamento com você antes.

## 4. Plano em fases

Cada fase fica jogável sozinha e entra como protótipo numérico seguinte ao 18. A menor vem primeiro.

**Protótipo 19: ver ou saber (percepção).**
- Entrega: regra "só atira se vê, ouviu o aviso, levou tiro ou lembra onde o inimigo entrou"; tiro de supressão em lugar suspeito; ícones de olho, orelha e interrogação; prédio suspeito no mapa; memória por soldado (não por esquadrão); grade espacial; medida e tratamento dos picos de 125 a 148 ms.
- Como testar: `testes/estresse_ia.js` antes e depois (mesmas sementes B2, K7, Q4): comparar mortes, abates, munição gasta por abate e tempo por passo; teste novo de que ninguém atira em alvo sem uma das quatro razões; partida jogada por você com combate real e sua impressão (ficou mais confuso ou mais interessante?).
- Corte de risco: se travar ou o combate ficar parado demais, o soldado volta ao comportamento atual com um interruptor.

**Protótipo 20: marcas e ódio (vivência).**
- Entrega: eventos marcantes por soldado, ódio por facção, medo, lista "Marcas" na ficha, aviso quando uma marca pesa, indicador de clima da tropa por facção.
- Como testar: soldados que viram a morte de um amigo por X devem ter ódio de X maior que os outros (teste automático); duas partidas com a mesma semente produzem marcas diferentes (vivência única); você lê 5 fichas de veterano e diz se contam uma história que você reconhece.

**Protótipo 21: saber fazer (habilidades e mapa).**
- Entrega: escolha de cobertura por pontuação, habilidades destravadas com nome, liderança que melhora, familiaridade por bairro e guia de caminho.
- Como testar: mesma semente com e sem as habilidades; veterano deve morrer menos e acertar mais que recruta em campo aberto e perto de cobertura; esquadrão com guia chega mais rápido que sem guia; medição de 1.000 soldados (ponto de decisão da plataforma).

**Protótipo 22: general e informação subindo.**
- Entrega: general por facção, ordens de intenção, relatórios que sobem pela cadeia, árvore de comando na tela, general ruim erra mais.
- Como testar: com general e sem general, mesma semente, a facção com general se coordena melhor? (nº de batalhões em ação simultânea, frentes ocupadas); matar o sargento realmente deixa o líder cego por um tempo; você joga só dando ordens grandes e diz se sente comando ou impotência.

**Protótipo 23 (opcional): vínculos entre soldados.** Só se 19 a 22 ficarem bons e você quiser. Testar: perda de amigo muda comportamento sem o soldado virar inútil.

## 5. Perguntas ao Renan

1. **Quanto a tropa pode contrariar você?** A) só afeta de quem ela gosta ou odeia (escolha de alvo e rendição). B) também pode recusar ordens (por exemplo, tropa que odeia X não vai a um ataque ao lado de X). C) pode agir contra a diplomacia (atira no aliado de ontem). **Recomendada: A** na fase 20; B só se você sentir falta de peso.
2. **O jogador também fica sem ver o que a tropa não vê (névoa de guerra)?** A) não, você vê tudo (só os soldados ficam sem saber). B) vê tudo que a facção sabe pela cadeia de comando, atrasado e incompleto. C) vê só o que está dentro do campo de visão dos seus soldados. **Recomendada: B**, porque faz o general e o sargento terem valor sem tirar sua visão do mapa. Muda bastante a tela; testamos antes na fase 22.
3. **Intervir por cima do general?** A) pode ordenar direto a qualquer esquadrão, sem custo. B) pode, mas gasta influência e o general perde confiança em você. C) não pode: só o general e os líderes recebem ordem. **Recomendada: B**, porque deixa uma saída para o momento de aperto sem apagar o general.

## 6. Riscos

- **Jogador se sentir impotente.** Se a tropa decide tudo, o jogador só vê números subindo. Mitigações: ordens de intenção claras, relatórios visíveis, escolher o general, orçamento, diplomacia, e a pergunta 3. Teste de aceitação: você sente que as decisões suas mudam o resultado da guerra.
- **Combate parado ou chato.** Com a regra "só atira se vê", pode haver longos tiroteios de supressão sem ninguém morrer. Mitigação: supressão custa munição (e munição já pesa na economia) e inimigo em abrigo perde moral aos poucos.
- **Confuso: ícones e fichas demais.** Mais informação por soldado pode poluir uma tela que já foi reclamada como poluída (design.md, "Interface e comando"). Mitigação: ícones só no que está selecionado ou em combate; Marcas escondidas atrás de um clique.
- **Pesado.** Hoje sobra folga, mas os picos de 125 a 148 ms precisam de tratamento já na fase 19; e se a partida for para mil soldados, é preciso a grade espacial. Mitigação: Worker e grade, e a medição de 1.000 soldados na fase 21.
- **Difícil de equilibrar.** Muitos sistemas pequenos interagindo (ódio, medo, habilidades, memória) dificultam saber por que uma partida deu errado. Mitigação: cada fase tem teste automático e interruptor para desligar o sistema novo.
- **Ódio atrapalhar a diplomacia que já existe.** Tropa que odeia o aliado vira atrito com o pacto. Mitigação: pergunta 1, começando pela versão leve.
- **Medição limitada.** Meus números vêm de partidas com o jogador parado. Em jogo real com muito combate o custo por passo será maior; a fase 19 remede.

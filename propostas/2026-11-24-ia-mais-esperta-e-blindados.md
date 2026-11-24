Ideias do Claude (24/11/2026), a pedido do Renan: IA mais esperta (fortificar o que importa, organizar esquadrões), IA do jogador mais autônoma e veículos armados. Nada aprovado; tudo aqui é proposta.

# 0. A ideia central: um "cérebro" só para rival e jogador
Hoje a IA das rivais (`ia.js`) e a ajuda ao jogador (batalhões, sugestões) são códigos separados. Proposta: um único **cérebro de general** que decide para qualquer facção. A rival usa no automático; o jogador usa com as intenções dele por cima.
- Vantagem: toda melhoria vale duas vezes (rival mais difícil e generais do jogador mais espertos).
- Cuidado (ponto contra): se o cérebro do jogador for bom demais, o jogo joga sozinho. Por isso o jogador escolhe o **nível de autonomia por batalhão**:
  1. Manual: só obedece ordens.
  2. Assistido: sugere ("quero fortificar o mercado: sim/não").
  3. Autônomo: faz sozinho dentro das regras que o jogador deu (zonas a proteger, zona-alvo, quanto pode gastar, postura).
- O general sempre **diz por que** fez algo ("Fortifiquei o mercado: ponto importante e a 120 m da facção Azul, em guerra"). Isso ensina o jogador e mostra que a IA pensa.

# 1. Fortificar o que importa
Hoje: bases até 100, fronteira até 60, por distância. Proposta: cada prédio ganha uma **nota de valor** e o general fortifica as maiores notas.
- Nota = importância × ameaça × posição.
  - Importância: base > ponto importante (dá controle do bairro) > fazenda/armazém (dão comida) > casa comum.
  - Ameaça: inimigo em guerra perto, ataques recentes ali, rota provável do inimigo.
  - Posição: prédio alto ou em cruzamento, que enxerga e cobre outros prédios.
- **Minha opinião, contra fortificar tudo:** prédio fortificado e vazio é presente para o inimigo (ele toma e usa). Regra proposta: só fortificar acima de 50 onde há ou haverá guarnição. Melhor 5 prédios a 100 formando uma linha do que 30 a 30.
- **Linha de defesa:** o general escolhe 3 a 6 "âncoras" por frente (pontos importantes que se cobrem) e concentra obra e guarnição nelas.

# 2. Organizar esquadrões por missão
Hoje o líder distribui funções numa ordem fixa (AR, médico, AT, granadeiro, engenheiro). Proposta: **molde por missão**.
| Missão | Composição (6) |
|---|---|
| Assalto | líder, AR, granadeiro, AT, 2 fuzileiros |
| Defesa | líder, AR, engenheiro, médico, 2 fuzileiros |
| Patrulha / ronda | líder, 4 fuzileiros rápidos, médico |
| Caça-blindado (com veículos) | líder, 2 AT, AR, 2 fuzileiros |
- **Coordenação de 2 esquadrões:** um prende o inimigo com tiro (supressão), o outro contorna. Hoje cada esquadrão ataca sozinho.
- **Concentrar força:** atacar um ponto com 2 ou 3 esquadrões de uma vez, em vez de espalhar.
- **Reserva:** cada batalhão guarda 1 esquadrão parado para reagir.
- **Veteranos:** escolha de doutrina por personalidade. Agressiva junta os melhores num esquadrão de elite; defensiva espalha veteranos para segurar os novatos.

# 3. Ideias minhas a mais (IA esperta)
1. **Memória de fracasso:** se o ataque num lugar falhou 2 vezes, o general muda de alvo ou espera reforço.
2. **Oportunismo:** atacar quem está em guerra com outro ou acabou de perder soldados.
3. **Alvos econômicos:** agora que obras valem a pena, atacar fazendas e armazéns do inimigo (corta comida sem enfrentar a base).
4. **Recuar para o forte:** esquadrão perdendo recua para o prédio fortificado mais perto, não para o QG.

# 4. Veículos armados e blindados
Hoje só há veículos de logística (picape, caminhão, caminhão blindado), e as rivais quase não usam nem esses. **Antes dos armados, a rival precisa usar os de logística**, senão os armados também vão ficar parados.
| Veículo | Papel | Forte contra | Morre para |
|---|---|---|---|
| Picape com metralhadora ("técnica") | rápido e barato, combina com o cenário | infantaria em campo aberto | fuzil concentrado, RPG |
| Blindado de transporte | leva 1 esquadrão, metralhadora | fuzil, metralhadora | RPG, AT, minas |
| Tanque | canhão que derruba prédio | tudo de perto | AT em emboscada, minas, rua estreita |
- **Contra-jogo (essencial):** RPG/AT, minas do engenheiro de combate e as ruas estreitas da cidade velha (blindado entra mal e vira alvo). Blindado sem infantaria por perto deve morrer em cidade; isso força a armas combinadas.
- Custo de uso: conserto gasta suprimentos (recurso que já existe); sem combustível novo, para não complicar.
- Visual: caixas simples em three.js, como os prédios; o peso é baixo.

# 5. Ordem que eu recomendo
1. Fechar o 19.4 (em andamento).
2. 19.1 névoa de guerra: IA esperta precisa decidir com informação parcial, senão "trapaceia"; os engenheiros de obras viram visíveis aqui.
3. Cérebro comum + nota de valor dos prédios + moldes de esquadrão (itens 0, 1 e 2).
4. Rival usar veículos de logística; depois a técnica (picape armada) como primeiro veículo armado.
5. Blindado de transporte e tanque, junto com minas.

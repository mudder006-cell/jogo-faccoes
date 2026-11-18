## O que cobre
As regras do jogo e o equilíbrio: o que existe, como funciona e com que números. Fonte única: `design.md`. Esta ficha aponta para as seções; não copia os números.

## Subequipes

## Subequipe — Mapa e território
- `design.md`: "Decidido pela Ana", "Território", "Bairro inteiro", Provisório "Zonas" e "Governo antigo".
- Mapa gerado a cada partida, 2,8 × 2,8 km, 1 cidade + 3 vilas, morros; inspirado em cidades do Oriente Médio, nomes inventados a partir de palavras árabes.

## Subequipe — Combate e soldados
- `design.md`: "Combate e soldados", "Explosões", "Evolução dos soldados", Provisório "Armas", "Níveis", "Explosões", "Posturas".
- Combate automático soldado por soldado; aprendizado = atributos + preferências (sem aprendizado de máquina); vale só na partida.

## Subequipe — Economia
- `design.md`: "Recursos", "Logística, economia e comando", "Comida, obras e comércio", Provisório "Economia", "Comida", "Obras", "Mercado de comida".
- Só 3 recursos: dinheiro, influência, comida. Coisas caras, que levam tempo.

## Subequipe — Exército e logística
- `design.md`: "Exército: recrutamento e armas", "Esquadrões independentes", "Bases e trocas", "Munição e níveis de arma", "Batalhões e diplomacia", "Estoque mínimo dos batalhões", Provisório "Recrutamento", "Munição", "Bases e trocas", "Batalhões", "Estoque mínimo", "Compra automática", "Estoques", "Veículos", "Comando".

## Subequipe — Diplomacia e IA rival
- `design.md`: "Batalhões e diplomacia", Provisório "Diplomacia", "IA rival", "Ofensivas das rivais", "Contra-ataque do governo", "Países".
- Protótipo 18 (aprovado pelo Renan em 18/11/2026): rival com as **mesmas regras** do jogador (batalhões, missões, estoque por base, logística), comandante da IA, sem trapaça; dificuldade Fácil, Normal e Difícil no menu.

## Material do projeto
| Arquivo | Data | Onde está |
|---|---|---|
| `design.md` | 18/11/2026 (protótipo 17) | GitHub `mudder006-cell/jogo-faccoes`, raiz |
| `MEMORIA.md` | 18/11/2026 | idem |

## Decisões e regras do jogo
- Quem aprova: Renan (antes, Ana; as decisões dela valem).
- Nome provisório: Salam Aleikum.
- Navegador, tempo real com pausa, um jogador contra a IA, pronto para multiplayer depois.
- Vitória: eliminar todas as rivais. Governo antigo começa com ~80% do mapa e enfraquece.
- Ordem de construção: exército → gestão da região (leis) → IA rival completa → drones, mísseis e blindados.

## Como fazemos
- Toda decisão nova entra no `design.md`, na seção do tema, com data.
- Número escolhido pelo Claude vai em "Provisório (Claude escolheu…)" até o Renan aprovar.
- Pergunta ao Renan: até 3 por vez, com opções e uma recomendada.
- Mudança de equilíbrio: medir antes e depois (ficha Testes e balanço) e dizer os números.

## Erros comuns
- Decidir sozinho quando há dúvida (regra do Renan: perguntar).
- Copiar número para a ficha e deixar o `design.md` desatualizado.
- Chamar de "aprovado" o que está em "Provisório".

## Pendências
- Em aberto no `design.md`: bônus do controle total, vantagem do edifício inicial, usos de prisioneiros, doação de aliadas, eventos com escolha, letalidade do combate inicial, conserto de prédios, quem recebe a melhor arma, nomes das facções.
- Protótipo 18: rival sem caixa negativo (hoje recruta mercenários demais), dificuldade no menu.
- Leis (gestão da região) e drones, mísseis e blindados: ainda não começados.

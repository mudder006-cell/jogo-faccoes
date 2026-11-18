## O que cobre
O que o jogador vê e clica: o mapa 3D, os painéis e janelas, ícones, retratos e o tutorial.

## Subequipes

## Subequipe — Visual 3D de blocos
- `src/tela/terreno.js`, `edificios.js`, `territorio.js`, `tropas.js`, `cena.js`.
- Visual aprovado (protótipo 1): 3D simples, de blocos, como o reel de @cidade_em_jogo ("City Builder Multijogador"). Sem sinais de guerra no começo.
- Soldados 40% maiores com disco da cor da facção; plaquinha sobre cada esquadrão com retrato do líder.

## Subequipe — Painéis, ícones e retratos
- `src/tela/paineis.js`, `janelas.js`, `principal.js`, `retratos.js`, `src/corpo.html`, `src/estilo.css`.
- Regras: interface limpa, ícone em tudo, menos texto, poucos painéis abertos, claro o que dá para clicar. Acontecimentos: só os 3 últimos.
- Retratos aprovados: rosto simples, lenço, capacete, gorro, bandana ou nada, barba variando.

## Subequipe — Tutorial e ajuda
- `src/tela/tutorial.js`: 13 passos num cartão no alto, anel piscando no que clicar; "Com/Sem tutorial" no menu; "Ver o tutorial de novo" na Ajuda.

## Material do projeto
| Arquivo | Data | Onde está |
|---|---|---|
| `src/tela/*.js`, `src/corpo.html`, `src/estilo.css` | 18/11/2026 | GitHub `mudder006-cell/jogo-faccoes` |
| `design.md`: "Interface e comando", Provisório "Layout", "Janela de armas", "Janela de esquadrões", "No mapa", "Janela de batalhões", "Tutorial", "Ícones" | 18/11/2026 | idem |

## Decisões e regras do jogo
- Ver as seções do `design.md` acima. Mudança visual grande: mostrar print ao Renan antes de juntar ao `main`.

## Como fazemos
- Toda tela nova ou mudada: print no navegador (ficha Testes e balanço) em tela de PC e de celular.
- Texto da tela em português simples; nomes curtos nos botões.
- Opção nova no menu segue o padrão dos botões `.opcoes` (ex.: Tutorial, Começo).

## Erros comuns
- Tela poluída: painéis e listas grandes demais (aconteceu no protótipo 8).
- Aviso de rival aparecendo para o jogador (falta filtro `meu(...)`).

## Pendências
- Protótipo 18: botões Fácil / Normal / Difícil no menu.
- O título da página ainda diz "protótipo do mapa".

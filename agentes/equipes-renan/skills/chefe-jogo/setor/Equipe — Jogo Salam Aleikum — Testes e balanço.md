## O que cobre
Provar que o jogo funciona e medir se os números estão bons, antes de o Renan jogar.

## Subequipes

## Subequipe — Simulações em Node
- `testes/*.js`: partidas sem tela. Rodar da raiz: `node testes/<teste>.js <semente>` (semente padrão `B2`).
- Mais úteis hoje: `teste_comando.js` (batalhões e defesa), `teste_logistica.js`, `teste_batalhao.js`, `teste_rival.js` (protótipo 18: `node testes/teste_rival.js B2 normal 48`).
- Cada teste tem a própria lista de arquivos de `src/`; arquivo novo precisa entrar nela.

## Subequipe — Teste visual no navegador
- Abrir o `index.html` com Playwright/Chromium, gerar uma região, jogar alguns segundos e tirar print (PC e celular).
- Conferir: sem erro no console, painéis legíveis, nada cortado.

## Subequipe — Medições de balanço
- Comparar antes × depois na mesma semente e horas de jogo: prédios, zonas, soldados, mortos, dinheiro, influência, comida.
- Referência do código antigo (protótipo 17, B2, 48 h, rivais simples): rivais com 39 a 211 prédios e caixa entre $ 1.865 e $ 2.456.
- Medição do protótipo 18 (B2, normal, 24 h): rivais com 12 a 56 prédios e caixa entre −$ 60 e −$ 1.084. Problema: caixa negativo.

## Material do projeto
| Arquivo | Data | Onde está |
|---|---|---|
| `testes/*.js` | 18/11/2026 | GitHub `mudder006-cell/jogo-faccoes` |
| `testes/teste_rival.js` | 18/11/2026 | ramo `prototipo-18` |
| `design.md`: números "Medido" em cada seção | 18/11/2026 | raiz do repositório |

## Decisões e regras do jogo
- Teste que falhou é dito como falhou, com a saída.
- Medição nova que muda número vai para o `design.md` como "Medido: …".

## Como fazemos
- Quem testa não é quem escreveu o código (revisão independente).
- Mesma semente e mesmas horas para comparar; dizer o tempo que o teste levou.
- Print que o Renan vai ver: escala 2; print só para conferência: escala 1.

## Erros comuns
- Testes antigos quebram por lista de arquivos desatualizada (ex.: `teste_partida.js`): não é erro do jogo.
- Comparar sementes diferentes.

## Pendências
- Atualizar as listas de arquivos dos testes antigos.
- Protótipo 18: medir de novo depois de corrigir o caixa das rivais, nas 3 dificuldades.

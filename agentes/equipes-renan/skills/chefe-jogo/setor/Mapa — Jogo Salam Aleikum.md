## Setor
- Jogo: **Salam Aleikum** (nome provisório, escolhido pelo Renan em 18/11/2026). Estratégia em tempo real no navegador: o jogador comanda uma facção numa zona de guerra gerada a cada partida.
- Repositório: `mudder006-cell/jogo-faccoes` (GitHub, público). Jogar: https://mudder006-cell.github.io/jogo-faccoes/ (a confirmar: GitHub Pages ligado).
- Quem aprova: Renan. Estado em 18/11/2026: protótipo 17 no `main`; protótipo 18 (IA rival completa) em andamento no ramo `prototipo-18`.
- Chefe: skill `chefe-jogo`. Executor: Leitor + agente geral Sonnet.

## Árvore
```
Setor Jogo (chefe-jogo)
├── Game design
│   ├── Mapa e território
│   ├── Combate e soldados
│   ├── Economia
│   ├── Exército e logística
│   └── Diplomacia e IA rival
├── Código
│   ├── Simulação
│   └── Montagem e publicação
├── Interface e visual
│   ├── Visual 3D de blocos
│   ├── Painéis, ícones e retratos
│   └── Tutorial e ajuda
└── Testes e balanço
    ├── Simulações em Node
    ├── Teste visual no navegador
    └── Medições de balanço
```

## Tema → material → onde é usado
| Tema | Material (no repositório) | Ficha |
|---|---|---|
| Regras do jogo, números provisórios, em aberto | `design.md` | Game design |
| Regras de trabalho, pendências do projeto | `MEMORIA.md` | todas |
| Mapa, relevo, zonas, território | `src/relevo.js`, `regiao.js`, `territorio.js`, `ocupacao.js`, `caminhos.js`, `rotas.js` | Game design · Código |
| Combate, soldados, explosões | `src/combate.js`, `soldados.js`, `catalogo.js`, `simulacao.js` | Game design · Código |
| Economia, comida, obras, mercado | `src/economia.js`, `comida.js` | Game design · Código |
| Recrutamento, armas, munição | `src/recrutamento.js`, `armas.js` | Game design · Código |
| Missões, bases, batalhões, estoques, veículos, comando | `src/missoes.js`, `logistica.js`, `batalhoes.js`, `estoques.js`, `veiculos.js`, `comando.js`, `ordens.js`, `acao.js` | Game design · Código |
| Diplomacia, países, IA rival | `src/diplomacia.js`, `comandante.js` (ramo `prototipo-18`) | Game design · Código |
| Montagem da página | `montar.py`, `index.html`, `icones/` | Código |
| Tela, painéis, janelas, retratos, 3D | `src/tela/*.js`, `src/corpo.html`, `src/estilo.css` | Interface e visual |
| Tutorial | `src/tela/tutorial.js` | Interface e visual |
| Testes | `testes/*.js` | Testes e balanço |

## Como escolher
- No máximo 3 fichas por pedido.
- Regra nova → Game design. Código → Código + Testes e balanço. Tela → Interface e visual (+ Testes para o print).

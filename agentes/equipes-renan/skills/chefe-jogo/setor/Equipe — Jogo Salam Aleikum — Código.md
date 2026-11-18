## O que cobre
O código da simulação (regras rodando) e a montagem da página única que vai para o GitHub.

## Subequipes

## Subequipe — Simulação
- Arquivos em `src/` (sem a pasta `tela/`). Ordem de carga em `montar.py` (`ORDEM`); um arquivo novo precisa entrar lá **e** na lista de cada teste que o usa.
- `completa(fac)` (em `territorio.js`, ramo `prototipo-18`): verdadeiro para o jogador e as rivais com exército completo. Use no lugar de `fac.jogador` quando for regra de exército; `fac.jogador` só para avisos e tela.
- Avisos: `avisa(P, tipo, dados)`; a tela filtra com `meu(...)`. Evento de rival não deve aparecer para o jogador.

## Subequipe — Montagem e publicação
- `python3 montar.py` junta `src/` em `index.html` (com ícones embutidos de `icones/icones.json`). Sempre montar antes de commitar.
- three.js r128 vem do cdnjs; nada mais da internet.
- Publicação: GitHub Pages do `main`, raiz (a confirmar se está ligado).

## Material do projeto
| Arquivo | Data | Onde está |
|---|---|---|
| `src/*.js`, `src/tela/*.js`, `src/corpo.html`, `src/estilo.css` | 18/11/2026 | GitHub `mudder006-cell/jogo-faccoes` |
| `montar.py`, `index.html`, `icones/` | 18/11/2026 | idem |
| `README.md` | 18/11/2026 | idem |

## Decisões e regras do jogo
- Uma página HTML só; código separado por assunto e juntado pelo `montar.py`.
- Ícones: Material Design Icons (Apache 2.0), embutidos.

## Como fazemos
- Um ramo por protótipo (`prototipo-NN`); `main` só com o OK do Renan.
- Commit em português, curto, com o que mudou para o jogador.
- Comentário no topo de cada arquivo explica a regra em português simples e diz "(Números provisórios.)".
- Números ficam em constantes no topo do arquivo (ex.: `COMANDO`, `LOGISTICA`), não espalhados.
- Antes de entregar: montar, rodar os testes ligados ao que mudou, revisão independente.

## Erros comuns
- Esquecer de pôr arquivo novo no `ORDEM` do `montar.py` ou na lista dos testes.
- Usar `fac.jogador` em regra que também vale para as rivais.
- Clonar raso e a cópia não seguir o ramo novo (corrigir com `git config --add remote.origin.fetch "+refs/heads/<ramo>:refs/remotes/origin/<ramo>"`).

## Pendências
- Testes antigos (`teste_partida.js` e outros) desatualizados: a lista de arquivos não tem os módulos novos.
- Protótipo 18 em `prototipo-18`: falta dificuldade no menu e corrigir caixa das rivais.

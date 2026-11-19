# Jogo de facções (protótipo 18)

Jogo de estratégia em tempo real para o navegador: você comanda uma facção numa zona de guerra gerada a cada partida, com batalhões, diplomacia, logística, economia (dinheiro, influência e comida) e combate soldado por soldado. Feito com three.js r128.

**Jogar:** https://mudder006-cell.github.io/jogo-faccoes/ (depois de ligar o GitHub Pages)

## Como o código está organizado
- `src/`: o código separado em arquivos (dados, relevo, território, soldados, combate, economia, comida, recrutamento, armas, diplomacia, batalhões, estoques, veículos, comando, ordens) e a interface em `src/tela/`.
- `montar.py`: junta tudo num `index.html` só, com os ícones embutidos. Rode `python3 montar.py`.
- `icones/`: ícones (Material Design Icons, Apache 2.0) já guardados em `icones.json`.
- `design.md`: todas as decisões de design e os números provisórios.
- `testes/`: simulações em Node (`node testes/teste_comando.js B2`). Rode a partir da raiz depois de ajustar o caminho de `src` se precisar.

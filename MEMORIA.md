# Salam Aleikum (nome provisório) — Memória do projeto

Fonte: cópia da memória do projeto "joguinho" no outro site, atualizada em 17/11/2026. Importada em 18/11/2026.

## Regras de trabalho (definidas pelo Renan em 18/11/2026)
- Claude resolve sozinho com todas as ferramentas e agentes disponíveis; só aciona o Renan quando for extremamente necessário.
- Em caso de dúvida: perguntar, nunca decidir sozinho.
- Quem aprova as decisões do jogo, a partir de 18/11/2026: **Renan** (antes era a Ana; o que ela decidiu continua valendo).
- Tudo fica salvo na nuvem: repositório GitHub `mudder006-cell/jogo-faccoes` (público).

## Setor Jogo (agentes)
Chefe `chefe-jogo` + fichas em `agentes/equipes-renan/skills/chefe-jogo/`. Pacote para instalar no PC: `agentes/PACOTE-SETOR-JOGO.md`. Sincronia com o Renan OS: `agentes/PONTE.md` (o jogo propõe na caixa de saída, o PC instala).

## Design
Todas as decisões e números estão em `design.md` (protótipo 17, 18/11/2026).

## Pendências
- [x] Setor Jogo instalado no plugin equipes-renan 0.5.1 (conferido em 24/11/2026).
- [ ] Plugin 0.5.2: alinhamento DEC-021 do chefe-jogo e agente `testador-ia-jogo` (ver `agentes/CAIXA-DE-SAIDA.md`).
- [x] IA rival completa (protótipo 18).
- [ ] Protótipo 19.2 (suprimentos) no ramo `prototipo-19-2`: aguarda o Renan jogar e autorizar juntar ao main.
- [ ] Protótipo 19.3 (governo que enfraquece e reage, exaustão de guerra, cessar-fogo, coalizão) no ramo `prototipo-19-3`: feito, aguarda teste e revisão; números provisórios no design.md.
- [ ] Protótipo 19.3 (governo enfraquece e reage, exaustão, cessar-fogo, coalizão) no ramo `prototipo-19-3` (inclui o 19.2): aguarda o Renan jogar e autorizar juntar ao main.
- [ ] Decisões pendentes do Renan: rival zumbi (A: desmorona abaixo de 5 prédios com caixa negativo por 12 h, recomendado); proteção de 24 h da paz contra a coalizão; números das obras mais vantajosas.
- [ ] Próximos: 19.4 equipe de obras e obras vantajosas; 19.1 névoa de guerra (aguarda OK); comércio de armas e tratados; 20 marcas e ódio.
- [ ] Aberto: propostas ao jogador ainda altas com 6 rivais (até 18 em 96 h); testes lentos (economia, recrutamento) e teste_tela quebrado.
- [x] GitHub Pages ligado pelo Renan em 24/11/2026 (ramo main, pasta raiz). Link: https://mudder006-cell.github.io/jogo-faccoes/
- Demais pontos em aberto do jogo: ver "Em aberto" no design.md.

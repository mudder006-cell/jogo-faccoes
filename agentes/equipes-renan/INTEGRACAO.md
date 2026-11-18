## Linha para a tabela de equipes do `leitor` (seção 2, "Escolher a equipe")
| jogo, Salam Aleikum, facções, protótipo, regra do jogo, mapa, combate, IA rival | Jogo | `chefe-jogo` (lê `setor/Mapa — Jogo Salam Aleikum.md`) |

## Trecho para o `organograma.md` (depois de "Revisores")
## Jogo (Salam Aleikum, nome provisório)
- Chefe: skill `chefe-jogo` + `setor/Mapa — Jogo Salam Aleikum.md`. Criado a pedido do Renan em 2026-11-18.
- Base: GitHub `mudder006-cell/jogo-faccoes` (`design.md` = decisões; `MEMORIA.md` = regras e pendências).
- Executor: Leitor + agente geral Sonnet. Agente `jogo-*` só como vaga do RH.

| Equipe (ficha) | Subequipes | Situação |
|---|---|---|
| Game design | Mapa e território · Combate e soldados · Economia · Exército e logística · Diplomacia e IA rival | ficha (2026-11-18) |
| Código | Simulação · Montagem e publicação | ficha (2026-11-18) |
| Interface e visual | Visual 3D de blocos · Painéis, ícones e retratos · Tutorial e ajuda | ficha (2026-11-18) |
| Testes e balanço | Simulações em Node · Teste visual no navegador · Medições de balanço | ficha (2026-11-18) |

## Linha do Livro de Ocorrências
| 2026-11-18 | Jogo | criar Setor Jogo (pacote de integração) | Leitor · Opus | parcial | sessão na nuvem sem acesso à pasta Renan OS; instalação manual no PC |

## Como instalar (Claude Code no PC)
1. Copiar `agentes/equipes-renan/skills/chefe-jogo/` deste repositório para `08 — Desenvolvimento\Ferramentas\Agentes\equipes-renan\skills\chefe-jogo\`.
2. Pôr a linha acima na tabela do `skills\leitor\SKILL.md` e o trecho no `skills\leitor\organograma.md`.
3. Subir a versão em `.claude-plugin\plugin.json`, refazer o `equipes-renan.zip`.
4. Registrar no Livro de Ocorrências, no Histórico de Alterações e num Relatório de Etapa.

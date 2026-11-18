## Ponte: projeto do jogo → sistema de agentes do Renan
- O jogo é um projeto separado: roda em sessões na nuvem com este repositório (`mudder006-cell/jogo-faccoes`).
- O sistema de agentes mora no PC, na pasta Renan OS. Essa pasta é a **fonte oficial**.
- Mão única: o jogo **propõe**, o Renan OS **instala**. O jogo nunca grava direto no PC.

## O que a sessão do jogo faz
1. Muda as fichas e o chefe só em `agentes/equipes-renan/skills/chefe-jogo/`.
2. Acrescenta uma linha por mudança em `agentes/CAIXA-DE-SAIDA.md` (o que mudou, data, arquivo).
3. Acrescenta as linhas do Livro de Ocorrências em `agentes/LIVRO-PENDENTE.md`.
4. Commit e push no `main` (só arquivos de `agentes/`).

## O que a sessão do PC (pasta Renan OS) faz
1. Lê `agentes/CAIXA-DE-SAIDA.md` e `agentes/LIVRO-PENDENTE.md` deste repositório.
2. Copia `chefe-jogo/` para `08 — Desenvolvimento\Ferramentas\Agentes\equipes-renan\skills\chefe-jogo\`.
3. Passa as linhas pendentes para o Livro de Ocorrências; registra no Histórico de Alterações.
4. Sobe a versão em `.claude-plugin\plugin.json`, refaz o `equipes-renan.zip`.
5. Marca as linhas da caixa de saída como `instalado AAAA-MM-DD`.
Depois que o plugin é reenviado, a sessão do jogo na nuvem recebe a skill `chefe-jogo` atualizada.

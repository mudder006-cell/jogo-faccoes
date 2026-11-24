# Proposta: tirar a troca automática da skill `troca-de-chat` (Renan, 24/11/2026)

O Renan revogou a "regra permanente" de 2026-11-18 que mandava abrir a sessão nova sozinho. Para instalar no PC (plugin `equipes-renan` 0.5.2):

## 1. Em `skills/troca-de-chat/SKILL.md`, seção "Quando usar", trocar o primeiro item por:
- **Aba Code:** o hook `aviso-troca-de-chat` avisa acima de ~200 mil tokens. Termine só o passo em andamento, entregue o resumo num bloco pronto para copiar e proponha a troca em uma linha. **Nunca abra a sessão nova sozinho** (revogado pelo Renan em 2026-11-24).

## 2. Na seção "Como abrir o chat novo", trocar o item "Aba Code" por:
- **Aba Code (Claude Code):** entregue o resumo num bloco pronto para copiar e diga: "Abra uma sessão nova e cole o resumo". Use `mcp__ccd_session__start_session` só se o Renan pedir com essas palavras ("abre a sessão nova para mim").

## 3. Descrição da skill (frontmatter): trocar "e continua o trabalho num chat ou sessão nova" por "e entrega o resumo para o Renan abrir o chat novo".

## 4. Conferir o hook `aviso-troca-de-chat`: o texto do aviso não pode mandar abrir sessão sozinho.

## 5. Registrar a decisão no Histórico de Alterações (revoga a parte automática do DEC-017).

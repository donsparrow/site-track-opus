## Objetivo
Adicionar a ação "Visualizar" na lista de relatórios, abrindo a tela do relatório em modo somente leitura (campos bloqueados), ao lado de Editar e Excluir.

## Alterações — `src/pages/Relatorios.tsx`

1. **Estado de leitura**
   - Novo estado `readOnly` (boolean), ativado ao abrir via botão Visualizar e desativado ao abrir via Editar.
   - Reaproveitar `handleOpenRelatorio(r)` com um parâmetro opcional (`handleOpenRelatorio(r, { readOnly: true })`).

2. **Botão na tabela (coluna Ações)**
   - Ícone `Eye` (já importado) como primeiro botão, com `title="Visualizar"`, visível para todos que acessam a aba (inclusive perfis sem permissão de edição).

3. **Tela de edição em modo leitura**
   - Título passa a "Visualizar Relatório" quando `readOnly`.
   - Todos os inputs/textareas/selects recebem `disabled`/`readOnly`.
   - Ocultar botões de ação de escrita: Salvar, Consolidar, Assinar, Nova Revisão, e demais controles de edição.
   - Manter disponíveis: voltar para a lista, Gerar/Baixar PDF e o histórico de versões (somente leitura).

## Fora do escopo
- Sem mudanças em permissões no banco, PDFs ou lógica de consolidação.

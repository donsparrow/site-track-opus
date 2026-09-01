# Laudos Técnicos — Fase 1: Unificação + Vistoria Prévia

Prepara o módulo "Relatório Final" para virar "Laudos Técnicos", com dois tipos de laudo por obra (Entrega de Obra e Vistoria Prévia).

## O que muda para o usuário

- Menu lateral (desktop e mobile) passa a exibir "Laudos Técnicos"; o label nas permissões também.
- Na página, um novo seletor "Entrega de Obra / Vistoria Prévia" acima do seletor de obra.
- Cada obra pode ter um laudo de cada tipo; ao trocar o tipo, a página carrega o laudo correspondente.
- Sem laudo: mensagem "Esta obra ainda não possui laudo de {tipo}." e botão "Gerar Laudo".
- Em Vistoria Prévia, por ora, um único bloco "Registro Fotográfico" (grupos dinâmicos ficam para a Fase 2).

## Banco de dados

Migração:
- Trocar UNIQUE de `obra_id` por UNIQUE `(obra_id, tipo_relatorio)` em `relatorios_finais`.
- Remover o CHECK de `tipo` em `relatorio_final_fotos` (texto livre, para nomes de ambientes).
- Adicionar `secoes_extras JSONB NOT NULL DEFAULT '[]'` em `relatorios_finais`.

Depois: regenerar os types do backend.

## Alterações técnicas

- `types.ts`: adicionar `TipoRelatorio` ('entrega_obra' | 'vistoria_previa') e `SecaoExtra`. `TipoFoto` passa a ser alias de `string` (mantido para não quebrar `FotosManager.tsx` e as mutations, que só serão refatorados na Fase 2).
- `queryKeys.ts`: chaves namespaceadas; `relatorio(obraId, tipo)` inclui o tipo.
- `useRelatorioFinal.ts`: `useRelatorioFinal(obraId, tipoRelatorio = 'entrega_obra')` filtra por `tipo_relatorio`.
- `useRelatorioFinalMutations.ts`: recebe `tipoRelatorio` e usa nas invalidações.
- `RelatorioFinal.tsx`: estado `tipoRelatorio`, seletor no header, título/subtítulo dinâmicos, insert com `tipo_relatorio`, invalidação com o tipo, e renderização condicional das fotos (pré/pós para entrega; bloco único `registro` para vistoria).
- `RelatorioFinalViewer.tsx`: apenas acrescentar a prop opcional `tipoRelatorio` (nenhuma outra mudança), para o Viewer do síndico poder adaptar o layout na Fase 2.
- `usePermissions.ts`: apenas o label `relatorio_final: 'Laudos Técnicos'` (chave do módulo inalterada).

Não serão tocados: `src/features/relatorios/`, `src/lib/pdfRelatorio.ts`, `src/lib/pdfShared.ts`, `src/lib/pdfRelatorioFinal.ts`, `RelatorioFinalEditor.tsx`, `FotosManager.tsx`, `AssinaturasCard.tsx`.

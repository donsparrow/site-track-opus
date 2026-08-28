# Relatório Final: Template de Capa (Canva) no PDF

## Situação atual (verificada)

- O lag da legenda **já foi corrigido**: `FotosManager.tsx` já possui o sub-componente `FotoLegendaInput` com estado local e salvamento no `onBlur`. Nada a fazer no item 2.
- A capa atual do PDF é 100% programática (barra azul, logo, foto, faixa de dados) e o rodapé já é aplicado somente a partir da página 2.
- Não existe coluna `template_capa_url` em `relatorios_finais`.

## O que será feito

### 1. Banco de dados
Nova migração adicionando `template_capa_url TEXT` em `public.relatorios_finais` (coluna opcional, sem alteração de políticas RLS existentes). Types do backend regenerados em seguida.

### 2. Upload do template na tela do Relatório Final
Em `RelatorioFinalEditor.tsx`, acima do bloco "Foto de capa", nova seção **"Template da Capa"**:
- Miniatura do template atual (URL assinada), ou área vazia indicativa.
- Botão "Enviar template" (PNG/JPG) e botão de remover (X).
- Texto auxiliar: "Imagem de fundo da capa do PDF. Recomendado: PNG 1414x2000px (A4)."

Em `useRelatorioFinalMutations.ts`: mutations `uploadTemplateCapa` (upload para `anexos/relatorio-final/{obra_id}/...` e gravação do path) e `removerTemplateCapa` (limpa o campo e apaga o arquivo do storage).

### 3. Reaproveitamento automático do template
Em `RelatorioFinal.tsx`, ao criar um novo relatório final, buscar o template mais recente já cadastrado em outro relatório da mesma empresa e copiá-lo para o novo registro — assim o template não precisa ser reenviado a cada obra.

### 4. Capa do PDF (`pdfRelatorioFinal.ts`)
Substituição do bloco da capa:
- **Com template**: imagem aplicada como fundo A4 inteiro; sobre ela, título "RELATÓRIO DE VISTORIA PÓS-OBRA" centralizado no topo, foto de capa proporcional dentro da área do chevron (x 13mm, y 48mm, 120x94mm) e, abaixo, cliente + endereço, data de emissão e data da vistoria, exatamente nas coordenadas do prompt.
- **Sem template**: mantém uma capa programática de fallback (barra azul, logo, título, foto e lista de dados).
- Rodapé padrão: pulado na página 1 quando houver template; quando não houver, a página 1 também recebe rodapé. Flag `hasTemplate` no escopo da função.

## Restrições respeitadas
Nenhum arquivo fora da lista será alterado; `src/lib/pdfShared.ts` permanece intacto.

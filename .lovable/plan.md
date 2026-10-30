# Paralisação = dia do próprio diário

Each diário can have at most one stoppage, always dated on the diário's own day. Users no longer type a date range.

## Changes (only these 3 files)

1. **DiarioDetalhe.tsx**: pass `dataDiario={diario.data}` to `<ParalisacoesTab>`. Nothing else changes.
2. **ParalisacoesTab.tsx**
   - New prop `dataDiario` (YYYY-MM-DD). Remove the Início/Fim fields and `datasValidas`.
   - Quick reason buttons: Chuva, Aguardando condomínio, Falta de material (each fills in the reason, which can still be edited), and Outro (clears the field and puts the cursor in it). Reason is required, with OK / Cancelar buttons.
   - Helper text under the title: a weekday shows "Paralisação referente a dd/mm/aaaa. Este dia será descontado do prazo da obra." A weekend shows "dd/mm/aaaa não é dia útil — a paralisação fica registrada, mas não altera o prazo."
   - The "Adicionar" button is hidden once one stoppage exists.
   - Table columns: Motivo, Data, and actions. An old record with a range shows "dd/mm/aaaa a dd/mm/aaaa".
   - Editing changes the reason only. canEdit / canEditDelete stay as they are.
3. **useDiarioMutations.ts** (only adicionarParalisacao and atualizarParalisacao)
   - Add `{ motivo, data }` → data_inicio = data_fim = data, total_dias = calcBusinessDays(data, data).
   - Update `{ id, motivo }` → changes only motivo.

## Not touched
No migrations, no changes to existing records, relatorioDados, cronograma, relatorios, dias.ts, diario/utils.ts, other mutations, or other tabs.

## Checks
- Weekday diário: total_dias = 1 and Adicionar disappears.
- Saturday diário: total_dias = 0 and the warning appears.
- Editing changes only the reason.
- Deleting brings Adicionar back.

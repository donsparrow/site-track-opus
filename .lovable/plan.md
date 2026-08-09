# Paralisações em dias úteis

Hoje `totalDiasParalisacao` conta dias corridos e é exclusiva no fim (paralisação de 1 dia grava 0). Passa a contar **dias úteis (seg–sex), inclusivo nas duas pontas**, no app e no banco.

## 1. Novo `src/lib/dias.ts`

- `calcBusinessDays(inicio, fim)` — implementação movida de `src/lib/relatorioDados.ts`, com guardas: retorna 0 se alguma data for vazia/inválida ou se `fim < inicio`.
- Em `relatorioDados.ts`: remover a definição local, `import { calcBusinessDays } from './dias'` e reexportar (`export { calcBusinessDays }`) para não quebrar imports existentes.
- Em `src/pages/Obras.tsx`: apagar a cópia local da função (linha 18) e importar de `@/lib/dias`. As implementações são idênticas hoje, então não há mudança de comportamento — é eliminação de duplicação, garantindo que `prazo_contratual_dias` (linha 109) e `total_dias` usem a MESMA função (importante quando entrarem feriados). Ao final, `calcBusinessDays` tem uma única implementação no sistema, em `src/lib/dias.ts`.

## 2. `src/features/diario/utils.ts`

`totalDiasParalisacao` delega para `calcBusinessDays`; mantém retorno 0 quando não há `data_fim`.

## 3. Migration

- `public.dias_uteis_entre(date, date)` — IMMUTABLE, `generate_series` + `extract(isodow) < 6`, `SET search_path = ''`, `REVOKE` de `public`/`anon`, `GRANT EXECUTE` para `authenticated`.
- Trigger `BEFORE INSERT OR UPDATE OF data_inicio, data_fim` em `diario_paralisacoes` definindo sempre `NEW.total_dias` (0 quando `data_fim` nula).
- Backfill: `UPDATE` de todos os registros com `data_fim NOT NULL`.

## 4. Rótulos

- `src/lib/pdfRelatorio.ts`: head `'Dias'` → `'Dias Úteis'`; foot `${total} dias` → `${total} dias úteis`; nota em itálico passa a dizer "dias úteis de paralisação".
- `src/features/relatorios/components/RegistrosTab.tsx`: coluna "Dias" → "Dias Úteis" (card "Dias Parados" mantém o texto atual).
- `src/features/diario/components/ParalisacoesTab.tsx`: coluna "Dias" → "Dias Úteis".

## 5. Formulário inline de paralisação

Em `ParalisacoesTab.tsx`, quando início e fim estiverem preenchidos, exibir o total calculado em tempo real (`calcBusinessDays`) ao lado dos campos.

## Fora de escopo

Nenhuma alteração em `prazoAjustado`/`saldo` de `relatorioDados.ts` — ambos derivam de `total_dias` e se corrigem sozinhos após o backfill.

ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS progresso_fisico integer,
  ADD COLUMN IF NOT EXISTS prazo_consumido integer,
  ADD COLUMN IF NOT EXISTS desvio integer,
  ADD COLUMN IF NOT EXISTS status_obra text,
  ADD COLUMN IF NOT EXISTS dias_trabalhados_snapshot integer,
  ADD COLUMN IF NOT EXISTS dias_parados_snapshot integer,
  ADD COLUMN IF NOT EXISTS diarios_registrados integer,
  ADD COLUMN IF NOT EXISTS indicadores_congelados_em timestamptz;

WITH snap AS (
  SELECT DISTINCT ON (v.relatorio_id)
    v.relatorio_id,
    v.data_criacao,
    (v.snapshot_dados->'prazos'->>'percentualExecutado')::int AS pexec,
    (v.snapshot_dados->'prazos'->>'percentualTempo')::int     AS ptempo,
    (v.snapshot_dados->'prazos'->>'trabalhados')::int         AS trab,
    (v.snapshot_dados->'prazos'->>'parados')::int             AS parados,
    (v.snapshot_dados->>'diarios_count')::int                 AS diarios
  FROM public.relatorio_versoes v
  WHERE v.snapshot_dados IS NOT NULL
    AND v.snapshot_dados->'prazos'->>'percentualExecutado' IS NOT NULL
  ORDER BY v.relatorio_id, v.numero_versao DESC
)
UPDATE public.relatorios r
SET progresso_fisico = s.pexec,
    prazo_consumido = s.ptempo,
    desvio = s.pexec - s.ptempo,
    status_obra = CASE
      WHEN (s.pexec - s.ptempo) > 5 THEN 'Adiantada'
      WHEN (s.pexec - s.ptempo) >= -5 THEN 'Em Dia'
      ELSE 'Atrasada'
    END,
    dias_trabalhados_snapshot = s.trab,
    dias_parados_snapshot = s.parados,
    diarios_registrados = s.diarios,
    indicadores_congelados_em = s.data_criacao
FROM snap s
WHERE r.id = s.relatorio_id;
CREATE TABLE public.rollback_cronograma_backfill_20260809 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cronograma_atividade_id uuid NOT NULL,
  nome_atividade text,
  obra_id uuid,
  percentual_concluido_antes integer,
  status_antes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rollback_cronograma_backfill_20260809 TO service_role;
ALTER TABLE public.rollback_cronograma_backfill_20260809 ENABLE ROW LEVEL SECURITY;
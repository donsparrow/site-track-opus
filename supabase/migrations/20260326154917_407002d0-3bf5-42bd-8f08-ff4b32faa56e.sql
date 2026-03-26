
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS prazo_contratual_dias integer DEFAULT 0;

ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS revisao_pdf integer DEFAULT 0;

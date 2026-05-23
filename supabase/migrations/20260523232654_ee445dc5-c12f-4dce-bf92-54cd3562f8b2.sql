
ALTER TABLE public.cronograma_atividades ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.diario_atividades ADD COLUMN IF NOT EXISTS cronograma_atividade_id UUID REFERENCES public.cronograma_atividades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_diario_atividades_cronograma_atividade ON public.diario_atividades(cronograma_atividade_id);

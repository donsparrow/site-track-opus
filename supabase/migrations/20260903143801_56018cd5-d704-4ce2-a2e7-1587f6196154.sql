ALTER TABLE public.funcionario_lancamentos
  ADD COLUMN IF NOT EXISTS lancamento_origem_id uuid REFERENCES public.funcionario_lancamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_funcionario_lancamentos_origem
  ON public.funcionario_lancamentos(lancamento_origem_id);
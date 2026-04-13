ALTER TABLE public.diario_obra 
ADD COLUMN relatorio_id uuid REFERENCES public.relatorios(id) ON DELETE SET NULL;
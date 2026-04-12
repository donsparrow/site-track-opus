
-- Remove duplicate trigger causing double expenses
DROP TRIGGER IF EXISTS trg_auto_despesa_manutencao ON public.manutencao_ferramentas;

-- Also remove duplicate updated_at trigger
DROP TRIGGER IF EXISTS trg_updated_at_manutencao_ferramentas ON public.manutencao_ferramentas;

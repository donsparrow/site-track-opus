
-- Add manutencao_id to despesas
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS manutencao_id uuid REFERENCES public.manutencao_ferramentas(id) ON DELETE SET NULL;

-- Add despesa_id to manutencao_ferramentas  
ALTER TABLE public.manutencao_ferramentas ADD COLUMN IF NOT EXISTS despesa_id uuid;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_despesas_manutencao_id ON public.despesas(manutencao_id);

-- Recreate the trigger function with bidirectional linking
CREATE OR REPLACE FUNCTION public.auto_despesa_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _despesa_id uuid;
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, forma_pagamento, empresa_id, manutencao_id)
    VALUES (NEW.obra_id, 'manutencao', 'Manutenção - ' || NEW.descricao, NEW.valor, NEW.data, NEW.forma_pagamento, NEW.empresa_id, NEW.id)
    RETURNING id INTO _despesa_id;

    -- Store the despesa_id back on the manutencao record
    UPDATE public.manutencao_ferramentas SET despesa_id = _despesa_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger (only one!)
DROP TRIGGER IF EXISTS auto_despesa_on_manutencao ON public.manutencao_ferramentas;
CREATE TRIGGER auto_despesa_on_manutencao
  AFTER INSERT ON public.manutencao_ferramentas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_despesa_manutencao();

CREATE UNIQUE INDEX IF NOT EXISTS ux_despesas_manutencao_id
ON public.despesas (manutencao_id)
WHERE manutencao_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_manutencao_ferramentas_despesa_id
ON public.manutencao_ferramentas (despesa_id)
WHERE despesa_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manutencao_ferramentas_despesa_id_fkey'
      AND conrelid = 'public.manutencao_ferramentas'::regclass
  ) THEN
    ALTER TABLE public.manutencao_ferramentas
      ADD CONSTRAINT manutencao_ferramentas_despesa_id_fkey
      FOREIGN KEY (despesa_id)
      REFERENCES public.despesas(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.auto_despesa_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _despesa_id uuid;
  _descricao_despesa text;
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar manutenção: id não gerado.';
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar despesa da manutenção %: empresa_id ausente.', NEW.id;
  END IF;

  IF NEW.obra_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar despesa da manutenção %: obra_id ausente.', NEW.id;
  END IF;

  IF NEW.valor IS NULL OR NEW.valor <= 0 THEN
    RAISE EXCEPTION 'Falha ao criar despesa da manutenção %: valor inválido.', NEW.id;
  END IF;

  SELECT d.id
    INTO _despesa_id
  FROM public.despesas d
  WHERE d.manutencao_id = NEW.id
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF _despesa_id IS NOT NULL THEN
    UPDATE public.manutencao_ferramentas
    SET despesa_id = _despesa_id
    WHERE id = NEW.id
      AND (despesa_id IS NULL OR despesa_id IS DISTINCT FROM _despesa_id);

    RETURN NEW;
  END IF;

  _descricao_despesa := CASE
    WHEN NEW.descricao IS NULL OR btrim(NEW.descricao) = '' THEN 'Manutenção'
    WHEN NEW.descricao ILIKE 'Manutenção - %' THEN NEW.descricao
    ELSE 'Manutenção - ' || NEW.descricao
  END;

  INSERT INTO public.despesas (
    obra_id,
    tipo,
    descricao,
    valor,
    data,
    forma_pagamento,
    empresa_id,
    manutencao_id
  )
  VALUES (
    NEW.obra_id,
    'manutencao',
    _descricao_despesa,
    NEW.valor,
    NEW.data,
    NEW.forma_pagamento,
    NEW.empresa_id,
    NEW.id
  )
  RETURNING id INTO _despesa_id;

  IF _despesa_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar despesa vinculada à manutenção %.', NEW.id;
  END IF;

  UPDATE public.manutencao_ferramentas
  SET despesa_id = _despesa_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
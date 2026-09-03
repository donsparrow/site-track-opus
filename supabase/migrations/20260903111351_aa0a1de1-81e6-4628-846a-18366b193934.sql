CREATE OR REPLACE FUNCTION public.auto_despesa_fechamento_funcionario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _nome text;
  item jsonb;
  _obra_id uuid;
  _valor numeric;
BEGIN
  SELECT f.nome INTO _nome FROM public.funcionarios f WHERE f.id = NEW.funcionario_id;

  IF NEW.detalhamento_obras IS NULL OR jsonb_typeof(NEW.detalhamento_obras) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.detalhamento_obras)
  LOOP
    IF (item->>'obra_id') IS NULL OR btrim(item->>'obra_id') = '' THEN
      CONTINUE;
    END IF;

    _obra_id := (item->>'obra_id')::uuid;
    _valor := COALESCE((item->>'valor')::numeric, 0);

    IF _valor <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, empresa_id)
    VALUES (
      _obra_id,
      'mao_obra',
      'Mão de obra - ' || COALESCE(_nome, 'Funcionário') || ' - quinzena ' ||
        to_char(NEW.periodo_inicio, 'DD/MM/YYYY') || ' a ' || to_char(NEW.periodo_fim, 'DD/MM/YYYY'),
      _valor,
      NEW.periodo_fim,
      NEW.empresa_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_despesa_fechamento_funcionario ON public.funcionario_fechamentos;

CREATE TRIGGER trg_auto_despesa_fechamento_funcionario
AFTER INSERT ON public.funcionario_fechamentos
FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_fechamento_funcionario();
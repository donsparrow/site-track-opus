CREATE OR REPLACE FUNCTION public.validar_data_diario()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.data IS DISTINCT FROM OLD.data THEN
    IF NEW.data > hoje THEN
      RAISE EXCEPTION 'Não é permitido registrar diário com data futura.';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.relatorio_id IS NOT NULL THEN
      RAISE EXCEPTION 'Diário vinculado a relatório: a data não pode ser alterada.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_data_diario ON public.diario_obra;
CREATE TRIGGER trg_validar_data_diario BEFORE INSERT OR UPDATE ON public.diario_obra
FOR EACH ROW EXECUTE FUNCTION public.validar_data_diario();

CREATE OR REPLACE FUNCTION public.validar_datas_paralisacao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
     OR NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
    IF NEW.data_inicio > hoje OR (NEW.data_fim IS NOT NULL AND NEW.data_fim > hoje) THEN
      RAISE EXCEPTION 'Não é permitido registrar paralisação com data futura.';
    END IF;
    IF NEW.data_fim IS NOT NULL AND NEW.data_fim < NEW.data_inicio THEN
      RAISE EXCEPTION 'A data final da paralisação não pode ser anterior à inicial.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_datas_paralisacao ON public.diario_paralisacoes;
CREATE TRIGGER trg_validar_datas_paralisacao BEFORE INSERT OR UPDATE ON public.diario_paralisacoes
FOR EACH ROW EXECUTE FUNCTION public.validar_datas_paralisacao();
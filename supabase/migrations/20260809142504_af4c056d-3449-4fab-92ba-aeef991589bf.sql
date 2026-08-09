CREATE OR REPLACE FUNCTION public.dias_uteis_entre(_inicio date, _fim date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _inicio IS NULL OR _fim IS NULL OR _fim < _inicio THEN 0
    ELSE (
      SELECT COUNT(*)::int
      FROM generate_series(_inicio, _fim, interval '1 day') AS d
      WHERE extract(isodow FROM d) < 6
    )
  END
$$;

REVOKE ALL ON FUNCTION public.dias_uteis_entre(date, date) FROM public;
REVOKE ALL ON FUNCTION public.dias_uteis_entre(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.dias_uteis_entre(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dias_uteis_entre(date, date) TO service_role;

CREATE OR REPLACE FUNCTION public.set_total_dias_paralisacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.total_dias := public.dias_uteis_entre(NEW.data_inicio, NEW.data_fim);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_total_dias_paralisacao ON public.diario_paralisacoes;
CREATE TRIGGER trg_set_total_dias_paralisacao
BEFORE INSERT OR UPDATE OF data_inicio, data_fim ON public.diario_paralisacoes
FOR EACH ROW EXECUTE FUNCTION public.set_total_dias_paralisacao();

UPDATE public.diario_paralisacoes
SET total_dias = public.dias_uteis_entre(data_inicio, data_fim)
WHERE data_fim IS NOT NULL;
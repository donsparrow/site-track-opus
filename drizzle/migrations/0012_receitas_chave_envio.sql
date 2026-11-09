ALTER TABLE public.receitas ADD COLUMN chave_envio uuid NULL;
CREATE UNIQUE INDEX receitas_chave_envio_key ON public.receitas (chave_envio) WHERE chave_envio IS NOT NULL;

DROP FUNCTION public.criar_receita_com_parcelas(uuid, text, numeric, text, text, jsonb);

CREATE FUNCTION public.criar_receita_com_parcelas(_obra_id uuid, _descricao text, _valor_total numeric, _forma_pagamento text, _observacoes text, _parcelas jsonb, _chave_envio uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _id uuid; _empresa uuid; _n int; _soma numeric; item jsonb; i int := 0;
BEGIN
  IF _chave_envio IS NOT NULL THEN
    SELECT id INTO _id FROM public.receitas WHERE chave_envio = _chave_envio;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
  END IF;
  IF _parcelas IS NULL OR jsonb_typeof(_parcelas) <> 'array' OR jsonb_array_length(_parcelas) < 1 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela.';
  END IF;
  _n := jsonb_array_length(_parcelas);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_parcelas) e
             WHERE coalesce((e->>'valor')::numeric, 0) <= 0 OR (e->>'data_vencimento') IS NULL) THEN
    RAISE EXCEPTION 'Cada parcela precisa de valor maior que zero e data de vencimento.';
  END IF;
  SELECT sum((e->>'valor')::numeric) INTO _soma FROM jsonb_array_elements(_parcelas) e;
  IF abs(_soma - _valor_total) > 0.005 THEN
    RAISE EXCEPTION 'A soma das parcelas (R$ %) é diferente do valor total (R$ %).', round(_soma, 2), round(_valor_total, 2);
  END IF;
  PERFORM set_config('app.parcelas_manuais', 'on', true);
  BEGIN
    INSERT INTO public.receitas (obra_id, descricao, valor_total, forma_pagamento, numero_parcelas, observacoes, chave_envio)
    VALUES (_obra_id, _descricao, _valor_total, _forma_pagamento, _n, _observacoes, _chave_envio)
    RETURNING id, empresa_id INTO _id, _empresa;
  EXCEPTION WHEN unique_violation THEN
    IF _chave_envio IS NULL THEN RAISE; END IF;
    SELECT id INTO _id FROM public.receitas WHERE chave_envio = _chave_envio;
    PERFORM set_config('app.parcelas_manuais', 'off', true);
    RETURN _id;
  END;
  FOR item IN SELECT * FROM jsonb_array_elements(_parcelas) LOOP
    i := i + 1;
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
    VALUES (_id, i, (item->>'valor')::numeric, (item->>'data_vencimento')::date, _empresa);
  END LOOP;
  PERFORM set_config('app.parcelas_manuais', 'off', true);
  RETURN _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_receita_com_parcelas(uuid, text, numeric, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_receita_com_parcelas(uuid, text, numeric, text, text, jsonb, uuid) TO authenticated, service_role;
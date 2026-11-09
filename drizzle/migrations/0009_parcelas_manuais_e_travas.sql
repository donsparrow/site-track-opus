CREATE OR REPLACE FUNCTION public.auto_generate_parcelas()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  i INTEGER; parcela_valor NUMERIC(12,2); vencimento DATE; existing_count INTEGER;
BEGIN
  IF current_setting('app.parcelas_manuais', true) = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO existing_count FROM public.parcelas WHERE receita_id = NEW.id;
  IF existing_count > 0 THEN RETURN NEW; END IF;
  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 1 THEN
    parcela_valor := ROUND(NEW.valor_total / NEW.numero_parcelas, 2);
    FOR i IN 1..NEW.numero_parcelas LOOP
      vencimento := CURRENT_DATE + (i * 30);
      INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
      VALUES (NEW.id, i,
        CASE WHEN i = NEW.numero_parcelas THEN NEW.valor_total - parcela_valor * (NEW.numero_parcelas - 1) ELSE parcela_valor END,
        vencimento, NEW.empresa_id);
    END LOOP;
  ELSE
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
    VALUES (NEW.id, 1, NEW.valor_total, CURRENT_DATE + 30, NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_receita_com_parcelas(_obra_id uuid, _descricao text, _valor_total numeric, _forma_pagamento text, _observacoes text, _parcelas jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE _id uuid; _empresa uuid; _n int; _soma numeric; item jsonb; i int := 0;
BEGIN
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
  INSERT INTO public.receitas (obra_id, descricao, valor_total, forma_pagamento, numero_parcelas, observacoes)
  VALUES (_obra_id, _descricao, _valor_total, _forma_pagamento, _n, _observacoes)
  RETURNING id, empresa_id INTO _id, _empresa;
  FOR item IN SELECT * FROM jsonb_array_elements(_parcelas) LOOP
    i := i + 1;
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
    VALUES (_id, i, (item->>'valor')::numeric, (item->>'data_vencimento')::date, _empresa);
  END LOOP;
  PERFORM set_config('app.parcelas_manuais', 'off', true);
  RETURN _id;
END;
$function$;
REVOKE ALL ON FUNCTION public.criar_receita_com_parcelas(uuid, text, numeric, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_receita_com_parcelas(uuid, text, numeric, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_soma_parcelas()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
DECLARE _total numeric; _soma numeric;
BEGIN
  SELECT valor_total INTO _total FROM public.receitas WHERE id = NEW.receita_id;
  SELECT coalesce(sum(valor), 0) INTO _soma FROM public.parcelas WHERE receita_id = NEW.receita_id;
  IF _total IS NOT NULL AND _soma > _total + 0.005 THEN
    RAISE EXCEPTION 'A soma das parcelas (R$ %) ultrapassa o valor total da receita (R$ %).',
      to_char(_soma, 'FM999G999G990D00'), to_char(_total, 'FM999G999G990D00');
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_validar_soma_parcelas AFTER INSERT OR UPDATE OF valor, receita_id ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.validar_soma_parcelas();

CREATE OR REPLACE FUNCTION public.validar_valor_total_receita()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
DECLARE _soma numeric;
BEGIN
  SELECT coalesce(sum(valor), 0) INTO _soma FROM public.parcelas WHERE receita_id = NEW.id;
  IF NEW.valor_total < _soma - 0.005 THEN
    RAISE EXCEPTION 'O valor total não pode ser menor que a soma das parcelas já lançadas (R$ %).',
      to_char(_soma, 'FM999G999G990D00');
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_validar_valor_total_receita BEFORE UPDATE OF valor_total ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.validar_valor_total_receita();

CREATE OR REPLACE FUNCTION public.auto_generate_parcelas()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  i INTEGER;
  parcela_valor NUMERIC(12,2);
  vencimento DATE;
  existing_count INTEGER;
BEGIN
  -- Check if parcelas already exist for this receita (prevent duplicates)
  SELECT COUNT(*) INTO existing_count FROM public.parcelas WHERE receita_id = NEW.id;
  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 1 THEN
    parcela_valor := ROUND(NEW.valor_total / NEW.numero_parcelas, 2);
    FOR i IN 1..NEW.numero_parcelas LOOP
      vencimento := CURRENT_DATE + (i * 30);
      INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
      VALUES (NEW.id, i, parcela_valor, vencimento, NEW.empresa_id);
    END LOOP;
  ELSE
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
    VALUES (NEW.id, 1, NEW.valor_total, CURRENT_DATE + 30, NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$function$;

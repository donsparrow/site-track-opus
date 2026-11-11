ALTER TABLE public.relatorios_finais ADD COLUMN IF NOT EXISTS data_emissao date;

ALTER POLICY "Externo view relatorios_finais" ON public.relatorios_finais
USING ((public.has_role(auth.uid(), 'sindico'::public.app_role) OR public.has_role(auth.uid(), 'cliente'::public.app_role)) AND public.can_access_obra(obra_id) AND assinatura_empresa_url IS NOT NULL);
ALTER POLICY "Externo assina relatorios_finais" ON public.relatorios_finais
USING ((public.has_role(auth.uid(), 'sindico'::public.app_role) OR public.has_role(auth.uid(), 'cliente'::public.app_role)) AND public.can_access_obra(obra_id) AND assinatura_empresa_url IS NOT NULL)
WITH CHECK ((public.has_role(auth.uid(), 'sindico'::public.app_role) OR public.has_role(auth.uid(), 'cliente'::public.app_role)) AND public.can_access_obra(obra_id) AND assinatura_empresa_url IS NOT NULL);
ALTER POLICY "Externo view relatorio_final_fotos" ON public.relatorio_final_fotos
USING ((public.has_role(auth.uid(), 'sindico'::public.app_role) OR public.has_role(auth.uid(), 'cliente'::public.app_role)) AND relatorio_id IN (SELECT rf.id FROM public.relatorios_finais rf WHERE public.can_access_obra(rf.obra_id) AND rf.assinatura_empresa_url IS NOT NULL));

CREATE OR REPLACE FUNCTION public.guard_relatorio_final_sindico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW := jsonb_populate_record(NEW, to_jsonb(OLD) - ARRAY['assinatura_sindico_url','assinatura_sindico_nome','assinatura_sindico_cargo','assinatura_sindico_data']);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_relatorio_final_assinado()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'assinado' AND (to_jsonb(NEW) - ARRAY['updated_at','status']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at','status']) THEN
    RAISE EXCEPTION 'Laudo assinado: alterações bloqueadas.';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_00_lock_relatorio_final_assinado BEFORE UPDATE ON public.relatorios_finais FOR EACH ROW EXECUTE FUNCTION public.lock_relatorio_final_assinado();

CREATE OR REPLACE FUNCTION public.lock_relatorio_final_fotos_assinado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _status text;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT status INTO _status FROM public.relatorios_finais WHERE id = OLD.relatorio_id FOR UPDATE;
    IF _status = 'assinado' THEN
      RAISE EXCEPTION 'Laudo assinado: fotos bloqueadas.';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT status INTO _status FROM public.relatorios_finais WHERE id = NEW.relatorio_id FOR UPDATE;
    IF _status = 'assinado' THEN
      RAISE EXCEPTION 'Laudo assinado: fotos bloqueadas.';
    END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$function$;
CREATE TRIGGER trg_00_lock_relatorio_final_fotos_assinado BEFORE INSERT OR UPDATE OR DELETE ON public.relatorio_final_fotos FOR EACH ROW EXECUTE FUNCTION public.lock_relatorio_final_fotos_assinado();

CREATE OR REPLACE FUNCTION public.set_data_emissao_relatorio_final()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.assinatura_empresa_url IS NULL AND NEW.assinatura_empresa_url IS NOT NULL THEN
    NEW.data_emissao := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  ELSIF NEW.assinatura_empresa_url IS NULL THEN
    NEW.data_emissao := NULL;
  ELSE
    NEW.data_emissao := OLD.data_emissao;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER trg_set_data_emissao_relatorio_final BEFORE UPDATE ON public.relatorios_finais FOR EACH ROW EXECUTE FUNCTION public.set_data_emissao_relatorio_final();
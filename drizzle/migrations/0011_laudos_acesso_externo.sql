DROP POLICY IF EXISTS "Sindico view own relatorios_finais" ON public.relatorios_finais;
DROP POLICY IF EXISTS "Sindico assina relatorios_finais" ON public.relatorios_finais;
CREATE POLICY "Externo view relatorios_finais" ON public.relatorios_finais FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(),'sindico') OR public.has_role(auth.uid(),'cliente')) AND public.can_access_obra(obra_id));
CREATE POLICY "Externo assina relatorios_finais" ON public.relatorios_finais FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'sindico') OR public.has_role(auth.uid(),'cliente')) AND public.can_access_obra(obra_id))
  WITH CHECK ((public.has_role(auth.uid(),'sindico') OR public.has_role(auth.uid(),'cliente')) AND public.can_access_obra(obra_id));

DROP POLICY IF EXISTS "Sindico view relatorio_final_fotos" ON public.relatorio_final_fotos;
CREATE POLICY "Externo view relatorio_final_fotos" ON public.relatorio_final_fotos FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(),'sindico') OR public.has_role(auth.uid(),'cliente'))
    AND relatorio_id IN (SELECT id FROM public.relatorios_finais WHERE public.can_access_obra(obra_id)));

CREATE OR REPLACE FUNCTION public.guard_relatorio_final_sindico()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _permitidas text[] := ARRAY['assinatura_sindico_url','assinatura_sindico_nome','assinatura_sindico_cargo','assinatura_sindico_data','status','updated_at'];
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'cliente') THEN
    IF (to_jsonb(NEW) - _permitidas) IS DISTINCT FROM (to_jsonb(OLD) - _permitidas) THEN
      RAISE EXCEPTION 'Você só pode assinar o laudo; os demais campos não podem ser alterados.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_default_permissions(_user_id uuid, _role text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes','ferramentas','relatorio_final','funcionarios'];
  m text;
BEGIN
  DELETE FROM public.permissoes_usuario WHERE user_id = _user_id;
  FOREACH m IN ARRAY modules LOOP
    IF _role IN ('super_admin', 'admin') THEN
      INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
      VALUES (_user_id, m, true, true, true, true);
    ELSIF _role = 'trabalhador' THEN
      IF m IN ('diario_obra', 'ferramentas') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, true, false, false);
      ELSIF m IN ('dashboard', 'cronograma', 'documentos', 'relatorios') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'sindico' THEN
      IF m IN ('diario_obra', 'cronograma', 'documentos', 'relatorios', 'dashboard', 'relatorio_final') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'cliente' THEN
      IF m IN ('cronograma', 'diario_obra', 'documentos', 'relatorios', 'dashboard', 'relatorio_final') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_default_permissions(_user_id uuid, _role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes','ferramentas'];
  m text;
BEGIN
  DELETE FROM public.permissoes_usuario WHERE user_id = _user_id;

  FOREACH m IN ARRAY modules LOOP
    IF _role IN ('super_admin', 'admin') THEN
      INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
      VALUES (_user_id, m, true, true, true, true);
    ELSIF _role = 'trabalhador' THEN
      IF m = 'diario_obra' THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, true, false, false);
      ELSIF m = 'ferramentas' THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, true, false, false);
      ELSIF m IN ('dashboard', 'cronograma', 'documentos', 'relatorios') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSIF m IN ('financeiro', 'usuarios', 'configuracoes', 'clientes') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'sindico' THEN
      IF m IN ('diario_obra', 'cronograma', 'documentos', 'relatorios', 'dashboard') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'cliente' THEN
      IF m IN ('cronograma', 'diario_obra', 'documentos', 'relatorios', 'dashboard') THEN
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

-- Also update create_empresa_and_link to include ferramentas
CREATE OR REPLACE FUNCTION public.create_empresa_and_link(_nome text, _cnpj text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _empresa_id uuid;
  _uid uuid;
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes','ferramentas'];
  m text;
BEGIN
  _uid := auth.uid();

  INSERT INTO public.empresas (nome, cnpj)
  VALUES (_nome, _cnpj)
  RETURNING id INTO _empresa_id;

  UPDATE public.profiles
  SET empresa_id = _empresa_id
  WHERE user_id = _uid;

  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id = _uid;

  DELETE FROM public.permissoes_usuario WHERE user_id = _uid;
  FOREACH m IN ARRAY modules LOOP
    INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
    VALUES (_uid, m, true, true, true, true);
  END LOOP;

  RETURN _empresa_id;
END;
$function$;

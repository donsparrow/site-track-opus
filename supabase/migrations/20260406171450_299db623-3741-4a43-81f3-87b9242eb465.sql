
CREATE OR REPLACE FUNCTION public.create_empresa_and_link(_nome text, _cnpj text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _empresa_id uuid;
  _uid uuid;
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes'];
  m text;
BEGIN
  _uid := auth.uid();

  INSERT INTO public.empresas (nome, cnpj)
  VALUES (_nome, _cnpj)
  RETURNING id INTO _empresa_id;

  UPDATE public.profiles
  SET empresa_id = _empresa_id
  WHERE user_id = _uid;

  -- Promote user to admin (Diretor)
  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id = _uid;

  -- Set full permissions for all modules
  DELETE FROM public.permissoes_usuario WHERE user_id = _uid;
  FOREACH m IN ARRAY modules LOOP
    INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
    VALUES (_uid, m, true, true, true, true);
  END LOOP;

  RETURN _empresa_id;
END;
$$;

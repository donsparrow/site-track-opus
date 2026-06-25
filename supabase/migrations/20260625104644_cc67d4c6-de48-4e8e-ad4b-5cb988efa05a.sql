
-- 1. create_empresa_and_link: guard against self-promotion
CREATE OR REPLACE FUNCTION public.create_empresa_and_link(_nome text, _cnpj text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _empresa_id uuid;
  _uid uuid;
  _existing_empresa uuid;
  _existing_role app_role;
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes','ferramentas'];
  m text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT empresa_id INTO _existing_empresa FROM public.profiles WHERE user_id = _uid;
  IF _existing_empresa IS NOT NULL THEN
    RAISE EXCEPTION 'Usuário já está vinculado a uma empresa';
  END IF;

  SELECT role INTO _existing_role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  IF _existing_role IS NOT NULL AND _existing_role NOT IN ('trabalhador') THEN
    RAISE EXCEPTION 'Usuário não autorizado a criar empresa';
  END IF;

  INSERT INTO public.empresas (nome, cnpj) VALUES (_nome, _cnpj) RETURNING id INTO _empresa_id;

  UPDATE public.profiles SET empresa_id = _empresa_id WHERE user_id = _uid;
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = _uid;

  DELETE FROM public.permissoes_usuario WHERE user_id = _uid;
  FOREACH m IN ARRAY modules LOOP
    INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
    VALUES (_uid, m, true, true, true, true);
  END LOOP;

  RETURN _empresa_id;
END;
$$;

-- 2. user_roles: scope admin management to same empresa
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin delete user_roles" ON public.user_roles;

CREATE POLICY "Admins manage empresa roles" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.empresa_id = public.get_user_empresa_id(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

-- 3. storage.objects anexos: scope SELECT to owner or same empresa
DROP POLICY IF EXISTS "Auth view anexos" ON storage.objects;

CREATE POLICY "Empresa view anexos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
  )
);

-- 4. Revoke EXECUTE from authenticated/public on SECURITY DEFINER helpers
-- not needed for direct client invocation (linter finding).
REVOKE EXECUTE ON FUNCTION public.set_default_permissions(uuid, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_empresa_id() FROM PUBLIC, authenticated, anon;

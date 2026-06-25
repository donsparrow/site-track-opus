
-- 1. DELETE policies
CREATE POLICY "Empresa delete compras_ferramentas" ON public.compras_ferramentas
FOR DELETE TO authenticated
USING ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'trabalhador'::app_role)) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa delete imagens" ON public.imagens
FOR DELETE TO authenticated
USING ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'trabalhador'::app_role)) AND empresa_id = get_user_empresa_id(auth.uid()));

-- 2. anexos storage bucket - tighten policies
DROP POLICY IF EXISTS "Anyone can view anexos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update anexos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload anexos" ON storage.objects;

CREATE POLICY "Auth view anexos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'anexos');

CREATE POLICY "Auth upload anexos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'anexos' AND owner = auth.uid());

CREATE POLICY "Owner update anexos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'anexos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'anexos' AND owner = auth.uid());

CREATE POLICY "Owner delete anexos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'anexos' AND owner = auth.uid());

-- 3. user_roles - prevent privilege escalation
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.can_access_obra(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_usuario_obra(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_empresa_and_link(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_default_permissions(uuid, text) FROM anon, public;

-- Trigger-only functions: revoke from authenticated too (only triggers/internal callers need them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_empresa_id() FROM anon, authenticated, public;

-- Allow super_admin to manage all user_roles
CREATE POLICY "Super admin manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to manage all profiles
CREATE POLICY "Super admin manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to manage all usuario_obras
CREATE POLICY "Super admin manage all usuario_obras"
ON public.usuario_obras
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to manage all permissoes_usuario
CREATE POLICY "Super admin manage all permissoes"
ON public.permissoes_usuario
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
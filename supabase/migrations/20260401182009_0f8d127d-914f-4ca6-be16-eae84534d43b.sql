CREATE POLICY "Admin delete profiles in empresa"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND empresa_id = get_user_empresa_id(auth.uid())
);

CREATE POLICY "Admin delete user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
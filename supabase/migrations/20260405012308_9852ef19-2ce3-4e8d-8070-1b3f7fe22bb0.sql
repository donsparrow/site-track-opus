CREATE UNIQUE INDEX IF NOT EXISTS usuario_obras_user_id_obra_id_uidx
ON public.usuario_obras (user_id, obra_id);

CREATE OR REPLACE FUNCTION public.can_access_obra(_obra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.usuario_obras uo
      WHERE uo.user_id = auth.uid()
        AND uo.obra_id = _obra_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_usuario_obra(_target_user_id uuid, _obra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'admin')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = _target_user_id
          AND p.empresa_id = public.get_user_empresa_id(auth.uid())
      )
      AND EXISTS (
        SELECT 1
        FROM public.obras o
        WHERE o.id = _obra_id
          AND o.empresa_id = public.get_user_empresa_id(auth.uid())
      )
    );
$$;

DROP POLICY IF EXISTS "Empresa view obras" ON public.obras;
DROP POLICY IF EXISTS "Super admin view all obras" ON public.obras;
CREATE POLICY "Users view linked obras only"
ON public.obras
FOR SELECT
TO authenticated
USING (public.can_access_obra(id));

DROP POLICY IF EXISTS "Admin manage usuario_obras" ON public.usuario_obras;
DROP POLICY IF EXISTS "Super admin manage all usuario_obras" ON public.usuario_obras;
CREATE POLICY "Admins manage usuario_obras in allowed scope"
ON public.usuario_obras
FOR ALL
TO authenticated
USING (public.can_manage_usuario_obra(user_id, obra_id))
WITH CHECK (public.can_manage_usuario_obra(user_id, obra_id));
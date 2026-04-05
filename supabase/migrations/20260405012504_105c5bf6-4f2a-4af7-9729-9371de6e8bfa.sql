CREATE OR REPLACE FUNCTION public.can_access_obra(_obra_id uuid)
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
        SELECT 1 FROM public.obras o
        WHERE o.id = _obra_id
          AND o.empresa_id = public.get_user_empresa_id(auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.usuario_obras uo
      WHERE uo.user_id = auth.uid()
        AND uo.obra_id = _obra_id
    );
$$;
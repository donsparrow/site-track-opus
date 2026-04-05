
DROP POLICY IF EXISTS "Empresa delete diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa delete diario_obra" ON public.diario_obra
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
    AND (empresa_id = get_user_empresa_id(auth.uid()))
  );

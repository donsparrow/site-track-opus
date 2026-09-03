CREATE OR REPLACE FUNCTION public.can_write_anexo(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH p AS (
    SELECT
      split_part(_name, '/', 1) AS prefix,
      split_part(_name, '/', 2) AS seg,
      split_part(_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AS seg_is_uuid,
      public.get_user_empresa_id(auth.uid()) AS empresa
  )
  SELECT
    auth.uid() IS NOT NULL
    AND _name NOT LIKE '%..%'
    AND (
      (p.prefix IN ('empresa', 'funcionarios')
        AND p.seg_is_uuid AND p.seg::uuid = p.empresa)
      OR (p.prefix IN ('documentos', 'relatorio-final')
        AND p.seg_is_uuid AND public.can_access_obra(p.seg::uuid))
      OR (p.prefix = 'diarios' AND p.seg_is_uuid AND EXISTS (
        SELECT 1 FROM public.diario_obra d
        WHERE d.id = p.seg::uuid AND public.can_access_obra(d.obra_id)))
      OR (p.prefix = 'assinaturas' AND p.seg_is_uuid AND EXISTS (
        SELECT 1 FROM public.relatorios r
        WHERE r.id = p.seg::uuid AND public.can_access_obra(r.obra_id)))
      OR (p.prefix IN ('receitas', 'despesas', 'financeiro', 'manutencao')
        AND public.is_operacional(auth.uid()))
    )
  FROM p
$$;

REVOKE ALL ON FUNCTION public.can_write_anexo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_anexo(text) TO authenticated;

DROP POLICY IF EXISTS "Auth upload anexos" ON storage.objects;
CREATE POLICY "Auth upload anexos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND owner = auth.uid()
  AND public.can_write_anexo(name)
);

DROP POLICY IF EXISTS "Owner update anexos" ON storage.objects;
CREATE POLICY "Owner update anexos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'anexos' AND owner = auth.uid())
WITH CHECK (
  bucket_id = 'anexos'
  AND owner = auth.uid()
  AND public.can_write_anexo(name)
);
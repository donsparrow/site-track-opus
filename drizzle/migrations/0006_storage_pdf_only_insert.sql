DROP POLICY IF EXISTS "relatorios-assinados insert" ON storage.objects;
CREATE POLICY "relatorios-assinados insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'relatorios-assinados'
  AND lower(storage.extension(name)) = 'pdf'
  AND public.is_operacional((select auth.uid()))
  AND (storage.foldername(name))[1] = public.get_user_empresa_id((select auth.uid()))::text
  AND EXISTS (SELECT 1 FROM public.relatorios r WHERE r.id::text = (storage.foldername(name))[2]
    AND r.empresa_id = public.get_user_empresa_id((select auth.uid())) AND r.status = 'assinado')
);
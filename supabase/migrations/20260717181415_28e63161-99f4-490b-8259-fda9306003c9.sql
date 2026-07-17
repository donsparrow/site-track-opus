
DROP POLICY IF EXISTS "Empresa view anexos" ON storage.objects;

CREATE POLICY "Empresa view anexos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (public.get_user_empresa_id(auth.uid()))::text
    OR public.get_user_empresa_id(owner) = public.get_user_empresa_id(auth.uid())
  )
);

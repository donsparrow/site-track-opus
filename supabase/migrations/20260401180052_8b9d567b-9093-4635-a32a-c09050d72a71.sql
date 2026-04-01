
DROP POLICY IF EXISTS "Admin insert empresa" ON public.empresas;

CREATE POLICY "Authenticated insert empresa"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

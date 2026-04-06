CREATE POLICY "Super admin delete any obra"
ON public.obras
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
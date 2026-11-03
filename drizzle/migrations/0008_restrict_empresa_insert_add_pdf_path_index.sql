CREATE INDEX IF NOT EXISTS idx_relatorio_pdfs_assinados_storage_path
ON public.relatorio_pdfs_assinados (storage_path);

DROP POLICY "Authenticated insert empresa" ON public.empresas;

CREATE POLICY "Super admin insert empresa"
ON public.empresas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
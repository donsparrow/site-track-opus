CREATE TABLE public.relatorio_pdfs_assinados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  versao_id uuid NULL REFERENCES public.relatorio_versoes(id) ON DELETE SET NULL,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  storage_path text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  tamanho_bytes integer NOT NULL CHECK (tamanho_bytes > 0),
  qtd_assinaturas integer NOT NULL DEFAULT 0,
  origem text NOT NULL CHECK (origem IN ('assinatura','arquivamento_posterior')),
  gerado_por uuid NOT NULL DEFAULT auth.uid(),
  gerado_em timestamptz NOT NULL DEFAULT now(),
  excluido_em timestamptz NULL,
  excluido_por uuid NULL
);
CREATE INDEX relatorio_pdfs_assinados_rel_idx ON public.relatorio_pdfs_assinados (relatorio_id, gerado_em DESC);

GRANT SELECT, INSERT ON public.relatorio_pdfs_assinados TO authenticated;
GRANT ALL ON public.relatorio_pdfs_assinados TO service_role;
ALTER TABLE public.relatorio_pdfs_assinados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver PDFs assinados" ON public.relatorio_pdfs_assinados
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.relatorios r WHERE r.id = relatorio_id AND (
    (r.empresa_id = public.get_user_empresa_id((select auth.uid())) AND public.is_operacional((select auth.uid())))
    OR (public.can_access_obra(r.obra_id) AND r.status = 'assinado')))
);

CREATE POLICY "Inserir PDFs assinados" ON public.relatorio_pdfs_assinados
FOR INSERT TO authenticated WITH CHECK (
  public.is_operacional((select auth.uid()))
  AND empresa_id = public.get_user_empresa_id((select auth.uid()))
  AND excluido_em IS NULL AND excluido_por IS NULL
  AND EXISTS (SELECT 1 FROM public.relatorios r WHERE r.id = relatorio_id
    AND r.empresa_id = public.get_user_empresa_id((select auth.uid())) AND r.status = 'assinado')
);

CREATE OR REPLACE FUNCTION public.excluir_pdf_assinado(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente administradores podem excluir PDFs arquivados';
  END IF;
  UPDATE public.relatorio_pdfs_assinados
     SET excluido_em = now(), excluido_por = auth.uid()
   WHERE id = _id AND excluido_em IS NULL
     AND empresa_id = public.get_user_empresa_id(auth.uid());
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN
    RAISE EXCEPTION 'PDF não encontrado ou já excluído';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.excluir_pdf_assinado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_pdf_assinado(uuid) TO authenticated;

CREATE POLICY "relatorios-assinados insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'relatorios-assinados'
  AND public.is_operacional((select auth.uid()))
  AND (storage.foldername(name))[1] = public.get_user_empresa_id((select auth.uid()))::text
  AND EXISTS (SELECT 1 FROM public.relatorios r WHERE r.id::text = (storage.foldername(name))[2]
    AND r.empresa_id = public.get_user_empresa_id((select auth.uid())) AND r.status = 'assinado')
);
CREATE POLICY "relatorios-assinados select" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'relatorios-assinados'
  AND EXISTS (SELECT 1 FROM public.relatorio_pdfs_assinados p WHERE p.storage_path = name)
);
CREATE POLICY "relatorios-assinados delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'relatorios-assinados'
  AND public.has_role((select auth.uid()), 'admin')
  AND (storage.foldername(name))[1] = public.get_user_empresa_id((select auth.uid()))::text
);
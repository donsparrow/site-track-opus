-- 1. Branding por empresa (apenas nome e logo)
CREATE OR REPLACE FUNCTION public.get_empresa_branding(_empresa_id uuid)
RETURNS TABLE(nome_empresa text, logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.nome_empresa, c.logo_url
  FROM public.configuracoes_empresa c
  WHERE c.empresa_id = _empresa_id
    AND (
      _empresa_id = public.get_user_empresa_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.usuario_obras uo
        JOIN public.obras o ON o.id = uo.obra_id
        WHERE uo.user_id = auth.uid() AND o.empresa_id = _empresa_id
      )
    )
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_empresa_branding(uuid) TO authenticated;

-- 2. Visibilidade de documentos para cliente/síndico
ALTER TABLE public.documentos_arquivos
  ADD COLUMN IF NOT EXISTS visivel_cliente boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Cliente view documentos_arquivos liberados" ON public.documentos_arquivos;
CREATE POLICY "Cliente view documentos_arquivos liberados"
ON public.documentos_arquivos FOR SELECT TO authenticated
USING (
  visivel_cliente = true
  AND EXISTS (
    SELECT 1 FROM public.documentos_pastas p
    WHERE p.id = documentos_arquivos.pasta_id
      AND public.can_access_obra(p.obra_id)
  )
);

DROP POLICY IF EXISTS "Cliente view documentos_pastas com arquivos liberados" ON public.documentos_pastas;
CREATE POLICY "Cliente view documentos_pastas com arquivos liberados"
ON public.documentos_pastas FOR SELECT TO authenticated
USING (
  public.can_access_obra(obra_id)
  AND EXISTS (
    SELECT 1 FROM public.documentos_arquivos a
    WHERE a.pasta_id = documentos_pastas.id AND a.visivel_cliente = true
  )
);

-- 3. Acesso granular ao bucket privado `anexos`
CREATE OR REPLACE FUNCTION public.can_read_anexo(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Operacional da empresa mantém acesso amplo aos anexos da empresa
    (
      public.is_operacional(auth.uid())
      AND (
        _name LIKE 'empresa/' || public.get_user_empresa_id(auth.uid())::text || '/%'
        OR EXISTS (
          SELECT 1 FROM storage.objects o
          WHERE o.bucket_id = 'anexos' AND o.name = _name
            AND public.get_user_empresa_id(o.owner) = public.get_user_empresa_id(auth.uid())
        )
      )
    )
    -- Logotipo da empresa do usuário (necessário para PDFs e cabeçalhos)
    OR _name LIKE 'empresa/' || public.get_user_empresa_id(auth.uid())::text || '/%'
    -- Documento liberado ao cliente, em obra vinculada
    OR EXISTS (
      SELECT 1
      FROM public.documentos_arquivos a
      JOIN public.documentos_pastas p ON p.id = a.pasta_id
      WHERE a.visivel_cliente = true
        AND public.can_access_obra(p.obra_id)
        AND a.url_arquivo LIKE '%' || _name
    )
    -- Fotos do diário de obra vinculada
    OR EXISTS (
      SELECT 1
      FROM public.diario_imagens di
      JOIN public.diario_obra d ON d.id = di.diario_id
      WHERE public.can_access_obra(d.obra_id)
        AND di.url LIKE '%' || _name
    )
    -- Imagens da obra vinculada
    OR EXISTS (
      SELECT 1 FROM public.imagens i
      WHERE public.can_access_obra(i.obra_id)
        AND i.url LIKE '%' || _name
    )
    -- Assinaturas de relatórios assinados de obra vinculada
    OR EXISTS (
      SELECT 1
      FROM public.assinaturas s
      JOIN public.relatorios r ON r.id = s.relatorio_id
      WHERE r.status = 'assinado'
        AND public.can_access_obra(r.obra_id)
        AND s.assinatura_url LIKE '%' || _name
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_read_anexo(text) TO authenticated;

DROP POLICY IF EXISTS "Empresa view anexos" ON storage.objects;
CREATE POLICY "Empresa view anexos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'anexos'
  AND (owner = auth.uid() OR public.can_read_anexo(name))
);
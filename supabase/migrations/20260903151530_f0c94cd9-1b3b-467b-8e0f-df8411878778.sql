-- =====================================================================
-- 1. RLS de leitura – módulo Funcionários
-- =====================================================================

DROP POLICY IF EXISTS "funcionarios_select" ON public.funcionarios;

CREATE POLICY "funcionarios_select" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND public.is_operacional(auth.uid())
  );

DROP POLICY IF EXISTS "ponto_registros_select" ON public.ponto_registros;

CREATE POLICY "ponto_registros_select" ON public.ponto_registros
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "func_lancamentos_select" ON public.funcionario_lancamentos;

CREATE POLICY "func_lancamentos_select" ON public.funcionario_lancamentos
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

DROP POLICY IF EXISTS "func_fechamentos_select" ON public.funcionario_fechamentos;

CREATE POLICY "func_fechamentos_select" ON public.funcionario_fechamentos
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- =====================================================================
-- 2. Storage – can_read_anexo: restringir cláusula solta ao logo
--    (única alteração: linha "OR _name LIKE 'empresa/...'/%'" -> '/logo.%')
-- =====================================================================

CREATE OR REPLACE FUNCTION public.can_read_anexo(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
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
    -- Logotipo da empresa (necessário em PDFs para qualquer perfil da empresa)
    OR _name LIKE 'empresa/' || public.get_user_empresa_id(auth.uid())::text || '/logo.%'
    OR EXISTS (
      SELECT 1
      FROM public.documentos_arquivos a
      JOIN public.documentos_pastas p ON p.id = a.pasta_id
      WHERE a.visivel_cliente = true
        AND public.can_access_obra(p.obra_id)
        AND a.url_arquivo LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1
      FROM public.diario_imagens di
      JOIN public.diario_obra d ON d.id = di.diario_id
      WHERE public.can_access_obra(d.obra_id)
        AND di.url LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1 FROM public.imagens i
      WHERE public.can_access_obra(i.obra_id)
        AND i.url LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1
      FROM public.assinaturas s
      JOIN public.relatorios r ON r.id = s.relatorio_id
      WHERE r.status = 'assinado'
        AND public.can_access_obra(r.obra_id)
        AND s.assinatura_url LIKE '%' || _name
    )
    OR EXISTS (
      SELECT 1 FROM public.relatorios_finais rf
      WHERE public.can_access_obra(rf.obra_id)
        AND _name LIKE 'relatorio-final/' || rf.obra_id::text || '/%'
    )
$$;

-- =====================================================================
-- 3. Grants – remover EXECUTE herdado de PUBLIC/anon
-- =====================================================================

REVOKE ALL ON FUNCTION public.can_read_anexo(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_read_anexo(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_empresa_branding() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_empresa_branding() TO authenticated;

REVOKE ALL ON FUNCTION public.get_empresa_branding(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_empresa_branding(uuid) TO authenticated;
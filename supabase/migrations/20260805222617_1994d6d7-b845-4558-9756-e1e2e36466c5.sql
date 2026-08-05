-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.is_operacional(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin')
      OR public.has_role(_uid, 'trabalhador')
      OR public.has_role(_uid, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_empresa_branding()
RETURNS TABLE (nome_empresa text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.nome_empresa, c.logo_url
  FROM public.configuracoes_empresa c
  WHERE c.empresa_id = public.get_user_empresa_id(auth.uid())
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_empresa_branding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_empresa_branding() TO authenticated;
REVOKE ALL ON FUNCTION public.is_operacional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_operacional(uuid) TO authenticated;

-- 2. Operational-only SELECT (empresa + papel operacional)
DROP POLICY IF EXISTS "Empresa view despesas" ON public.despesas;
CREATE POLICY "Empresa view despesas" ON public.despesas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view receitas" ON public.receitas;
CREATE POLICY "Empresa view receitas" ON public.receitas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view parcelas" ON public.parcelas;
CREATE POLICY "Empresa view parcelas" ON public.parcelas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view mao_de_obra" ON public.mao_de_obra;
CREATE POLICY "Empresa view mao_de_obra" ON public.mao_de_obra FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view financeiro_anexos" ON public.financeiro_anexos;
CREATE POLICY "Empresa view financeiro_anexos" ON public.financeiro_anexos FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view ferramentas" ON public.ferramentas;
CREATE POLICY "Empresa view ferramentas" ON public.ferramentas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view ferramentas_historico" ON public.ferramentas_historico;
CREATE POLICY "Empresa view ferramentas_historico" ON public.ferramentas_historico FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view compras_ferramentas" ON public.compras_ferramentas;
CREATE POLICY "Empresa view compras_ferramentas" ON public.compras_ferramentas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view compras_materiais" ON public.compras_materiais;
CREATE POLICY "Empresa view compras_materiais" ON public.compras_materiais FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view manutencao_ferramentas" ON public.manutencao_ferramentas;
CREATE POLICY "Empresa view manutencao_ferramentas" ON public.manutencao_ferramentas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view clientes" ON public.clientes;
CREATE POLICY "Empresa view clientes" ON public.clientes FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view documentos_pastas" ON public.documentos_pastas;
CREATE POLICY "Empresa view documentos_pastas" ON public.documentos_pastas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view documentos_arquivos" ON public.documentos_arquivos;
CREATE POLICY "Empresa view documentos_arquivos" ON public.documentos_arquivos FOR SELECT TO authenticated
USING (
  public.is_operacional(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.documentos_pastas p
    WHERE p.id = documentos_arquivos.pasta_id
      AND p.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Empresa view configuracoes" ON public.configuracoes_empresa;
CREATE POLICY "Empresa view configuracoes" ON public.configuracoes_empresa FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa view relatorio_logs" ON public.relatorio_logs;
CREATE POLICY "Empresa view relatorio_logs" ON public.relatorio_logs FOR SELECT TO authenticated
USING (
  public.is_operacional(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.relatorios r
    WHERE r.id = relatorio_logs.relatorio_id
      AND r.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

-- 3. Obra-scoped SELECT
DROP POLICY IF EXISTS "Empresa view atividades_obra" ON public.atividades_obra;
CREATE POLICY "Empresa view atividades_obra" ON public.atividades_obra FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR public.can_access_obra(obra_id)
);

DROP POLICY IF EXISTS "Empresa view cronograma" ON public.cronograma;
CREATE POLICY "Empresa view cronograma" ON public.cronograma FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR public.can_access_obra(obra_id)
);

DROP POLICY IF EXISTS "Empresa view cronograma_atividades" ON public.cronograma_atividades;
CREATE POLICY "Empresa view cronograma_atividades" ON public.cronograma_atividades FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma c
    WHERE c.id = cronograma_atividades.cronograma_id
      AND (
        (c.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
        OR public.can_access_obra(c.obra_id)
      )
  )
);

DROP POLICY IF EXISTS "Empresa view diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa view diario_obra" ON public.diario_obra FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR public.can_access_obra(obra_id)
);

DROP POLICY IF EXISTS "Empresa view diario_atividades" ON public.diario_atividades;
CREATE POLICY "Empresa view diario_atividades" ON public.diario_atividades FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_atividades.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view diario_equipe" ON public.diario_equipe;
CREATE POLICY "Empresa view diario_equipe" ON public.diario_equipe FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_equipe.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view diario_imagens" ON public.diario_imagens;
CREATE POLICY "Empresa view diario_imagens" ON public.diario_imagens FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_imagens.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view diario_materiais" ON public.diario_materiais;
CREATE POLICY "Empresa view diario_materiais" ON public.diario_materiais FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_materiais.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view diario_ocorrencias" ON public.diario_ocorrencias;
CREATE POLICY "Empresa view diario_ocorrencias" ON public.diario_ocorrencias FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_ocorrencias.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view diario_paralisacoes" ON public.diario_paralisacoes;
CREATE POLICY "Empresa view diario_paralisacoes" ON public.diario_paralisacoes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.diario_obra d
  WHERE d.id = diario_paralisacoes.diario_id
    AND ((d.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid())) OR public.can_access_obra(d.obra_id))
));

DROP POLICY IF EXISTS "Empresa view imagens" ON public.imagens;
CREATE POLICY "Empresa view imagens" ON public.imagens FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR public.can_access_obra(obra_id)
);

DROP POLICY IF EXISTS "Empresa view obra_aditivos" ON public.obra_aditivos;
CREATE POLICY "Empresa view obra_aditivos" ON public.obra_aditivos FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR public.can_access_obra(obra_id)
);

-- 4. Relatórios (gate status = 'assinado' para síndico/cliente)
DROP POLICY IF EXISTS "Empresa view relatorios" ON public.relatorios;
CREATE POLICY "Empresa view relatorios" ON public.relatorios FOR SELECT TO authenticated
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
  OR (public.can_access_obra(obra_id) AND status = 'assinado')
);

DROP POLICY IF EXISTS "Empresa view relatorio_versoes" ON public.relatorio_versoes;
CREATE POLICY "Empresa view relatorio_versoes" ON public.relatorio_versoes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.id = relatorio_versoes.relatorio_id
    AND (
      (r.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
      OR (public.can_access_obra(r.obra_id) AND r.status = 'assinado')
    )
));

DROP POLICY IF EXISTS "Empresa view assinaturas" ON public.assinaturas;
CREATE POLICY "Empresa view assinaturas" ON public.assinaturas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.id = assinaturas.relatorio_id
    AND (
      (r.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
      OR (public.can_access_obra(r.obra_id) AND r.status = 'assinado')
    )
));

-- 5. DELETE explícito faltante (apenas operacional da empresa)
DROP POLICY IF EXISTS "Empresa delete atividades_obra" ON public.atividades_obra;
CREATE POLICY "Empresa delete atividades_obra" ON public.atividades_obra FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa delete compras_materiais" ON public.compras_materiais;
CREATE POLICY "Empresa delete compras_materiais" ON public.compras_materiais FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa delete mao_de_obra" ON public.mao_de_obra;
CREATE POLICY "Empresa delete mao_de_obra" ON public.mao_de_obra FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa delete manutencao_ferramentas" ON public.manutencao_ferramentas;
CREATE POLICY "Empresa delete manutencao_ferramentas" ON public.manutencao_ferramentas FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));

DROP POLICY IF EXISTS "Empresa delete relatorios" ON public.relatorios;
CREATE POLICY "Empresa delete relatorios" ON public.relatorios FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()));
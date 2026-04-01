
-- ============================================================
-- MULTI-TENANCY: ISOLAMENTO POR EMPRESA
-- ============================================================

-- 1. TABELA EMPRESAS
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. EMPRESA_ID NO PROFILES
ALTER TABLE public.profiles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- 3. FUNÇÃO: buscar empresa_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 4. FUNÇÃO TRIGGER: auto-set empresa_id
CREATE OR REPLACE FUNCTION public.set_empresa_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := get_user_empresa_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- 5. ADICIONAR EMPRESA_ID ÀS TABELAS PRINCIPAIS
ALTER TABLE public.obras ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.clientes ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.configuracoes_empresa ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.despesas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.receitas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.parcelas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.mao_de_obra ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.compras_materiais ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.compras_ferramentas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.manutencao_ferramentas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.imagens ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.atividades_obra ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.diario_obra ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.cronograma ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.documentos_pastas ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.relatorios ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.financeiro_anexos ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- 6. ÍNDICES
CREATE INDEX idx_obras_empresa ON public.obras(empresa_id);
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_despesas_empresa ON public.despesas(empresa_id);
CREATE INDEX idx_receitas_empresa ON public.receitas(empresa_id);
CREATE INDEX idx_parcelas_empresa ON public.parcelas(empresa_id);
CREATE INDEX idx_diario_obra_empresa ON public.diario_obra(empresa_id);
CREATE INDEX idx_relatorios_empresa ON public.relatorios(empresa_id);
CREATE INDEX idx_profiles_empresa ON public.profiles(empresa_id);

-- 7. TRIGGERS AUTO-SET EMPRESA_ID
CREATE TRIGGER set_empresa_id_obras BEFORE INSERT ON public.obras FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_clientes BEFORE INSERT ON public.clientes FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_configuracoes BEFORE INSERT ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_despesas BEFORE INSERT ON public.despesas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_receitas BEFORE INSERT ON public.receitas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_parcelas BEFORE INSERT ON public.parcelas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_mao_de_obra BEFORE INSERT ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_compras_materiais BEFORE INSERT ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_compras_ferramentas BEFORE INSERT ON public.compras_ferramentas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_manutencao BEFORE INSERT ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_imagens BEFORE INSERT ON public.imagens FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_atividades BEFORE INSERT ON public.atividades_obra FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_diario BEFORE INSERT ON public.diario_obra FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_cronograma BEFORE INSERT ON public.cronograma FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_doc_pastas BEFORE INSERT ON public.documentos_pastas FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_relatorios BEFORE INSERT ON public.relatorios FOR EACH ROW EXECUTE FUNCTION set_empresa_id();
CREATE TRIGGER set_empresa_id_fin_anexos BEFORE INSERT ON public.financeiro_anexos FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

-- 8. ATUALIZAR TRIGGERS EXISTENTES PARA PROPAGAR EMPRESA_ID
CREATE OR REPLACE FUNCTION public.auto_generate_parcelas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  parcela_valor NUMERIC(12,2);
  vencimento DATE;
BEGIN
  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 1 THEN
    parcela_valor := ROUND(NEW.valor_total / NEW.numero_parcelas, 2);
    FOR i IN 1..NEW.numero_parcelas LOOP
      vencimento := CURRENT_DATE + (i * 30);
      INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
      VALUES (NEW.id, i, parcela_valor, vencimento, NEW.empresa_id);
    END LOOP;
  ELSE
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento, empresa_id)
    VALUES (NEW.id, 1, NEW.valor_total, CURRENT_DATE + 30, NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_despesa_material()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, forma_pagamento, empresa_id)
  VALUES (NEW.obra_id, 'material', 'Compra material - NF ' || COALESCE(NEW.numero_nota, 'S/N'), NEW.valor, CURRENT_DATE, NEW.forma_pagamento, NEW.empresa_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_despesa_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, forma_pagamento, empresa_id)
    VALUES (NEW.obra_id, 'manutencao', 'Manutenção - ' || NEW.descricao, NEW.valor, NEW.data, NEW.forma_pagamento, NEW.empresa_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_despesa_mao_obra()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, empresa_id)
  VALUES (NEW.obra_id, 'mao_obra', 'Mão de obra - ' || NEW.funcionario || ' (' || COALESCE(NEW.funcao, '') || ')', NEW.valor_diaria * NEW.dias, CURRENT_DATE, NEW.empresa_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    (NEW.raw_user_meta_data->>'empresa_id')::uuid
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'trabalhador');
  RETURN NEW;
END;
$$;

-- 9. RLS PARA EMPRESAS
CREATE POLICY "Users view own empresa" ON public.empresas
  FOR SELECT TO authenticated
  USING (id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Admin insert empresa" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update own empresa" ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 10. RLS PROFILES: Admin pode gerenciar profiles da mesma empresa
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admin view empresa profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') AND (
      empresa_id = get_user_empresa_id(auth.uid()) OR empresa_id IS NULL
    )
  );

CREATE POLICY "Admin update profiles in empresa" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') AND (
      empresa_id IS NULL OR empresa_id = get_user_empresa_id(auth.uid())
    )
  );

-- 11. RLS TABELAS PRINCIPAIS COM EMPRESA_ID

-- OBRAS
DROP POLICY IF EXISTS "Auth users can view obras" ON public.obras;
CREATE POLICY "Empresa view obras" ON public.obras
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin and trabalhador can insert obras" ON public.obras;
CREATE POLICY "Empresa insert obras" ON public.obras
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin and trabalhador can update obras" ON public.obras;
CREATE POLICY "Empresa update obras" ON public.obras
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete obras" ON public.obras;
CREATE POLICY "Empresa delete obras" ON public.obras
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- CLIENTES
DROP POLICY IF EXISTS "Auth users can view clientes" ON public.clientes;
CREATE POLICY "Empresa view clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin and trabalhador can insert clientes" ON public.clientes;
CREATE POLICY "Empresa insert clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin and trabalhador can update clientes" ON public.clientes;
CREATE POLICY "Empresa update clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete clientes" ON public.clientes;
CREATE POLICY "Empresa delete clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- CONFIGURACOES_EMPRESA
DROP POLICY IF EXISTS "Auth view configuracoes" ON public.configuracoes_empresa;
DROP POLICY IF EXISTS "Admin manage configuracoes" ON public.configuracoes_empresa;
CREATE POLICY "Empresa view configuracoes" ON public.configuracoes_empresa
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Empresa admin manage configuracoes" ON public.configuracoes_empresa
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- DESPESAS
DROP POLICY IF EXISTS "Auth users can view despesas" ON public.despesas;
CREATE POLICY "Empresa view despesas" ON public.despesas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador can insert despesas" ON public.despesas;
CREATE POLICY "Empresa insert despesas" ON public.despesas
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador can update despesas" ON public.despesas;
CREATE POLICY "Empresa update despesas" ON public.despesas
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete despesas" ON public.despesas;
CREATE POLICY "Empresa delete despesas" ON public.despesas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- RECEITAS
DROP POLICY IF EXISTS "Auth users can view receitas" ON public.receitas;
CREATE POLICY "Empresa view receitas" ON public.receitas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador can insert receitas" ON public.receitas;
CREATE POLICY "Empresa insert receitas" ON public.receitas
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador can update receitas" ON public.receitas;
CREATE POLICY "Empresa update receitas" ON public.receitas
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete receitas" ON public.receitas;
CREATE POLICY "Empresa delete receitas" ON public.receitas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- PARCELAS
DROP POLICY IF EXISTS "Auth users can view parcelas" ON public.parcelas;
CREATE POLICY "Empresa view parcelas" ON public.parcelas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador can insert parcelas" ON public.parcelas;
CREATE POLICY "Empresa insert parcelas" ON public.parcelas
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador can update parcelas" ON public.parcelas;
CREATE POLICY "Empresa update parcelas" ON public.parcelas
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin can delete parcelas" ON public.parcelas;
CREATE POLICY "Empresa delete parcelas" ON public.parcelas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- MAO_DE_OBRA
DROP POLICY IF EXISTS "Auth view mao_de_obra" ON public.mao_de_obra;
CREATE POLICY "Empresa view mao_de_obra" ON public.mao_de_obra
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert mao_de_obra" ON public.mao_de_obra;
CREATE POLICY "Empresa insert mao_de_obra" ON public.mao_de_obra
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update mao_de_obra" ON public.mao_de_obra;
CREATE POLICY "Empresa update mao_de_obra" ON public.mao_de_obra
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- COMPRAS_MATERIAIS
DROP POLICY IF EXISTS "Auth view compras_materiais" ON public.compras_materiais;
CREATE POLICY "Empresa view compras_materiais" ON public.compras_materiais
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert compras_materiais" ON public.compras_materiais;
CREATE POLICY "Empresa insert compras_materiais" ON public.compras_materiais
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update compras_materiais" ON public.compras_materiais;
CREATE POLICY "Empresa update compras_materiais" ON public.compras_materiais
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- COMPRAS_FERRAMENTAS
DROP POLICY IF EXISTS "Auth view compras_ferramentas" ON public.compras_ferramentas;
CREATE POLICY "Empresa view compras_ferramentas" ON public.compras_ferramentas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert compras_ferramentas" ON public.compras_ferramentas;
CREATE POLICY "Empresa insert compras_ferramentas" ON public.compras_ferramentas
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update compras_ferramentas" ON public.compras_ferramentas;
CREATE POLICY "Empresa update compras_ferramentas" ON public.compras_ferramentas
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- MANUTENCAO_FERRAMENTAS
DROP POLICY IF EXISTS "Auth view manutencao_ferramentas" ON public.manutencao_ferramentas;
CREATE POLICY "Empresa view manutencao_ferramentas" ON public.manutencao_ferramentas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert manutencao_ferramentas" ON public.manutencao_ferramentas;
CREATE POLICY "Empresa insert manutencao_ferramentas" ON public.manutencao_ferramentas
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update manutencao_ferramentas" ON public.manutencao_ferramentas;
CREATE POLICY "Empresa update manutencao_ferramentas" ON public.manutencao_ferramentas
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- IMAGENS
DROP POLICY IF EXISTS "Auth view imagens" ON public.imagens;
CREATE POLICY "Empresa view imagens" ON public.imagens
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert imagens" ON public.imagens;
CREATE POLICY "Empresa insert imagens" ON public.imagens
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update imagens" ON public.imagens;
CREATE POLICY "Empresa update imagens" ON public.imagens
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- ATIVIDADES_OBRA
DROP POLICY IF EXISTS "Auth view atividades_obra" ON public.atividades_obra;
CREATE POLICY "Empresa view atividades_obra" ON public.atividades_obra
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert atividades_obra" ON public.atividades_obra;
CREATE POLICY "Empresa insert atividades_obra" ON public.atividades_obra
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update atividades_obra" ON public.atividades_obra;
CREATE POLICY "Empresa update atividades_obra" ON public.atividades_obra
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- DIARIO_OBRA
DROP POLICY IF EXISTS "Auth view diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa view diario_obra" ON public.diario_obra
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa insert diario_obra" ON public.diario_obra
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa update diario_obra" ON public.diario_obra
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin delete diario_obra" ON public.diario_obra;
CREATE POLICY "Empresa delete diario_obra" ON public.diario_obra
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- CRONOGRAMA
DROP POLICY IF EXISTS "Auth view cronograma" ON public.cronograma;
DROP POLICY IF EXISTS "Admin/trabalhador manage cronograma" ON public.cronograma;
CREATE POLICY "Empresa view cronograma" ON public.cronograma
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Empresa manage cronograma" ON public.cronograma
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- DOCUMENTOS_PASTAS
DROP POLICY IF EXISTS "Auth view documentos_pastas" ON public.documentos_pastas;
DROP POLICY IF EXISTS "Admin/trabalhador manage documentos_pastas" ON public.documentos_pastas;
CREATE POLICY "Empresa view documentos_pastas" ON public.documentos_pastas
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Empresa manage documentos_pastas" ON public.documentos_pastas
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- RELATORIOS
DROP POLICY IF EXISTS "Auth view relatorios" ON public.relatorios;
CREATE POLICY "Empresa view relatorios" ON public.relatorios
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Admin/trabalhador insert relatorios" ON public.relatorios;
CREATE POLICY "Empresa insert relatorios" ON public.relatorios
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

DROP POLICY IF EXISTS "Admin/trabalhador update relatorios" ON public.relatorios;
CREATE POLICY "Empresa update relatorios" ON public.relatorios
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- FINANCEIRO_ANEXOS
DROP POLICY IF EXISTS "Auth view financeiro_anexos" ON public.financeiro_anexos;
DROP POLICY IF EXISTS "Admin/trabalhador manage financeiro_anexos" ON public.financeiro_anexos;
CREATE POLICY "Empresa view financeiro_anexos" ON public.financeiro_anexos
  FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
CREATE POLICY "Empresa manage financeiro_anexos" ON public.financeiro_anexos
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- 12. RLS TABELAS FILHAS (via parent empresa_id)

-- CRONOGRAMA_ATIVIDADES
DROP POLICY IF EXISTS "Auth view cronograma_atividades" ON public.cronograma_atividades;
DROP POLICY IF EXISTS "Admin/trabalhador manage cronograma_atividades" ON public.cronograma_atividades;
CREATE POLICY "Empresa view cronograma_atividades" ON public.cronograma_atividades
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM cronograma c WHERE c.id = cronograma_id AND c.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage cronograma_atividades" ON public.cronograma_atividades
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND EXISTS (SELECT 1 FROM cronograma c WHERE c.id = cronograma_id AND c.empresa_id = get_user_empresa_id(auth.uid()))
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND EXISTS (SELECT 1 FROM cronograma c WHERE c.id = cronograma_id AND c.empresa_id = get_user_empresa_id(auth.uid()))
  );

-- DOCUMENTOS_ARQUIVOS
DROP POLICY IF EXISTS "Auth view documentos_arquivos" ON public.documentos_arquivos;
DROP POLICY IF EXISTS "Admin/trabalhador manage documentos_arquivos" ON public.documentos_arquivos;
CREATE POLICY "Empresa view documentos_arquivos" ON public.documentos_arquivos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM documentos_pastas p WHERE p.id = pasta_id AND p.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage documentos_arquivos" ON public.documentos_arquivos
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND EXISTS (SELECT 1 FROM documentos_pastas p WHERE p.id = pasta_id AND p.empresa_id = get_user_empresa_id(auth.uid()))
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'))
    AND EXISTS (SELECT 1 FROM documentos_pastas p WHERE p.id = pasta_id AND p.empresa_id = get_user_empresa_id(auth.uid()))
  );

-- DIARIO CHILD TABLES
DROP POLICY IF EXISTS "Auth view diario_atividades" ON public.diario_atividades;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_atividades" ON public.diario_atividades;
CREATE POLICY "Empresa view diario_atividades" ON public.diario_atividades
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_atividades" ON public.diario_atividades
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view diario_equipe" ON public.diario_equipe;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_equipe" ON public.diario_equipe;
CREATE POLICY "Empresa view diario_equipe" ON public.diario_equipe
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_equipe" ON public.diario_equipe
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view diario_materiais" ON public.diario_materiais;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_materiais" ON public.diario_materiais;
CREATE POLICY "Empresa view diario_materiais" ON public.diario_materiais
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_materiais" ON public.diario_materiais
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view diario_ocorrencias" ON public.diario_ocorrencias;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_ocorrencias" ON public.diario_ocorrencias;
CREATE POLICY "Empresa view diario_ocorrencias" ON public.diario_ocorrencias
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_ocorrencias" ON public.diario_ocorrencias
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view diario_paralisacoes" ON public.diario_paralisacoes;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_paralisacoes" ON public.diario_paralisacoes;
CREATE POLICY "Empresa view diario_paralisacoes" ON public.diario_paralisacoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_paralisacoes" ON public.diario_paralisacoes
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view diario_imagens" ON public.diario_imagens;
DROP POLICY IF EXISTS "Admin/trabalhador manage diario_imagens" ON public.diario_imagens;
CREATE POLICY "Empresa view diario_imagens" ON public.diario_imagens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage diario_imagens" ON public.diario_imagens
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM diario_obra d WHERE d.id = diario_id AND d.empresa_id = get_user_empresa_id(auth.uid())));

-- RELATORIO CHILD TABLES
DROP POLICY IF EXISTS "Auth view relatorio_versoes" ON public.relatorio_versoes;
DROP POLICY IF EXISTS "Admin/trabalhador manage relatorio_versoes" ON public.relatorio_versoes;
CREATE POLICY "Empresa view relatorio_versoes" ON public.relatorio_versoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage relatorio_versoes" ON public.relatorio_versoes
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view relatorio_logs" ON public.relatorio_logs;
DROP POLICY IF EXISTS "Admin/trabalhador insert relatorio_logs" ON public.relatorio_logs;
CREATE POLICY "Empresa view relatorio_logs" ON public.relatorio_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa insert relatorio_logs" ON public.relatorio_logs
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));

DROP POLICY IF EXISTS "Auth view assinaturas" ON public.assinaturas;
DROP POLICY IF EXISTS "Admin/trabalhador manage assinaturas" ON public.assinaturas;
CREATE POLICY "Empresa view assinaturas" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));
CREATE POLICY "Empresa manage assinaturas" ON public.assinaturas
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND EXISTS (SELECT 1 FROM relatorios r WHERE r.id = relatorio_id AND r.empresa_id = get_user_empresa_id(auth.uid())));

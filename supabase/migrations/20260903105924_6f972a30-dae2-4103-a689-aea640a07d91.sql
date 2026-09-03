CREATE TABLE public.funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  funcao text,
  telefone text,
  foto_url text,
  valor_diaria numeric(10,2) NOT NULL DEFAULT 0,
  dias_padrao integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  obra_atual_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  obra_atual_texto text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funcionarios_select" ON public.funcionarios FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "funcionarios_insert" ON public.funcionarios FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "funcionarios_update" ON public.funcionarios FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "funcionarios_delete" ON public.funcionarios FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE TRIGGER set_empresa_id_funcionarios BEFORE INSERT ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER trg_updated_at_funcionarios BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ponto_registros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data date NOT NULL,
  status text NOT NULL CHECK (status IN ('integral','meio','falta')),
  motivo text,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  obra_texto text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, data)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_registros TO authenticated;
GRANT ALL ON public.ponto_registros TO service_role;
ALTER TABLE public.ponto_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_registros_select" ON public.ponto_registros FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "ponto_registros_insert" ON public.ponto_registros FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "ponto_registros_update" ON public.ponto_registros FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "ponto_registros_delete" ON public.ponto_registros FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE TRIGGER set_empresa_id_ponto_registros BEFORE INSERT ON public.ponto_registros FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER trg_updated_at_ponto_registros BEFORE UPDATE ON public.ponto_registros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.funcionario_lancamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('vale','adiantamento','desconto','bonus')),
  valor numeric(10,2) NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_lancamentos TO authenticated;
GRANT ALL ON public.funcionario_lancamentos TO service_role;
ALTER TABLE public.funcionario_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "func_lancamentos_select" ON public.funcionario_lancamentos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "func_lancamentos_insert" ON public.funcionario_lancamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "func_lancamentos_update" ON public.funcionario_lancamentos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "func_lancamentos_delete" ON public.funcionario_lancamentos FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE TRIGGER set_empresa_id_func_lancamentos BEFORE INSERT ON public.funcionario_lancamentos FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER trg_updated_at_func_lancamentos BEFORE UPDATE ON public.funcionario_lancamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.funcionario_fechamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_diaria_congelado numeric(10,2) NOT NULL,
  dias_integrais numeric(5,1) NOT NULL DEFAULT 0,
  dias_meio numeric(5,1) NOT NULL DEFAULT 0,
  total_vales numeric(10,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(10,2) NOT NULL DEFAULT 0,
  detalhamento_obras jsonb,
  valor_nao_alocado numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'fechado' CHECK (status IN ('fechado','reaberto')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_fechamentos TO authenticated;
GRANT ALL ON public.funcionario_fechamentos TO service_role;
ALTER TABLE public.funcionario_fechamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "func_fechamentos_select" ON public.funcionario_fechamentos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "func_fechamentos_insert" ON public.funcionario_fechamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "func_fechamentos_update" ON public.funcionario_fechamentos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')))
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "func_fechamentos_delete" ON public.funcionario_fechamentos FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE TRIGGER set_empresa_id_func_fechamentos BEFORE INSERT ON public.funcionario_fechamentos FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER trg_updated_at_func_fechamentos BEFORE UPDATE ON public.funcionario_fechamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
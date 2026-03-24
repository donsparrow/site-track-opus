
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'trabalhador', 'sindico', 'cliente');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'trabalhador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  endereco TEXT,
  administradora TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and trabalhador can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin and trabalhador can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Obras table
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'andamento', 'concluida')),
  data_inicio DATE,
  data_fim_prevista DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view obras" ON public.obras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and trabalhador can insert obras" ON public.obras FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin and trabalhador can update obras" ON public.obras FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin can delete obras" ON public.obras FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Receitas
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'avista' CHECK (forma_pagamento IN ('avista', 'parcelado')),
  numero_parcelas INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view receitas" ON public.receitas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador can insert receitas" ON public.receitas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador can update receitas" ON public.receitas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin can delete receitas" ON public.receitas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Parcelas
CREATE TABLE public.parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id UUID REFERENCES public.receitas(id) ON DELETE CASCADE NOT NULL,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'atrasado')),
  forma_pagamento TEXT DEFAULT 'pix' CHECK (forma_pagamento IN ('pix', 'boleto', 'transferencia', 'dinheiro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view parcelas" ON public.parcelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador can insert parcelas" ON public.parcelas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador can update parcelas" ON public.parcelas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin can delete parcelas" ON public.parcelas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Despesas
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outros' CHECK (tipo IN ('material', 'mao_obra', 'ferramenta', 'manutencao', 'outros')),
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  anexo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view despesas" ON public.despesas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador can insert despesas" ON public.despesas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador can update despesas" ON public.despesas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin can delete despesas" ON public.despesas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Compras materiais
CREATE TABLE public.compras_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  loja TEXT,
  valor NUMERIC(12,2) NOT NULL,
  numero_nota TEXT,
  forma_pagamento TEXT,
  anexo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view compras_materiais" ON public.compras_materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert compras_materiais" ON public.compras_materiais FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update compras_materiais" ON public.compras_materiais FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Compras ferramentas
CREATE TABLE public.compras_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  loja TEXT,
  valor NUMERIC(12,2) NOT NULL,
  numero_nota TEXT,
  forma_pagamento TEXT,
  anexo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view compras_ferramentas" ON public.compras_ferramentas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert compras_ferramentas" ON public.compras_ferramentas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update compras_ferramentas" ON public.compras_ferramentas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Manutenção ferramentas
CREATE TABLE public.manutencao_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  loja TEXT,
  valor NUMERIC(12,2) NOT NULL,
  numero_nota TEXT,
  forma_pagamento TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manutencao_ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view manutencao_ferramentas" ON public.manutencao_ferramentas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert manutencao_ferramentas" ON public.manutencao_ferramentas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update manutencao_ferramentas" ON public.manutencao_ferramentas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Mão de obra
CREATE TABLE public.mao_de_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  funcionario TEXT NOT NULL,
  funcao TEXT,
  valor_diaria NUMERIC(12,2) NOT NULL DEFAULT 0,
  dias INTEGER NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) GENERATED ALWAYS AS (valor_diaria * dias) STORED,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mao_de_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view mao_de_obra" ON public.mao_de_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert mao_de_obra" ON public.mao_de_obra FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update mao_de_obra" ON public.mao_de_obra FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Atividades obra
CREATE TABLE public.atividades_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  percentual INTEGER NOT NULL DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'andamento', 'concluido')),
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atividades_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view atividades_obra" ON public.atividades_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert atividades_obra" ON public.atividades_obra FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update atividades_obra" ON public.atividades_obra FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Relatórios
CREATE TABLE public.relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view relatorios" ON public.relatorios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert relatorios" ON public.relatorios FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update relatorios" ON public.relatorios FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Imagens
CREATE TABLE public.imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'durante' CHECK (tipo IN ('antes', 'durante', 'depois')),
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view imagens" ON public.imagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert imagens" ON public.imagens FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);
CREATE POLICY "Admin/trabalhador update imagens" ON public.imagens FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trabalhador')
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON public.parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compras_materiais_updated_at BEFORE UPDATE ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compras_ferramentas_updated_at BEFORE UPDATE ON public.compras_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manutencao_ferramentas_updated_at BEFORE UPDATE ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mao_de_obra_updated_at BEFORE UPDATE ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_atividades_obra_updated_at BEFORE UPDATE ON public.atividades_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_relatorios_updated_at BEFORE UPDATE ON public.relatorios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_imagens_updated_at BEFORE UPDATE ON public.imagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'trabalhador');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate parcelas
CREATE OR REPLACE FUNCTION public.auto_generate_parcelas()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  parcela_valor NUMERIC(12,2);
  vencimento DATE;
BEGIN
  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 1 THEN
    parcela_valor := ROUND(NEW.valor_total / NEW.numero_parcelas, 2);
    FOR i IN 1..NEW.numero_parcelas LOOP
      vencimento := CURRENT_DATE + (i * 30);
      INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento)
      VALUES (NEW.id, i, parcela_valor, vencimento);
    END LOOP;
  ELSE
    INSERT INTO public.parcelas (receita_id, numero_parcela, valor, data_vencimento)
    VALUES (NEW.id, 1, NEW.valor_total, CURRENT_DATE + 30);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_parcelas_on_receita
  AFTER INSERT ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_parcelas();

-- Auto-create despesa from compras_materiais
CREATE OR REPLACE FUNCTION public.auto_despesa_material()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, forma_pagamento)
  VALUES (NEW.obra_id, 'material', 'Compra material - NF ' || COALESCE(NEW.numero_nota, 'S/N'), NEW.valor, CURRENT_DATE, NEW.forma_pagamento);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_despesa_on_compra_material
  AFTER INSERT ON public.compras_materiais
  FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_material();

-- Auto-create despesa from manutencao_ferramentas
CREATE OR REPLACE FUNCTION public.auto_despesa_manutencao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.obra_id IS NOT NULL THEN
    INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data, forma_pagamento)
    VALUES (NEW.obra_id, 'manutencao', 'Manutenção - ' || NEW.descricao, NEW.valor, NEW.data, NEW.forma_pagamento);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_despesa_on_manutencao
  AFTER INSERT ON public.manutencao_ferramentas
  FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_manutencao();

-- Auto-create despesa from mao_de_obra
CREATE OR REPLACE FUNCTION public.auto_despesa_mao_obra()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.despesas (obra_id, tipo, descricao, valor, data)
  VALUES (NEW.obra_id, 'mao_obra', 'Mão de obra - ' || NEW.funcionario || ' (' || COALESCE(NEW.funcao, '') || ')', NEW.valor_diaria * NEW.dias, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_despesa_on_mao_obra
  AFTER INSERT ON public.mao_de_obra
  FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_mao_obra();

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos', 'anexos', true);
CREATE POLICY "Anyone can view anexos" ON storage.objects FOR SELECT USING (bucket_id = 'anexos');
CREATE POLICY "Auth users can upload anexos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos');
CREATE POLICY "Auth users can update anexos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'anexos');

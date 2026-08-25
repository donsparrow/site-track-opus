-- 1. Tabela principal
CREATE TABLE public.relatorios_finais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  tipo_relatorio TEXT NOT NULL DEFAULT 'entrega_obra',

  cliente_nome TEXT,
  cliente_cpf_cnpj TEXT,
  endereco TEXT,
  responsavel TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_conclusao DATE,

  titulo_introducao TEXT DEFAULT 'Objetivo',
  conteudo_introducao TEXT,
  titulo_garantia TEXT DEFAULT 'Prazo de Garantia',
  conteudo_garantia TEXT,
  titulo_aditivo TEXT DEFAULT 'Aditivo Contratual',
  conteudo_aditivo TEXT,
  titulo_conclusao TEXT DEFAULT 'Conclusão',
  conteudo_conclusao TEXT,

  foto_capa_url TEXT,
  link_externo TEXT,
  link_externo_label TEXT DEFAULT 'Link de acesso',

  assinatura_empresa_url TEXT,
  assinatura_empresa_nome TEXT,
  assinatura_empresa_cargo TEXT,
  assinatura_empresa_data DATE,
  assinatura_sindico_url TEXT,
  assinatura_sindico_nome TEXT,
  assinatura_sindico_cargo TEXT DEFAULT 'Síndico',
  assinatura_sindico_data DATE,

  status TEXT NOT NULL DEFAULT 'nao_assinado' CHECK (status IN ('nao_assinado', 'assinado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (obra_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_finais TO authenticated;
GRANT ALL ON public.relatorios_finais TO service_role;

ALTER TABLE public.relatorios_finais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access relatorios_finais"
  ON public.relatorios_finais FOR ALL TO authenticated
  USING (
    has_role((select auth.uid()), 'super_admin')
    OR (has_role((select auth.uid()), 'admin') AND empresa_id = public.get_user_empresa_id((select auth.uid())))
  )
  WITH CHECK (
    has_role((select auth.uid()), 'super_admin')
    OR (has_role((select auth.uid()), 'admin') AND empresa_id = public.get_user_empresa_id((select auth.uid())))
  );

CREATE POLICY "Sindico view own relatorios_finais"
  ON public.relatorios_finais FOR SELECT TO authenticated
  USING (
    has_role((select auth.uid()), 'sindico')
    AND obra_id IN (
      SELECT obra_id FROM public.usuario_obras WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Sindico assina relatorios_finais"
  ON public.relatorios_finais FOR UPDATE TO authenticated
  USING (
    has_role((select auth.uid()), 'sindico')
    AND obra_id IN (
      SELECT obra_id FROM public.usuario_obras WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    has_role((select auth.uid()), 'sindico')
    AND obra_id IN (
      SELECT obra_id FROM public.usuario_obras WHERE user_id = (select auth.uid())
    )
  );

CREATE INDEX idx_relatorios_finais_obra_id ON public.relatorios_finais(obra_id);
CREATE INDEX idx_relatorios_finais_empresa_id ON public.relatorios_finais(empresa_id);

CREATE TRIGGER trg_updated_at_relatorios_finais
  BEFORE UPDATE ON public.relatorios_finais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_empresa_id_relatorios_finais
  BEFORE INSERT ON public.relatorios_finais
  FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

-- Impede que o síndico altere qualquer coisa fora da própria assinatura
CREATE OR REPLACE FUNCTION public.guard_relatorio_final_sindico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'sindico') THEN
    NEW.obra_id := OLD.obra_id;
    NEW.empresa_id := OLD.empresa_id;
    NEW.tipo_relatorio := OLD.tipo_relatorio;
    NEW.cliente_nome := OLD.cliente_nome;
    NEW.cliente_cpf_cnpj := OLD.cliente_cpf_cnpj;
    NEW.endereco := OLD.endereco;
    NEW.responsavel := OLD.responsavel;
    NEW.data_inicio := OLD.data_inicio;
    NEW.data_fim_prevista := OLD.data_fim_prevista;
    NEW.data_conclusao := OLD.data_conclusao;
    NEW.titulo_introducao := OLD.titulo_introducao;
    NEW.conteudo_introducao := OLD.conteudo_introducao;
    NEW.titulo_garantia := OLD.titulo_garantia;
    NEW.conteudo_garantia := OLD.conteudo_garantia;
    NEW.titulo_aditivo := OLD.titulo_aditivo;
    NEW.conteudo_aditivo := OLD.conteudo_aditivo;
    NEW.titulo_conclusao := OLD.titulo_conclusao;
    NEW.conteudo_conclusao := OLD.conteudo_conclusao;
    NEW.foto_capa_url := OLD.foto_capa_url;
    NEW.link_externo := OLD.link_externo;
    NEW.link_externo_label := OLD.link_externo_label;
    NEW.assinatura_empresa_url := OLD.assinatura_empresa_url;
    NEW.assinatura_empresa_nome := OLD.assinatura_empresa_nome;
    NEW.assinatura_empresa_cargo := OLD.assinatura_empresa_cargo;
    NEW.assinatura_empresa_data := OLD.assinatura_empresa_data;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_relatorio_final_sindico
  BEFORE UPDATE ON public.relatorios_finais
  FOR EACH ROW EXECUTE FUNCTION public.guard_relatorio_final_sindico();

-- Status automático quando ambas assinaturas existirem
CREATE OR REPLACE FUNCTION public.sync_status_relatorio_final()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assinatura_empresa_url IS NOT NULL AND NEW.assinatura_sindico_url IS NOT NULL THEN
    NEW.status := 'assinado';
  ELSE
    NEW.status := 'nao_assinado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_status_relatorio_final
  BEFORE INSERT OR UPDATE ON public.relatorios_finais
  FOR EACH ROW EXECUTE FUNCTION public.sync_status_relatorio_final();

-- 2. Tabela de fotos
CREATE TABLE public.relatorio_final_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id UUID NOT NULL REFERENCES public.relatorios_finais(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  legenda TEXT,
  tipo TEXT NOT NULL DEFAULT 'pos_obra' CHECK (tipo IN ('pre_obra', 'pos_obra')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_final_fotos TO authenticated;
GRANT ALL ON public.relatorio_final_fotos TO service_role;

ALTER TABLE public.relatorio_final_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access relatorio_final_fotos"
  ON public.relatorio_final_fotos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.relatorios_finais rf
      WHERE rf.id = relatorio_id
        AND (
          has_role((select auth.uid()), 'super_admin')
          OR (has_role((select auth.uid()), 'admin') AND rf.empresa_id = public.get_user_empresa_id((select auth.uid())))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relatorios_finais rf
      WHERE rf.id = relatorio_id
        AND (
          has_role((select auth.uid()), 'super_admin')
          OR (has_role((select auth.uid()), 'admin') AND rf.empresa_id = public.get_user_empresa_id((select auth.uid())))
        )
    )
  );

CREATE POLICY "Sindico view relatorio_final_fotos"
  ON public.relatorio_final_fotos FOR SELECT TO authenticated
  USING (
    has_role((select auth.uid()), 'sindico')
    AND relatorio_id IN (
      SELECT rf.id FROM public.relatorios_finais rf
      JOIN public.usuario_obras uo ON uo.obra_id = rf.obra_id
      WHERE uo.user_id = (select auth.uid())
    )
  );

CREATE INDEX idx_relatorio_final_fotos_relatorio_id ON public.relatorio_final_fotos(relatorio_id);
CREATE INDEX idx_relatorio_final_fotos_ordem ON public.relatorio_final_fotos(relatorio_id, ordem);

-- 3. Storage: leitura dos arquivos do relatório final para quem acessa a obra
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
    OR _name LIKE 'empresa/' || public.get_user_empresa_id(auth.uid())::text || '/%'
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
    -- Arquivos do relatório final de obra acessível
    OR EXISTS (
      SELECT 1 FROM public.relatorios_finais rf
      WHERE public.can_access_obra(rf.obra_id)
        AND _name LIKE 'relatorio-final/' || rf.obra_id::text || '/%'
    )
$$;

-- 4. Permissões padrão incluem o novo módulo
CREATE OR REPLACE FUNCTION public.set_default_permissions(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios','configuracoes','clientes','ferramentas','relatorio_final'];
  m text;
BEGIN
  DELETE FROM public.permissoes_usuario WHERE user_id = _user_id;

  FOREACH m IN ARRAY modules LOOP
    IF _role IN ('super_admin', 'admin') THEN
      INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
      VALUES (_user_id, m, true, true, true, true);
    ELSIF _role = 'trabalhador' THEN
      IF m IN ('diario_obra', 'ferramentas') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, true, false, false);
      ELSIF m IN ('dashboard', 'cronograma', 'documentos', 'relatorios') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'sindico' THEN
      IF m IN ('diario_obra', 'cronograma', 'documentos', 'relatorios', 'dashboard', 'relatorio_final') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'cliente' THEN
      IF m IN ('cronograma', 'diario_obra', 'documentos', 'relatorios', 'dashboard') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSE
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    END IF;
  END LOOP;
END;
$$;

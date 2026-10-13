ALTER TABLE public.relatorios_finais ADD COLUMN IF NOT EXISTS contrato TEXT;
ALTER TABLE public.relatorios_finais ADD COLUMN IF NOT EXISTS secoes JSONB NULL;
ALTER TABLE public.relatorios_finais ADD CONSTRAINT relatorios_finais_secoes_array_chk CHECK (secoes IS NULL OR jsonb_typeof(secoes) = 'array');

CREATE OR REPLACE FUNCTION public.guard_relatorio_final_sindico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    NEW.contrato := OLD.contrato;
    NEW.secoes := OLD.secoes;
    NEW.secoes_extras := OLD.secoes_extras;
    NEW.template_capa_url := OLD.template_capa_url;
    NEW.foto_capa_escala := OLD.foto_capa_escala;
    NEW.data_vistoria := OLD.data_vistoria;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_relatorio_final_sindico() FROM PUBLIC, anon, authenticated;
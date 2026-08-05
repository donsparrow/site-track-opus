CREATE OR REPLACE FUNCTION public.normalize_anexo_path(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _value IS NULL OR btrim(_value) = '' THEN _value
    WHEN _value ~ '/storage/v1/object/(public|sign|authenticated)/anexos/' THEN
      split_part(
        regexp_replace(btrim(_value), '^.*/storage/v1/object/(public|sign|authenticated)/anexos/', ''),
        '?', 1
      )
    ELSE _value
  END
$$;

UPDATE public.diario_imagens SET url = public.normalize_anexo_path(url) WHERE url ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.financeiro_anexos SET url_arquivo = public.normalize_anexo_path(url_arquivo) WHERE url_arquivo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.documentos_arquivos SET url_arquivo = public.normalize_anexo_path(url_arquivo) WHERE url_arquivo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.assinaturas SET assinatura_url = public.normalize_anexo_path(assinatura_url) WHERE assinatura_url ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.imagens SET url = public.normalize_anexo_path(url) WHERE url ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.configuracoes_empresa SET logo_url = public.normalize_anexo_path(logo_url) WHERE logo_url ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.despesas SET anexo = public.normalize_anexo_path(anexo) WHERE anexo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.receitas SET anexo = public.normalize_anexo_path(anexo) WHERE anexo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.compras_materiais SET anexo = public.normalize_anexo_path(anexo) WHERE anexo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';
UPDATE public.compras_ferramentas SET anexo = public.normalize_anexo_path(anexo) WHERE anexo ~ '/storage/v1/object/(public|sign|authenticated)/anexos/';

DROP FUNCTION public.normalize_anexo_path(text);
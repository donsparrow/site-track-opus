ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS assinado_por uuid NULL;
CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_cliente_por_usuario_uk
  ON public.assinaturas (relatorio_id, assinado_por)
  WHERE tipo = 'cliente' AND assinado_por IS NOT NULL;
CREATE OR REPLACE FUNCTION public.assinar_relatorio_cliente(
  _relatorio_id uuid, _assinatura_url text, _nome text, _cargo text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _obra uuid; _status text; _id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'cliente')) THEN
    RAISE EXCEPTION 'Somente síndico/cliente pode usar esta assinatura';
  END IF;
  SELECT obra_id, status INTO _obra, _status
    FROM public.relatorios WHERE id = _relatorio_id FOR UPDATE;
  IF _obra IS NULL OR NOT public.can_access_obra(_obra) THEN
    RAISE EXCEPTION 'Relatório não encontrado';
  END IF;
  IF _status <> 'assinado' THEN
    RAISE EXCEPTION 'O relatório ainda não foi assinado pela empresa';
  END IF;
  IF coalesce(trim(_nome), '') = '' OR coalesce(trim(_cargo), '') = '' THEN
    RAISE EXCEPTION 'Informe nome e cargo';
  END IF;
  IF _assinatura_url IS NULL OR _assinatura_url NOT LIKE 'assinaturas/' || _relatorio_id::text || '/%'
     OR NOT EXISTS (SELECT 1 FROM storage.objects o
                    WHERE o.bucket_id = 'anexos' AND o.name = _assinatura_url
                      AND o.owner = auth.uid()) THEN
    RAISE EXCEPTION 'Imagem da assinatura inválida';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assinaturas
             WHERE relatorio_id = _relatorio_id AND tipo = 'cliente'
               AND assinado_por = auth.uid()) THEN
    RAISE EXCEPTION 'Você já assinou este relatório';
  END IF;
  INSERT INTO public.assinaturas
    (relatorio_id, tipo, nome_assinante, cargo, tipo_assinatura, assinatura_url, assinado_por, assinado_em)
  VALUES (_relatorio_id, 'cliente', trim(_nome), trim(_cargo), 'desenho', _assinatura_url, auth.uid(), now())
  RETURNING id INTO _id;
  INSERT INTO public.relatorio_logs (relatorio_id, usuario_id, acao)
  VALUES (_relatorio_id, auth.uid(), 'assinou (cliente)');
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.assinar_relatorio_cliente(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_relatorio_cliente(uuid, text, text, text) TO authenticated;
DROP FUNCTION IF EXISTS public.get_empresa_branding();
DROP FUNCTION IF EXISTS public.get_empresa_branding(uuid);

CREATE OR REPLACE FUNCTION public.get_empresa_branding()
RETURNS TABLE(nome_empresa text, logo_url text, cnpj text, telefone text, email text, site text, instagram text, texto_rodape text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.nome_empresa, c.logo_url, c.cnpj, c.telefone, c.email, c.site, c.instagram, c.texto_rodape
  FROM public.configuracoes_empresa c
  WHERE c.empresa_id = public.get_user_empresa_id(auth.uid())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_empresa_branding(_empresa_id uuid)
RETURNS TABLE(nome_empresa text, logo_url text, cnpj text, telefone text, email text, site text, instagram text, texto_rodape text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.nome_empresa, c.logo_url, c.cnpj, c.telefone, c.email, c.site, c.instagram, c.texto_rodape
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

REVOKE ALL ON FUNCTION public.get_empresa_branding() FROM anon;
REVOKE ALL ON FUNCTION public.get_empresa_branding(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_empresa_branding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_empresa_branding(uuid) TO authenticated;
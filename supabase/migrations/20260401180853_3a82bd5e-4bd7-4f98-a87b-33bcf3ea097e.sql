
CREATE OR REPLACE FUNCTION public.create_empresa_and_link(_nome text, _cnpj text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _empresa_id uuid;
BEGIN
  INSERT INTO public.empresas (nome, cnpj)
  VALUES (_nome, _cnpj)
  RETURNING id INTO _empresa_id;

  UPDATE public.profiles
  SET empresa_id = _empresa_id
  WHERE user_id = auth.uid();

  RETURN _empresa_id;
END;
$$;

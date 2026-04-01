
-- Create permissoes_usuario table
CREATE TABLE public.permissoes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  modulo text NOT NULL,
  pode_visualizar boolean NOT NULL DEFAULT false,
  pode_criar boolean NOT NULL DEFAULT false,
  pode_editar boolean NOT NULL DEFAULT false,
  pode_excluir boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, modulo)
);

-- Enable RLS
ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- Admins can manage permissions for users in their empresa
CREATE POLICY "Admin manage permissoes"
ON public.permissoes_usuario
FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = permissoes_usuario.user_id
    AND (p.empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = permissoes_usuario.user_id
    AND (p.empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Users can view their own permissions
CREATE POLICY "Users view own permissoes"
ON public.permissoes_usuario
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Function to set default permissions based on role
CREATE OR REPLACE FUNCTION public.set_default_permissions(_user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules text[] := ARRAY['dashboard','financeiro','diario_obra','cronograma','relatorios','documentos','usuarios'];
  m text;
BEGIN
  -- Remove existing permissions
  DELETE FROM public.permissoes_usuario WHERE user_id = _user_id;

  FOREACH m IN ARRAY modules LOOP
    IF _role IN ('super_admin', 'admin') THEN
      INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
      VALUES (_user_id, m, true, true, true, true);
    ELSIF _role = 'trabalhador' THEN
      IF m = 'diario_obra' THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, true, false, false);
      ELSIF m IN ('dashboard', 'cronograma', 'documentos', 'relatorios') THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, true, false, false, false);
      ELSIF m = 'financeiro' THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      ELSIF m = 'usuarios' THEN
        INSERT INTO public.permissoes_usuario (user_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES (_user_id, m, false, false, false, false);
      END IF;
    ELSIF _role = 'sindico' THEN
      IF m IN ('diario_obra', 'cronograma', 'documentos', 'relatorios', 'dashboard') THEN
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

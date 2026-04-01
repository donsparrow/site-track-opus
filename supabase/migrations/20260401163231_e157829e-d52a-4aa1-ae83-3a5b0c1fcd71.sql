
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

CREATE POLICY "Super admin view all empresas"
ON public.empresas FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manage all empresas"
ON public.empresas FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin view all obras"
ON public.obras FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

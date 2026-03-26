
-- Create usuario_obras linking table
CREATE TABLE public.usuario_obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, obra_id)
);

-- Enable RLS
ALTER TABLE public.usuario_obras ENABLE ROW LEVEL SECURITY;

-- Admin can manage all links
CREATE POLICY "Admin manage usuario_obras" ON public.usuario_obras
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own links
CREATE POLICY "Users view own usuario_obras" ON public.usuario_obras
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Add legal responsibility fields to configuracoes_empresa
ALTER TABLE public.configuracoes_empresa 
ADD COLUMN responsavel_legal text,
ADD COLUMN cpf_responsavel_legal text,
ADD COLUMN cargo_responsavel_legal text;

-- Rename responsavel to responsavel_tecnico in obras
ALTER TABLE public.obras RENAME COLUMN responsavel TO responsavel_tecnico;

-- Add CREA/CAU field to obras
ALTER TABLE public.obras ADD COLUMN crea_cau text;
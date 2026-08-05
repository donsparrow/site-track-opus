# Correções de acesso do papel Síndico/Cliente (pós-Fase 0)

Objetivo: devolver ao síndico/cliente apenas os acessos legítimos do portal, sem reabrir nenhuma tabela sensível.

## Auditoria — o que quebrou e por quê (verificado no banco e no código)

| # | Tela / recurso | Causa exata verificada | Correção proposta |
|---|---|---|---|
| 1 | Cabeçalho/logo do PDF de relatório | `useEmpresaConfig` (src/features/relatorios/hooks/useObrasRelatorios.ts:42) faz `select('*')` em `configuracoes_empresa`; a política `Empresa view configuracoes` exige `is_operacional()`. Para síndico retorna `null` → PDF sem cabeçalho/logo | Usar a função `get_empresa_branding()` (já existe, SECURITY DEFINER, devolve só `nome_empresa` + `logo_url`) como fallback quando o `select` vier vazio. PDF do síndico sai com nome + logo e sem CNPJ/telefone/e-mail/endereço |
| 2 | Aba Documentação (lista vazia) | **Causa (a), confirmada**: `documentos_pastas` e `documentos_arquivos` têm SELECT com `is_operacional(auth.uid())` — o síndico não lê nenhum registro. Storage **não** é o bloqueio: a policy `Empresa view anexos` já libera por `get_user_empresa_id(owner) = get_user_empresa_id(auth.uid())`, e o uploader é da mesma empresa | Adicionar `visivel_cliente boolean not null default false` em `documentos_arquivos`; nova policy de SELECT para síndico/cliente: `can_access_obra(pasta.obra_id) AND visivel_cliente = true`. Em `documentos_pastas`, liberar a pasta apenas quando ela contiver ao menos um arquivo liberado (evita pastas vazias na tela) |
| 3 | Storage / signed URL — **falha de segurança confirmada** | A policy `Empresa view anexos` libera **qualquer objeto** do bucket cujo dono seja da mesma empresa (`get_user_empresa_id(owner) = get_user_empresa_id(auth.uid())`). Como os caminhos são previsíveis (`financeiro/…`, `manutencao/…`, `documentos/{obra}/{pasta}/…`, `diarios/{diario}/…`), um síndico com o caminho em mãos consegue assinar e baixar anexos financeiros, notas fiscais e documentos não liberados | Reescrever a policy de SELECT do bucket para espelhar a matriz das tabelas (detalhe abaixo) |
| 4 | `ObraDetail.tsx:197` | `configuracoes_empresa … .limit(1).single()` → erro PGRST116 para síndico, podendo derrubar o carregamento da tela | Trocar por `maybeSingle()` + fallback de branding |
| 5 | `useEmpresaConfigCronograma.ts:11` | mesmo padrão `select('*').single()` → a query entra em estado de erro no Cronograma do síndico | `maybeSingle()` + fallback de branding |
| 6 | `useEmpresaNome.ts` | `.single()` em `empresas` — política `Users view own empresa` permite; ok, mas `.single()` quebra se o perfil ainda não tem empresa | Trocar por `maybeSingle()` (robustez) |
| 7 | Configurações / Financeiro / Clientes / Ferramentas | Bloqueio é intencional (matriz da Fase 0) | Sem mudança; menus já ocultos por permissão |
| 8 | Relatórios não assinados, despesas, receitas, parcelas | Bloqueio intencional | Sem mudança |

## Mudanças no banco (migration)

1. `get_empresa_branding(_empresa_id uuid)` — sobrecarga SECURITY DEFINER que retorna **apenas** `nome_empresa` e `logo_url`, validando que o chamador pertence à empresa ou tem obra vinculada a ela. Nunca expõe CNPJ, e-mail, telefone, endereço ou responsável legal.
2. `ALTER TABLE public.documentos_arquivos ADD COLUMN visivel_cliente boolean NOT NULL DEFAULT false;`
3. Novas políticas de SELECT (adicionadas, sem afastar as existentes de operacional):
   - `documentos_arquivos`: síndico/cliente leem quando `visivel_cliente = true` e a pasta pertence a obra vinculada (`can_access_obra`).
   - `documentos_pastas`: síndico/cliente leem a pasta quando existe arquivo liberado nela.
4. Escrita (INSERT/UPDATE/DELETE) permanece exclusiva de admin/trabalhador — inclusive o toggle de `visivel_cliente`.
5. **Nova policy de SELECT do bucket `anexos`** (substitui `Empresa view anexos`), apoiada em `public.can_read_anexo(_name text)` (SECURITY DEFINER):
   - operacional (admin/trabalhador/super_admin) da empresa: mantém o acesso atual;
   - dono do arquivo: mantém;
   - síndico/cliente: `true` somente quando o caminho corresponde a um registro que ele já pode ler pela RLS de tabela —
     - `documentos_arquivos` com `visivel_cliente = true` em obra vinculada,
     - `diario_imagens` / `imagens` de obra vinculada,
     - `assinaturas` de relatório `assinado` de obra vinculada,
     - logo da empresa (`empresa/{empresa_id}/…`);
   - qualquer outro caminho (`financeiro/…`, `manutencao/…`, documentos não liberados) fica bloqueado para síndico/cliente, mesmo com o caminho conhecido.
   A função casa o caminho com a coluna de URL/caminho já normalizada em cada tabela, sem expor colunas sensíveis.

## Mudanças no frontend (camada de dados apenas)

- Fallback de branding via RPC em: `useEmpresaConfig` (relatórios), `useEmpresaConfigCronograma`, `ObraDetail`.
- `single()` → `maybeSingle()` nos pontos 4, 5 e 6.
- Documentação: nenhum ajuste de query necessário — a RLS passa a filtrar. Interruptor "Visível ao cliente" por arquivo para admin/trabalhador na lista de arquivos.

## Checklist de teste (usuário síndico vinculado a 1 obra)

1. Login como síndico: dashboard e obra vinculada carregam sem erro; logo e nome da empresa aparecem.
2. Cronograma da obra vinculada: etapas e progresso visíveis.
3. Relatório **assinado**: abrir e baixar PDF → cabeçalho com **nome + logo**, **sem CNPJ/telefone/e-mail/endereço**.
4. Relatório em rascunho: não aparece na lista.
5. Documentação: só aparecem arquivos com `visivel_cliente = true` da obra vinculada; download abre o arquivo.
6. Arquivo não liberado: não listado **e**, chamando `createSignedUrl` direto com o caminho conhecido, a geração falha.
7. Teste de caminho conhecido: tentar assinar `financeiro/…` e `manutencao/…` como síndico → deve falhar; como admin → deve funcionar.
8. Fotos do diário e assinatura do relatório assinado da obra vinculada continuam abrindo para o síndico.
9. API direta: `select` em `despesas`, `receitas`, `parcelas`, `ferramentas`, `clientes`, `configuracoes_empresa` retorna vazio.
10. Login como admin: PDF continua completo (CNPJ, telefone, e-mail, endereço) e toda a documentação visível.

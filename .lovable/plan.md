# Correção do acesso à Documentação (admin/trabalhador bloqueados)

## Diagnóstico

Verifiquei as regras de acesso atuais e a estrutura das tabelas:

- A coluna `visivel_cliente` **existe** em `documentos_arquivos` (boolean) — não é esse o problema.
- As regras operacionais **não foram esquecidas**: admin/trabalhador/super_admin da empresa têm regra própria em ambas as tabelas, sem depender de `visivel_cliente`.
- O problema real é **recursão cruzada entre as duas tabelas**:
  - a regra de leitura de `documentos_pastas` (caminho síndico/cliente) consulta `documentos_arquivos`;
  - a regra de leitura de `documentos_arquivos` (caminho síndico/cliente) consulta `documentos_pastas`.

Como o Postgres avalia **todas** as regras de uma tabela (não só a que daria acesso), a consulta da página de Documentação entra em avaliação circular e falha com erro para **qualquer** usuário — inclusive admin. Por isso a tela mostra "Não foi possível carregar a documentação" em vez de simplesmente vir vazia.

## Correção proposta

Uma única migração de banco:

1. Criar função auxiliar `public.pasta_visivel_cliente(_pasta_id uuid)` (SECURITY DEFINER, STABLE) que responde se a pasta tem ao menos um arquivo liberado ao cliente — sem passar pelas regras de acesso, quebrando o ciclo.
2. Criar função auxiliar `public.pasta_obra_acessivel(_pasta_id uuid)` (SECURITY DEFINER, STABLE) que devolve a obra da pasta e aplica `can_access_obra`.
3. Recriar as regras de leitura do caminho síndico/cliente usando essas funções, no lugar das subconsultas cruzadas:
   - `documentos_pastas`: síndico/cliente vê a pasta se a obra é vinculada e a pasta tem arquivo liberado.
   - `documentos_arquivos`: síndico/cliente vê o arquivo se `visivel_cliente = true` e a obra da pasta é vinculada.
4. Manter intactas as regras operacionais (admin/trabalhador/super_admin da empresa veem tudo) e as regras de criação/edição/exclusão.

## Verificação após aplicar

- Consultar pastas por obra e arquivos por pasta como admin (deve retornar tudo da empresa).
- Mesmo teste como trabalhador.
- Como síndico: apenas arquivos com `visivel_cliente = true` de obra vinculada, e apenas pastas que contenham esses arquivos.
- Rodar o linter de segurança para confirmar que nada ficou permissivo demais.

Nenhuma alteração de código de frontend é necessária.

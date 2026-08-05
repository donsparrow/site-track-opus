# PDF do síndico idêntico ao do admin (cabeçalho e rodapé)

## O que está errado hoje (verificado no código)

- `get_empresa_branding()` devolve só `nome_empresa` e `logo_url`; para síndico/cliente, CNPJ, telefone, e-mail, site e instagram chegam vazios no gerador.
- Rodapé com valores inventados: `src/lib/pdfRelatorio.ts:131-132` e `src/lib/pdfShared.ts:87-88` usam `'www.engenhariajf.com.br'` e `'@engenhariajf'` como fallback.
- Cabeçalho imprime o endereço da empresa (`pdfRelatorio.ts:193`, `pdfShared.ts:169-170`) — campo que não deve sair pela função filtrada.
- Dados do responsável legal (`responsavel_legal`, `cpf_responsavel_legal`, `cargo_responsavel_legal`): nenhuma ocorrência nos geradores de PDF hoje. Nada a remover, só manter fora.

## Mudanças no banco

Ampliar `public.get_empresa_branding()` (SECURITY DEFINER, mesma checagem de empresa/obra vinculada) para retornar:
`nome_empresa, logo_url, cnpj, telefone, email, site, instagram, texto_rodape`.

Nunca retornar `endereco`, `responsavel_legal`, `cpf_responsavel_legal`, `cargo_responsavel_legal` nem qualquer outra coluna interna. A RLS de `configuracoes_empresa` e o bloqueio da aba Configurações permanecem exatamente como estão.

## Mudanças no frontend

- `src/lib/empresaBranding.ts`: interface e mapeamento passam a carregar os novos campos, mantendo o fallback (linha completa quando o papel pode ler; RPC filtrada caso contrário).
- `src/lib/pdfRelatorio.ts` e `src/lib/pdfShared.ts`:
  - remover os fallbacks hardcoded de site/instagram; usar apenas o que vier cadastrado;
  - montar o rodapé juntando `site`, `instagram` e `texto_rodape` com `|`, omitindo os vazios (se tudo vazio, só a numeração de página);
  - remover a linha de endereço da empresa no cabeçalho, para que admin e síndico gerem exatamente o mesmo bloco (nome, logo, CNPJ, telefone, e-mail).
- Nenhum campo de responsável legal é adicionado ao payload do PDF.

## Teste

1. Mesmo relatório baixado como admin e como síndico: cabeçalho e rodapé idênticos.
2. Rodapé mostra apenas dados reais de `configuracoes_empresa`; sem dados cadastrados, sai só "Página N".
3. Nenhum PDF exibe nome/CPF/cargo do responsável legal.
4. `select` direto em `configuracoes_empresa` como síndico continua vazio e a aba Configurações segue bloqueada.

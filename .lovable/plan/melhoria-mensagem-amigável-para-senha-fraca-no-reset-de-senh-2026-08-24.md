# Melhoria — Mensagem amigável para senha fraca no reset de senha

## O que vai ser feito
Adicionar tratamento específico para o erro de senha fraca retornado pelo `adminClient.auth.admin.updateUserById` na edge function `supabase/functions/admin-reset-password/index.ts`, antes do fallback genérico de 500.

## Por quê
O Supabase pode rejeitar a nova senha com a mensagem "Password is known to be weak and easy to guess, please choose a different one." Hoje a função retorna 500 com a mensagem crua, gerando a runtime error observada. O ajuste mapeia esse caso para 400 com uma mensagem clara em português, preservando o comportamento padrão para outros erros.

## Arquivos alterados
- `supabase/functions/admin-reset-password/index.ts` (linhas ~92–96)

## Mudança cirúrgica
Substituir o bloco:

```ts
if (error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Por:

```ts
if (error) {
  const msg = error.message?.toLowerCase() || "";
  const isWeakPassword = msg.includes("weak") || msg.includes("easy to guess");
  const message = isWeakPassword
    ? "Senha muito fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e símbolos."
    : error.message;
  const status = isWeakPassword ? 400 : 500;

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

## Validação
1. Deploy imediato da edge function.
2. Testar via Supabase Edge Function client com uma senha fraca (ex: "123456") e confirmar retorno 400 + mensagem amigável.
3. Confirmar que senha forte ainda retorna 200/success.

## Escopo
Alteração exclusiva na edge function `admin-reset-password`. Nenhum hook, componente, rota ou configuração será modificado.

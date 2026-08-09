# Remover criação de conta da página inicial

A tela de login passa a ser somente login. Ninguém consegue mais se cadastrar sozinho — novas contas só via convite/cadastro pelo administrador dentro do sistema.

## O que muda

- Remove o link "Não tem conta? Criar conta" no rodapé do formulário.
- Remove o campo "Seu nome" e todo o modo de cadastro do formulário.
- O título fica fixo em "Entrar" e o botão sempre "Entrar".

## Detalhes técnicos

Arquivo: `src/pages/Auth.tsx`

- Elimina o estado `isLogin` e o uso de `signUp` do `useAuth()`.
- `handleSubmit` chama apenas `signIn(email, password)`.
- Remove o bloco `<div className="mt-4 text-center">` com o botão de alternância e o `<Input placeholder="Seu nome">`.
- Nenhuma alteração no `AuthContext`, nas rotas ou no backend — a função `signUp` continua existindo, apenas não é mais exposta nessa tela.

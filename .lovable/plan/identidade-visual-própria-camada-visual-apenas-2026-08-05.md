# Identidade visual própria (camada visual apenas)

Objetivo: tirar o sistema do visual shadcn genérico e dar aparência de ferramenta técnica de engenharia, sem tocar em lógica, hooks ou queries.

## 1. Paleta J&A em tokens

Redefinir as CSS variables em `src/index.css` (claro e escuro) e mapear no `tailwind.config.ts`:

- Primária: `#14213D` (azul-marinho), derivados `#1D2E52` (primary-hover/elevated) e `#33456F` (primary-muted/bordas de destaque)
- Fundo neutro frio: `#F7F8FA`; superfícies de card em branco puro; bordas neutras frias
- Funcionais: sucesso `#1F9D63`, atenção `#C98A21`, crítico `#C0392B` (cada um com `-foreground` legível)
- Sidebar herda a família marinho; acento atual laranja é substituído pelo âmbar funcional para manter coerência

Todas as cores continuam em HSL nas variáveis, como já é o padrão do projeto.

## 2. Tipografia em três níveis

- Display: Space Grotesk (títulos, números grandes) — já carregada
- Corpo: Inter — já carregada
- Mono: JetBrains Mono, adicionada ao import de fontes e exposta como `font-mono` / token `--font-mono`

Aplicação de mono em dados técnicos: datas, valores monetários, percentuais, CNPJ/CREA/ART, números de cadastro, IDs e cabeçalhos de tabela. Isso será feito por classes utilitárias nas células/labels existentes, sem mudar o dado nem sua formatação.

## 3. Forma e hierarquia

- `--radius` de 0.625rem para 0.375rem (6px)
- Card: remover `shadow-sm`, manter borda 1px; hierarquia por peso tipográfico e cor de borda
- Sombra reservada a flutuantes: dropdown, select, popover, dialog, tooltip, sheet
- Padding de card levemente reduzido (p-6 → p-5 no header/content base) para densidade

## 4. Tabelas estilo planilha técnica

Em `src/components/ui/table.tsx`:

- `TableHead`: altura 36px, mono, uppercase, `text-[11px]`, tracking largo, fundo sutil, borda inferior mais marcada
- `TableCell`: padding vertical reduzido (h ~36px, `px-3 py-2`)
- Linhas com borda 1px e hover discreto; zebra leve opcional em `TableRow`

## 5. Badges de status sólidos

Em `src/components/ui/badge.tsx`: raio reduzido (pill → `rounded` 4px), sem gradiente, novas variantes `success`, `warning`, `critical`, `neutral` usando a paleta funcional em fundo sólido discreto com texto de alto contraste. Os pontos do sistema que hoje usam cores hardcoded de status (ferramentas, financeiro, relatórios) passam a usar essas variantes.

## 6. Acessibilidade e mobile

- Anel de foco visível (`--ring`) em todos os controles, contraste AA nos pares texto/fundo
- Alvo de toque mínimo 44px em mobile permanece (regra já existente no CSS)
- Tabelas mantêm rolagem horizontal em telas pequenas

## Detalhes técnicos

Arquivos tocados: `src/index.css`, `tailwind.config.ts`, `src/components/ui/{card,table,badge,button,input,select,dialog,dropdown-menu,popover}.tsx`, e ajustes pontuais de classe (`font-mono`, variantes de badge) nas tabelas e cards das features. Nenhum hook, query, mutation ou regra de negócio é alterado.

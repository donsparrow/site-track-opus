# Fase 2 de Performance — compressão de fotos antes do upload

Sem mudanças de banco, layout, regras de negócio, PDF, assinaturas ou arquivos existentes. Nenhuma biblioteca nova.

## Arquivos (somente estes)

1. **Novo `src/lib/comprimirImagem.ts`** — `comprimirImagem(file): Promise<File>`
   - Processa apenas JPEG/PNG/WebP acima de 500 KB; demais casos retornam o original.
   - `createImageBitmap(file, { imageOrientation: 'from-image' })`, lado maior máx. 1920 px (nunca amplia).
   - Canvas com fundo branco, `toBlob` JPEG 0,8; novo `File` `.jpg` / `image/jpeg`.
   - Resultado maior que o original → original. Qualquer erro → `console.warn` + original.

2. **Novo `src/lib/comprimirImagem.test.ts`** — arquivo < 500 KB retorna o mesmo objeto; `application/pdf` e `image/heic` retornam o original; `createImageBitmap` lançando erro retorna o original sem exceção.

3. **`useDiarioMutations.ts` → apenas `enviarImagem`**: comprimir `v.file` antes de `uploadAnexoComProgresso`; extensão do caminho calculada a partir do arquivo resultante; progresso inalterado.

4. **`useRelatorioFinalMutations.ts` → apenas `adicionarFotos`**: comprimir cada arquivo antes de `uploadRelatorioFinalArquivo`, usando o nome resultante. Capa, modelo de capa e assinatura intocados.

5. **`GaleriaImagens.tsx` → apenas o preview**: gerar a URL uma vez por arquivo (`useMemo`) e revogá-la ao trocar o arquivo ou desmontar (`useEffect`). Visual idêntico.

## Garantia de nomes
Quando `comprimirImagem` devolver o arquivo original (mesmo objeto), o caminho e o nome no armazenamento ficam exatamente como hoje — mesma lógica de extensão/nome atual, sem forçar `.jpg`. Só arquivos efetivamente convertidos usam `.jpg`.

## Validação
- Rodar os testes de `comprimirImagem`.
- Conferir build; se possível, medir no preview o tamanho antes/depois de uma foto de teste e listar os arquivos alterados.

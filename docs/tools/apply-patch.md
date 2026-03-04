---
summary: "Aplique patches multi-arquivo com a ferramenta apply_patch"
read_when:
  - Você precisa de edições estruturadas em múltiplos arquivos
  - Você quer documentar ou depurar edições baseadas em patch
---

# Ferramenta apply_patch

Aplique alterações de arquivo usando um formato de patch estruturado. Isso é ideal para edições multi-arquivo
ou multi-hunk (multi-trecho), onde uma única chamada `edit` seria frágil.

A ferramenta aceita uma única string `input` que envolve uma ou mais operações de arquivo:

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## Parâmetros

- `input` (obrigatório): Conteúdo completo do patch, incluindo `*** Begin Patch` e `*** End Patch`.

## Notas

- Caminhos são resolvidos relativos à raiz do espaço de trabalho (workspace root).
- Use `*** Move to:` dentro de um trecho `*** Update File:` para renomear arquivos.
- `*** End of File` marca uma inserção apenas de EOF quando necessário.
- Experimental e desativado por padrão. Habilite com `tools.exec.applyPatch.enabled`.
- Apenas OpenAI (incluindo OpenAI Codex). Opcionalmente restrinja por modelo via
  `tools.exec.applyPatch.allowModels`.
- Configuração apenas sob `tools.exec`.

## Exemplo

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

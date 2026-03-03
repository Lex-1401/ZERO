# 📐 SPEC: Estabilização do Gateway & Build macOS Ad-Hoc

## 🏗️ 1. ARCHITECTURAL PLAN

- **Strategic Approach:** Forçar a assinatura ad-hoc (`-`) no script de codesign caso não haja identidade de desenvolvedor válida configurada. Isso permite a distribuição de binários autossuficientes para testes locais e desenvolvimento em rede local.
- **Data Flow:** O script de build invoca o `codesign-mac-app.sh`, que injetará as `com.apple.security.network.client` e `server` entitlements.

## 📂 2. FILE MODIFICATIONS (TACTICAL LIST)

| Arquivo | Ação | Descrição da Modificação |
| :--- | :--- | :--- |
| `scripts/codesign-mac-app.sh` | Edit | Garantir que o fallback para `-` (Ad-Hoc) respeite os entitlements de rede. |
| `scripts/package-mac-dist.sh` | Edit | Permitir `ALLOW_ADHOC_SIGNING=1` como flag silenciosa para evitar interrupção. |

## 🧪 3. TEST PLAN

- **Unit Tests:** `pnpm test:unit` para garantir que o core não regressou.
- **Integration:** Executar `dist/ZERO.app/Contents/MacOS/zero gateway status` após o build para validar a integridade do binário empacotado.

## 🏁 4. IMPLEMENTATION CHECKLIST (STEP-BY-STEP)

1. [x] Corrreção de Tipagem (`tsc` passing).
2. [x] Correção de Dependências (`signal-exit` v3).
3. [ ] Ajuste no `scripts/package-mac-dist.sh` para fallback ad-hoc.
4. [ ] Execução de `pnpm mac:package` com flags de ad-hoc.
5. [ ] Validação visual final (8pt grid em logs de CLI/Dashboard).
6. [ ] Gate de Qualidade Master (`pnpm validate`).

---
> **Ação:** Spec criada. Favor limpar janela de contexto (clear context) para iniciar o Coding.

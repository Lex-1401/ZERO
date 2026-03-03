---
summary: "Central de resolução de problemas: sintomas → verificações → correções"
read_when:
  - Você vê um erro e quer o caminho de correção
  - O instalador diz “sucesso”, mas a CLI não funciona
---

# Resolução de Problemas (Troubleshooting)

## Primeiros 60 segundos

Execute estes comandos em ordem:

```bash
zero status
zero status --all
zero gateway probe
zero logs --follow
zero doctor
```

Se o gateway estiver acessível, faça sondagens profundas:

```bash
zero status --deep
```

## Casos comuns de “quebrou”

### `zero: comando não encontrado`

Quase sempre é um problema de PATH do Node/npm. Comece por aqui:

- [Instalação (Sanidade do PATH do Node/npm)](/install#nodejs--npm-path-sanity)

### O instalador falha (ou você precisa dos logs completos)

Execute novamente o instalador em modo detalhado (verbose) para ver o rastreamento completo e a saída do npm:

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.sh | bash -s -- --verbose
```

Para instalações beta:

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.sh | bash -s -- --beta --verbose
```

Você também pode definir `ZERO_VERBOSE=1` em vez da flag.

### Gateway “não autorizado” (unauthorized), não conecta ou fica reconectando

- [Resolução de problemas do Gateway](/gateway/troubleshooting)
- [Autenticação do Gateway](/gateway/authentication)

### A UI de Controle falha em HTTP (identidade do dispositivo exigida)

- [Resolução de problemas do Gateway](/gateway/troubleshooting)
- [UI de Controle](/web/control-ui#insecure-http)

### `docs.zero.local` mostra um erro de SSL (Comcast/Xfinity)

Algumas conexões Comcast/Xfinity bloqueiam `docs.zero.local` via Xfinity Advanced Security.
Desative o Advanced Security ou adicione `docs.zero.local` à lista de permissões e tente novamente.

- Ajuda do Xfinity Advanced Security: <https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security>
- Verificações rápidas de sanidade: tente um hotspot móvel ou VPN para confirmar se é filtragem no nível do ISP.

### O serviço diz que está rodando, mas a sondagem RPC falha

- [Resolução de problemas do Gateway](/gateway/troubleshooting)
- [Processo em segundo plano / serviço](/gateway/background-process)

### Falhas de modelo/autenticação (limite de taxa, cobrança, “todos os modelos falharam”)

- [Modelos](/cli/models)
- [Conceitos de OAuth / autenticação](/concepts/oauth)

### `/model` diz `model not allowed` (modelo não permitido)

Isso geralmente significa que `agents.defaults.models` está configurado como uma lista de permissões (allowlist). Quando não está vazia, apenas essas chaves de provedor/modelo podem ser selecionadas.

- Verifique a lista de permissões: `zero config get agents.defaults.models`
- Adicione o modelo desejado (ou limpe a lista) e tente `/model` novamente
- Use `/models` para navegar pelos provedores/modelos permitidos

### Ao abrir um chamado (issue)

Cole um relatório seguro:

```bash
zero status --all
```

Se puder, inclua o final do log relevante de `zero logs --follow`.

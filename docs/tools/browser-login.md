---
summary: "Logins manuais para automação de navegador + postagem no X/Twitter"
read_when:
  - Você precisa fazer login em sites para automação de navegador
  - Você quer postar atualizações no X/Twitter
---

# Login de navegador + postagem no X/Twitter

## Login manual (recomendado)

Quando um site exige login, **faça login manualmente** no perfil de navegador **host** (o navegador zero).

**Não** forneça suas credenciais ao modelo. Logins automatizados frequentemente acionam defesas anti-bot e podem bloquear a conta.

Voltar para a documentação principal do navegador: [Browser](/tools/browser).

## Qual perfil do Chrome é usado?

O ZERO controla um **perfil dedicado do Chrome** (chamado `zero`, UI com coloração laranja). Isso é separado do seu perfil de navegador diário.

Duas maneiras fáceis de acessá-lo:

1) **Peça ao agente para abrir o navegador** e então faça o login você mesmo.
2) **Abra via CLI**:

```bash
zero browser start
zero browser open https://x.com
```

Se você tiver múltiplos perfis, passe `--browser-profile <nome>` (o padrão é `zero`).

## X/Twitter: fluxo recomendado

- **Ler/pesquisar/threads:** use a habilidade de CLI **bird** (sem navegador, estável).
  - Repositório: <https://github.com/steipete/bird>
- **Postar atualizações:** use o navegador **host** (login manual).

## Sandboxing + acesso ao navegador host

Sessões de navegador em sandbox são **mais propensas** a acionar detecção de bots. Para X/Twitter (e outros sites rigorosos), prefira o navegador **host**.

Se o agente estiver em sandbox, a ferramenta de navegador padroniza para a sandbox. Para permitir o controle do host:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true
        }
      }
    }
  }
}
```

Então direcione para o navegador host:

```bash
zero browser open https://x.com --browser-profile zero --target host
```

Ou desative o sandboxing para o agente que posta atualizações.

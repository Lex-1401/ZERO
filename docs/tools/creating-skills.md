# Criando Habilidades (Skills) Personalizadas 🛠

O ZERO foi projetado para ser facilmente extensível. "Habilidades" (Skills) são a maneira principal de adicionar novas capacidades ao seu assistente.

## O que é uma Habilidade?

Uma habilidade é um diretório contendo um arquivo `SKILL.md` (que fornece instruções e definições de ferramenta para o LLM) e, opcionalmente, alguns scripts ou recursos.

## Passo a Passo: Sua Primeira Habilidade

### 1. Crie o Diretório

As habilidades ficam no seu espaço de trabalho, geralmente `~/zero/skills/`. Crie uma nova pasta para sua habilidade:

```bash
mkdir -p ~/zero/skills/hello-world
```

### 2. Defina o `SKILL.md`

Crie um arquivo `SKILL.md` nesse diretório. Este arquivo usa frontmatter YAML para metadados e Markdown para instruções.

```markdown
---
name: hello_world
description: Uma habilidade simples que diz olá.
---

# Habilidade Olá Mundo
Quando o usuário pedir uma saudação, use a ferramenta `echo` para dizer "Olá da sua habilidade personalizada!".
```

### 3. Adicione Ferramentas (Opcional)

Você pode definir ferramentas personalizadas no frontmatter ou instruir o agente a usar ferramentas de sistema existentes (como `bash` ou `browser`).

### 4. Atualize o ZERO

Peça ao seu agente para "atualizar habilidades" ou reinicie o gateway. O ZERO descobrirá o novo diretório e indexará o `SKILL.md`.

## Melhores Práticas

- **Seja Conciso**: Instrua o modelo sobre *o que* fazer, não como ser uma IA.
- **Segurança Primeiro**: Se sua habilidade usar `bash`, certifique-se de que os prompts não permitem injeção de comandos arbitrários a partir de entradas de usuários não confiáveis.
- **Teste Localmente**: Use `zero agent --message "use my new skill"` para testar.

## Habilidades Compartilhadas

Você também pode navegar e contribuir com habilidades no [ZeroHub](https://zerohub.com).

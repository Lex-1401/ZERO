---
summary: "Execute o ZERO com o Ollama (tempo de execução de LLM local)"
read_when:
  - Você deseja executar o ZERO com modelos locais via Ollama
  - Você precisa de orientação sobre configuração do Ollama
---
# Ollama

O Ollama é um tempo de execução de LLM local que facilita a execução de modelos de código aberto em sua máquina. O ZERO se integra à API compatível com OpenAI do Ollama e pode **descobrir automaticamente modelos capazes de usar ferramentas** quando você opta por usar `OLLAMA_API_KEY` (ou um perfil de autenticação) e não define uma entrada explícita em `models.providers.ollama`.

## Início rápido

1) Instale o Ollama: <https://ollama.ai>

2) Baixe um modelo:

```bash
ollama pull llama3.3
# ou
ollama pull qwen2.5-coder:32b
# ou
ollama pull deepseek-r1:32b
```

1) Ative o Ollama para o ZERO (qualquer valor funciona; o Ollama não requer uma chave real):

```bash
# Definir variável de ambiente
export OLLAMA_API_KEY="ollama-local"

# Ou configurar em seu arquivo de configuração
zero config set models.providers.ollama.apiKey "ollama-local"
```

1) Use modelos Ollama:

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/llama3.3" }
    }
  }
}
```

## Descoberta de modelos (provedor implícito)

Quando você define `OLLAMA_API_KEY` (ou um perfil de autenticação) e **não** define `models.providers.ollama`, o ZERO descobre modelos da instância local do Ollama em `http://127.0.0.1:11434`:

- Consulta `/api/tags` e `/api/show`
- Mantém apenas modelos que relatam capacidade de ferramentas (`tools`)
- Marca como raciocínio (`reasoning`) quando o modelo relata pensamento (`thinking`)
- Lê `contextWindow` de `model_info["<arch>.context_length"]` quando disponível
- Define `maxTokens` como 10x a janela de contexto
- Define todos os custos como `0`

Isso evita entradas manuais de modelos, mantendo o catálogo alinhado com as capacidades do Ollama.

Para ver quais modelos estão disponíveis:

```bash
ollama list
zero models list
```

Para adicionar um novo modelo, basta baixá-lo com o Ollama:

```bash
ollama pull mistral
```

O novo modelo será descoberto automaticamente e estará disponível para uso.

Se você definir `models.providers.ollama` explicitamente, a descoberta automática é ignorada e você deve definir os modelos manualmente (veja abaixo).

## Configuração

### Configuração básica (descoberta implícita)

A maneira mais simples de ativar o Ollama é via variável de ambiente:

```bash
export OLLAMA_API_KEY="ollama-local"
```

### Configuração explícita (modelos manuais)

Use a configuração explícita quando:

- O Ollama roda em outro host/porta.
- Você quer forçar janelas de contexto ou listas de modelos específicas.
- Você quer incluir modelos que não relatam suporte a ferramentas.

```json5
{
  models: {
    providers: {
      ollama: {
        // Use um host que inclua /v1 para APIs compatíveis com OpenAI
        baseUrl: "http://ollama-host:11434/v1",
        apiKey: "ollama-local",
        api: "openai-completions",
        models: [
          {
            id: "llama3.3",
            name: "Llama 3.3",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

Se `OLLAMA_API_KEY` estiver definida, você pode omitir `apiKey` na entrada do provedor e o ZERO a preencherá para verificações de disponibilidade.

### URL base personalizada (configuração explícita)

Se o Ollama estiver rodando em um host ou porta diferente (a configuração explícita desativa a descoberta automática, portanto defina os modelos manualmente):

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434/v1"
      }
    }
  }
}
```

### Seleção de modelos

Uma vez configurado, todos os seus modelos Ollama estarão disponíveis:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/llama3.3",
        fallback: ["ollama/qwen2.5-coder:32b"]
      }
    }
  }
}
```

## Avançado

### Modelos de raciocínio

O ZERO marca modelos como capazes de raciocínio quando o Ollama relata `thinking` em `/api/show`:

```bash
ollama pull deepseek-r1:32b
```

### Custos dos Modelos

O Ollama é gratuito e roda localmente, portanto todos os custos dos modelos são definidos como $0.

### Janelas de contexto

Para modelos descobertos automaticamente, o ZERO usa a janela de contexto relatada pelo Ollama quando disponível, caso contrário, o padrão é `8192`. Você pode substituir `contextWindow` e `maxTokens` na configuração explícita do provedor.

## Solução de problemas

### Ollama não detectado

Certifique-se de que o Ollama está rodando e que você definiu `OLLAMA_API_KEY` (ou um perfil de autenticação), e que você **não** definiu uma entrada explícita em `models.providers.ollama`:

```bash
ollama serve
```

E que a API está acessível:

```bash
curl http://localhost:11434/api/tags
```

### Nenhum modelo disponível

O ZERO descobre automaticamente apenas modelos que relatam suporte a ferramentas. Se o seu modelo não estiver listado, você deverá:

- Baixar um modelo capaz de usar ferramentas, ou
- Definir o modelo explicitamente em `models.providers.ollama`.

Para adicionar modelos:

```bash
ollama list  # Veja o que está instalado
ollama pull llama3.3  # Baixe um modelo
```

### Conexão recusada

Verifique se o Ollama está rodando na porta correta:

```bash
# Verifique se o Ollama está rodando
ps aux | grep ollama

# Ou reinicie o Ollama
ollama serve
```

## Veja também

- [Provedores de Modelos](/concepts/model-providers) - Visão geral de todos os provedores
- [Seleção de Modelos](/concepts/models) - Como escolher modelos
- [Configuração](/gateway/configuration) - Referência completa de configuração

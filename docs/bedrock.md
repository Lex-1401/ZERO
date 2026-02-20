---
summary: "Use modelos do Amazon Bedrock (via Converse API) com o ZERO"
read_when:
  - Você deseja usar modelos do Amazon Bedrock com o ZERO
  - Você precisa configurar credenciais/região da AWS para chamadas de modelo
---

# Amazon Bedrock

O ZERO pode usar modelos do **Amazon Bedrock** através do provedor de fluxo (stream) **Bedrock Converse** do pi‑ai. A autenticação do Bedrock usa a **cadeia de credenciais padrão do SDK da AWS**, não uma chave de API simples.

## O que o pi‑ai suporta

- Provedor: `amazon-bedrock`
- API: `bedrock-converse-stream`
- Autenticação: Credenciais AWS (variáveis de ambiente, configuração compartilhada ou função de instância)
- Região: `AWS_REGION` ou `AWS_DEFAULT_REGION` (padrão: `us-east-1`)

## Descoberta automática de modelos

Se credenciais da AWS forem detectadas, o ZERO pode descobrir automaticamente modelos do Bedrock que suportam **fluxo (streaming)** e **saída de texto**. A descoberta usa `bedrock:ListFoundationModels` e é armazenada em cache (padrão: 1 hora).

As opções de configuração residem sob `models.bedrockDiscovery`:

```json5
{
  models: {
    bedrockDiscovery: {
      enabled: true,
      region: "us-east-1",
      providerFilter: ["anthropic", "amazon"],
      refreshInterval: 3600,
      defaultContextWindow: 32000,
      defaultMaxTokens: 4096
    }
  }
}
```

Notas:

- `enabled` (ativado) assume `true` como padrão quando credenciais da AWS estão presentes.
- `region` assume como padrão `AWS_REGION` ou `AWS_DEFAULT_REGION`, depois `us-east-1`.
- `providerFilter` (filtro de provedor) corresponde aos nomes de provedores do Bedrock (por exemplo, `anthropic`).
- `refreshInterval` (intervalo de atualização) é em segundos; defina como `0` para desativar o cache.
- `defaultContextWindow` (janela de contexto padrão: `32000`) e `defaultMaxTokens` (máximo de tokens padrão: `4096`) são usados para modelos descobertos (substitua se você souber os limites do seu modelo).

## Configuração (manual)

1) Certifique-se de que as credenciais da AWS estejam disponíveis no **host do gateway**:

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# Opcional:
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="seu-perfil"
# Opcional (chave de API do Bedrock/token portador):
export AWS_BEARER_TOKEN_BEDROCK="..."
```

1) Adicione um provedor Bedrock e um modelo à sua configuração (não é necessário `apiKey`):

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "anthropic.claude-opus-4-5-20251101-v1:0",
            name: "Claude Opus 4.5 (Bedrock)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0" }
    }
  }
}
```

## Funções de Instância EC2 (Instance Roles)

Ao executar o ZERO em uma instância EC2 com uma função IAM anexada, o SDK da AWS usará automaticamente o serviço de metadados da instância (IMDS) para autenticação. No entanto, a detecção de credenciais do ZERO atualmente verifica apenas variáveis de ambiente, não credenciais IMDS.

**Solução alternativa:** Defina `AWS_PROFILE=default` para sinalizar que as credenciais da AWS estão disponíveis. A autenticação real ainda usará a função de instância via IMDS.

```bash
# Adicione ao seu ~/.bashrc ou perfil de shell
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**Permissões IAM necessárias** para a função da instância EC2:

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` (para descoberta automática)

Ou anexe a política gerenciada `AmazonBedrockFullAccess`.

**Configuração rápida:**

```bash
# 1. Crie a função IAM e o perfil de instância
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. Anexe à sua instância EC2
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. Na instância EC2, ative a descoberta
zero config set models.bedrockDiscovery.enabled true
zero config set models.bedrockDiscovery.region us-east-1

# 4. Configure as variáveis de ambiente de contorno
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verifique se os modelos foram descobertos
zero models list
```

## Notas

- O Bedrock requer o **acesso ao modelo** (model access) ativado em sua conta/região da AWS.
- A descoberta automática precisa da permissão `bedrock:ListFoundationModels`.
- Se você usar perfis, defina `AWS_PROFILE` no host do gateway.
- O ZERO prioriza a fonte de credenciais nesta ordem: `AWS_BEARER_TOKEN_BEDROCK`, depois `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, depois `AWS_PROFILE`, e por fim a cadeia padrão do SDK da AWS.
- O suporte ao raciocínio (reasoning) depende do modelo; verifique o cartão do modelo no Bedrock para as capacidades atuais.
- Se preferir um fluxo de chave gerenciada, você também pode colocar um proxy compatível com OpenAI à frente do Bedrock e configurá-lo como um provedor OpenAI.

---
summary: "Persistência de permissões do macOS (TCC) e requisitos de assinatura"
read_when:
  - Depurando solicitações de permissão do macOS ausentes ou travadas
  - Empacotando ou assinando o app macOS
  - Alterando IDs de pacote (bundle IDs) ou caminhos de instalação do app
---
# Permissões do macOS (TCC)

As concessões de permissão do macOS são frágeis. O TCC associa uma concessão de permissão à assinatura de código do app, ao identificador do pacote (bundle identifier) e ao caminho no disco. Se qualquer um desses mudar, o macOS trata o app como novo e pode descartar ou ocultar as solicitações.

## Requisitos para permissões estáveis

- Mesmo caminho: execute o app a partir de um local fixo (para o ZERO, `dist/ZERO.app`).
- Mesmo identificador de pacote: alterar o ID do pacote cria uma nova identidade de permissão.
- App assinado: builds não assinados ou com assinatura ad-hoc não persistem permissões.
- Assinatura consistente: use um certificado real de Desenvolvimento Apple ou Developer ID para que a assinatura permaneça estável entre builds.

Assinaturas ad-hoc geram uma nova identidade a cada build. O macOS esquecerá as concessões anteriores e as solicitações podem desaparecer inteiramente até que as entradas obsoletas sejam limpas.

## Checklist de recuperação quando as solicitações desaparecem

1. Encerre o app.
2. Remova a entrada do app em Ajustes do Sistema -> Privacidade e Segurança.
3. Reinicie o app a partir do mesmo caminho e conceda as permissões novamente.
4. Se a solicitação ainda não aparecer, resete as entradas do TCC com `tccutil` e tente novamente.
5. Algumas permissões só reaparecem após uma reinicialização completa do macOS.

Exemplos de reset (substitua o ID do pacote conforme necessário):

```bash
sudo tccutil reset Accessibility com.zero.mac
sudo tccutil reset ScreenCapture com.zero.mac
sudo tccutil reset AppleEvents
```

Se você estiver testando permissões, sempre assine com um certificado real. Builds ad-hoc são aceitáveis apenas para execuções locais rápidas onde as permissões não importam.

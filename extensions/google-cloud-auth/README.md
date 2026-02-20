# Google Google Cloud Auth Auth (Zero plugin)

OAuth provider plugin for **Google Google Cloud Auth** (Cloud Code Assist).

## Enable

Bundled plugins are disabled by default. Enable this one:

```bash
zero plugins enable google-cloud-auth-auth
```

Restart the Gateway after enabling.

## Authenticate

```bash
zero models auth login --provider google-cloud-auth --set-default
```

## Notes

- Google Cloud Auth uses Google Cloud project quotas.
- If requests fail, ensure Gemini for Google Cloud is enabled.

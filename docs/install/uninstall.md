---
summary: "Uninstall ZERO completely (CLI, service, state, workspace)"
read_when:
  - You want to remove ZERO from a machine
  - The gateway service is still running after uninstall
---

# Uninstall

Two paths:
- **Easy path** if `zero` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
zero uninstall
```

Non-interactive (automation / npx):

```bash
zero uninstall --all --yes --non-interactive
npx -y zero uninstall --all --yes --non-interactive
```

Manual steps (same result):

1) Stop the gateway service:

```bash
zero gateway stop
```

2) Uninstall the gateway service (launchd/systemd/schtasks):

```bash
zero gateway uninstall
```

3) Delete state + config:

```bash
rm -rf "${ZERO_STATE_DIR:-$HOME/.zero}"
```

If you set `ZERO_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4) Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/zero
```

5) Remove the CLI install (pick the one you used):

```bash
npm rm -g zero
pnpm remove -g zero
bun remove -g zero
```

6) If you installed the macOS app:

```bash
rm -rf /Applications/ZERO.app
```

Notes:
- If you used profiles (`--profile` / `ZERO_PROFILE`), repeat step 3 for each state dir (defaults are `~/.zero-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `zero` is missing.

### macOS (launchd)

Default label is `com.zero.gateway` (or `com.zero.<profile>`):

```bash
launchctl bootout gui/$UID/com.zero.gateway
rm -f ~/Library/LaunchAgents/com.zero.gateway.plist
```

If you used a profile, replace the label and plist name with `com.zero.<profile>`.

### Linux (systemd user unit)

Default unit name is `zero-gateway.service` (or `zero-gateway-<profile>.service`):

```bash
systemctl --user disable --now zero-gateway.service
rm -f ~/.config/systemd/user/zero-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `ZERO Gateway` (or `ZERO Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "ZERO Gateway"
Remove-Item -Force "$env:USERPROFILE\.zero\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.zero-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://zero.local/install.sh` or `install.ps1`, the CLI was installed with `npm install -g zero@latest`.
Remove it with `npm rm -g zero` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `zero ...` / `bun run zero ...`):

1) Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2) Delete the repo directory.
3) Remove state + workspace as shown above.

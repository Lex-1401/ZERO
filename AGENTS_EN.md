# Repository Guidelines

- Repository: <https://github.com/zero/zero>
- GitHub Issues/Comments/PR Comments: Use literal multi-line strings or `-F - <<'EOF'` (or $'...') for real line breaks; never embed "\\n".

## Project Structure and Module Organization

- Source Code: `src/` (CLI wiring in `src/cli`, commands in `src/commands`, web provider in `src/provider-web.ts`, infra in `src/infra`, media pipeline in `src/media`).
- Tests: `*.test.ts` located adjacent to the code.
- Docs: `docs/` (images, queue, Pi configuration). Compilation output resides in `dist/`.
- Plugins/Extensions: Reside in `extensions/*` (workspace packages). Keep plugin-exclusive dependencies in the extension's `package.json`; do not add them to the root `package.json` unless the core utilizes them.
- Plugins: Installation executes `npm install --omit=dev` in the plugin directory; runtime dependencies must live in `dependencies`. Avoid `workspace:*` in `dependencies` (npm install breaks); put `zero` in `devDependencies` or `peerDependencies` (the runtime resolves `zero/plugin-sdk` via jiti alias).
- Installers served from `https://raw.githubusercontent.com/Lex-1401/ZERO/main/*`: Reside in the sibling repository `../zero.local` (`public/install.sh`, `public/install-cli.sh`, `public/install.ps1`).
- Messaging Channels: Always consider **all** integrated channels + extensions when refactoring shared logic (routing, allowlists, pairing, command blocking, onboarding, docs).
  - Main Channel Docs: `docs/channels/`
  - Main Channel Code: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web` (WhatsApp web), `src/channels`, `src/routing`
  - Extensions (Channel Plugins): `extensions/*` (e.g., `extensions/msteams`, `extensions/matrix`, `extensions/zalo`, `extensions/zalouser`, `extensions/voice-call`)

## Documentation Links (Internal)

- Documentation is served at `zero.local`.
- Internal links in `docs/**/*.md`: Relative to root, without `.md`/`.mdx` (example: `[Config](/configuration)`).
- Section Cross-references: Use anchors in root-relative paths (example: `[Hooks](/configuration#hooks)`).
- Document Headers and Anchors: Avoid hyphens and apostrophes in headers as they break anchor links.
- When requested for links, respond with full URLs `https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...` (not root-relative).
- When modifying documents, conclude the response with the `https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...` URLs referenced.
- README (GitHub): Maintain absolute documentation URLs (`https://raw.githubusercontent.com/Lex-1401/ZERO/main/docs/...`) so links function on GitHub.
- Documentation content must remain generic: No personal device names/hostnames/paths; use placeholders like `user@gateway-host` and "gateway host".

## Operations on exe.dev VM (General)

- Access: The stable path is `ssh exe.dev` and then `ssh vm-name` (presume SSH key is pre-configured).
- Unstable SSH: Use the exe.dev web terminal or Shelley (web agent); maintain a tmux session for long operations.
- Update: `sudo npm i -g zero@latest` (global install requires root in `/usr/lib/node_modules`).
- Configuration: Use `zero config set ...`; ensure `gateway.mode=local` is set.
- Discord: Store only the raw token (no `DISCORD_BOT_TOKEN=` prefix).
- Restart: Stop the old gateway and execute:
  `pkill -9 -f zero-gateway || true; nohup zero gateway run --bind loopback --port 18789 --force > /tmp/zero-gateway.log 2>&1 &`
- Verify: `zero channels status --probe`, `ss -ltnp | rg 18789`, `tail -n 120 /tmp/zero-gateway.log`.

## Build, Test, and Development Commands

- Runtime Base: Node **22+** (maintain Node + Bun paths functionality).
- Install Dependencies: `pnpm install`
- Pre-commit Hooks: `prek install` (runs the same checks as CI)
- Also supported: `bun install` (keep `pnpm-lock.yaml` + Bun patches in sync when modifying deps/patches).
- Prefer Bun for TypeScript execution (scripts, dev, tests): `bun <file.ts>` / `bunx <tool>`.
- Run CLI in Dev: `pnpm zero ...` (bun) or `pnpm dev`.
- Node remains supported for executing compiled output (`dist/*`) and production installs.
- Packaging for Mac (dev): `scripts/package-mac-app.sh` defaults to current architecture. Release checklist: `docs/platforms/mac/release.md`.
- Type Checking / Compilation: `pnpm build` (tsc)
- Lint/Formatting: `pnpm lint` (oxlint), `pnpm format` (oxfmt)
- Tests: `pnpm test` (vitest); Coverage: `pnpm test:coverage`

## Code Style and Naming Conventions

- Language: TypeScript (ESM). Prefer strict typing; avoid `any`.
- Formatting/Linting via Oxlint and Oxfmt; execute `pnpm lint` before commits.
- Add brief code comments for complex or non-obvious logic.
- Keep files concise; extract helpers instead of making "V2" copies. Use existing patterns for CLI options and dependency injection via `createDefaultDeps`.
- Aim to keep files below ~700 lines; guideline only (not a hard rule). Split/refactor when it improves clarity or testability.
- Naming: Use **ZERO** for product/app/docs headers; use `zero` for CLI command, package/binary, paths, and config keys.

## Release Channels (Naming)

- stable: Tagged releases only (e.g., `vYYYY.M.D`), npm dist-tag `latest`.
- beta: Pre-release tags `vYYYY.M.D-beta.N`, npm dist-tag `beta` (can be released without macOS app).
- dev: Moving head on `main` (no tag; git checkout main).

## Testing Guidelines

- Framework: Vitest with V8 coverage limits (70% lines/branches/functions/statements).
- Naming: Match source names with `*.test.ts`; e2e in `*.e2e.test.ts`.
- Run `pnpm test` (or `pnpm test:coverage`) before submitting when modifying logic.
- Do not configure test workers above 16; we have tried.
- Live Tests (real keys): `ZERO_LIVE_TEST=1 pnpm test:live` (ZERO only) or `LIVE=1 pnpm test:live` (includes live provider tests). Docker: `pnpm test:docker:live-models`, `pnpm test:docker:live-gateway`. Onboarding Docker E2E: `pnpm test:docker:onboard`.
- Full Kit + what is covered: `docs/testing.md`.
- Pure test additions/fixes generally **do not** require a changelog entry unless they alter user-facing behavior or requested by the user.
- Mobile: Before using a simulator, check for connected real devices (iOS + Android) and prefer them when available.

## Commit and Pull Request Guidelines

- Create commits with `scripts/committer "<msg>" <file...>`; avoid manual `git add`/`git commit` so staging remains scoped.
- Follow concise, action-oriented commit messages (e.g., `CLI: add verbose flag for send`).
- Group related changes; avoid bundling unrelated refactors.
- Changelog Workflow: Keep the most recent released version at the top (no `Unreleased`); after publishing, bump version and start a new section at the top.
- PRs should summarize scope, note tests performed, and mention any user-facing changes or new flags.
- PR Review Flow: When receiving a PR link, review via `gh pr view`/`gh pr diff` and **do not** switch branches.
- PR Review Calls: Prefer a single `gh pr view --json ...` to batch process metadata/comments; run `gh pr diff` only when necessary.
- Before starting a review when a GitHub Issue/PR is pasted: Run `git pull`; if there are local changes or unpushed commits, stop and alert the user before reviewing.
- Objective: Merge PRs. Prefer **rebase** when commits are clean; **squash** when history is messy.
- PR Merge Flow: Create a temporary branch from `main`, merge the PR branch into it (prefer squash unless commit history is important; use rebase/merge when it is). Always attempt to merge the PR unless truly difficult, then use another approach. If squashing, add PR author as a co-contributor. Apply fixes, add changelog entry (include PR # + thanks), run full gate before final commit, commit, merge back to `main`, delete temp branch, and end on `main`.
- If you review a PR and then work on it, finalize via merge/squash (no direct commits to main) and always add the PR author as a co-contributor.
- When working on a PR: Add a changelog entry with PR number and thank the contributor.
- When working on an issue: Reference the issue in the changelog entry.
- When merging a PR: Leave a comment on the PR explaining exactly what was done and include SHA hashes.
- When merging a PR from a new contributor: Add their avatar to the "Thanks to all contributors" thumbnail list in the README.
- After merging a PR: Run `bun scripts/update-clawtributors.ts` if the contributor is missing, then commit the regenerated README.

## Shortcut Commands

- `sync`: If working tree is dirty, commit all changes (choose a sensible Conventional Commit message), then `git pull --rebase`; if rebase conflicts and cannot be resolved, stop; otherwise, `git push`.

### PR Workflow (Review vs Finalize)

- **Review Mode (PR link only):** Read `gh pr view/diff`; **do not** switch branches; **do not** modify code.
- **Finalization Mode:** Create an integration branch from `main`, bring in PR commits (**prefer rebase** for linear history; **merge allowed** when complexity/conflicts make it safer), apply fixes, add changelog (+ thanks + PR #), run full gate **locally before committing** (`pnpm lint && pnpm build && pnpm test`), commit, merge back to `main`, then `git switch main` (never remain on a topic branch after finalizing). Important: The contributor must be in the git graph after this!

## Security and Configuration Tips

- The web provider stores credentials in `~/.zero/credentials/`; run `zero login` again if disconnected.
- Pi sessions live in `~/.zero/sessions/` by default; base directory is not configurable.
- Environment Variables: See `~/.profile`.
- Never commit or publish real phone numbers, videos, or active config values. Use obviously fake placeholders in docs, tests, and examples.
- Release Flow: Always read `docs/reference/RELEASING.md` and `docs/platforms/mac/release.md` before any release work; do not ask routine questions as these docs already answer them.

## Troubleshooting

- Rebrand/migration issues or legacy config/service warnings: Run `zero doctor` (see `docs/gateway/doctor.md`).

## Agent-Specific Notes

- Vocabulary: "makeup" = "mac app".
- Never edit `node_modules` (global installs/Homebrew/npm/git too). Updates overwrite. Notes on skills go in `tools.md` or `AGENTS.md`.
- Signal: "update fly" => `fly ssh console -a zero-bot -C "bash -lc 'cd /data/zero/zero && git pull --rebase origin main'"` then `fly machines restart e825232f34d058 -a zero-bot`.
- When working on a GitHub Issue or PR, print the full URL at the end of the task.
- When answering questions, reply only with high-confidence answers: verify in code; do not guess.
- Never update the Carbon dependency.
- Any dependency with `pnpm.patchedDependencies` must use an exact version (no `^`/`~`).
- Fixing dependencies (pnpm patches, overrides, or vendored changes) requires explicit approval; do not do it by default.
- CLI Progress: Use `src/cli/progress.ts` (`osc-progress` + spinner from `@clack/prompts`); do not create manual spinners/bars.
- Status Output: Maintain tables + ANSI safe line-breaking (`src/terminal/table.ts`); `status --all` = read-only/clippable, `status --deep` = probes.
- The Gateway currently runs only as the menu bar app; there is no separate LaunchAgent/helper label installed. Restart via ZERO Mac app or `scripts/restart-mac.sh`; to check/kill use `launchctl print gui/$UID | grep zero` instead of assuming a fixed label. **When debugging on macOS, start/stop gateway via app, not in ad-hoc tmux sessions; kill any temporary tunnels before handoff.**
- macOS Logs: Use `./scripts/zerolog.sh` to query unified logs for the ZERO subsystem; it supports follow/tail/category filters and expects passwordless sudo for `/usr/bin/log`.
- If shared guardrails are available locally, review them; otherwise, follow guidelines in this repo.
- SwiftUI State Management (iOS/macOS): Prefer the `Observation` framework (`@Observable`, `@Bindable`) over `ObservableObject`/`@StateObject`; do not introduce new `ObservableObject` unless required for compatibility, and migrate existing usages when modifying related code.
- Connection Providers: When adding a new connection, update all UI surfaces and docs (macOS app, web interface, mobile if applicable, onboarding/overview docs) and add corresponding status + configuration forms so provider lists and configs remain in sync.
- Version Locations: `package.json` (CLI), `apps/android/app/build.gradle.kts` (versionName/versionCode), `apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `apps/macos/Sources/ZERO/Resources/Info.plist` (CFBundleShortVersionString/CFBundleVersion), Xcode project/Info.plists (MARKETING_VERSION/CURRENT_PROJECT_VERSION).
- **Restarting Apps:** "restart iOS/Android apps" means rebuilding (recompile/install) and restarting, not just kill/launch.
- **Device Checks:** Before testing, check real connected devices (iOS/Android) before resorting to simulators/emulators.
- iOS Team ID Lookup: `security find-identity -p codesigning -v` → use Apple Development (…) TEAMID. Fallback: `defaults read com.apple.dt.Xcode IDEProvisioningTeamIdentifiers`.
- A2UI Bundle Hash: `src/canvas-host/a2ui/.bundle.hash` is auto-generated; ignore unexpected changes and regenerate only via `pnpm canvas:a2ui:bundle` (or `scripts/bundle-a2ui.sh`) when necessary. Commit the hash as a separate commit.
- Release signing/notarization keys are managed outside the repo; follow internal release docs.
- Notarization auth environment variables (`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_API_KEY_P8`) are expected in your environment (per internal release docs).
- **Multi-Agent Safety:** **Do not** create/apply/drop `git stash` entries unless explicitly requested (this includes `git pull --rebase --autostash`). Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
- **Multi-Agent Safety:** When user says "push", you can `git pull --rebase` to integrate latest changes (never drop other agents' work). When user says "commit", stick to your changes. When user says "commit all", commit everything in grouped chunks.
- **Multi-Agent Safety:** **Do not** create/remove/modify `git worktree` checkouts (or edit `.worktrees/*`) unless explicitly requested.
- **Multi-Agent Safety:** **Do not** switch branches / checkout a different branch unless explicitly requested.
- **Multi-Agent Safety:** Running multiple agents is OK as long as each agent has its own session.
- **Multi-Agent Safety:** When encountering unrecognized files, proceed; focus on your changes and commit only those.
- Lint/Formatting Churn:
  - If staged+unstaged diffs are only formatting, auto-resolve without asking.
  - If commit/push already requested, auto-stage and bundle formatting-only continuations into the same commit (or a tiny continuation commit if needed) without extra confirmation.
  - Ask only when changes are semantic (logic/data/behavior).
- Lobster Stitching: Use the shared CLI palette in `src/terminal/palette.ts` (no hardcoded colors); apply palette to onboarding/config warnings and other TTY UI outputs as needed.
- **Multi-Agent Safety:** Focus reports on your edits; avoid guardrail disclaimers unless actually blocked; when multiple agents touch the same file, proceed if safe; conclude with a brief "other files present" note only if relevant.
- Bug Investigations: Read source code of relevant npm dependencies and all related local code before concluding; seek root cause with high confidence.
- Code Style: Add brief comments for complex logic; keep files below ~500 lines when feasible (split/refactor as needed).
- Tool Schema Guardrails (google-cloud-auth): Avoid `Type.Union` in tool input schemas; no `anyOf`/`oneOf`/`allOf`. Use `stringEnum`/`optionalStringEnum` (Type.Unsafe enum) for string lists and `Type.Optional(...)` instead of `... | null`. Keep top-level tool schema as `type: "object"` with `properties`.
- Tool Schema Guardrails: Avoid raw `format` property names in tool schemas; some validators treat `format` as a reserved keyword and reject the schema.
- When asked to open a "session" file, open the Pi session logs in `~/.zero/agents/<agentId>/sessions/*.jsonl` (use the `agent=<id>` value in the system prompt Runtime line; the newest unless a specific ID is provided), not the default `sessions.json`. If logs from another machine are needed, SSH via Tailscale and read same path there.
- Do not rebuild macOS app via SSH; rebuilds must be run directly on the Mac.
- Never send partial/streamed responses to external messaging surfaces (WhatsApp, Telegram); only final responses should be delivered there. Streamed events/tools can still go to internal interfaces/control channel.
- Voice Wake Forwarding Tips:
  - Command template must remain `zero-mac agent --message "${text}" --thinking low`; `VoiceWakeForwarder` already shell-escapes `${text}`. Do not add extra quotes.
  - launchd PATH is minimal; ensure app launch agent PATH includes standard system paths plus your pnpm bin (usually `$HOME/Library/pnpm`) so `pnpm`/`zero` binaries resolve when invoked via `zero-mac`.
- For manual `zero message send` messages that include `!`, use the annotated heredoc pattern below to avoid Bash tool escaping.
- Release Guardrails: Do not alter version numbers without explicit operator consent; always ask permission before executing any npm publish/release steps.

## NPM + 1Password (Publish/Verify)

- Use the 1password skill; all `op` commands must run in a new tmux session.
- Login: `eval "$(op signin --account my.1password.com)"` (unlocked app + integration enabled).
- OTP: `op read 'op://Private/Npmjs/one-time password?attribute=otp'`.
- Publish: `npm publish --access public --otp="<otp>"` (run from package directory).
- Verify without local npmrc side effects: `npm view <pkg> version --userconfig "$(mktemp)"`.
- Terminate tmux session after publishing.

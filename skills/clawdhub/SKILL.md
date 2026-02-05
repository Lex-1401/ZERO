---
name: zerohub
description: Use the ZeroHub CLI to search, install, update, and publish agent skills from zerohub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed zerohub CLI.
metadata: {"zero":{"requires":{"bins":["zerohub"]},"install":[{"id":"node","kind":"node","package":"zerohub","bins":["zerohub"],"label":"Install ZeroHub CLI (npm)"}]}}
---

# ZeroHub CLI

Install
```bash
npm i -g zerohub
```

Auth (publish)
```bash
zerohub login
zerohub whoami
```

Search
```bash
zerohub search "postgres backups"
```

Install
```bash
zerohub install my-skill
zerohub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)
```bash
zerohub update my-skill
zerohub update my-skill --version 1.2.3
zerohub update --all
zerohub update my-skill --force
zerohub update --all --no-input --force
```

List
```bash
zerohub list
```

Publish
```bash
zerohub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes
- Default registry: https://zerohub.com (override with CLAWDHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to Zero workspace); install dir: ./skills (override with --workdir / --dir / CLAWDHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set

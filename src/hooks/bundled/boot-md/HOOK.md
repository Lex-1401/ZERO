---
name: boot-md
description: "Run BOOT.md on gateway startup"
homepage: https://docs.zero.bot/hooks#boot-md
metadata:
  {
    "zero":
      {
        "emoji": "🚀",
        "events": ["gateway:startup"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with ZERO" }],
      },
  }
---

# Boot Checklist Hook

Runs `BOOT.md` every time the gateway starts, if the file exists in the workspace.

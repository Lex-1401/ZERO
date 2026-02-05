---
name: Supabase Tool
description: Manage Supabase projects and database migrations
---

# Supabase Tool

Integrates with the `supabase` CLI for backend management.

## Prerequisites

- Install Supabase CLI: `brew install supabase/tap/supabase` (or via npm)
- Login: `supabase login`

## Actions

### Initialize

Initialize Supabase in the current project.

```bash
supabase init
```

### Start Local

Start the local Supabase stack.

```bash
supabase start
```

### Stop Local

Stop the local Supabase stack.

```bash
supabase stop
```

### Status

Check the status of the local stack.

```bash
supabase status
```

### Migration New

Create a new migration file.

```bash
supabase migration new <migration_name>
```

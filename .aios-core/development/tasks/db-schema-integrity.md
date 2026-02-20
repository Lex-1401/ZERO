# Task: Schema Integrity Check

**Purpose**: Comprehensive verification of database schema quality and best practices

**Elicit**: false

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)

- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Simple, deterministic tasks

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**

- Explicit decision checkpoints
- Educational explanations
- **Best for:** Learning, complex decisions

### 3. Pre-Flight Planning - Comprehensive Upfront Planning

- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Ambiguous requirements, critical work

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: dbSchemaIntegrity()
responsável: Dara (Sage)
responsavel_type: Agente
atomic_layer: Strategy

**Entrada:**
- campo: query
  tipo: string
  origem: User Input
  obrigatório: true
  validação: Valid SQL query

- campo: params
  tipo: object
  origem: User Input
  obrigatório: false
  validação: Query parameters

- campo: connection
  tipo: object
  origem: config
  obrigatório: true
  validação: Valid PostgreSQL connection via Supabase

**Saída:**
- campo: query_result
  tipo: array
  destino: Memory
  persistido: false

- campo: records_affected
  tipo: number
  destino: Return value
  persistido: false

- campo: execution_time
  tipo: number
  destino: Memory
  persistido: false
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - [ ] Database connection established; query syntax valid
    tipo: pre-condition
    blocker: true
    validação: |
      Check database connection established; query syntax valid
    error_message: "Pre-condition failed: Database connection established; query syntax valid"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - [ ] Query executed; results returned; transaction committed
    tipo: post-condition
    blocker: true
    validação: |
      Verify query executed; results returned; transaction committed
    error_message: "Post-condition failed: Query executed; results returned; transaction committed"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - [ ] Data persisted correctly; constraints respected; no orphaned data
    tipo: acceptance-criterion
    blocker: true
    validação: |
      Assert data persisted correctly; constraints respected; no orphaned data
    error_message: "Acceptance criterion not met: Data persisted correctly; constraints respected; no orphaned data"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** neo4j-driver
  - **Purpose:** Neo4j database connection and query execution
  - **Source:** npm: neo4j-driver

- **Tool:** query-validator
  - **Purpose:** Cypher query syntax validation
  - **Source:** .aios-core/utils/db-query-validator.js

---

## Scripts

**Agent-specific code for this task:**

- **Script:** db-query.js
  - **Purpose:** Execute Neo4j queries with error handling
  - **Language:** JavaScript
  - **Location:** .aios-core/scripts/db-query.js

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Connection Failed
   - **Cause:** Unable to connect to Neo4j database
   - **Resolution:** Check connection string, credentials, network
   - **Recovery:** Retry with exponential backoff (max 3 attempts)

2. **Error:** Query Syntax Error
   - **Cause:** Invalid Cypher query syntax
   - **Resolution:** Validate query syntax before execution
   - **Recovery:** Return detailed syntax error, suggest fix

3. **Error:** Transaction Rollback
   - **Cause:** Query violates constraints or timeout
   - **Resolution:** Review query logic and constraints
   - **Recovery:** Automatic rollback, preserve data integrity

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 5-20 min (estimated)
cost_estimated: $0.003-0.015
token_usage: ~2,000-8,000 tokens
```

**Optimization Notes:**

- Iterative analysis with depth limits; cache intermediate results; batch similar operations

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - N/A
tags:
  - database
  - infrastructure
updated_at: 2026-02-20
```

---

## Overview

This task performs a thorough verification of your database schema, checking for:

- Design best practices
- Performance issues
- Security gaps
- Data integrity risks
- Missing indexes
- Naming conventions

---

## Process

### 1. Collect Schema Metadata

Gather comprehensive schema information:

```bash
echo "Collecting schema metadata..."

psql "$SUPABASE_DB_URL" << 'EOF'
-- Save to temp tables for analysis

-- Tables
CREATE TEMP TABLE audit_tables AS
SELECT
  schemaname,
  tablename,
  pg_total_relation_size(schemaname||'.'||tablename) AS total_size
FROM pg_tables
WHERE schemaname = 'public';

-- Columns
CREATE TEMP TABLE audit_columns AS
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public';

-- Indexes
CREATE TEMP TABLE audit_indexes AS
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef,
  pg_relation_size(indexrelid) AS index_size
FROM pg_indexes
WHERE schemaname = 'public';

-- Foreign Keys
CREATE TEMP TABLE audit_fks AS
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

SELECT '✓ Metadata collected' AS status;
EOF
```

### 2. Check Design Best Practices

Run design checks:

```bash
psql "$SUPABASE_DB_URL" << 'EOF'
\echo '=========================================='
\echo '🔍 DESIGN BEST PRACTICES VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: Tables without primary keys
\echo '1. Tables without PRIMARY KEY:'
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = t.table_schema
      AND table_name = t.table_name
      AND constraint_type = 'PRIMARY KEY'
  );
\echo ''

-- Check 2: Tables without created_at
\echo '2. Tables without created_at timestamp:'
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = t.table_schema
      AND table_name = t.table_name
      AND column_name IN ('created_at', 'createdat')
  );
\echo ''

-- Check 3: Tables without updated_at
\echo '3. Tables without updated_at timestamp:'
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = t.table_schema
      AND table_name = t.table_name
      AND column_name IN ('updated_at', 'updatedat')
  );
\echo ''

-- Check 4: Foreign keys without indexes
\echo '4. Foreign keys without indexes (performance issue):'
SELECT
  fk.table_name,
  fk.column_name,
  fk.foreign_table
FROM audit_fks fk
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_indexes idx
  WHERE idx.tablename = fk.table_name
    AND idx.indexdef LIKE '%' || fk.column_name || '%'
);
\echo ''

-- Check 5: Nullable columns that should be NOT NULL
\echo '5. Suspicious nullable columns (id, *_id, email, created_at):'
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND is_nullable = 'YES'
  AND (
    column_name = 'id'
    OR column_name = 'email'
    OR column_name = 'created_at'
    OR column_name LIKE '%_id'
  );
\echo ''

EOF
```

### 3. Check Performance Issues

Identify performance problems:

```bash
psql "$SUPABASE_DB_URL" << 'EOF'
\echo '=========================================='
\echo '⚡ PERFORMANCE ISSUES VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: Missing indexes on foreign keys
\echo '1. Foreign keys without indexes:'
[Same as Check 4 above]
\echo ''

-- Check 2: Tables without indexes (except very small tables)
\echo '2. Tables without any indexes (excluding tiny tables):'
SELECT
  t.tablename,
  pg_size_pretty(pg_total_relation_size('public.' || t.tablename)) AS size
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes idx
    WHERE idx.tablename = t.tablename
      AND idx.schemaname = t.schemaname
  )
  AND pg_total_relation_size('public.' || t.tablename) > 8192;  -- > 8KB
\echo ''

-- Check 3: Unused indexes
\echo '3. Unused indexes (0 scans, size > 1MB):'
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
  AND pg_relation_size(indexrelid) > 1024*1024;  -- > 1MB
\echo ''

-- Check 4: Duplicate indexes
\echo '4. Potential duplicate indexes:'
SELECT
  a.tablename,
  a.indexname AS index1,
  b.indexname AS index2
FROM pg_indexes a
JOIN pg_indexes b
  ON a.tablename = b.tablename
  AND a.indexname < b.indexname
  AND a.indexdef = b.indexdef
WHERE a.schemaname = 'public';
\echo ''

-- Check 5: Large tables without partitioning
\echo '5. Large tables (>1GB) that might benefit from partitioning:'
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND pg_total_relation_size('public.' || tablename) > 1024*1024*1024
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
\echo ''

EOF
```

### 4. Check Security

Verification of security configuration:

```bash
psql "$SUPABASE_DB_URL" << 'EOF'
\echo '=========================================='
\echo '🔒 SECURITY VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: Tables without RLS
\echo '1. Tables without Row Level Security enabled:'
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
\echo ''

-- Check 2: Tables with RLS but no policies
\echo '2. Tables with RLS enabled but no policies:'
SELECT
  t.schemaname,
  t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = t.schemaname
      AND p.tablename = t.tablename
  );
\echo ''

-- Check 3: RLS policy coverage
\echo '3. RLS policy coverage by table:'
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  STRING_AGG(DISTINCT p.cmd, ', ') AS operations
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.tablename = p.tablename
  AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
\echo ''

-- Check 4: Columns that might contain PII without encryption
\echo '4. Potential PII columns (consider encryption/hashing):'
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%ssn%'
    OR column_name ILIKE '%tax_id%'
    OR column_name ILIKE '%passport%'
    OR column_name ILIKE '%credit_card%'
    OR column_name ILIKE '%password%'
  );
\echo ''

EOF
```

### 5. Check Data Integrity

Verify constraints and relationships:

```bash
psql "$SUPABASE_DB_URL" << 'EOF'
\echo '=========================================='
\echo '✅ DATA INTEGRITY VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: Foreign key relationships count
\echo '1. Foreign key relationship summary:'
SELECT
  COUNT(*) AS total_fk_constraints,
  COUNT(DISTINCT table_name) AS tables_with_fks
FROM audit_fks;
\echo ''

-- Check 2: Check constraints count
\echo '2. CHECK constraints summary:'
SELECT
  COUNT(*) AS total_check_constraints
FROM information_schema.check_constraints
WHERE constraint_schema = 'public';
\echo ''

-- Check 3: Unique constraints count
\echo '3. UNIQUE constraints summary:'
SELECT
  COUNT(*) AS total_unique_constraints
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'UNIQUE';
\echo ''

-- Check 4: Tables without any constraints (red flag)
\echo '4. Tables without constraints (potential issues):'
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = t.table_schema
      AND table_name = t.table_name
  );
\echo ''

-- Check 5: Orphaned records (FK points to non-existent record)
\echo '5. Checking for orphaned records...'
\echo '   (This check requires custom queries per table)'
\echo '   Example:'
\echo '   SELECT COUNT(*) FROM posts p'
\echo '   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id);'
\echo ''

EOF
```

---

## Output

Display verification summary:

```
✅ SCHEMA INTEGRITY CHECK COMPLETE

Database: [redacted]
Tables:   {count}
Size:     {size}

Critical Issues: {count} 🔴
Warnings:        {count} ⚠️
Recommendations: {count} 💡

Overall Score: {score}/100

Report: supabase/docs/schema-verification-{timestamp}.md

Top Issues:
1. {issue_1}
2. {issue_2}
3. {issue_3}

Next Steps:
1. Review full report: cat {report_file}
2. Prioritize fixes
3. Create migrations for P0 issues
4. Re-run verification after fixes
```

# Agent Config Usage Audit

**Generated:** 2026-03-03T17:05:12.254Z
**Total Agents:** 10

---

## 📊 Executive Summary

**Lazy Loading Impact:**
- Average savings per agent: **113.8 KB** (78.5% reduction)
- Agents benefiting from lazy loading: **10/10**
- Total config saved across all agents: **1138.0 KB**

---

## 🔍 Agent Analysis

### 🟢 Morgan (@pm)

**Title:** Product Manager

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 1.7 KB
- **Savings: 143.3 KB (98.8% reduction)**

**Dependencies:**
- tasks: 11 items
- templates: 2 items
- checklists: 2 items
- data: 1 items

---

### 🟢 Aria (@architect)

**Title:** Architect

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 11 items
- scripts: 1 items
- templates: 4 items
- checklists: 1 items
- data: 1 items
- tools: 6 items

---

### 🟢 Pax (@po)

**Title:** Product Owner

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 11 items
- templates: 1 items
- checklists: 2 items
- tools: 2 items

---

### 🟢 River (@sm)

**Title:** Scrum Master

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 3 items
- templates: 1 items
- checklists: 1 items
- tools: 3 items

---

### 🟢 Atlas (@analyst)

**Title:** Business Analyst

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 6 items
- scripts: 1 items
- templates: 4 items
- data: 2 items
- tools: 3 items

---

### 🟢 Dara (@data-engineer)

**Title:** Database Architect & Operations Engineer

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 20 items
- templates: 12 items
- checklists: 3 items
- data: 5 items
- tools: 5 items

---

### 🟢 Gage (@devops)

**Title:** GitHub Repository Manager & DevOps Specialist

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 11.7 KB
- **Savings: 133.3 KB (91.9% reduction)**

**Dependencies:**
- tasks: 22 items
- workflows: 1 items
- templates: 4 items
- checklists: 2 items
- utils: 5 items
- scripts: 3 items
- tools: 4 items

---

### 🟢 Orion (@aios-master)

**Title:** AIOS Master Orchestrator & Framework Developer

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 1 sections (`registry`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 16.7 KB
- **Savings: 128.3 KB (88.5% reduction)**

**Dependencies:**
- tasks: 30 items
- templates: 15 items
- data: 4 items
- utils: 3 items
- workflows: 9 items
- checklists: 6 items

---

### 🟡 Dex (@dev)

**Title:** Full Stack Developer

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 3 sections (`pvMindContext`, `hybridOpsConfig`, `toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 111.7 KB
- **Savings: 33.3 KB (23.0% reduction)**

**Dependencies:**
- checklists: 2 items
- tasks: 22 items
- scripts: 9 items
- tools: 7 items

---

### 🟡 Quinn (@qa)

**Title:** Test Architect & Quality Advisor

**Config Needs:**
- **Always Loaded:** 4 sections (`frameworkDocsLocation`, `projectDocsLocation`, `devLoadAlwaysFiles`, `lazyLoading`)
- **Lazy Loaded:** 3 sections (`pvMindContext`, `hybridOpsConfig`, `toolConfigurations`)

**Savings:**
- Without lazy loading: 145.0 KB
- With lazy loading: 111.7 KB
- **Savings: 33.3 KB (23.0% reduction)**

**Dependencies:**
- data: 1 items
- tasks: 20 items
- templates: 2 items
- tools: 5 items

---

## 🎯 Recommendations

### High Priority (Agents with >50KB savings)
- **@pm**: 143.3 KB savings
- **@architect**: 133.3 KB savings
- **@po**: 133.3 KB savings
- **@sm**: 133.3 KB savings
- **@analyst**: 133.3 KB savings
- **@data-engineer**: 133.3 KB savings
- **@devops**: 133.3 KB savings
- **@aios-master**: 128.3 KB savings

### Medium Priority (Agents with 20-50KB savings)
- **@dev**: 33.3 KB savings
- **@qa**: 33.3 KB savings

### Low Priority (Agents with <20KB savings)

---

## 📋 Implementation Checklist

- [ ] Create agent-config-requirements.yaml with needs mapping
- [ ] Implement lazy loading in config loader
- [ ] Update each agent's activation to use lazy loader
- [ ] Add performance tracking for load times
- [ ] Verify 18% improvement target achieved

---

*Auto-generated by AIOS Agent Config Audit (Story 6.1.2.6)*

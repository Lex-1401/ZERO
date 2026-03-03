# Walkthrough: ACI Integration for ZERO

This document details the successful integration of ACI and procedural memory capabilities (Search, See, Remember) into the ZERO agent framework.

## 1. Core Components Implemented

### Agent-Computer Interface (ACI) Engine

- **File:** `src/agents/aci/engine.ts`
- **Function:** Parses raw DOM into semantic, LLM-friendly snapshots. Filters out invisible/irrelevant elements.
- **Key Feature:** Extracts interactive elements (Inputs, Buttons, Links) with their IDs and coordinates.

### Procedural Memory System

- **File:** `src/agents/aci/memory.ts`
- **Function:** Local persistence (JSON) of successful task trajectories.
- **Key Feature:** `retrieveRelevantExperience(query)` uses keyword matching to find past solutions.

### Browser Tools

- **New Action:** `browser(action='aci_scan')`
  - Injects the ACI engine into the page.
  - Returns a structured text prompt describing the UI.
- **New Tools:**
  - `aci_recall(taskDescription)`: "How do I do X?"
  - `aci_remember(task, steps)`: "I just did X successfully."

## 2. Agent Training (System Prompt)

The Agent's System Prompt (`src/agents/system-prompt.ts`) was updated to enforce the **ACI Workflow**:

1. **RECALL**: Check memory before acting.
2. **SEE**: Use `aci_scan` instead of raw screenshots for better reasoning.
3. **REMEMBER**: Save successful trajectories.

## 3. Practical Demonstration

A showcase script was created to simulate the full lifecycle: `src/agents/aci/showcase.ts`

### How to Run the Showcase

```bash
npx tsx src/agents/aci/showcase.ts
```

### What You Will See

1. **Scenario 1 (Learning):** The agent tries to login to GitHub. It checks memory (fails), navigates manually, uses ACI to see the form, fills it, and finally **MEMORIZES** the steps.
2. **Scenario 2 (Executing):** Days later, the agent is asked to login again. It checks memory, **FINDS** the previous trajectory, and executes it instantly without needing to analyze the page again.

## 4. Next Steps for Production

- **Vector Database:** Replace the JSON memory file with a vector store (e.g., Qdrant/Chroma) for semantic search.
- **Trajectory Optimization:** Allow the LLM to generalize trajectories (e.g., generic "login" pattern).
- **Computer Use Integration:** Verify if Anthropic's new "Computer Use" API can leverage the ACI coordinates directly.

This implementation provides ZERO with state-of-the-art "Agentic Memory" capabilities.

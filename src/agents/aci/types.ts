/**
 * Agent-Computer Interface Types
 * Defines the structured representation of the GUI for the agent.
 */

export interface ElementSnapshot {
  id: number;
  tagName: string;
  role: string | null;
  name: string | null;
  value: string | null;
  description: string | null;
  bounds: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
  isInteractive: boolean;
  isVisible: boolean;
}

export interface ACISnapshot {
  url: string;
  title: string;
  elements: ElementSnapshot[];
  timestamp: number;
}

export interface ACITaskResult {
  success: boolean;
  trajectory: ACIStep[];
  outcomeSummary: string;
}

export interface ACIStep {
  action: string; // e.g., "click", "type", "scroll"
  targetElementId?: number;
  parameters?: any;
  contextSnapshot?: string; // Summary of what was seen before action
  resultSnapshot?: string; // Summary of what changed after action
}

export interface ExperienceMemory {
  taskId: string;
  description: string;
  outcome: ACITaskResult;
  tags: string[];
}

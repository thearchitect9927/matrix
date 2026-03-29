export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentContext {
  matrixId: string;
  matrixMd: string;
  taskId?: string;
  taskMd?: string;
  activeFiles?: string[];
}

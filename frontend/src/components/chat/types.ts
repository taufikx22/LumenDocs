export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  modelId?: string | null;
  modelName?: string | null;
  context?: string | null;
}

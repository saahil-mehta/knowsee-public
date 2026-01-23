export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: number;
}

export interface SessionsResponse {
  sessions: ChatSession[];
  error?: string;
}

export interface HistoricalMessage {
  role: "user" | "model";
  content: string;
  timestamp?: number;
  /** ADK invocation ID - all events from one user query share this ID */
  invocationId?: string;
}

export interface SessionDetailResponse {
  id: string;
  messages: HistoricalMessage[];
  lastUpdated: number;
  error?: string;
}

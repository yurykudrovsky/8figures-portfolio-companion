import { Portfolio } from '../../../core/models/portfolio.model';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatContext {
  portfolio: Portfolio;
  messages: ChatMessage[];
}

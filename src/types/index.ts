export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export type ContentType = 'resume' | 'intro' | 'cover-letter' | 'linkedin' | 'general';
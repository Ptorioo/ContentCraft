export interface Attachment {
  name: string;
  url: string;
  type?: string;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  attachment?: Attachment;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export type ContentType = 'resume' | 'intro' | 'cover-letter' | 'linkedin' | 'general';
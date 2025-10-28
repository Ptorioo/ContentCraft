import { Conversation, Message } from '../types';

const createMessage = (content: string, isUser: boolean, timestamp = new Date()): Message => ({
  id: Math.random().toString(36).substr(2, 9),
  content,
  isUser,
  timestamp
});

export const sampleConversations: Conversation[] = [
];
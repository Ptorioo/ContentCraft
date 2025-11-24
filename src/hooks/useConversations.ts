import { useState } from 'react';
import { Conversation, Message } from '../types';
import { sampleConversations } from '../data/sampleConversations';
import { analyzeContent } from '../services/contentService';
import { AnalyzeResult } from '../services/contentService';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>('1');
  const [isLoading, setIsLoading] = useState(false);

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New conversation',
      messages: [],
      lastUpdated: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const addMessage = async (content: string, isUser: boolean, file?: File) => {
    if (!currentConversationId) return;

    const convId = currentConversationId;

    const attachment = file
      ? { name: file.name, url: URL.createObjectURL(file), type: file.type }
      : undefined;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      isUser,
      timestamp: new Date(),
      attachment
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === convId) {
        const updatedMessages = [...conv.messages, newMessage];
        return {
          ...conv,
          messages: updatedMessages,
          title:
            conv.title === 'New conversation' && isUser
              ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
              : conv.title,
          lastUpdated: new Date()
        };
      }
      return conv;
    }));

    if (isUser) {
      setIsLoading(true);
      try {
        const aiResult: AnalyzeResult = await analyzeContent(content, file);
        const aiMsg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          content: aiResult.text,
          isUser: false,
          timestamp: new Date(),
          analyticsData: aiResult.analytics,
        };
        setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
            return {
              ...conv,
              messages: [...conv.messages, aiMsg],
              lastUpdated: new Date()
            };
          }
          return conv;
        }));
      } catch {
        const errMsg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          content: 'Error processing request.',
          isUser: false,
          timestamp: new Date()
        };
        setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
            return {
              ...conv,
              messages: [...conv.messages, errMsg],
              lastUpdated: new Date()
            };
          }
          return conv;
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage,
    isLoading
  };
};

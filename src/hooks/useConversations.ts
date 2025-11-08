import { useState } from 'react';
import { Conversation, Message } from '../types';
import { sampleConversations } from '../data/sampleConversations';
import { analyzeContent } from '../services/contentService';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>('1');

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

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      isUser,
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        const updatedMessages = [...conv.messages, newMessage];
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.title === 'New conversation' && isUser ?
            content.slice(0, 50) + (content.length > 50 ? '...' : '') :
            conv.title,
          lastUpdated: new Date()
        };
      }
      return conv;
    }));

    if (isUser) {
      try {
        const aiResponse = await analyzeContent(content, file);
        addMessage(aiResponse, false);
      } catch (error) {
        addMessage('Sorry, there was an error processing your request. Please try again.', false);
      }
    }
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage
  };
};
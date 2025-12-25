import { useState } from 'react';
import { Conversation, Message } from '../types';
import { sampleConversations } from '../data/sampleConversations';
import { analyzeContent, AnalyzeResult } from '../services/contentService';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>('1');
  // 改為按對話 ID 追蹤 loading 狀態
  const [loadingConversationIds, setLoadingConversationIds] = useState<Set<string>>(new Set());

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  // 只顯示當前對話的 loading 狀態
  const isLoading = currentConversationId ? loadingConversationIds.has(currentConversationId) : false;

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New post',
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
          title: conv.title === 'New post' && isUser ?
            content.slice(0, 50) + (content.length > 50 ? '...' : '') :
            conv.title,
          lastUpdated: new Date()
        };
      }
      return conv;
    }));

    if (isUser) {
      // 標記該對話為 loading 狀態
      setLoadingConversationIds(prev => new Set(prev).add(convId));
      try {
        const aiResult: AnalyzeResult = await analyzeContent(content, file);
        const aiMsg: Message = {
          id: Math.random().toString(36).substr(2, 9),
          content: aiResult.text,
          isUser: false,
          timestamp: new Date(),
          postAnalysisData: aiResult.analysisData,
          originalUserContent: content, // 保存原始用戶輸入的文字
          originalUserImage: file, // 保存原始用戶上傳的圖片
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
        // 移除該對話的 loading 狀態
        setLoadingConversationIds(prev => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
      }
    }
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const remainingConversations = prev.filter(conv => conv.id !== id);
      // 如果刪除的是當前對話，切換到第一個對話（如果還有對話的話）
      if (currentConversationId === id) {
        if (remainingConversations.length > 0) {
          setCurrentConversationId(remainingConversations[0].id);
        } else {
          setCurrentConversationId(null);
        }
      }
      return remainingConversations;
    });
    // 清除該對話的 loading 狀態
    setLoadingConversationIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage,
    deleteConversation,
    isLoading
  };
};
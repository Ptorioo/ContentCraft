import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MessageSquare, FileText, User, Briefcase, X, PanelLeftClose, Trash2 } from 'lucide-react';
import { Conversation } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  isOpen,
  onClose,
  onToggleCollapse,
  showCollapseButton = false
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // 防止觸發對話選擇
    setDeleteConfirmId(conversationId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };
  const samplePrompts = [
    {
      icon: <FileText size={16} />,
      title: "Resume Review",
      description: "Make my resume stand out from other candidates"
    },
    {
      icon: <User size={16} />,
      title: "Self Introduction",
      description: "Craft a memorable elevator pitch"
    },
    {
      icon: <Briefcase size={16} />,
      title: "Cover Letter",
      description: "Write a compelling cover letter"
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-full w-full lg:w-full bg-gray-50 border-r border-gray-200 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onNewConversation}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 flex items-center space-x-2 hover:bg-gray-50 transition-colors text-left"
          >
            <Plus size={16} className="text-gray-600" />
            <span className="text-gray-700 font-medium text-xs">新增貼文檢測</span>
          </button>
          {showCollapseButton && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors"
              title="收合側邊欄"
            >
              <PanelLeftClose className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

{/*
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Get Started</h3>
          <div className="space-y-2">
            {samplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={onNewConversation}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3 mb-1">
                  <div className="text-purple-600 group-hover:text-purple-700">
                    {prompt.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {prompt.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                  {prompt.description}
                </p>
              </button>
            ))}
          </div>
        </div>
*/}
        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent</h3>
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`
                  group relative w-full rounded-lg transition-colors flex items-center overflow-hidden
                  ${currentConversationId === conversation.id 
                    ? 'bg-purple-100 border border-purple-200' 
                    : 'hover:bg-gray-100'
                  }
                `}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`
                    flex-1 text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3 min-w-0
                    ${currentConversationId === conversation.id 
                      ? 'text-purple-900' 
                      : 'text-gray-700'
                    }
                  `}
                >
                  <MessageSquare size={16} className="flex-shrink-0" />
                  <span className="text-sm font-medium truncate min-w-0">
                    {conversation.title}
                  </span>
                </button>
                <button
                  onClick={(e) => handleDeleteClick(e, conversation.id)}
                  className={`
                    p-2 rounded-lg transition-colors flex-shrink-0 mr-1
                    ${currentConversationId === conversation.id
                      ? 'text-purple-600 hover:bg-purple-200'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }
                  `}
                  title="刪除對話"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* 刪除確認對話框 - 使用 React Portal 渲染到 body，確保在最上層 */}
      {deleteConfirmId && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          onClick={handleCancelDelete}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">確認刪除</h3>
            <p className="text-sm text-gray-600 mb-6">
              確定要刪除此對話嗎？此操作無法復原。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                刪除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Sidebar;
import React from 'react';
import { Plus, MessageSquare, FileText, User, Briefcase, X } from 'lucide-react';
import { Conversation } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onClose
}) => {
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
        fixed lg:relative top-0 left-0 h-full w-80 bg-gray-50 border-r border-gray-200 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={onNewConversation}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
          >
            <Plus size={18} className="text-gray-600" />
            <span className="text-gray-700 font-medium">New conversation</span>
          </button>
          <button
            onClick={onClose}
            className="lg:hidden ml-3 p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent</h3>
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3
                  ${currentConversationId === conversation.id 
                    ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                <MessageSquare size={16} />
                <span className="text-sm font-medium truncate">
                  {conversation.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Elevate your content above average
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
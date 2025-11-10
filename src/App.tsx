import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { useConversations } from './hooks/useConversations';
import { mockAnalytics } from './data/mockAnalytics';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'analytics'>('chat');
  const {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage
  } = useConversations();

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleSendMessage = (content: string, file?: File) => {
    addMessage(content, true, file);
  };

  const handleNewConversation = () => {
    createNewConversation();
    setIsSidebarOpen(false); // Close sidebar on mobile after creation
  };

  const renderChatView = () => (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <ChatArea
          messages={currentConversation?.messages || []}
          conversationTitle={currentConversation?.title}
        />
        <MessageInput
          onSendMessage={handleSendMessage}
        />
      </main>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="lg:hidden border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">分析儀表板</p>
        <button
          onClick={() => setActiveView('chat')}
          className="text-sm text-purple-600 font-medium"
        >
          返回聊天
        </button>
      </div>
      <AnalyticsDashboard
        data={mockAnalytics}
        onBackToChat={() => setActiveView('chat')}
      />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header 
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          if (view === 'analytics') {
            setIsSidebarOpen(false);
          }
        }}
      />

      {activeView === 'chat' ? renderChatView() : renderAnalyticsView()}
    </div>
  );
}

export default App;
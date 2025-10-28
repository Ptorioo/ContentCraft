import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import { useConversations } from './hooks/useConversations';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const handleSendMessage = (content: string) => {
    addMessage(content, true);
  };

  const handleNewConversation = () => {
    createNewConversation();
    setIsSidebarOpen(false); // Close sidebar on mobile after creation
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header 
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      
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
    </div>
  );
}

export default App;
import { useState, useEffect as ReactUseEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PostAnalysisResult from './components/PostAnalysisResult';
import { ResizablePanel } from './components/ResizablePanel';
import { useConversations } from './hooks/useConversations';
import { macuABTestData, manshangABTestData } from './data/sampleConversations';
import { mockAnalytics } from './data/mockAnalytics';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'analytics'>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resultPanelCollapsed, setResultPanelCollapsed] = useState(true); // 默認收合，因為初始沒有結果
  const [sidebarWidth, setSidebarWidth] = useState(250);
  // 計算右側面板的預設寬度：(總寬 - 左側欄250) / 2
  const [resultPanelWidth, setResultPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.floor((window.innerWidth - 250) / 2);
    }
    return 640; // 伺服器端渲染時的預設值
  });
  const hasAutoExpandedRef = useRef(false); // 追蹤是否已經自動展開過
  const userManuallyCollapsedRef = useRef(false); // 追蹤用戶是否手動收合過
  // 保存每個對話的 UI 狀態（如 A/B 測試面板是否顯示、A/B 測試數據）
  const [conversationUIState, setConversationUIState] = useState<Record<string, { 
    showABTest?: boolean;
    abTestData?: {
      modifiedText?: string;
      modifiedAnalysis?: any; // PostAnalysisData
    };
  }>>({
    // 為範例對話 '1' (麻古) 設置預設的 A/B test 數據，預設展開
    '1': {
      showABTest: true,
      abTestData: macuABTestData,
    },
    // 為範例對話 '2' (滿上) 設置預設的 A/B test 數據，預設展開
    '2': {
      showABTest: true,
      abTestData: manshangABTestData,
    },
  });
  const {
    conversations,
    currentConversation,
    currentConversationId,
    createNewConversation,
    setCurrentConversationId,
    addMessage,
    deleteConversation,
    isLoading,
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

  // 獲取最新的分析結果（最後一條 AI 消息中的 postAnalysisData）
  const latestAIMessage = currentConversation?.messages
    ?.slice()
    .reverse()
    .find(msg => !msg.isUser && msg.postAnalysisData);
  
  const latestAnalysis = latestAIMessage?.postAnalysisData;
  
  // 獲取當前對話的 UI 狀態
  const currentUIState = currentConversationId ? (conversationUIState[currentConversationId] || {}) : {};
  
  // 處理 A/B 測試面板顯示狀態的變化
  const handleShowABTestChange = (show: boolean) => {
    if (currentConversationId) {
      setConversationUIState(prev => ({
        ...prev,
        [currentConversationId]: {
          ...prev[currentConversationId],
          showABTest: show,
        },
      }));
    }
  };

  // 處理 A/B 測試數據的更新
  const handleABTestDataChange = (data: { modifiedText?: string; modifiedAnalysis?: any }) => {
    if (currentConversationId) {
      setConversationUIState(prev => ({
        ...prev,
        [currentConversationId]: {
          ...prev[currentConversationId],
          abTestData: {
            ...prev[currentConversationId]?.abTestData,
            ...data,
          },
        },
      }));
    }
  };

  // 當切換對話時，重置自動展開標記，以便新對話的分析結果可以顯示
  ReactUseEffect(() => {
    hasAutoExpandedRef.current = false;
  }, [currentConversationId]);

  // 如果有分析結果，只在第一次自動展開右側面板（用戶未手動收合的情況下）
  ReactUseEffect(() => {
    if (latestAnalysis && !hasAutoExpandedRef.current && !userManuallyCollapsedRef.current) {
      setResultPanelCollapsed(false);
      hasAutoExpandedRef.current = true;
    }
    // 如果分析結果消失了，重置自動展開標記
    if (!latestAnalysis) {
      hasAutoExpandedRef.current = false;
    }
  }, [latestAnalysis]);

  const renderChatView = () => {
    const originalText = latestAIMessage?.originalUserContent || '';
    const originalImage = latestAIMessage?.originalUserImage;

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* 左側側邊欄 */}
        <ResizablePanel
          defaultWidth={sidebarWidth}
          minWidth={200}
          maxWidth={600}
          onResize={setSidebarWidth}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          position="left"
          collapsible={true}
        >
          <Sidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={deleteConversation}
            onNewConversation={handleNewConversation}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onToggleCollapse={() => setSidebarCollapsed(true)}
            showCollapseButton={true}
          />
        </ResizablePanel>

        {/* 中間：對話歷史和輸入 */}
        <main className={`flex-1 flex flex-col min-w-0 border-r border-gray-200 ${sidebarCollapsed ? 'pl-12' : ''}`}>
          <ChatArea
            messages={currentConversation?.messages || []}
            conversationTitle={currentConversation?.title}
            isLoading={isLoading}
            hideAnalysisResult={true}
          />
          {!latestAnalysis && !isLoading && (
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          )}
        </main>

        {/* 右側：分析結果 */}
        <ResizablePanel
          defaultWidth={resultPanelWidth}
          minWidth={300}
          maxWidth={800}
          onResize={setResultPanelWidth}
          isCollapsed={resultPanelCollapsed}
          onToggleCollapse={() => {
            const newState = !resultPanelCollapsed;
            setResultPanelCollapsed(newState);
            if (newState) {
              // 用戶手動收合
              userManuallyCollapsedRef.current = true;
            } else {
              // 用戶手動展開，重置標記
              userManuallyCollapsedRef.current = false;
            }
          }}
          position="right"
          collapsible={true}
        >
          <div className="h-full bg-gray-50 border-l border-gray-200 overflow-y-auto">
            {latestAnalysis ? (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pl-10">分析結果</h3>
                <PostAnalysisResult
                  analysisData={latestAnalysis}
                  originalText={originalText}
                  originalImage={originalImage}
                  showABTest={currentUIState.showABTest}
                  onShowABTestChange={handleShowABTestChange}
                  abTestData={currentUIState.abTestData}
                  onABTestDataChange={handleABTestDataChange}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <div className="text-2xl">📊</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 pl-10">分析結果</h3>
                <p className="text-sm text-gray-500">
                  提交貼文後，分析結果將顯示在這裡
                </p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </div>
    );
  };

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
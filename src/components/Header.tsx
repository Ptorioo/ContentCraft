import React from 'react';
import { Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  activeView: 'chat' | 'analytics';
  onChangeView: (view: 'chat' | 'analytics') => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  activeView,
  onChangeView
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:justify-center relative">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>
      
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          ContentCraft
        </h1>
      </div>
      
      <nav className="hidden lg:flex items-center space-x-4 absolute right-6">
        <button
          onClick={() => onChangeView('chat')}
          className={`
            text-sm font-medium px-3 py-2 rounded-lg transition-colors
            ${activeView === 'chat' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}
          `}
        >
          對話介面
        </button>
        <button
          onClick={() => onChangeView('analytics')}
          className={`
            text-sm font-medium px-3 py-2 rounded-lg transition-colors
            ${activeView === 'analytics' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}
          `}
        >
          分析儀表板
        </button>
      </nav>

      <div className="w-8 lg:hidden" /> {/* Spacer for mobile */}
    </header>
  );
};

export default Header;
import React from 'react';
import { Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
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
      
      <div className="w-8 lg:hidden" /> {/* Spacer for mobile */}
    </header>
  );
};

export default Header;
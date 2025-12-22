import React, { useState, useRef, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

// Header 的實際高度（包括 padding 和內容）
const HEADER_HEIGHT = 56; // py-3 (12px * 2) + content (~32px)

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  position: 'left' | 'right';
  collapsible?: boolean;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth,
  minWidth = 200,
  maxWidth,
  onResize,
  onToggleCollapse,
  isCollapsed = false,
  position,
  collapsible = true,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(defaultWidth);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onResize) {
      onResize(width);
    }
  }, [width, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setStartX(e.clientX);
    setStartWidth(width);
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = position === 'left' 
        ? e.clientX - startX
        : startX - e.clientX; // 右側面板：鼠標向左移動時增加寬度

      const newWidth = startWidth + deltaX;

      const constrainedWidth = Math.max(
        minWidth,
        maxWidth ? Math.min(maxWidth, newWidth) : newWidth
      );

      setWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth, position, startX, startWidth]);

  if (isCollapsed) {
    // 展開按鈕應該和收合按鈕在同一高度
    // 收合按鈕使用 absolute top-4，是相對於面板頂部的
    // 展開按鈕使用 fixed，所以需要加上 Header 的高度
    const buttonTopOffset = HEADER_HEIGHT + 16; // Header 高度 + top-4 (16px)
    
    return (
      <div className="relative flex-shrink-0" style={{ width: '0px', position: 'relative', zIndex: 70 }}>
        <button
          onClick={onToggleCollapse}
          className={`fixed p-1.5 bg-white border border-gray-300 shadow-lg hover:bg-gray-50 transition-colors ${
            position === 'left' ? 'left-0 rounded-r' : 'right-0 rounded-l'
          }`}
          style={{ zIndex: 70, top: `${buttonTopOffset}px` }}
          title={position === 'left' ? '展開側邊欄' : '展開分析結果'}
        >
          {position === 'left' ? (
            <PanelLeftOpen className="w-4 h-4 text-gray-600" />
          ) : (
            <PanelRightOpen className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="relative flex flex-shrink-0 h-full"
      style={{ width: `${width}px` }}
    >
      <div className="overflow-hidden h-full w-full flex flex-col">{children}</div>
      {collapsible && (
        <>
          <div
            className={`absolute top-0 bottom-0 w-1 bg-gray-200 hover:bg-purple-500 cursor-col-resize transition-colors ${
              position === 'left' ? 'right-0' : 'left-0'
            } ${isResizing ? 'bg-purple-500' : ''}`}
            onMouseDown={handleMouseDown}
          />
          {position === 'left' ? null : (
            <button
              onClick={onToggleCollapse}
              className="absolute top-4 left-3 p-1.5 bg-white border border-gray-300 rounded shadow-md hover:bg-gray-50 transition-colors z-[60]"
              title="收合分析結果"
            >
              <PanelRightClose className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </>
      )}
    </div>
  );
};


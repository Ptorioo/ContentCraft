import React, { useMemo } from "react";
import { Message as MessageType } from "../types";
import AnalyticsDashboard from "./AnalyticsDashboard";
import PostAnalysisResult from "./PostAnalysisResult";

interface MessageProps {
  message: MessageType;
  hideAnalysisResult?: boolean;
}

const Message: React.FC<MessageProps> = React.memo(({ message, hideAnalysisResult = false }) => {
  // 優化：使用 useMemo 緩存文本處理結果
  const formattedContent = useMemo(() => {
    if (!message.content) return null;
    
    const lines = message.content.split("\n");
    return lines.map((line, idx) => {
      const isAtiLine = !message.isUser && line.trim().startsWith("ATI score:");
      const isLower = !message.isUser && line.includes("Lower than average");
      const isHigher = !message.isUser && line.includes("Higher than average");

      let className = "mb-2";
      if (isAtiLine) {
        className = "mb-2 font-semibold text-lg";
      } else if (isLower) {
        className = "mb-2 text-red-600 font-medium";
      } else if (isHigher) {
        className = "mb-2 text-green-600 font-medium";
      }

      return (
        <div key={idx} className={className}>
          {line}
        </div>
      );
    });
  }, [message.content, message.isUser]);

  return (
    <div
      className={`p-6 ${
        !message.isUser ? "bg-gray-50" : ""
      }`}
    >
      {/* Content */}
      <div className="w-full">
        <div className="whitespace-pre-wrap leading-relaxed">
          <div
            className={
              message.isUser
                ? "text-gray-800 text-sm"
                : "text-gray-900 text-[0.95rem] md:text-base"
            }
          >
            {formattedContent}
          </div>

          {message.attachment &&
            message.attachment.type?.startsWith("image/") && (
              <img
                src={message.attachment.url}
                alt={message.attachment.name || "Attachment"}
                className="mt-3 max-w-full rounded-lg border object-contain max-h-80"
                loading="lazy"
              />
            )}

          {/* 單一貼文分析結果（優先顯示）- 如果 hideAnalysisResult 為 true，則不顯示 */}
          {!message.isUser && message.postAnalysisData && !hideAnalysisResult && (
            <div className="mt-3">
              <PostAnalysisResult
                analysisData={message.postAnalysisData}
                originalText={message.originalUserContent || ''}
                originalImage={message.originalUserImage}
              />
            </div>
          )}
          {/* 保留向後兼容：完整的 Analytics Dashboard */}
          {!message.isUser && !message.postAnalysisData && message.analyticsData && (
            <div className="mt-3">
              <AnalyticsDashboard
                data={message.analyticsData}
                onBackToChat={() => {}}
              />
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
});

Message.displayName = "Message";

export default Message;
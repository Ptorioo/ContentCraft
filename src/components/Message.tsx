import React from "react";
import { User, Sparkles } from "lucide-react";
import { Message as MessageType } from "../types";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div
      className={`flex items-start space-x-4 p-6 ${
        !message.isUser ? "bg-gray-50" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${
          message.isUser
            ? "bg-purple-600"
            : "bg-gradient-to-br from-green-500 to-emerald-600"
        }
      `}
      >
        {message.isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Sparkles size={16} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`prose max-w-none ${
            message.isUser ? "prose-sm" : "prose-base"
          }`}
        >
          {/* Text content with line-based styling */}
          <div
            className={`whitespace-pre-wrap leading-relaxed ${
              message.isUser
                ? "text-gray-800"
                : "text-gray-900 text-[0.95rem] md:text-base"
            }`}
          >
            {message.content.split("\n").map((line, idx) => {
              const isAtiLine = line.trim().startsWith("ATI score:");
              const isLower = line.includes("Lower than average");
              const isHigher = line.includes("Higher than average");

              let className = "mb-3";
              if (!message.isUser && isAtiLine) {
                className += " font-semibold text-lg";
              }
              if (!message.isUser && isLower) {
                className += " text-red-600 font-medium";
              }
              if (!message.isUser && isHigher) {
                className += " text-green-600 font-medium";
              }

              return (
                <div key={idx} className={className}>
                  {line}
                </div>
              );
            })}
          </div>

          {message.attachment &&
            message.attachment.type?.startsWith("image/") && (
              <img
                src={message.attachment.url}
                alt={message.attachment.name}
                className="mt-3 max-w-full rounded-lg border object-contain max-h-80"
              />
            )}

          {/* Shorter gap between text and dashboard */}
          {!message.isUser && message.analyticsData && (
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
};

export default Message;
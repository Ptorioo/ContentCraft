import React from 'react';
import { Message as MessageType } from '../types';
import Message from './Message';
import { ThreeDots } from 'react-loader-spinner';

interface ChatAreaProps {
  messages: MessageType[];
  conversationTitle?: string;
  isLoading?: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, conversationTitle, isLoading }) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <div className="text-2xl">✨</div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Rise Above Average
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Analyze your content by calculating ATI score.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversationTitle && (
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <h2 className="text-lg font-semibold text-gray-900">{conversationTitle}</h2>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center justify-start px-6 py-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2">
              <ThreeDots
                height="24"
                width="48"
                color="#686868ff"
                ariaLabel="loading"
                visible
              />
              <span className="text-sm text-gray-600">Analyzing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;

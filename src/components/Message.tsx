import React from 'react';
import { User, Sparkles } from 'lucide-react';
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div className={`flex items-start space-x-4 p-6 ${!message.isUser ? 'bg-gray-50' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${message.isUser 
          ? 'bg-purple-600' 
          : 'bg-gradient-to-br from-green-500 to-emerald-600'
        }
      `}>
        {message.isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Sparkles size={16} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {message.content}
          </div>
          {message.attachment && message.attachment.type?.startsWith('image/') && (
            <img
              src={message.attachment.url}
              alt={message.attachment.name}
              className="mt-3 max-w-full rounded-lg border object-contain max-h-80"
            />
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
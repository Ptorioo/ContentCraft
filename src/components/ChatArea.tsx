import React from 'react';
import { Message as MessageType } from '../types';
import Message from './Message';

interface ChatAreaProps {
  messages: MessageType[];
  conversationTitle?: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, conversationTitle }) => {
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
{/*        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200">
            <div className="text-purple-600 mb-3">📄</div>
            <h3 className="font-semibold text-gray-900 mb-2">Resume Enhancement</h3>
            <p className="text-gray-600 text-sm">
              "Review my software engineer resume and suggest improvements to make it stand out to hiring managers"
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200">
            <div className="text-purple-600 mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">Elevator Pitch</h3>
            <p className="text-gray-600 text-sm">
              "Help me craft a 30-second self-introduction that highlights my unique value proposition"
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200">
            <div className="text-purple-600 mb-3">💼</div>
            <h3 className="font-semibold text-gray-900 mb-2">Cover Letter</h3>
            <p className="text-gray-600 text-sm">
              "Create a compelling cover letter that shows genuine interest and relevant experience"
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all duration-200">
            <div className="text-purple-600 mb-3">🔗</div>
            <h3 className="font-semibold text-gray-900 mb-2">LinkedIn Profile</h3>
            <p className="text-gray-600 text-sm">
              "Optimize my LinkedIn summary to attract recruiters and showcase my professional brand"
            </p>
          </div>
        </div>
*/}
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
      </div>
    </div>
  );
};

export default ChatArea;
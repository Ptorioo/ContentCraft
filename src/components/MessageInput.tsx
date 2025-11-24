import React, { useState, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim(), selectedFile || undefined);
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestionPrompts = [
    "Review my resume for a marketing manager position",
    "Help me write a compelling self-introduction for networking events",
    "Improve my LinkedIn summary to attract more opportunities",
    "Create a cover letter that stands out from generic templates"
  ];

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto p-4">
{/*        {input === '' && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-3">Try these suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestionPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
*/}        
        <form onSubmit={handleSubmit} className="relative">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-700 bg-gray-100 rounded-lg px-3 py-2">
              <Paperclip size={14} />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-end space-x-3 bg-white rounded-xl border border-gray-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".png, .jpg, .jpeg, .svg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
              disabled={disabled}
            >
              <Paperclip size={18} className="text-gray-500" />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your content that needs improvement..."
              disabled={disabled}
              className="flex-1 min-h-[48px] max-h-32 resize-none border-none outline-none px-0 py-3 text-gray-900 placeholder-gray-500"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '48px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              className={`
                p-3 rounded-lg transition-all duration-200 m-1
                ${input.trim() && !disabled
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
        
        <p className="text-xs text-gray-500 text-center mt-3">
          ATI Agent can help improve your professional content. Always review suggestions before using.
        </p>
      </div>
    </div>
  );
};

export default MessageInput;
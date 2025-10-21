import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
          <span>{formatTime(message.timestamp)}</span>
          {isOwn && (
            message.read ? (
              <CheckCheck className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

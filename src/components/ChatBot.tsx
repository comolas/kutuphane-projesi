import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { MessageCircle, Send, X, Loader2, Bot, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const ChatBot: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const getChatHistory = httpsCallable(functions, 'getChatHistory');
      const result: any = await getChatHistory({ limit: 20 });
      
      const history: Message[] = [];
      result.data.messages.forEach((msg: any) => {
        history.push(
          { role: 'user', content: msg.userMessage, timestamp: msg.timestamp },
          { role: 'assistant', content: msg.aiResponse, timestamp: msg.timestamp }
        );
      });
      
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    setLoadingHistory(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatWithAssistant = httpsCallable(functions, 'chatWithAssistant');
      const result: any = await chatWithAssistant({ message: input });

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.data.response,
        timestamp: result.data.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (result.data.remainingMessages !== undefined) {
        setRemainingMessages(result.data.remainingMessages);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: t('chatbot.errorMessage'),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-bounce">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{t('chatbot.libraryAssistant')}</p>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"></div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 animate-bounce overflow-hidden flex items-center justify-center"
          >
            <img src="https://r.resimlink.com/L2H7vA3-u.png" alt="Chat" className="w-10 h-10 object-cover" />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[600px] max-h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src="https://r.resimlink.com/L2H7vA3-u.png" alt={t('chatbot.bookFriend')} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold">{t('chatbot.bookFriend')}</h3>
                <p className="text-xs opacity-90">
                  {remainingMessages !== null ? t('chatbot.messagesRemaining', { count: remainingMessages }) : t('chatbot.yourAssistant')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img src="https://r.resimlink.com/L2H7vA3-u.png" alt={t('chatbot.bookFriend')} className="w-16 h-16 rounded-full mb-4" />
                <h4 className="font-bold text-lg mb-2">{t('chatbot.greeting')}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t('chatbot.greetingDesc')}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white'
                  }`}>
                    {msg.role === 'user' ? <User size={18} /> : <img src="https://r.resimlink.com/L2H7vA3-u.png" alt="Bot" className="w-full h-full object-cover" />}
                  </div>
                  <div className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img src="https://r.resimlink.com/L2H7vA3-u.png" alt="Bot" className="w-full h-full object-cover" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="animate-spin text-indigo-600" size={20} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Buttons */}
          {messages.length === 0 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              <button
                onClick={() => { setInput(t('chatbot.quickMessages.bookSuggestion')); }}
                className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              >
                {t('chatbot.quickReplies.bookSuggestion')}
              </button>
              <button
                onClick={() => { setInput(t('chatbot.quickMessages.myStats')); }}
                className="px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              >
                {t('chatbot.quickReplies.myStats')}
              </button>
              <button
                onClick={() => { setInput(t('chatbot.quickMessages.similarBooks')); }}
                className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {t('chatbot.quickReplies.similarBooks')}
              </button>
              <button
                onClick={() => { setInput(t('chatbot.quickMessages.popularBooks')); }}
                className="px-3 py-1.5 text-xs bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full hover:bg-pink-200 dark:hover:bg-pink-800 transition-colors"
              >
                {t('chatbot.quickReplies.popularBooks')}
              </button>
              <button
                onClick={() => { setInput(t('chatbot.quickMessages.shortBook')); }}
                className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                {t('chatbot.quickReplies.shortBook')}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.messagePlaceholder')}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;

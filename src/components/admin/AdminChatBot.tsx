import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { MessageCircle, Send, X, Loader2, Shield, User } from 'lucide-react';

interface Message {
  role: 'admin' | 'assistant';
  content: string;
  timestamp: string;
}

const AdminChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
      const getAdminChatHistory = httpsCallable(functions, 'getAdminChatHistory');
      const result: any = await getAdminChatHistory();
      
      const history: Message[] = [];
      result.data.messages.forEach((msg: any) => {
        history.push(
          { role: 'admin', content: msg.message, timestamp: msg.timestamp },
          { role: 'assistant', content: msg.response, timestamp: msg.timestamp }
        );
      });
      
      setMessages(history);
    } catch (error) {
      console.error('Error loading admin chat history:', error);
    }
    setLoadingHistory(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const adminMessage: Message = {
      role: 'admin',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, adminMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatWithAdminAssistant = httpsCallable(functions, 'chatWithAdminAssistant');
      const result: any = await chatWithAdminAssistant({ message: input });

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.data.response,
        timestamp: result.data.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Admin chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
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
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-bounce">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">Yönetim Asistanı</p>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"></div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 animate-bounce overflow-hidden flex items-center justify-center"
          >
            <Shield size={32} className="text-white" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[500px] h-[calc(100vh-2rem)] sm:h-[700px] max-h-[700px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-[9999] border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-3 sm:p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Shield size={20} className="text-orange-600 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">Yönetim Asistanı</h3>
                <p className="text-xs opacity-90 hidden sm:block">Admin Analiz & Raporlama</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-orange-600" size={32} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Shield size={64} className="text-orange-600 mb-4" />
                <h4 className="font-bold text-lg mb-2">Merhaba Admin! 👋</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Detaylı raporlar, kullanıcı analizleri ve yönetim önerileri için buradayım!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'admin' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'admin' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300'
                  }`}>
                    {msg.role === 'admin' ? <User size={18} /> : <Shield size={18} />}
                  </div>
                  <div className={`max-w-[75%] p-2 sm:p-3 rounded-2xl ${
                    msg.role === 'admin'
                      ? 'bg-orange-600 text-white rounded-tr-none'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Shield size={18} className="text-orange-600 dark:text-orange-300" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 className="animate-spin text-orange-600" size={20} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              <button
                onClick={() => { setInput("Son 7 günde hangi kitaplar popülerdi?"); }}
                className="px-3 py-1.5 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
              >
                🔥 Son 7 Gün Trendleri
              </button>
              <button
                onClick={() => { setInput("Bu ay hiç kitap almayan kullanıcılar kimler?"); }}
                className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                😴 Pasif Kullanıcılar
              </button>
              <button
                onClick={() => { setInput("Hangi kategorilerde stok azalıyor?"); }}
                className="px-3 py-1.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
              >
                📦 Stok Durumu
              </button>
              <button
                onClick={() => { setInput("Ceza oranı en yüksek kullanıcılar kimler?"); }}
                className="px-3 py-1.5 text-xs bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
              >
                ⚠️ Yüksek Ceza Oranlı
              </button>
              <button
                onClick={() => { setInput("Ortalama kitap okuma süresi nedir?"); }}
                className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                ⏱️ Okuma Süresi
              </button>
              <button
                onClick={() => { setInput("Geçen aya göre nasıl bir trend var?"); }}
                className="px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              >
                📈 Aylık Karşılaştırma
              </button>
            </div>
          )}

          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Sorunuzu yazın..."
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation min-h-[40px]"
              >
                <Send size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminChatBot;

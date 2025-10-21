import React from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-16 md:pt-20">
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden h-full">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Konuşma Listesi */}
            <div className={`border-r border-gray-200 flex flex-col h-full ${conversationId ? 'hidden md:flex' : 'flex'}`}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 sm:p-4 flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  Sohbet
                </h1>
              </div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                <ConversationList />
              </div>
            </div>

            {/* Chat Penceresi */}
            <div className={`md:col-span-2 h-full ${conversationId ? 'flex' : 'hidden md:flex'} flex-col`}>
              {conversationId ? (
                <ChatWindow />
              ) : (
                <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
                  <div>
                    <MessageCircle className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 text-gray-300" />
                    <p className="text-base sm:text-lg font-semibold mb-2">Bir sohbet seçin</p>
                    <p className="text-xs sm:text-sm">Mesajlaşmaya başlamak için sol taraftan bir sohbet seçin</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

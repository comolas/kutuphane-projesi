import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ConversationList from '../../chat/ConversationList';
import ChatWindow from '../../chat/ChatWindow';
import { useParams } from 'react-router-dom';

const AdminChatTab: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          {/* Konuşma Listesi */}
          <div className={`border-r border-gray-200 flex flex-col h-full ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 sm:p-4 flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                Sohbet
              </h1>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <ConversationList />
            </div>
          </div>

          {/* Chat Penceresi */}
          <div className={`md:col-span-2 h-full ${selectedConversationId || conversationId ? 'flex' : 'hidden md:flex'} flex-col`}>
            {selectedConversationId || conversationId ? (
              <ChatWindow />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500 p-3 sm:p-4">
                <div>
                  <MessageCircle className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-semibold mb-2">Bir sohbet seçin</p>
                  <p className="text-xs sm:text-sm">Mesajlaşmaya başlamak için sol taraftan bir sohbet seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatTab;

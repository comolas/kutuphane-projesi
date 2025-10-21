import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, Users } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface AvailableUser {
  uid: string;
  displayName: string;
  role: string;
  studentClass?: string;
}

const ConversationList: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, getOrCreateConversation } = useChat();
  const { user, userData, isTeacher, isAdmin } = useAuth();
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);

  const getOtherParticipant = (conv: any) => {
    const otherUserId = conv.participants.find((id: string) => id !== user?.uid);
    return {
      id: otherUserId,
      name: conv.participantNames[otherUserId] || 'Kullanıcı'
    };
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  // Kullanıcı listesini yükle
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      if (!userData) return;
      
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        let q;

        if (isAdmin) {
          // Admin herkesle konuşabilir
          q = query(usersRef, where('uid', '!=', user?.uid));
        } else if (isTeacher && userData.teacherData?.assignedClass) {
          // Öğretmen kendi sınıfındaki öğrenciler ve admin ile konuşabilir
          const snapshot = await getDocs(usersRef);
          const users: AvailableUser[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.uid !== user?.uid && (
              data.role === 'admin' || 
              data.studentClass === userData.teacherData?.assignedClass
            )) {
              users.push({
                uid: data.uid,
                displayName: data.displayName || 'İsimsiz',
                role: data.role,
                studentClass: data.studentClass
              });
            }
          });
          setAvailableUsers(users);
          setLoading(false);
          return;
        } else {
          // Öğrenci admin ve kendi sınıfının öğretmeni ile konuşabilir
          const snapshot = await getDocs(usersRef);
          const users: AvailableUser[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.uid !== user?.uid && (
              data.role === 'admin' ||
              (data.role === 'teacher' && userData.studentClass && data.teacherData?.assignedClass === userData.studentClass)
            )) {
              users.push({
                uid: data.uid,
                displayName: data.displayName || 'İsimsiz',
                role: data.role,
                studentClass: data.studentClass
              });
            }
          });
          setAvailableUsers(users);
          setLoading(false);
          return;
        }

        const snapshot = await getDocs(q);
        const users: AvailableUser[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          users.push({
            uid: data.uid,
            displayName: data.displayName || 'İsimsiz',
            role: data.role,
            studentClass: data.studentClass
          });
        });
        setAvailableUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableUsers();
  }, [userData, user, isTeacher, isAdmin]);

  const handleStartConversation = async (recipientId: string, recipientName: string) => {
    try {
      const conversationId = await getOrCreateConversation(recipientId, recipientName);
      navigate(`/chat/${conversationId}`);
      setShowUserList(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  return (
    <div className="space-y-2">
      {/* Yeni Sohbet Butonu */}
      {availableUsers.length > 0 && (
        <button
          onClick={() => setShowUserList(!showUserList)}
          className="w-full p-2 sm:p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm sm:text-base"
        >
          {showUserList ? <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
          {showUserList ? 'Sohbetleri Göster' : 'Yeni Sohbet Başlat'}
        </button>
      )}

      {/* Kullanıcı Listesi */}
      {showUserList && (
        <div className="bg-white rounded-lg border-2 border-indigo-200 p-2 sm:p-3 space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-gray-200">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Kullanıcılar</h3>
          </div>
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-sm">Yükleniyor...</div>
          ) : availableUsers.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs sm:text-sm">
              Mesajlaşabileceğiniz kullanıcı bulunamadı
            </div>
          ) : (
            availableUsers.map(availableUser => {
              const hasConversation = conversations.some(conv => 
                conv.participants.includes(availableUser.uid)
              );
              
              return (
                <div
                  key={availableUser.uid}
                  onClick={() => handleStartConversation(availableUser.uid, availableUser.displayName)}
                  className="p-2 sm:p-3 rounded-lg hover:bg-indigo-50 cursor-pointer transition-all border border-transparent hover:border-indigo-200 active:bg-indigo-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{availableUser.displayName}</p>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          availableUser.role === 'admin' 
                            ? 'bg-red-100 text-red-700'
                            : availableUser.role === 'teacher'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {availableUser.role === 'admin' ? 'Admin' : availableUser.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                        </span>
                        {availableUser.studentClass && (
                          <span className="text-xs text-gray-600">{availableUser.studentClass}</span>
                        )}
                      </div>
                    </div>
                    {hasConversation && (
                      <MessageCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {!showUserList && conversations.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-gray-500 px-4">
          <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
          <p className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Henüz sohbet yok</p>
          <p className="text-xs sm:text-sm">Yeni bir sohbet başlatmak için yukarıdaki butona tıklayın</p>
        </div>
      ) : !showUserList && (
        conversations.map((conv) => {
          const other = getOtherParticipant(conv);
          const unreadCount = conv.unreadCount[user?.uid || ''] || 0;

          return (
            <div
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all hover:shadow-md active:scale-98 ${
                unreadCount > 0
                  ? 'bg-indigo-50 border-l-4 border-indigo-500'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm sm:text-base truncate ${unreadCount > 0 ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {other.name}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs sm:text-sm truncate ${unreadCount > 0 ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>
                    {conv.lastMessage || 'Henüz mesaj yok'}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(conv.lastMessageTime)}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConversationList;

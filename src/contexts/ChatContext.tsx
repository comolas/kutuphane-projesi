import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: { [key: string]: number };
}

interface ChatContextType {
  conversations: Conversation[];
  sendMessage: (recipientId: string, text: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  getOrCreateConversation: (recipientId: string, recipientName: string) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Kullanıcının konuşmalarını dinle
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((doc) => {
        convs.push({ id: doc.id, ...doc.data() } as Conversation);
      });
      
      // Son mesaj zamanına göre sırala
      convs.sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis() || 0;
        const timeB = b.lastMessageTime?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [user]);

  const getOrCreateConversation = async (recipientId: string, recipientName: string): Promise<string> => {
    if (!user || !userData) throw new Error('User not authenticated');

    const conversationId = [user.uid, recipientId].sort().join('_');
    const convRef = doc(db, 'conversations', conversationId);

    try {
      await setDoc(convRef, {
        participants: [user.uid, recipientId],
        participantNames: {
          [user.uid]: userData.displayName || 'Kullanıcı',
          [recipientId]: recipientName
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        unreadCount: {
          [user.uid]: 0,
          [recipientId]: 0
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    return conversationId;
  };

  // Mesaj gönder
  const sendMessage = async (recipientId: string, text: string) => {
    if (!user || !userData) throw new Error('User not authenticated');

    const conversationId = [user.uid, recipientId].sort().join('_');

    // Mesajı ekle
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId: user.uid,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false
    });

    // Konuşmayı güncelle
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: text.trim(),
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${recipientId}`]: (conversations.find(c => c.id === conversationId)?.unreadCount[recipientId] || 0) + 1
    });
  };

  // Okundu işaretle
  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${user.uid}`]: 0
    });

    // Mesajları okundu olarak işaretle
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, where('senderId', '!=', user.uid), where('read', '==', false));
    const snapshot = await getDocs(q);
    
    snapshot.forEach(async (messageDoc) => {
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageDoc.id), {
        read: true
      });
    });
  };

  return (
    <ChatContext.Provider value={{ conversations, sendMessage, markAsRead, getOrCreateConversation }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

import React, { createContext, useContext, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from './AuthContext';
import { useBooks } from './BookContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantContextType {
  messages: Message[];
  isLoading: boolean;
  selectedFunction: string;
  sendMessage: (message: string, func?: string) => Promise<void>;
  clearChat: () => void;
  setSelectedFunction: (fn: string) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState('general');
  const { user } = useAuth();
  const { borrowedBooks } = useBooks();

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  const generatePrompt = (userMessage: string, func?: string) => {
    const userBorrowedBooks = borrowedBooks.map(book => ({
      title: book.title,
      author: book.author,
      tags: book.tags
    }));

    const functionPrompts = {
      general: `Sen bir kütüphane asistanısın. Kullanıcıya yardımcı ol.`,
      bookRecommendation: `Sen bir kitap öneri uzmanısın. Kullanıcının okuduğu kitaplara ve tercihlerine göre önerilerde bulun.`,
      research: `Sen bir araştırma danışmanısın. Kullanıcıya akademik araştırma ve kaynak bulma konusunda yardımcı ol.`,
      readingPlan: `Sen bir okuma koçusun. Kullanıcıya etkili okuma planları oluşturma konusunda yardımcı ol.`,
      libraryServices: `Sen bir kütüphane rehberisin. Kütüphane hizmetleri, kuralları ve kaynakları hakkında bilgi ver.`
    };

    return `
      ${functionPrompts[func || 'general']}
      
      Kullanıcının mesajı: "${userMessage}"
      
      Kullanıcının ödünç aldığı kitaplar: ${JSON.stringify(userBorrowedBooks)}
      
      Önerilerini kullanıcının okuma geçmişi ve tercihlerine göre yap.
      Yanıtlarını kısa ve öz tut, seçilen işleve odaklan.
      Türkçe yanıt ver.
    `;
  };

  const sendMessage = async (message: string, func?: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'user', content: message }]);

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = generatePrompt(message, func || selectedFunction);
      
      try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } catch (error: any) {
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Üzgünüm, şu anda çok fazla istek aldığım için yanıt veremiyorum. Lütfen birkaç dakika sonra tekrar deneyin.'
            }
          ]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <AssistantContext.Provider value={{ 
      messages, 
      isLoading, 
      selectedFunction,
      sendMessage, 
      clearChat,
      setSelectedFunction 
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
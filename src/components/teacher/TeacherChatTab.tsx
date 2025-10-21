import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const TeacherChatTab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-8 text-center">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-xl inline-block mb-6">
            <MessageCircle className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Öğrenci Sohbetleri
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Sınıfınızdaki öğrencilerle mesajlaşmak için sohbet sayfasına gidin
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 flex items-center gap-3 mx-auto font-semibold text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            Sohbet Sayfasına Git
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherChatTab;

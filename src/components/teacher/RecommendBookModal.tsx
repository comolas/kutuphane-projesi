import React, { useState, useEffect } from 'react';
import { X, Send, BookOpen, User } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { Book } from '../../types';
import Swal from 'sweetalert2';

interface RecommendBookModalProps {
  book: Book;
  onClose: () => void;
}

interface Student {
  uid: string;
  displayName: string;
  studentNumber: string;
}

const RecommendBookModal: React.FC<RecommendBookModalProps> = ({ book, onClose }) => {
  const { userData } = useAuth();
  const { getOrCreateConversation, sendMessage } = useChat();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!userData?.teacherData?.assignedClass) return;

      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('studentClass', '==', userData.teacherData.assignedClass),
          where('role', '==', 'user')
        );
        const snapshot = await getDocs(q);
        const studentList: Student[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          studentList.push({
            uid: data.uid,
            displayName: data.displayName || 'İsimsiz',
            studentNumber: data.studentNumber || ''
          });
        });
        setStudents(studentList.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr-TR')));
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [userData]);

  const handleSend = async () => {
    if (!selectedStudent) {
      Swal.fire('Uyarı', 'Lütfen bir öğrenci seçin', 'warning');
      return;
    }

    setSending(true);
    try {
      const student = students.find(s => s.uid === selectedStudent);
      if (!student) return;

      const conversationId = await getOrCreateConversation(selectedStudent, student.displayName);
      
      const message = `📚 Kitap Önerisi\n\n${userData?.displayName || 'Öğretmeniniz'} size bir kitap önerdi:\n"${book.title}" - ${book.author}\n\n${note ? `Not: ${note}\n\n` : ''}Bu kitabı katalogdan inceleyebilir ve ödünç alabilirsiniz.`;
      
      await sendMessage(selectedStudent, message);
      
      Swal.fire('Başarılı!', 'Kitap önerisi gönderildi', 'success');
      onClose();
    } catch (error) {
      console.error('Error sending recommendation:', error);
      Swal.fire('Hata', 'Öneri gönderilirken bir hata oluştu', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Kitap Öner
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <div className="flex gap-3">
              <img src={book.coverImage} alt={book.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{book.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{book.author}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Öğrenci Seç
            </label>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Yükleniyor...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">Sınıfınızda öğrenci bulunamadı</div>
            ) : (
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Öğrenci seçin...</option>
                {students.map(student => (
                  <option key={student.uid} value={student.uid}>
                    {student.displayName} {student.studentNumber && `(${student.studentNumber})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Not (Opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Öğrencinize bu kitap hakkında bir not yazabilirsiniz..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{note.length}/200</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedStudent}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendBookModal;

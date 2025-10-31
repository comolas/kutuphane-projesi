
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { X } from 'lucide-react';
import { Book } from '../../types';

interface UserDetailsModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
}

interface UserProfile {
  displayName: string;
  studentClass: string;
  studentNumber: string;
  email: string;
  role: string;
  uid: string;
}

interface BorrowedBookRecord extends Book {
  borrowedAt: { seconds: number; nanoseconds: number; };
  dueDate: { seconds: number; nanoseconds: number; };
  returnedAt?: { seconds: number; nanoseconds: number; };
  returnStatus: 'borrowed' | 'returned' | 'pending';
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, userId, onClose }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBookRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserDetails = async () => {
        setLoading(true);
        try {
          // Fetch user profile
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser(userSnap.data() as UserProfile);
          }

          // Fetch borrowed books history
          const borrowedBooksRef = collection(db, 'borrowedBooks');
          const q = query(borrowedBooksRef, where('userId', '==', userId));
          const querySnapshot = await getDocs(q);
          const books: BorrowedBookRecord[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            books.push({
              ...data.book,
              id: doc.id,
              borrowedAt: data.borrowedAt,
              dueDate: data.dueDate,
              returnedAt: data.returnDate,
              returnStatus: data.returnStatus,
            } as BorrowedBookRecord);
          });
          setBorrowedBooks(books);

        } catch (error) {
          console.error("Error fetching user details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserDetails();
    }
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const formatDate = (timestamp: { seconds: number; nanoseconds: number; }) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Kullanıcı Detayları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <p className="text-sm sm:text-base">Yükleniyor...</p>
          ) : user ? (
            <div>
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">Kullanıcı Bilgileri</h4>
                <p className="text-xs sm:text-sm mb-1"><strong>Ad Soyad:</strong> {user.displayName}</p>
                <p className="text-xs sm:text-sm mb-1"><strong>Sınıf:</strong> {user.studentClass}</p>
                <p className="text-xs sm:text-sm mb-1"><strong>Okul Numarası:</strong> {user.studentNumber}</p>
                <p className="text-xs sm:text-sm mb-1"><strong>Email:</strong> {user.email}</p>
                <p className="text-xs sm:text-sm"><strong>Rol:</strong> {user.role}</p>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">Ödünç Alınan Kitaplar ({borrowedBooks.length})</h4>
                <div className="space-y-3 sm:space-y-4">
                  {borrowedBooks.length > 0 ? (
                    borrowedBooks.map(book => (
                      <div key={book.id} className="p-3 sm:p-4 border rounded-lg">
                        <p className="text-xs sm:text-sm mb-1"><strong>Kitap Adı:</strong> {book.title}</p>
                        <p className="text-xs sm:text-sm mb-1"><strong>Yazar:</strong> {book.author}</p>
                        <p className="text-xs sm:text-sm mb-1"><strong>Alınma Tarihi:</strong> {formatDate(book.borrowedAt)}</p>
                        <p className="text-xs sm:text-sm mb-1"><strong>Teslim Tarihi:</strong> {formatDate(book.dueDate)}</p>
                        <p className="text-xs sm:text-sm"><strong>İade Durumu:</strong> {book.returnStatus === 'returned' ? `İade Edildi (${formatDate(book.returnedAt)})` : 'Ödünç Alındı'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs sm:text-sm">Bu kullanıcı hiç kitap ödünç almamış.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base">Kullanıcı bulunamadı.</p>
          )}
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-semibold min-h-[44px]"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, Book } from '../../types';
import { X, Loader, User as UserIcon, Book as BookIcon, Calendar, Hash } from 'lucide-react';

interface BorrowHistory extends Book {
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  returnStatus?: 'borrowed' | 'returned' | 'pending';
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          // Fetch user details
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser({ id: userSnap.id, ...userSnap.data() } as User);
          }

          // Fetch user's borrow history
          const historyQuery = query(
            collection(db, 'borrowedBooks'), 
            where('userId', '==', userId),
            orderBy('borrowedAt', 'desc')
          );
          const historySnap = await getDocs(historyQuery);
          const historyData = historySnap.docs.map(d => {
            const data = d.data();
            return {
              ...data.book,
              borrowedAt: data.borrowedAt.toDate(),
              dueDate: data.dueDate.toDate(),
              returnedAt: data.returnDate ? data.returnDate.toDate() : undefined,
              returnStatus: data.returnStatus,
            } as BorrowHistory;
          });
          setHistory(historyData);

        } catch (error) {
          console.error("Error fetching user details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <UserIcon className="w-7 h-7 mr-3 text-indigo-600" />
            Kullanıcı Detayları
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
          ) : user ? (
            <>
              {/* User Profile Section */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Profil Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-base">
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="font-medium text-gray-900">{user.displayName}</span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
                     <span className="text-gray-700">{user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Hash className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="text-gray-700">{user.studentClass} Sınıfı</span>
                  </div>
                  <div className="flex items-center">
                    <Hash className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="text-gray-700">{user.studentNumber}</span>
                  </div>
                </div>
              </div>

              {/* Borrow History Section */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BookIcon className="w-6 h-6 mr-3 text-gray-600" />
                  Kitap Geçmişi ({history.length})
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitap Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödünç Tarihi</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planlanan İade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gerçek İade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {history.length > 0 ? history.map((book, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{book.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.borrowedAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(book.dueDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {book.returnedAt ? new Date(book.returnedAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {book.returnStatus === 'returned' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  İade Edildi
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Kullanıcıda
                                </span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-500">
                              Bu kullanıcıya ait bir kitap geçmişi bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-500">Kullanıcı bilgileri yüklenemedi.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useNavigate } from 'react-router-dom';
import { User, AlertTriangle, Search, Library, Book as BookIcon, ArrowDownUp, Users as UsersIcon } from 'lucide-react';

// Interfaces
interface UserData {
  uid: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  photoURL?: string;
}

interface BookData {
    id: string;
    title: string;
}

interface BorrowedBookDoc {
  userId: string;
  book: BookData;
  dueDate: { seconds: number };
  returnStatus: 'borrowed';
  borrowStatus: 'approved';
}

interface UserWithBorrows extends UserData {
  isOverdue: boolean;
  borrowedBookTitles: string[];
  borrowCount: number;
  soonestDueDate: number; // Store as timestamp for easy sorting
}

const BorrowedBooksTab: React.FC = () => {
  const [usersWithBorrows, setUsersWithBorrows] = useState<UserWithBorrows[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [sortOption, setSortOption] = useState('due-date-asc');
  const [classFilter, setClassFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsersWithBorrows = async () => {
      setLoading(true);
      try {
        const borrowsQuery = query(
          collection(db, 'borrowedBooks'), 
          where('returnStatus', '==', 'borrowed'),
          where('borrowStatus', '==', 'approved')
        );
        const borrowsSnapshot = await getDocs(borrowsQuery);
        const borrows = borrowsSnapshot.docs.map(doc => doc.data() as BorrowedBookDoc);

        if (borrows.length === 0) {
          setUsersWithBorrows([]);
          setLoading(false);
          return;
        }

        const userIds = [...new Set(borrows.map(b => b.userId))];
        const usersData = await fetchCollectionData(userIds, 'users');
        const usersMap = new Map(usersData.map(u => [u.uid, u]));

        const combinedData = userIds.map(userId => {
          const user = usersMap.get(userId);
          if (!user) return null;

          const userBorrows = borrows.filter(b => b.userId === userId);
          const now = new Date();
          const isOverdue = userBorrows.some(b => new Date(b.dueDate.seconds * 1000) < now);
          const borrowedBookTitles = userBorrows.map(b => b.book.title);
          const borrowCount = userBorrows.length;
          const soonestDueDate = Math.min(...userBorrows.map(b => b.dueDate.seconds));

          return { ...user, isOverdue, borrowedBookTitles, borrowCount, soonestDueDate };
        }).filter((u): u is UserWithBorrows => u !== null);

        setUsersWithBorrows(combinedData);

      } catch (error) {
        console.error("Error fetching users with borrowed books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersWithBorrows();
  }, []);

  const fetchCollectionData = async (ids: string[], collectionName: string): Promise<UserData[]> => {
    const data: UserData[] = [];
    if (ids.length === 0) return data;

    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) {
      chunks.push(ids.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      if (chunk.length === 0) continue;
      const q = query(collection(db, collectionName), where('uid', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        data.push({ uid: doc.id, ...doc.data() } as UserData);
      });
    }
    return data;
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set(usersWithBorrows.map(u => u.studentClass).filter(Boolean));
    return ['all', ...Array.from(classes).sort()];
  }, [usersWithBorrows]);

  const sortedAndFilteredUsers = useMemo(() => {
    return usersWithBorrows
      .filter(user => {
        const matchesClass = classFilter === 'all' || user.studentClass === classFilter;
        if (!matchesClass) return false;

        if (showOnlyOverdue && !user.isOverdue) return false;
        
        if (searchTerm.trim() === '') return true;

        const lowercasedTerm = searchTerm.toLowerCase();
        const nameMatch = user.displayName.toLowerCase().includes(lowercasedTerm);
        const bookMatch = user.borrowedBookTitles.some(title => title.toLowerCase().includes(lowercasedTerm));
        return nameMatch || bookMatch;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'name-asc':
            return a.displayName.localeCompare(b.displayName);
          case 'name-desc':
            return b.displayName.localeCompare(a.displayName);
          case 'book-count-desc':
            return b.borrowCount - a.borrowCount;
          case 'book-count-asc':
            return a.borrowCount - b.borrowCount;
          case 'due-date-asc':
            return a.soonestDueDate - b.soonestDueDate;
          default:
            return 0;
        }
      });
  }, [usersWithBorrows, searchTerm, showOnlyOverdue, sortOption, classFilter]);

  const handleUserClick = (userId: string) => {
    navigate(`/admin/borrowed-by/${userId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center p-10"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="p-1">
        <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Library className="w-6 h-6 mr-2 text-indigo-600" />
                    Kitap Ödünç Alan Kullanıcılar
                </h2>
            </div>
            {/* Filter and Search Bar */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                <div className="lg:col-span-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Kullanıcı veya kitap adına göre ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                        <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select 
                            value={classFilter}
                            onChange={e => setClassFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            {uniqueClasses.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'Tüm Sınıflar' : c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select 
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            <option value="due-date-asc">En Yakın Teslim Tarihi</option>
                            <option value="name-asc">İsme Göre (A-Z)</option>
                            <option value="name-desc">İsme Göre (Z-A)</option>
                            <option value="book-count-desc">Kitap Sayısı (En Çok)</option>
                            <option value="book-count-asc">Kitap Sayısı (En Az)</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-end">
                        <input 
                            type="checkbox"
                            id="overdueFilter"
                            checked={showOnlyOverdue}
                            onChange={e => setShowOnlyOverdue(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="overdueFilter" className="ml-2 block text-sm font-medium text-gray-700">Sadece Gecikenleri Göster</label>
                    </div>
                </div>
            </div>

            {sortedAndFilteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Eşleşen kullanıcı bulunamadı.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
                {sortedAndFilteredUsers.map(user => (
                    <div
                        key={user.uid}
                        onClick={() => handleUserClick(user.uid)}
                        className={`bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${user.isOverdue ? 'border-2 border-red-500' : ''}`}>
                        <div className="relative w-full h-72">
                            {user.isOverdue && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 z-10" title="Bu kullanıcının gecikmiş kitabı var">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                            )}
                             <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center z-10">
                                <BookIcon className="w-3 h-3 mr-1" />
                                {user.borrowCount} Kitap
                            </div>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/200'; }} />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <User className="w-20 h-20 text-gray-400" />
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <h2 className="font-bold text-lg text-gray-800 truncate group-hover:text-indigo-600" title={user.displayName}>{user.displayName}</h2>
                            <p className="text-sm text-gray-600">{user.studentClass} - {user.studentNumber}</p>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default BorrowedBooksTab;

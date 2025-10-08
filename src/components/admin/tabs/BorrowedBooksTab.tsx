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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
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
    const filtered = usersWithBorrows
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
    return filtered;
  }, [usersWithBorrows, searchTerm, showOnlyOverdue, sortOption, classFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedAndFilteredUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showOnlyOverdue, sortOption, classFilter]);

  const getDueDateColor = (dueDate: number) => {
    const now = new Date();
    const due = new Date(dueDate * 1000);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'from-red-500 to-red-600'; // Gecikmiş
    if (daysUntilDue === 0) return 'from-orange-500 to-orange-600'; // Bugün
    if (daysUntilDue <= 7) return 'from-yellow-400 to-yellow-500'; // 1-7 gün
    return 'from-green-500 to-green-600'; // 7+ gün
  };

  const handleUserClick = (userId: string) => {
    navigate(`/admin/borrowed-by/${userId}`);
  };

  if (loading) {
    return (
      <div className="p-1">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="w-full h-72 bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Görünüm</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
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
                        <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                        <select 
                            value={classFilter}
                            onChange={e => setClassFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all duration-200 hover:border-indigo-400"
                        >
                            {uniqueClasses.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'Tüm Sınıflar' : c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                        <select 
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all duration-200 hover:border-indigo-400"
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
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition-all duration-200 cursor-pointer"
                        />
                        <label htmlFor="overdueFilter" className="ml-2 block text-sm font-medium text-gray-700">Sadece Gecikenleri Göster</label>
                    </div>
                </div>
            </div>
            </div>

            {sortedAndFilteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-32 h-32 mb-6 text-gray-300">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Kullanıcı Bulunamadı</h3>
                    <p className="text-gray-500 text-center mb-6 max-w-md">
                        {searchTerm || showOnlyOverdue || classFilter !== 'all' 
                            ? 'Arama kriterlerinize uygun kullanıcı bulunamadı. Filtreleri değiştirmeyi deneyin.'
                            : 'Şu anda ödünç alınmış kitap bulunmamaktadır.'}
                    </p>
                    {(searchTerm || showOnlyOverdue || classFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setShowOnlyOverdue(false);
                                setClassFilter('all');
                            }}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Filtreleri Temizle
                        </button>
                    )}
                </div>
            ) : (
                <>
                <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 p-4" 
                    : "flex flex-col gap-3 p-4"}>
                {paginatedUsers.map((user, index) => (
                    viewMode === 'grid' ? (
                        <div
                            key={user.uid}
                            onClick={() => handleUserClick(user.uid)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 cursor-pointer group animate-fadeInUp">
                            <div className={`h-2 bg-gradient-to-r ${getDueDateColor(user.soonestDueDate)}`}></div>
                            <div className="relative w-full h-64 sm:h-72">

                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center z-10">
                                    <BookIcon className="w-3 h-3 mr-1" />
                                    {user.borrowCount} Kitap
                                </div>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/200'; }} />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="p-3 sm:p-4">
                                <h2 className="font-bold text-base sm:text-lg text-gray-800 truncate group-hover:text-indigo-600" title={user.displayName}>{user.displayName}</h2>
                                <p className="text-xs sm:text-sm text-gray-600">{user.studentClass} - {user.studentNumber}</p>
                            </div>
                        </div>
                    ) : (
                        <div
                            key={user.uid}
                            onClick={() => handleUserClick(user.uid)}
                            style={{ animationDelay: `${index * 30}ms` }}
                            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer animate-fadeInUp relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${getDueDateColor(user.soonestDueDate)}`}></div>
                            <div className="flex items-center gap-4 p-4">
                                <div className="relative flex-shrink-0">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/80'; }} />
                                    ) : (
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                        </div>
                                    )}

                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-bold text-base sm:text-lg text-gray-800 truncate">{user.displayName}</h2>
                                    <p className="text-xs sm:text-sm text-gray-600">{user.studentClass} - {user.studentNumber}</p>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                        <BookIcon className="w-3 h-3" />
                                        <span>{user.borrowCount} Kitap</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )
                ))}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 border-t">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm text-gray-600">
                            Sayfa {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
                </>
            )}
        </div>
    </div>
  );
};

export default BorrowedBooksTab;

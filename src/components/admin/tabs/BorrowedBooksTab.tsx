import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useNavigate } from 'react-router-dom';
import { User, AlertTriangle, Search, Library, Book as BookIcon, ArrowDownUp, Users as UsersIcon, Filter, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import DOMPurify from 'dompurify';

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
  const { isSuperAdmin, campusId } = useAuth();
  const [usersWithBorrows, setUsersWithBorrows] = useState<UserWithBorrows[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [sortOption, setSortOption] = useState('due-date-asc');
  const [classFilter, setClassFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsersWithBorrows = async () => {
      setLoading(true);
      try {
        const borrowsQuery = isSuperAdmin 
          ? query(
              collection(db, 'borrowedBooks'), 
              where('returnStatus', '==', 'borrowed'),
              where('borrowStatus', '==', 'approved')
            )
          : query(
              collection(db, 'borrowedBooks'), 
              where('returnStatus', '==', 'borrowed'),
              where('borrowStatus', '==', 'approved'),
              where('campusId', '==', campusId)
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
  }, [isSuperAdmin, campusId]);

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

  const statistics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalUsers = usersWithBorrows.length;
    const totalBooks = usersWithBorrows.reduce((sum, user) => sum + user.borrowCount, 0);
    const overdueCount = usersWithBorrows.filter(user => user.isOverdue).length;
    const dueTodayCount = usersWithBorrows.filter(user => {
      const dueDate = new Date(user.soonestDueDate * 1000);
      return dueDate >= today && dueDate < tomorrow;
    }).length;

    return { totalUsers, totalBooks, overdueCount, dueTodayCount };
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

  const sanitizeText = (text: string): string => {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  };

  const sanitizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return DOMPurify.sanitize(url, { ALLOWED_TAGS: [] });
      }
    } catch {
      return 'https://via.placeholder.com/200';
    }
    return 'https://via.placeholder.com/200';
  };

  const handleUserClick = (userId: string) => {
    navigate(`/admin/borrowed-by/${encodeURIComponent(userId)}`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-7xl mx-auto">
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/20">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Library className="w-6 h-6 mr-2 text-indigo-600" />
                    Kitap Ödünç Alan Kullanıcılar
                </h2>
            </div>

            <div className="p-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-6 text-white shadow-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                                <p className="text-blue-100 text-xs sm:text-sm font-medium">Toplam Kullanıcı</p>
                                <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{statistics.totalUsers}</p>
                            </div>
                            <div className="bg-white/20 p-2 sm:p-3 rounded-lg">
                                <UsersIcon className="w-5 h-5 sm:w-8 sm:h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Toplam Kitap</p>
                                <p className="text-3xl font-bold mt-2">{statistics.totalBooks}</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-lg">
                                <BookIcon className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-100 text-sm font-medium">Gecikmiş İade</p>
                                <p className="text-3xl font-bold mt-2">{statistics.overdueCount}</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-lg">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Bugün Teslim</p>
                                <p className="text-3xl font-bold mt-2">{statistics.dueTodayCount}</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-lg">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Filter Button (Mobile) */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                    <Filter className="w-6 h-6" />
                </button>

                {/* Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    {/* Sidebar */}
                    <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } lg:flex-shrink-0 border border-white/20`}>
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h2 className="text-base sm:text-lg font-semibold flex items-center">
                                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                                Filtreler
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setShowOnlyOverdue(false);
                                        setClassFilter('all');
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    Temizle
                                </button>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="lg:hidden text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 sm:mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Kullanıcı veya kitap ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <Search className="absolute left-2.5 sm:left-3 top-2.5 text-gray-400" size={14} />
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Sınıf</h3>
                                <div className="space-y-1 sm:space-y-2 max-h-48 overflow-y-auto">
                                    {uniqueClasses.map(c => (
                                        <label key={c} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 sm:p-2 rounded touch-manipulation">
                                            <input
                                                type="radio"
                                                name="class"
                                                checked={classFilter === c}
                                                onChange={() => setClassFilter(c)}
                                                className="mr-2"
                                            />
                                            <span className="text-xs sm:text-sm">{c === 'all' ? 'Tümü' : c}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Sıralama</h3>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="due-date-asc">En Yakın Teslim</option>
                                    <option value="name-asc">İsim (A-Z)</option>
                                    <option value="name-desc">İsim (Z-A)</option>
                                    <option value="book-count-desc">En Çok Kitap</option>
                                    <option value="book-count-asc">En Az Kitap</option>
                                </select>
                            </div>

                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Durum</h3>
                                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded touch-manipulation">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyOverdue}
                                        onChange={(e) => setShowOnlyOverdue(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-xs sm:text-sm text-red-600">● Sadece Gecikenler</span>
                                </label>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="mb-3 sm:mb-4 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 touch-manipulation ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600">{sortedAndFilteredUsers.length} kullanıcı bulundu</p>
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
                    ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 p-2 sm:p-4" 
                    : "flex flex-col gap-2 sm:gap-3 p-2 sm:p-4"}>
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
                                    <img src={sanitizeUrl(user.photoURL)} alt={sanitizeText(user.displayName)} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/200'; }} />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="p-3 sm:p-4">
                                <h2 className="font-bold text-base sm:text-lg text-gray-800 truncate group-hover:text-indigo-600" title={sanitizeText(user.displayName)}>{sanitizeText(user.displayName)}</h2>
                                <p className="text-xs sm:text-sm text-gray-600">{sanitizeText(user.studentClass)} - {sanitizeText(user.studentNumber)}</p>
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
                                        <img src={sanitizeUrl(user.photoURL)} alt={sanitizeText(user.displayName)} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src='https://via.placeholder.com/80'; }} />
                                    ) : (
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                        </div>
                                    )}

                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-bold text-base sm:text-lg text-gray-800 truncate">{sanitizeText(user.displayName)}</h2>
                                    <p className="text-xs sm:text-sm text-gray-600">{sanitizeText(user.studentClass)} - {sanitizeText(user.studentNumber)}</p>
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
            </div>
        </div>
    </div>
    </div>
  );
};

export default BorrowedBooksTab;

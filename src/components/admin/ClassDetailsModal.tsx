import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, BookOpen, Award, TrendingUp, DollarSign } from 'lucide-react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Bar } from 'react-chartjs-2';
import { Book, UserData } from '../../types';

interface StudentStats {
  id: string;
  name: string;
  totalReads: number;
  monthlyReads: number;
  favoriteCategory: string;
  favoriteAuthor: string;
  totalFinesPaid: number;
  monthlyFinesPaid: number;
  monthlyBorrowsData: { title: string; author: string; }[];
}

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string | null;
  reportMonth: string;
}

type SortableKeys = keyof Pick<StudentStats, 'name' | 'monthlyReads' | 'totalReads' | 'monthlyFinesPaid' | 'totalFinesPaid'>;

const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({ isOpen, onClose, className, reportMonth }) => {
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [detailedStudent, setDetailedStudent] = useState<StudentStats | null>(null);
  const [schoolAverage, setSchoolAverage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchClassData = async () => {
      if (!className) return;

      setLoading(true);
      try {
        const [usersSnapshot, borrowedBooksSnapshot, booksSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'borrowedBooks')),
          getDocs(collection(db, 'books'))
        ]);

        const allUsers = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          displayName: doc.data().displayName || '',
          email: doc.data().email || '',
          photoURL: doc.data().photoURL || '',
          studentClass: doc.data().studentClass || '',
          role: doc.data().role || 'student',
          createdAt: doc.data().createdAt || null,
        })) as UserData[];
        const allBorrowed = borrowedBooksSnapshot.docs.map(doc => doc.data());
        const allBooks = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];

        const studentsOfClass = allUsers.filter(user => user.studentClass === className);

        const [year, month] = reportMonth.split('-').map(Number);

        const totalSchoolBorrowsInMonth = allBorrowed.filter(b => {
          if (!b.borrowedAt) return false;
          const borrowDate = (b.borrowedAt as Timestamp).toDate();
          return borrowDate.getFullYear() === year && borrowDate.getMonth() === month - 1;
        }).length;
        
        const totalStudents = allUsers.filter(u => u.role === 'student').length;
        setSchoolAverage(totalStudents > 0 ? (totalSchoolBorrowsInMonth / totalStudents) : 0);

        const studentStats = studentsOfClass.map(student => {
          const studentBorrows = allBorrowed.filter(b => b.userId === student.uid);

          const monthlyBorrows = studentBorrows.filter(b => {
            if (!b.borrowedAt) return false;
            const borrowDate = (b.borrowedAt as Timestamp).toDate();
            return borrowDate.getFullYear() === year && borrowDate.getMonth() === month - 1;
          });

          const monthlyBorrowsData = monthlyBorrows.map(borrow => {
            const book = allBooks.find(b => b.id === borrow.bookId);
            return { 
              title: book?.title || 'Bilinmeyen Kitap', 
              author: book?.author || 'Bilinmeyen Yazar' 
            };
          });

          const favoriteCategory = (borrows => {
            if (borrows.length === 0) return 'N/A';
            const categoryCounts = new Map<string, number>();
            borrows.forEach(borrow => {
              const book = allBooks.find(b => b.id === borrow.bookId);
              if (book && book.category) {
                categoryCounts.set(book.category, (categoryCounts.get(book.category) || 0) + 1);
              }
            });
            if (categoryCounts.size === 0) return 'N/A';
            return [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          })(studentBorrows);

          const favoriteAuthor = (borrows => {
            if (borrows.length === 0) return 'N/A';
            const authorCounts = new Map<string, number>();
            borrows.forEach(borrow => {
              const book = allBooks.find(b => b.id === borrow.bookId);
              if (book && book.author) {
                authorCounts.set(book.author, (authorCounts.get(book.author) || 0) + 1);
              }
            });
            if (authorCounts.size === 0) return 'N/A';
            return [...authorCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          })(studentBorrows);

          const totalFinesPaid = studentBorrows
            .filter(b => b.fineStatus === 'paid' && b.fineAmount)
            .reduce((sum, b) => sum + (b.fineAmount || 0), 0);

          const monthlyFinesPaid = studentBorrows
            .filter(b => {
              if (b.fineStatus !== 'paid' || !b.returnDate) return false;
              const returnDate = (b.returnDate as Timestamp).toDate();
              return returnDate.getFullYear() === year && returnDate.getMonth() === month - 1;
            })
            .reduce((sum, b) => sum + (b.fineAmount || 0), 0);

          return {
            id: student.uid,
            name: student.displayName,
            totalReads: studentBorrows.length,
            monthlyReads: monthlyBorrows.length,
            favoriteCategory,
            favoriteAuthor,
            totalFinesPaid,
            monthlyFinesPaid,
            monthlyBorrowsData,
          };
        });

        setStudents(studentStats);
      } catch (error) {
        console.error("Error fetching class details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchClassData();
    }
  }, [isOpen, className, reportMonth]);

  const monthName = useMemo(() => {
    if (!reportMonth) return '';
    const [year, month] = reportMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('tr-TR', { month: 'long' });
  }, [reportMonth]);

  const totalMonthlyReads = useMemo(() => 
    students.reduce((acc, student) => acc + student.monthlyReads, 0), 
  [students]);

  const classAverage = useMemo(() => 
    students.length > 0 ? totalMonthlyReads / students.length : 0,
  [students, totalMonthlyReads]);

  const comparisonData = {
    labels: ['Ortalamalar'],
    datasets: [
      {
        label: 'Sınıf Ortalaması',
        data: [classAverage],
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
      },
      {
        label: 'Okul Ortalaması',
        data: [schoolAverage],
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      },
    ],
  };

  const filteredStudents = useMemo(() => 
    students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [students, searchTerm]);

  const sortedStudents = useMemo(() => {
    let sortableStudents = [...filteredStudents];
    if (sortConfig !== null) {
      sortableStudents.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStudents;
  }, [filteredStudents, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const currentStudents = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedStudents.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedStudents, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => 
    Math.ceil(filteredStudents.length / itemsPerPage), 
  [filteredStudents, itemsPerPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col transform transition-all duration-300 animate-slideUp">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl flex justify-between items-center">
          <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            <span className="truncate">Sınıf: {className}</span>
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-grow flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Öğrenci adıyla ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                  />
                  <Search className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 text-indigo-400" size={18} />
                </div>
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3 text-white">
                    <BookOpen className="w-8 h-8" />
                    <div>
                      <p className="text-sm opacity-90">{monthName} Ayı Toplam Okuma</p>
                      <p className="text-3xl font-bold">{totalMonthlyReads}</p>
                    </div>
                  </div>
                </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-4 shadow-lg border border-indigo-100">
                <h4 className="text-sm font-semibold text-center text-gray-700 mb-3 flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Sınıf vs. Okul Ortalaması
                </h4>
                <Bar 
                  data={comparisonData} 
                  options={{ 
                    indexAxis: 'y', 
                    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
                  }} 
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Öğrenci verileri hesaplanıyor...</p>
              </div>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto bg-white rounded-xl shadow-inner">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => requestSort('name')}>
                      <span className="hidden sm:inline">Öğrenci Adı</span><span className="sm:hidden">Ad</span> {sortConfig?.key === 'name' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => requestSort('monthlyReads')}>
                      <span className="hidden sm:inline">{monthName} Ayı</span><span className="sm:hidden">Ay</span> {sortConfig?.key === 'monthlyReads' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors hidden md:table-cell" onClick={() => requestSort('totalReads')}>
                      Toplam {sortConfig?.key === 'totalReads' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors hidden lg:table-cell" onClick={() => requestSort('monthlyFinesPaid')}>
                      Aylık Ceza {sortConfig?.key === 'monthlyFinesPaid' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors hidden lg:table-cell" onClick={() => requestSort('totalFinesPaid')}>
                      Toplam Ceza {sortConfig?.key === 'totalFinesPaid' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 cursor-pointer group" onClick={() => setDetailedStudent(student)}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-indigo-100 text-indigo-800">
                          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                          {student.monthlyReads}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          <Award className="w-4 h-4" />
                          {student.totalReads}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${student.monthlyFinesPaid > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          <DollarSign className="w-4 h-4" />
                          {student.monthlyFinesPaid} TL
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${student.totalFinesPaid > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          <DollarSign className="w-4 h-4" />
                          {student.totalFinesPaid} TL
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 text-center sm:text-left">
                Sayfa {currentPage} / {totalPages}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center min-h-[44px] shadow-md touch-manipulation"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center min-h-[44px] shadow-md touch-manipulation"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {detailedStudent && (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center animate-fadeIn p-2 sm:p-4" onClick={() => setDetailedStudent(null)}>
        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-lg transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {detailedStudent.name.charAt(0).toUpperCase()}
              </div>
              <h4 className="text-2xl font-bold text-gray-900">{detailedStudent.name}</h4>
            </div>
            <button onClick={() => setDetailedStudent(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"><X size={24} /></button>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-md border border-indigo-100">
              <h5 className="font-bold text-indigo-700 flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5" />
                Bu Ay Okuduğu Kitaplar ({detailedStudent.monthlyReads})
              </h5>
              {detailedStudent.monthlyBorrowsData.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {detailedStudent.monthlyBorrowsData.map((book, index) => (
                    <li key={index} className="flex items-start gap-2 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
                      <span className="text-indigo-600 font-bold text-xs mt-1">•</span>
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{book.title}</span>
                        <span className="text-gray-500"> - {book.author}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">Bu ay hiç kitap okumamış.</p>
              )}
            </div>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 shadow-md text-white">
              <h5 className="font-bold flex items-center gap-2 mb-3">
                <Award className="w-5 h-5" />
                Genel İstatistikler
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                  <span className="text-sm">Favori Kategorisi:</span>
                  <span className="font-bold">{detailedStudent.favoriteCategory}</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                  <span className="text-sm">Favori Yazarı:</span>
                  <span className="font-bold">{detailedStudent.favoriteAuthor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ClassDetailsModal;

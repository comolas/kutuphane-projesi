import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
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

        // Calculate school-wide average for the month
        const totalSchoolBorrowsInMonth = allBorrowed.filter(b => {
          if (!b.borrowedAt) return false;
          const borrowDate = (b.borrowedAt as Timestamp).toDate();
          return borrowDate.getFullYear() === year && borrowDate.getMonth() === month - 1;
        }).length;
        
        const totalStudents = allUsers.filter(u => u.role === 'student').length;
        setSchoolAverage(totalStudents > 0 ? totalSchoolBorrowsInMonth / totalStudents : 0);

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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-2xl font-semibold text-gray-900">Sınıf Detayları: {className}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-6 flex-grow flex flex-col">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Öğrenci adıyla ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
                <div className="text-lg font-semibold text-gray-800 mt-2">
                  {monthName} Ayı Toplam Okuma: <span className="text-indigo-600">{totalMonthlyReads}</span>
                </div>
            </div>
            <div className="col-span-1">
              <h4 className="text-sm font-semibold text-center text-gray-600 mb-1">Sınıf vs. Okul Ortalaması</h4>
              <Bar 
                data={comparisonData} 
                options={{ 
                  indexAxis: 'y', 
                  scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                  plugins: { legend: { display: true, position: 'bottom' } }
                }} 
              />
            </div>
          </div>

          {loading ? (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-lg">Öğrenci verileri hesaplanıyor...</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                      Öğrenci Adı {sortConfig?.key === 'name' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('monthlyReads')}>
                      {monthName} Ayı Okuma {sortConfig?.key === 'monthlyReads' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalReads')}>
                      Toplam Okuma {sortConfig?.key === 'totalReads' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('monthlyFinesPaid')}>
                      Aylık Ceza (₺) {sortConfig?.key === 'monthlyFinesPaid' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalFinesPaid')}>
                      Toplam Ceza (₺) {sortConfig?.key === 'totalFinesPaid' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.map(student => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600" onClick={() => setDetailedStudent(student)}>{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{student.monthlyReads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{student.totalReads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{student.monthlyFinesPaid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{student.totalFinesPaid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailedStudent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={() => setDetailedStudent(null)}>
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                  <h4 className="text-xl font-bold text-gray-900">{detailedStudent.name}</h4>
                  <button onClick={() => setDetailedStudent(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <h5 className="font-semibold text-gray-700">Bu Ay Okuduğu Kitaplar ({detailedStudent.monthlyReads})</h5>
                    {detailedStudent.monthlyBorrowsData.length > 0 ? (
                      <ul className="list-disc list-inside mt-2 text-sm text-gray-600 max-h-40 overflow-y-auto">
                        {detailedStudent.monthlyBorrowsData.map((book, index) => (
                          <li key={index}>{book.title} - <i>{book.author}</i></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">Bu ay hiç kitap okumamış.</p>
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-700">Genel İstatistikler</h5>
                    <p className="text-sm text-gray-600">Favori Kategorisi: <span className="font-medium text-indigo-600">{detailedStudent.favoriteCategory}</span></p>
                    <p className="text-sm text-gray-600">Favori Yazarı: <span className="font-medium text-indigo-600">{detailedStudent.favoriteAuthor}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> ({filteredStudents.length} öğrenci)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailsModal;

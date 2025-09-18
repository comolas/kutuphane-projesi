import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
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
}

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string | null;
  reportMonth: string;
}

const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({ isOpen, onClose, className, reportMonth }) => {
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

        const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as UserData[];
        const allBorrowed = borrowedBooksSnapshot.docs.map(doc => doc.data());
        const allBooks = booksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Book[];

        const studentsOfClass = allUsers.filter(user => user.studentClass === className);

        const [year, month] = reportMonth.split('-').map(Number);

        const studentStats = studentsOfClass.map(student => {
          const studentBorrows = allBorrowed.filter(b => b.userId === student.uid);

          const monthlyBorrows = studentBorrows.filter(b => {
            if (!b.borrowedAt) return false;
            const borrowDate = (b.borrowedAt as Timestamp).toDate();
            return borrowDate.getFullYear() === year && borrowDate.getMonth() === month - 1;
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

  const filteredStudents = useMemo(() => 
    students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [students, searchTerm]);

  const currentStudents = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => 
    Math.ceil(filteredStudents.length / itemsPerPage), 
  [filteredStudents, itemsPerPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-2xl font-semibold text-gray-900">Sınıf Detayları: {className}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-6 flex-grow flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Öğrenci adıyla ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci Adı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Okuma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aylık Okuma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Favori Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Favori Yazar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Ceza (₺)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aylık Ceza (₺)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.map(student => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.totalReads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.monthlyReads}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.favoriteCategory}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.favoriteAuthor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.totalFinesPaid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.monthlyFinesPaid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

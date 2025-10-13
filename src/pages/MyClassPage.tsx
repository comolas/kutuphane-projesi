import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, Search, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useBooks } from '../contexts/BookContext';

interface StudentData {
  uid: string;
  displayName: string;
  studentClass: string;
  studentNumber: string;
  photoURL?: string;
  totalXP?: number;
  level?: number;
}

const MyClassPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const { allBorrowedBooks } = useBooks();
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'books' | 'level'>('name');

  // Sınıf istatistikleri
  const classStats = {
    totalStudents: classStudents.length,
    activeReaders: classStudents.filter(s => 
      allBorrowedBooks.some(b => b.borrowedBy === s.uid && b.returnStatus === 'borrowed')
    ).length,
    totalBooksRead: allBorrowedBooks.filter(b => 
      classStudents.some(s => s.uid === b.borrowedBy) && b.returnStatus === 'returned'
    ).length,
    averageLevel: classStudents.length > 0 
      ? Math.round(classStudents.reduce((sum, s) => sum + (s.level || 1), 0) / classStudents.length)
      : 0
  };

  useEffect(() => {
    if (!isTeacher || !userData?.teacherData?.assignedClass) {
      navigate('/login');
    }
  }, [isTeacher, userData, navigate]);

  useEffect(() => {
    if (!isTeacher || !userData?.teacherData?.assignedClass) return;

    const fetchClassStudents = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('studentClass', '==', userData.teacherData!.assignedClass),
          where('role', '==', 'user')
        );
        const querySnapshot = await getDocs(q);
        const students: StudentData[] = [];
        querySnapshot.forEach((doc) => {
          students.push(doc.data() as StudentData);
        });
        setClassStudents(students);
      } catch (error) {
        console.error('Error fetching class students:', error);
      }
    };

    fetchClassStudents();
  }, [userData, isTeacher, navigate]);

  // Öğrenci istatistiklerini hesapla
  const getStudentStats = (studentId: string) => {
    const studentBooks = allBorrowedBooks.filter(b => b.borrowedBy === studentId);
    const activeBooksCount = studentBooks.filter(b => b.returnStatus === 'borrowed').length;
    const completedBooksCount = studentBooks.filter(b => b.returnStatus === 'returned').length;
    return { activeBooksCount, completedBooksCount };
  };

  // Filtreleme ve sıralama
  const filteredAndSortedStudents = classStudents
    .filter(student => 
      student.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.displayName.localeCompare(b.displayName);
      } else if (sortBy === 'books') {
        const aBooks = getStudentStats(a.uid).completedBooksCount;
        const bBooks = getStudentStats(b.uid).completedBooksCount;
        return bBooks - aBooks;
      } else if (sortBy === 'level') {
        return (b.level || 1) - (a.level || 1);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/teacher-dashboard')}
            className="mb-4 flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Geri Dön
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Users className="w-8 h-8 mr-3 text-orange-600" />
            Sınıfım - {userData?.teacherData?.assignedClass}
          </h1>
          <p className="text-gray-600">Toplam {classStudents.length} öğrenci</p>
        </div>

        {/* Sınıf İstatistikleri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Öğrenci</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Aktif Okuyucu</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.activeReaders}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Okunan Kitap</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.totalBooksRead}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ortalama Seviye</p>
                <p className="text-3xl font-bold text-gray-900">{classStats.averageLevel}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Öğrenci adı veya numarası ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('name')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortBy === 'name'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                İsme Göre
              </button>
              <button
                onClick={() => setSortBy('books')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortBy === 'books'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kitap Sayısı
              </button>
              <button
                onClick={() => setSortBy('level')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortBy === 'level'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Seviye
              </button>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedStudents.map((student) => {
            const stats = getStudentStats(student.uid);
            return (
              <div
                key={student.uid}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {student.photoURL ? (
                      <img
                        src={student.photoURL}
                        alt={student.displayName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-orange-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200">
                        <span className="text-2xl font-bold text-orange-600">
                          {student.displayName[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs border-2 border-white">
                      {student.level || 1}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {student.displayName}
                    </h3>
                    <p className="text-sm text-gray-600">No: {student.studentNumber}</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center text-sm">
                        <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-gray-700">
                          <span className="font-semibold">{stats.activeBooksCount}</span> aktif kitap
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 mr-2 text-green-500" />
                        <span className="text-gray-700">
                          <span className="font-semibold">{stats.completedBooksCount}</span> kitap okudu
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                        <span className="text-gray-700">
                          <span className="font-semibold">{student.totalXP || 0}</span> XP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedStudents.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Öğrenci Bulunamadı' : 'Henüz Öğrenci Yok'}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? 'Arama kriterlerinize uygun öğrenci bulunamadı.'
                : 'Bu sınıfa henüz öğrenci atanmamış.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClassPage;

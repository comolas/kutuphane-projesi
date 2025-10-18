import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Award, TrendingUp, X, ArrowLeft } from 'lucide-react';
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

const StudentComparePage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const { allBorrowedBooks } = useBooks();
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentData[]>([]);

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
        setClassStudents(students.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      } catch (error) {
        console.error('Error fetching class students:', error);
      }
    };

    fetchClassStudents();
  }, [userData, isTeacher]);

  const getStudentStats = (studentId: string) => {
    const studentBooks = allBorrowedBooks.filter(b => b.borrowedBy === studentId);
    const activeBooksCount = studentBooks.filter(b => b.returnStatus === 'borrowed').length;
    const completedBooksCount = studentBooks.filter(b => b.returnStatus === 'returned').length;
    const totalBooksCount = activeBooksCount + completedBooksCount;
    
    const completedBooks = studentBooks.filter(b => b.returnStatus === 'returned' && b.borrowDate && b.returnDate);
    const totalDays = completedBooks.reduce((sum, book) => {
      const borrowDate = book.borrowDate?.toDate();
      const returnDate = book.returnDate?.toDate();
      if (borrowDate && returnDate) {
        return sum + Math.ceil((returnDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return sum;
    }, 0);
    const avgReadingSpeed = completedBooksCount > 0 ? Math.round(totalDays / completedBooksCount) : 0;

    return { activeBooksCount, completedBooksCount, totalBooksCount, avgReadingSpeed };
  };

  const toggleStudent = (student: StudentData) => {
    if (selectedStudents.find(s => s.uid === student.uid)) {
      setSelectedStudents(selectedStudents.filter(s => s.uid !== student.uid));
    } else if (selectedStudents.length < 4) {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/my-class')}
          className="mb-6 flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Sınıfıma Dön
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Users className="w-8 h-8 mr-3 text-orange-600" />
            Öğrenci Karşılaştırma
          </h1>
          <p className="text-gray-600">En fazla 4 öğrenci seçerek karşılaştırma yapabilirsiniz</p>
        </div>

        {/* Öğrenci Seçimi */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Öğrenci Seç ({selectedStudents.length}/4)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {classStudents.map((student) => {
              const isSelected = selectedStudents.find(s => s.uid === student.uid);
              const isDisabled = !isSelected && selectedStudents.length >= 4;
              return (
                <button
                  key={student.uid}
                  onClick={() => toggleStudent(student)}
                  disabled={isDisabled}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    {student.photoURL ? (
                      <img
                        src={student.photoURL}
                        alt={student.displayName}
                        className="w-12 h-12 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-orange-600">
                          {student.displayName[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-900 text-center truncate w-full">
                      {student.displayName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Karşılaştırma Tablosu */}
        {selectedStudents.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Özellik</th>
                    {selectedStudents.map((student) => (
                      <th key={student.uid} className="px-6 py-4 text-center text-sm font-semibold">
                        <div className="flex flex-col items-center">
                          {student.photoURL ? (
                            <img
                              src={student.photoURL}
                              alt={student.displayName}
                              className="w-12 h-12 rounded-full object-cover mb-2 border-2 border-white"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2 border-2 border-white">
                              <span className="text-lg font-bold">
                                {student.displayName[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span>{student.displayName}</span>
                          <button
                            onClick={() => toggleStudent(student)}
                            className="mt-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <Award className="w-5 h-5 mr-2 text-orange-500" />
                        Seviye
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const maxLevel = Math.max(...selectedStudents.map(s => s.level || 1));
                      const isMax = (student.level || 1) === maxLevel;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-2xl font-bold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {student.level || 1}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                        Toplam XP
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const maxXP = Math.max(...selectedStudents.map(s => s.totalXP || 0));
                      const isMax = (student.totalXP || 0) === maxXP;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-xl font-semibold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {student.totalXP || 0}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                        Toplam Kitap
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const stats = getStudentStats(student.uid);
                      const maxBooks = Math.max(...selectedStudents.map(s => getStudentStats(s.uid).totalBooksCount));
                      const isMax = stats.totalBooksCount === maxBooks;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-xl font-semibold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {stats.totalBooksCount}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-green-500" />
                        Okunan Kitap
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const stats = getStudentStats(student.uid);
                      const maxCompleted = Math.max(...selectedStudents.map(s => getStudentStats(s.uid).completedBooksCount));
                      const isMax = stats.completedBooksCount === maxCompleted;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-xl font-semibold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {stats.completedBooksCount}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-indigo-500" />
                        Aktif Kitap
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const stats = getStudentStats(student.uid);
                      const maxActive = Math.max(...selectedStudents.map(s => getStudentStats(s.uid).activeBooksCount));
                      const isMax = stats.activeBooksCount === maxActive;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-xl font-semibold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {stats.activeBooksCount}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-pink-500" />
                        Ort. Okuma Hızı (gün)
                      </div>
                    </td>
                    {selectedStudents.map((student) => {
                      const stats = getStudentStats(student.uid);
                      const speeds = selectedStudents.map(s => getStudentStats(s.uid).avgReadingSpeed).filter(s => s > 0);
                      const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;
                      const isFastest = stats.avgReadingSpeed > 0 && stats.avgReadingSpeed === minSpeed;
                      return (
                        <td key={student.uid} className="px-6 py-4 text-center">
                          <span className={`text-xl font-semibold ${isFastest ? 'text-green-600' : 'text-gray-900'}`}>
                            {stats.avgReadingSpeed > 0 ? stats.avgReadingSpeed : '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedStudents.length === 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci Seçin</h3>
            <p className="text-gray-600">Karşılaştırma yapmak için yukarıdan öğrenci seçin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentComparePage;

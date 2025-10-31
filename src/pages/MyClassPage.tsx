import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, Search, Award, GitCompare, X, Calendar, Clock, AlertTriangle, FileText, Save, Trash2 } from 'lucide-react';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
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
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [studentNote, setStudentNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'behavior' | 'reading'>('general');
  const [studentNotes, setStudentNotes] = useState<any[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Sınıf istatistikleri
  const classStats = (() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const thisMonthBooksRead = allBorrowedBooks.filter(b => 
      classStudents.some(s => s.uid === b.borrowedBy) && 
      b.returnStatus === 'returned' &&
      b.returnedAt && b.returnedAt >= thisMonthStart
    ).length;
    
    const lastMonthBooksRead = allBorrowedBooks.filter(b => 
      classStudents.some(s => s.uid === b.borrowedBy) && 
      b.returnStatus === 'returned' &&
      b.returnedAt && b.returnedAt >= lastMonthStart && b.returnedAt <= lastMonthEnd
    ).length;
    
    const monthlyProgress = lastMonthBooksRead > 0 
      ? Math.round(((thisMonthBooksRead - lastMonthBooksRead) / lastMonthBooksRead) * 100)
      : thisMonthBooksRead > 0 ? 100 : 0;
    
    return {
      totalStudents: classStudents.length,
      activeReaders: classStudents.filter(s => 
        allBorrowedBooks.some(b => b.borrowedBy === s.uid && b.returnStatus === 'borrowed')
      ).length,
      totalBooksRead: allBorrowedBooks.filter(b => 
        classStudents.some(s => s.uid === b.borrowedBy) && b.returnStatus === 'returned'
      ).length,
      averageLevel: classStudents.length > 0 
        ? Math.round(classStudents.reduce((sum, s) => sum + (s.level || 1), 0) / classStudents.length)
        : 0,
      thisMonthBooksRead,
      lastMonthBooksRead,
      monthlyProgress
    };
  })();

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

  // Öğrenci notlarını yükle
  const loadStudentNotes = async (studentId: string) => {
    try {
      const notesRef = doc(db, 'teacherNotes', studentId);
      const notesDoc = await getDoc(notesRef);
      if (notesDoc.exists()) {
        const data = notesDoc.data();
        setStudentNotes(data.notes || []);
      } else {
        setStudentNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setStudentNotes([]);
    }
  };

  // Not kaydet
  const saveStudentNote = async () => {
    if (!selectedStudent || !studentNote.trim() || !userData) return;
    
    setIsSavingNote(true);
    try {
      const notesRef = doc(db, 'teacherNotes', selectedStudent.uid);
      const newNote = {
        id: Date.now().toString(),
        text: studentNote.trim(),
        category: noteCategory,
        teacherId: userData.uid,
        teacherName: userData.displayName,
        createdAt: Timestamp.now(),
      };

      const notesDoc = await getDoc(notesRef);
      if (notesDoc.exists()) {
        await updateDoc(notesRef, {
          notes: arrayUnion(newNote)
        });
      } else {
        await setDoc(notesRef, {
          studentId: selectedStudent.uid,
          notes: [newNote]
        });
      }

      setStudentNotes(prev => [newNote, ...prev]);
      setStudentNote('');
      setNoteCategory('general');
      
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'success',
        title: 'Başarılı!',
        text: 'Not başarıyla kaydedildi.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving note:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Not kaydedilirken bir hata oluştu.',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Not sil
  const deleteStudentNote = async (noteId: string) => {
    if (!selectedStudent) return;
    
    const Swal = (await import('sweetalert2')).default;
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu notu silmek istediğinizden emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      const notesRef = doc(db, 'teacherNotes', selectedStudent.uid);
      const updatedNotes = studentNotes.filter(note => note.id !== noteId);
      
      await updateDoc(notesRef, {
        notes: updatedNotes
      });

      setStudentNotes(updatedNotes);
      
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'success',
        title: 'Silindi!',
        text: 'Not başarıyla silindi.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Hata!',
        text: 'Not silinirken bir hata oluştu.',
      });
    }
  };

  // Öğrenci seçildiğinde notları yükle
  useEffect(() => {
    if (selectedStudent) {
      loadStudentNotes(selectedStudent.uid);
      setStudentNote('');
      setNoteCategory('general');
    }
  }, [selectedStudent]);

  // Öğrenci istatistiklerini hesapla
  const getStudentStats = (studentId: string) => {
    const studentBooks = allBorrowedBooks.filter(b => b.borrowedBy === studentId);
    const activeBooksCount = studentBooks.filter(b => b.returnStatus === 'borrowed').length;
    const completedBooksCount = studentBooks.filter(b => b.returnStatus === 'returned').length;
    return { activeBooksCount, completedBooksCount };
  };

  // Öğrenci durum göstergesi
  const getStudentStatus = (studentId: string) => {
    const studentBooks = allBorrowedBooks.filter(b => b.borrowedBy === studentId);
    const completedBooks = studentBooks.filter(b => b.returnStatus === 'returned').length;
    const now = new Date();
    
    // Gecikme kontrolü
    const hasLateBooks = studentBooks.some(book => {
      if (book.returnStatus === 'borrowed') {
        return new Date(book.dueDate) < now;
      }
      return false;
    });

    // Hiç okumamış
    if (studentBooks.length === 0) {
      return { color: 'gray', label: 'Pasif', description: 'Hiç kitap okumamış' };
    }

    // Gecikme var
    if (hasLateBooks) {
      return { color: 'red', label: 'Müdahale Gerekli', description: 'Gecikmiş kitap var' };
    }

    // Az okumuş (1-2 kitap)
    if (completedBooks <= 2) {
      return { color: 'yellow', label: 'Dikkat', description: 'Okuma alışkanlığı düşük' };
    }

    // İyi performans (3+ kitap)
    return { color: 'green', label: 'Aktif ve Başarılı', description: 'İyi okuma performansı' };
  };

  // Detaylı öğrenci analizi
  const getDetailedStudentStats = (studentId: string) => {
    const studentBooks = allBorrowedBooks.filter(b => b.borrowedBy === studentId);
    const completedBooks = studentBooks.filter(b => b.returnStatus === 'returned');
    const activeBooks = studentBooks.filter(b => b.returnStatus === 'borrowed');
    
    // Bu ay ve geçen ay karşılaştırması
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const thisMonthBooks = completedBooks.filter(book => {
      if (!book.returnedAt) return false;
      return book.returnedAt >= thisMonthStart;
    }).length;
    
    const lastMonthBooks = completedBooks.filter(book => {
      if (!book.returnedAt) return false;
      return book.returnedAt >= lastMonthStart && book.returnedAt <= lastMonthEnd;
    }).length;
    
    const monthlyProgress = lastMonthBooks > 0 
      ? Math.round(((thisMonthBooks - lastMonthBooks) / lastMonthBooks) * 100)
      : thisMonthBooks > 0 ? 100 : 0;
    
    const progressTrend = thisMonthBooks > lastMonthBooks ? 'up' : thisMonthBooks < lastMonthBooks ? 'down' : 'stable';
    
    // Kategori dağılımı
    const categoryCount = studentBooks.reduce((acc, book) => {
      const category = book.category || 'Diğer';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gecikme analizi
    const currentDate = new Date();
    const lateBooks = studentBooks.filter(book => {
      if (book.returnStatus === 'borrowed') {
        return new Date(book.dueDate) < currentDate;
      }
      if (book.returnStatus === 'returned' && book.returnedAt) {
        return book.returnedAt > new Date(book.dueDate);
      }
      return false;
    });

    const totalFine = lateBooks.reduce((sum, book) => {
      const dueDate = new Date(book.dueDate);
      const returnDate = book.returnStatus === 'returned' && book.returnedAt ? book.returnedAt : currentDate;
      const daysLate = Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + (daysLate * 1);
    }, 0);

    // Aylık okuma trendi (son 6 ay)
    const monthlyReading = (() => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: date.toLocaleDateString('tr-TR', { month: 'short' }),
          count: completedBooks.filter(book => {
            if (!book.returnedAt) return false;
            return book.returnedAt.getMonth() === date.getMonth() && 
                   book.returnedAt.getFullYear() === date.getFullYear();
          }).length
        });
      }
      return months;
    })();

    // Son aktivite
    const lastActivity = studentBooks.length > 0 
      ? new Date(Math.max(...studentBooks.map(b => new Date(b.borrowedAt).getTime())))
      : null;

    return {
      totalBooks: studentBooks.length,
      completedBooks: completedBooks.length,
      activeBooks: activeBooks.length,
      categoryCount,
      lateBooks: lateBooks.length,
      totalFine,
      monthlyReading,
      lastActivity,
      allBooks: studentBooks.sort((a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()),
      thisMonthBooks,
      lastMonthBooks,
      monthlyProgress,
      progressTrend
    };
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pt-16">
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

        {/* Aylık Gelişim Özeti */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center justify-center sm:justify-start">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Sınıf Aylık Gelişim
              </h3>
              <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm opacity-90">Bu Ay</p>
                  <p className="text-2xl sm:text-3xl font-bold">{classStats.thisMonthBooksRead}</p>
                  <p className="text-xs opacity-75">kitap okundu</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm opacity-90">Geçen Ay</p>
                  <p className="text-2xl sm:text-3xl font-bold">{classStats.lastMonthBooksRead}</p>
                  <p className="text-xs opacity-75">kitap okundu</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 sm:p-6">
                {classStats.monthlyProgress > 0 ? (
                  <>
                    <span className="text-5xl">↗️</span>
                    <p className="text-2xl font-bold mt-2">+{classStats.monthlyProgress}%</p>
                  </>
                ) : classStats.monthlyProgress < 0 ? (
                  <>
                    <span className="text-5xl">↘️</span>
                    <p className="text-2xl font-bold mt-2">{classStats.monthlyProgress}%</p>
                  </>
                ) : (
                  <>
                    <span className="text-5xl">➡️</span>
                    <p className="text-2xl font-bold mt-2">0%</p>
                  </>
                )}
                <p className="text-xs opacity-75 mt-1">
                  {classStats.monthlyProgress > 0 && 'Harika gidiş!'}
                  {classStats.monthlyProgress < 0 && 'Dikkat gerekli'}
                  {classStats.monthlyProgress === 0 && 'Sabit'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sınıf İstatistikleri */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 w-fit mb-2 sm:mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Toplam Öğrenci</p>
              <p className="text-2xl sm:text-4xl font-bold text-white">{classStats.totalStudents}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 w-fit mb-2 sm:mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Aktif Okuyucu</p>
              <p className="text-2xl sm:text-4xl font-bold text-white">{classStats.activeReaders}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 w-fit mb-2 sm:mb-4">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Okunan Kitap</p>
              <p className="text-2xl sm:text-4xl font-bold text-white">{classStats.totalBooksRead}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 w-fit mb-2 sm:mb-4">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Ortalama Seviye</p>
              <p className="text-2xl sm:text-4xl font-bold text-white">{classStats.averageLevel}</p>
            </div>
          </div>
        </div>

        {/* Karşılaştırma Butonu */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/student-compare')}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-h-[44px]"
          >
            <GitCompare className="w-5 h-5" />
            Öğrencileri Karşılaştır
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Öğrenci adı veya numarası ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortBy('name')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm min-h-[44px] ${
                  sortBy === 'name'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                İsme Göre
              </button>
              <button
                onClick={() => setSortBy('books')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm min-h-[44px] ${
                  sortBy === 'books'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kitap Sayısı
              </button>
              <button
                onClick={() => setSortBy('level')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm min-h-[44px] ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAndSortedStudents.map((student) => {
            const stats = getStudentStats(student.uid);
            const status = getStudentStatus(student.uid);
            const detailedStats = getDetailedStudentStats(student.uid);
            const statusColors = {
              green: 'border-l-green-500 bg-green-50/50',
              yellow: 'border-l-yellow-500 bg-yellow-50/50',
              red: 'border-l-red-500 bg-red-50/50',
              gray: 'border-l-gray-400 bg-gray-50/50'
            };
            const badgeColors = {
              green: 'bg-green-100 text-green-700 border-green-200',
              yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
              red: 'bg-red-100 text-red-700 border-red-200',
              gray: 'bg-gray-100 text-gray-700 border-gray-200'
            };
            return (
              <div
                key={student.uid}
                onClick={() => setSelectedStudent(student)}
                className={`bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border-l-4 ${statusColors[status.color]} hover:shadow-xl transition-all p-6 cursor-pointer hover:scale-105 relative`}
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
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {student.displayName}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">No: {student.studentNumber}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${badgeColors[status.color]}`}>
                      {status.label}
                    </span>
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
                    {/* Aylık İlerleme Göstergesi */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Bu ay:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900">{detailedStats.thisMonthBooks} kitap</span>
                          {detailedStats.progressTrend === 'up' && <span className="text-green-600">↗️</span>}
                          {detailedStats.progressTrend === 'down' && <span className="text-red-600">↘️</span>}
                          {detailedStats.progressTrend === 'stable' && <span className="text-gray-600">➡️</span>}
                        </div>
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
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-12 text-center">
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

        {/* Öğrenci Detay Modal */}
        {selectedStudent && (() => {
          const detailedStats = getDetailedStudentStats(selectedStudent.uid);
          const categoryChartData = {
            labels: Object.keys(detailedStats.categoryCount),
            datasets: [{
              data: Object.values(detailedStats.categoryCount),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
            }]
          };
          const trendChartData = {
            labels: detailedStats.monthlyReading.map(m => m.label),
            datasets: [{
              label: 'Okunan Kitap',
              data: detailedStats.monthlyReading.map(m => m.count),
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              tension: 0.4,
              fill: true
            }]
          };

          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedStudent(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-pink-500 p-4 sm:p-6 rounded-t-2xl z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {selectedStudent.photoURL ? (
                        <img src={selectedStudent.photoURL} alt={selectedStudent.displayName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white" />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center border-4 border-white">
                          <span className="text-2xl sm:text-3xl font-bold text-orange-600">{selectedStudent.displayName[0]}</span>
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedStudent.displayName}</h2>
                        <p className="text-sm sm:text-base text-white/90">No: {selectedStudent.studentNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">Seviye {selectedStudent.level || 1}</span>
                          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{selectedStudent.totalXP || 0} XP</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-white/80 hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Gelişim Takibi */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Aylık Gelişim Takibi
                    </h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Bu Ay</p>
                        <p className="text-3xl font-bold text-purple-600">{detailedStats.thisMonthBooks}</p>
                        <p className="text-xs text-gray-500">kitap okudu</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Geçen Ay</p>
                        <p className="text-3xl font-bold text-gray-600">{detailedStats.lastMonthBooks}</p>
                        <p className="text-xs text-gray-500">kitap okudu</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">İlerleme</p>
                        <div className="flex items-center justify-center gap-2">
                          {detailedStats.progressTrend === 'up' && (
                            <>
                              <span className="text-3xl">↗️</span>
                              <p className="text-2xl font-bold text-green-600">+{detailedStats.monthlyProgress}%</p>
                            </>
                          )}
                          {detailedStats.progressTrend === 'down' && (
                            <>
                              <span className="text-3xl">↘️</span>
                              <p className="text-2xl font-bold text-red-600">{detailedStats.monthlyProgress}%</p>
                            </>
                          )}
                          {detailedStats.progressTrend === 'stable' && (
                            <>
                              <span className="text-3xl">➡️</span>
                              <p className="text-2xl font-bold text-gray-600">0%</p>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {detailedStats.progressTrend === 'up' && 'Harika gidiş!'}
                          {detailedStats.progressTrend === 'down' && 'Dikkat gerekli'}
                          {detailedStats.progressTrend === 'stable' && 'Sabit'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* İstatistikler */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{detailedStats.totalBooks}</p>
                      <p className="text-xs text-blue-700">Toplam Kitap</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{detailedStats.completedBooks}</p>
                      <p className="text-xs text-green-700">Tamamlanan</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-orange-600">{detailedStats.activeBooks}</p>
                      <p className="text-xs text-orange-700">Aktif</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{detailedStats.lateBooks}</p>
                      <p className="text-xs text-red-700">Gecikme</p>
                    </div>
                  </div>

                  {/* Grafik Alanı */}
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {/* Kategori Dağılımı */}
                    {Object.keys(detailedStats.categoryCount).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          📊 Favori Kategoriler
                        </h3>
                        <div className="h-48">
                          <Pie data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                      </div>
                    )}

                    {/* Okuma Trendi */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                        Okuma Trendi (6 Ay)
                      </h3>
                      <div className="h-48">
                        <Line data={trendChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }} />
                      </div>
                    </div>
                  </div>

                  {/* Gecikme Bilgisi */}
                  {detailedStats.lateBooks > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-red-900 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Gecikme Uyarısı
                          </h3>
                          <p className="text-sm text-red-700 mt-1">{detailedStats.lateBooks} kitap geç teslim edildi</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">{detailedStats.totalFine}₺</p>
                          <p className="text-xs text-red-700">Toplam Ceza</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Son Aktivite */}
                  {detailedStats.lastActivity && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-900">
                          Son Aktivite: <span className="font-semibold">{detailedStats.lastActivity.toLocaleDateString('tr-TR')}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Kitap Listesi */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <BookOpen className="w-5 h-5 mr-2 text-orange-600" />
                      Tüm Kitaplar ({detailedStats.allBooks.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detailedStats.allBooks.map((book, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{book.title}</p>
                            <p className="text-xs text-gray-600">Ödünç: {new Date(book.borrowedAt).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            book.returnStatus === 'returned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {book.returnStatus === 'returned' ? 'Tamamlandı' : 'Aktif'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Not Ekleme */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-orange-600" />
                      Öğretmen Notları
                    </h3>
                    
                    {/* Not Kategorisi */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Not Kategorisi</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setNoteCategory('general')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                            noteCategory === 'general'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📝 Genel
                        </button>
                        <button
                          onClick={() => setNoteCategory('behavior')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                            noteCategory === 'behavior'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          😊 Davranış
                        </button>
                        <button
                          onClick={() => setNoteCategory('reading')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                            noteCategory === 'reading'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📚 Okuma
                        </button>
                      </div>
                    </div>

                    {/* Not Girişi */}
                    <textarea
                      value={studentNote}
                      onChange={(e) => setStudentNote(e.target.value)}
                      placeholder="Öğrenci hakkında notlarınızı buraya ekleyebilirsiniz..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm sm:text-base"
                      rows={3}
                    />
                    <button
                      onClick={saveStudentNote}
                      disabled={!studentNote.trim() || isSavingNote}
                      className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingNote ? 'Kaydediliyor...' : 'Notu Kaydet'}
                    </button>

                    {/* Not Geçmişi */}
                    {studentNotes.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Not Geçmişi ({studentNotes.length})</h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {studentNotes.map((note) => {
                            const categoryColors = {
                              general: 'bg-blue-50 border-blue-200',
                              behavior: 'bg-purple-50 border-purple-200',
                              reading: 'bg-green-50 border-green-200'
                            };
                            const categoryIcons = {
                              general: '📝',
                              behavior: '😊',
                              reading: '📚'
                            };
                            const categoryLabels = {
                              general: 'Genel',
                              behavior: 'Davranış',
                              reading: 'Okuma'
                            };
                            return (
                              <div
                                key={note.id}
                                className={`p-3 rounded-lg border ${categoryColors[note.category as keyof typeof categoryColors]}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{categoryIcons[note.category as keyof typeof categoryIcons]}</span>
                                    <span className="text-xs font-semibold text-gray-600">
                                      {categoryLabels[note.category as keyof typeof categoryLabels]}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => deleteStudentNote(note.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="Notu Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-sm text-gray-800 mb-2">{note.text}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{note.teacherName}</span>
                                  <span>{note.createdAt?.toDate().toLocaleDateString('tr-TR')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default MyClassPage;

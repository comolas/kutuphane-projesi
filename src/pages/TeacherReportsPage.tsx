import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Download, Calendar, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useBooks } from '../contexts/BookContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

interface StudentData {
  uid: string;
  displayName: string;
  studentNumber: string;
  personalization?: {
    favoriteCategories: string[];
    favoriteTopics: string[];
    favoriteMagazines: string[];
    readingInfluence: string;
    interests: string[];
    isCompleted: boolean;
  };
}

const TeacherReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData, isTeacher } = useAuth();
  const { allBorrowedBooks, allBooks } = useBooks();
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);

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
          const data = doc.data();
          students.push({
            uid: doc.id,
            displayName: data.displayName,
            studentNumber: data.studentNumber,
            personalization: data.personalization
          });
        });
        setClassStudents(students);
      } catch (error) {
        console.error('Error fetching class students:', error);
      }
    };

    fetchClassStudents();
  }, [userData, isTeacher, navigate]);

  // Sınıf kitaplarını filtrele
  const classBooks = allBorrowedBooks.filter(book =>
    classStudents.some(student => student.uid === book.borrowedBy)
  );

  // Debug: Veri kontrolü
  useEffect(() => {
    console.log('=== Teacher Reports Debug ===');
    console.log('Class Students:', classStudents.length);
    console.log('All Borrowed Books:', allBorrowedBooks.length);
    console.log('Class Books:', classBooks.length);
    console.log('Sample Class Book:', classBooks[0]);
    console.log('User Role:', userData?.role);
    console.log('Teacher Data:', userData?.teacherData);
  }, [classStudents, allBorrowedBooks, classBooks, userData]);

  // Kategori dağılımı
  const categoryData = classBooks.reduce((acc, book) => {
    const category = book.category || 'Diğer';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Okuma alışkanlıkları analizi
  const readingHabits = {
    nonReaders: classStudents.filter(student => 
      !classBooks.some(book => book.borrowedBy === student.uid)
    ),
    lowReaders: classStudents.filter(student => {
      const booksRead = classBooks.filter(b => b.borrowedBy === student.uid && b.returnStatus === 'returned').length;
      return booksRead > 0 && booksRead <= 2;
    }).sort((a, b) => {
      const aBooks = classBooks.filter(book => book.borrowedBy === a.uid && book.returnStatus === 'returned').length;
      const bBooks = classBooks.filter(book => book.borrowedBy === b.uid && book.returnStatus === 'returned').length;
      return aBooks - bBooks;
    }).slice(0, 5),
    averageReadingSpeed: classStudents.length > 0 
      ? (classBooks.filter(b => b.returnStatus === 'returned').length / classStudents.length).toFixed(1)
      : '0'
  };

  // Gecikme & Disiplin Analizi
  const disciplineReport = (() => {
    const now = new Date();
    const lateReturns = classBooks.filter(book => {
      if (book.returnStatus === 'borrowed') {
        return new Date(book.dueDate) < now;
      }
      if (book.returnStatus === 'returned' && book.returnedAt) {
        return book.returnedAt > new Date(book.dueDate);
      }
      return false;
    });

    const studentDelayData = classStudents.map(student => {
      const studentLateBooks = lateReturns.filter(b => b.borrowedBy === student.uid);
      const totalFine = studentLateBooks.reduce((sum, book) => {
        const dueDate = new Date(book.dueDate);
        const returnDate = book.returnStatus === 'returned' && book.returnedAt ? book.returnedAt : now;
        const daysLate = Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + (daysLate * 1); // 1 TL per day
      }, 0);

      return {
        student,
        lateCount: studentLateBooks.length,
        totalFine,
        currentlyLate: studentLateBooks.filter(b => b.returnStatus === 'borrowed').length,
        books: studentLateBooks
      };
    }).filter(d => d.lateCount > 0).sort((a, b) => b.lateCount - a.lateCount);

    return {
      totalLateReturns: lateReturns.length,
      currentlyOverdue: lateReturns.filter(b => b.returnStatus === 'borrowed').length,
      totalFines: studentDelayData.reduce((sum, d) => sum + d.totalFine, 0),
      studentDelayData
    };
  })();

  const categoryChartData = {
    labels: Object.keys(categoryData),
    datasets: [{
      label: 'Kitap Sayısı',
      data: Object.values(categoryData),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
      ],
    }]
  };

  // En çok okuyan öğrenciler
  const studentReadingData = classStudents.map(student => {
    const booksRead = classBooks.filter(
      book => book.borrowedBy === student.uid && book.returnStatus === 'returned'
    ).length;
    return { name: student.displayName, count: booksRead };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  const studentChartData = {
    labels: studentReadingData.map(s => s.name),
    datasets: [{
      label: 'Okunan Kitap Sayısı',
      data: studentReadingData.map(s => s.count),
      backgroundColor: '#f97316',
    }]
  };

  // En popüler kitaplar
  const popularBooks = (() => {
    const bookCounts = classBooks.reduce((acc, borrowedBook) => {
      const bookId = borrowedBook.id;
      acc[bookId] = (acc[bookId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(bookCounts)
      .map(([bookId, count]) => {
        const book = allBooks.find(b => b.id === bookId);
        return { book, count };
      })
      .filter(item => item.book)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  // Aylık okuma trendi (son 6 ay)
  const monthlyTrend = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }
    
    const monthlyCounts = months.map(m => {
      return classBooks.filter(book => {
        if (book.returnStatus !== 'returned') return false;
        const returnDate = book.returnedAt;
        if (!returnDate) return false;
        return returnDate.getMonth() === m.month && returnDate.getFullYear() === m.year;
      }).length;
    });

    return {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Okunan Kitap',
        data: monthlyCounts,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  })();

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      // Butonu gizle
      const button = document.getElementById('pdf-button');
      if (button) button.style.display = 'none';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Sayfa sayısını hesapla
      const totalPages = Math.ceil((imgHeight * ratio) / pdfHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        const yOffset = -i * pdfHeight;
        pdf.addImage(imgData, 'PNG', imgX, imgY + yOffset, imgWidth * ratio, imgHeight * ratio);
      }

      pdf.save(`sinif-raporu-${userData?.teacherData?.assignedClass}-${new Date().toISOString().split('T')[0]}.pdf`);

      // Butonu tekrar göster
      if (button) button.style.display = 'flex';
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="report-content">
        {/* Header */}
        <button
          onClick={() => navigate('/teacher-dashboard')}
          className="mb-4 flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Geri Dön
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <BarChart className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-orange-600" />
              Sınıf Raporları
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{userData?.teacherData?.assignedClass} Sınıfı</p>
          </div>
          <button
            id="pdf-button"
            onClick={handleDownloadPDF}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            PDF Rapor İndir
          </button>
        </div>

        {/* Kullanıcı Analizi */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Kullanıcı Analizi
          </h2>
          
          {(() => {
            // Kişiselleştirme verilerini topla
            const studentsWithData = classStudents.filter(s => s.personalization?.isCompleted);
            
            if (studentsWithData.length === 0) {
              return (
                <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-200">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Kullanıcı Analizi Hazırlanıyor</h3>
                  <p className="text-gray-600 mb-4">Öğrenciler kişiselleştirme sorularını yanıtladıkça bu bölümde grafikler görünecek.</p>
                  <p className="text-sm text-gray-500">({classStudents.length} öğrenciden {studentsWithData.length} kişiselleştirme tamamladı)</p>
                </div>
              );
            }

            // Verileri topla
            const categories: Record<string, number> = {};
            const topics: Record<string, number> = {};
            const magazines: Record<string, number> = {};
            const influences: Record<string, number> = {};
            const interests: Record<string, number> = {};

            studentsWithData.forEach(student => {
              const p = student.personalization!;
              p.favoriteCategories?.forEach(c => categories[c] = (categories[c] || 0) + 1);
              p.favoriteTopics?.forEach(t => topics[t] = (topics[t] || 0) + 1);
              p.favoriteMagazines?.forEach(m => magazines[m] = (magazines[m] || 0) + 1);
              if (p.readingInfluence) influences[p.readingInfluence] = (influences[p.readingInfluence] || 0) + 1;
              p.interests?.forEach(i => interests[i] = (interests[i] || 0) + 1);
            });

            // Grafik verileri
            const categoryChartData = {
              labels: Object.keys(categories),
              datasets: [{
                label: 'Öğrenci Sayısı',
                data: Object.values(categories),
                backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'],
              }]
            };

            const topicChartData = {
              labels: Object.keys(topics),
              datasets: [{
                label: 'Öğrenci Sayısı',
                data: Object.values(topics),
                backgroundColor: '#ec4899',
              }]
            };

            const magazineChartData = {
              labels: Object.keys(magazines),
              datasets: [{
                label: 'Öğrenci Sayısı',
                data: Object.values(magazines),
                backgroundColor: '#f59e0b',
              }]
            };

            const influenceChartData = {
              labels: Object.keys(influences),
              datasets: [{
                label: 'Öğrenci Sayısı',
                data: Object.values(influences),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
              }]
            };

            const interestChartData = {
              labels: Object.keys(interests),
              datasets: [{
                label: 'Öğrenci Sayısı',
                data: Object.values(interests),
                backgroundColor: '#10b981',
              }]
            };

            // En popüler seçenekler
            const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
            const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
            const topInfluence = Object.entries(influences).sort((a, b) => b[1] - a[1])[0];

            return (
              <div className="space-y-6">
                {/* İstatistik Kartları */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                    <p className="text-purple-600 text-sm font-medium mb-1">Veri Tamamlama</p>
                    <p className="text-3xl font-bold text-purple-700">{Math.round((studentsWithData.length / classStudents.length) * 100)}%</p>
                    <p className="text-xs text-purple-600 mt-1">{studentsWithData.length}/{classStudents.length} öğrenci</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4">
                    <p className="text-pink-600 text-sm font-medium mb-1">En Popüler Kategori</p>
                    <p className="text-lg font-bold text-pink-700">{topCategory?.[0] || '-'}</p>
                    <p className="text-xs text-pink-600 mt-1">{topCategory?.[1] || 0} öğrenci</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-600 text-sm font-medium mb-1">En Popüler Konu</p>
                    <p className="text-lg font-bold text-orange-700">{topTopic?.[0] || '-'}</p>
                    <p className="text-xs text-orange-600 mt-1">{topTopic?.[1] || 0} öğrenci</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-600 text-sm font-medium mb-1">En Etkili Faktör</p>
                    <p className="text-lg font-bold text-blue-700">{topInfluence?.[0] || '-'}</p>
                    <p className="text-xs text-blue-600 mt-1">{topInfluence?.[1] || 0} öğrenci</p>
                  </div>
                </div>

                {/* Grafikler */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Kategori Tercihleri */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-5 bg-purple-500 rounded-full mr-2"></span>
                      Kategori Tercihleri
                    </h3>
                    <div className="h-64">
                      <Pie data={categoryChartData} options={{ maintainAspectRatio: false }} />
                    </div>
                  </div>

                  {/* Konu Tercihleri */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-5 bg-pink-500 rounded-full mr-2"></span>
                      Konu Tercihleri
                    </h3>
                    <div className="h-64">
                      <Bar data={topicChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                    </div>
                  </div>

                  {/* Dergi Tercihleri */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-5 bg-orange-500 rounded-full mr-2"></span>
                      Dergi Tercihleri
                    </h3>
                    <div className="h-64">
                      <Bar data={magazineChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                    </div>
                  </div>

                  {/* Okuma Etkisi */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-5 bg-blue-500 rounded-full mr-2"></span>
                      Okuma Etkisi
                    </h3>
                    <div className="h-64">
                      <Pie data={influenceChartData} options={{ maintainAspectRatio: false }} />
                    </div>
                  </div>
                </div>

                {/* İlgi Alanları - Tam Genişlik */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="w-1 h-5 bg-green-500 rounded-full mr-2"></span>
                    İlgi Alanları
                  </h3>
                  <div className="h-64">
                    <Bar data={interestChartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
                  </div>
                </div>

                {/* Öneriler */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-6">
                  <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Öneriler & İçgörüler
                  </h3>
                  <ul className="space-y-2">
                    {topCategory && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span className="text-gray-700"><strong>{topCategory[0]}</strong> kategorisi en popüler (%{Math.round((topCategory[1] / studentsWithData.length) * 100)}). Koleksiyonu güçlendirin.</span>
                      </li>
                    )}
                    {topTopic && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span className="text-gray-700"><strong>{topTopic[0]}</strong> konusu ilgi çekiyor. Bu konuda etkinlik düzenleyin.</span>
                      </li>
                    )}
                    {topInfluence && topInfluence[0] === 'Sosyal Medya' && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span className="text-gray-700">Sosyal medya etkisi yüksek. Instagram/TikTok kampanyaları düşünün.</span>
                      </li>
                    )}
                    {topInfluence && topInfluence[0] === 'Öğretmen' && (
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span className="text-gray-700">Öğretmen etkisi güçlü. Öğretmen işbirliklerini artırın.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Toplam Öğrenci</p>
              <p className="text-4xl font-bold text-white">{classStudents.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <BarChart className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Okunan Kitap</p>
              <p className="text-4xl font-bold text-white">{classBooks.filter(b => b.returnStatus === 'returned').length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 w-fit mb-4">
                <PieChart className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">Aktif Kitap</p>
              <p className="text-4xl font-bold text-white">{classBooks.filter(b => b.returnStatus === 'borrowed').length}</p>
            </div>
          </div>
        </div>

        {/* En Popüler Kitaplar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            En Popüler Kitaplar
          </h2>
          {popularBooks.length > 0 ? (
            <div className="space-y-3">
              {popularBooks.map((item, index) => (
                <div key={item.book!.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-white rounded-lg border border-orange-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.book!.title}</h3>
                      <p className="text-sm text-gray-600">{item.book!.author}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-600">{item.count}</div>
                    <div className="text-xs text-gray-500">ödünç alınma</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Henüz veri yok
            </div>
          )}
        </div>

        {/* Gecikme & Disiplin Raporu */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
            Gecikme & Disiplin Raporu
          </h2>
          
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium mb-1">Toplam Geç Teslim</p>
                  <p className="text-3xl font-bold text-red-700">{disciplineReport.totalLateReturns}</p>
                </div>
                <Clock className="w-10 h-10 text-red-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium mb-1">Şu An Gecikmiş</p>
                  <p className="text-3xl font-bold text-orange-700">{disciplineReport.currentlyOverdue}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium mb-1">Toplam Ceza</p>
                  <p className="text-3xl font-bold text-yellow-700">{disciplineReport.totalFines} ₺</p>
                </div>
                <FileText className="w-10 h-10 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Geç Teslim Eden Öğrenciler */}
          {disciplineReport.studentDelayData.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-1 h-5 bg-red-500 rounded-full mr-2"></span>
                Geç Teslim Eden Öğrenciler
              </h3>
              {disciplineReport.studentDelayData.map((data, index) => (
                <div key={data.student.uid} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-red-600' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{data.student.displayName}</h4>
                        <p className="text-sm text-gray-500">{data.student.studentNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Geç Teslim</p>
                          <p className="text-lg font-bold text-red-600">{data.lateCount}</p>
                        </div>
                        {data.currentlyLate > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Şu An Gecikmiş</p>
                            <p className="text-lg font-bold text-orange-600">{data.currentlyLate}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500">Toplam Ceza</p>
                          <p className="text-lg font-bold text-yellow-600">{data.totalFine} ₺</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Geciken Kitaplar */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Geciken Kitaplar:</p>
                    <div className="space-y-1">
                      {data.books.slice(0, 3).map(book => {
                        const dueDate = new Date(book.dueDate);
                        const returnDate = book.returnStatus === 'returned' && book.returnedAt ? book.returnedAt : new Date();
                        const daysLate = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        const bookInfo = allBooks.find(b => b.id === book.id);
                        
                        return (
                          <div key={book.id + book.borrowedAt} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                            <span className="text-gray-700 flex-1">{bookInfo?.title || 'Bilinmeyen Kitap'}</span>
                            <span className={`font-semibold ml-2 ${
                              book.returnStatus === 'borrowed' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {daysLate} gün gecikme
                              {book.returnStatus === 'borrowed' && ' ⚠️'}
                            </span>
                          </div>
                        );
                      })}
                      {data.books.length > 3 && (
                        <p className="text-xs text-gray-500 italic">+{data.books.length - 3} kitap daha...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <div className="text-5xl mb-2">🎉</div>
              <p className="text-green-700 font-semibold">Harika! Hiç geç teslim yok.</p>
              <p className="text-green-600 text-sm mt-1">Tüm öğrenciler kitaplarını zamanında teslim ediyor.</p>
            </div>
          )}
        </div>

        {/* Okuma Alışkanlıkları */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Okuma Alışkanlıkları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Hiç Okumayan Öğrenciler */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-red-900">⚠️ Hiç Okumayan</h3>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {readingHabits.nonReaders.length}
                </span>
              </div>
              {readingHabits.nonReaders.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {readingHabits.nonReaders.map(student => (
                    <li key={student.uid} className="text-sm text-red-800 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {student.displayName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-700">🎉 Tüm öğrenciler en az bir kitap okudu!</p>
              )}
            </div>

            {/* En Az Okuyan 5 Öğrenci */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-yellow-900">📚 En Az Okuyan</h3>
                <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {readingHabits.lowReaders.length}
                </span>
              </div>
              {readingHabits.lowReaders.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {readingHabits.lowReaders.map(student => {
                    const booksRead = classBooks.filter(b => b.borrowedBy === student.uid && b.returnStatus === 'returned').length;
                    return (
                      <li key={student.uid} className="text-sm text-yellow-800 flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          {student.displayName}
                        </span>
                        <span className="font-semibold">{booksRead} kitap</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-yellow-700">Veri yok</p>
              )}
            </div>

            {/* Okuma Hızı */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-900">⚡ Okuma Hızı</h3>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {readingHabits.averageReadingSpeed}
                </div>
                <p className="text-sm text-green-700">Öğrenci başına ortalama kitap</p>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="flex justify-between text-xs text-green-700">
                  <span>Toplam Okunan:</span>
                  <span className="font-semibold">{classBooks.filter(b => b.returnStatus === 'returned').length} kitap</span>
                </div>
                <div className="flex justify-between text-xs text-green-700 mt-1">
                  <span>Aktif Okuyucu:</span>
                  <span className="font-semibold">{classStudents.length - readingHabits.nonReaders.length} öğrenci</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Aylık Okuma Trendi */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Aylık Okuma Trendi
          </h2>
          <div className="h-64">
            <Line 
              data={monthlyTrend} 
              options={{ 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* En Çok Okuyan Öğrenciler */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">En Çok Okuyan Öğrenciler</h2>
          {studentReadingData.length > 0 ? (
            <div className="h-64">
              <Bar 
                data={studentChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }} 
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Henüz veri yok
            </div>
          )}
        </div>

        {/* Kategori Dağılımı */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kategori Dağılımı</h2>
          {Object.keys(categoryData).length > 0 ? (
            <div className="h-64">
              <Bar 
                data={categoryChartData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }} 
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Henüz veri yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherReportsPage;

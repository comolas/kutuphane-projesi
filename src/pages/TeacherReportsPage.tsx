import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Download, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useBooks } from '../contexts/BookContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

interface StudentData {
  uid: string;
  displayName: string;
  studentNumber: string;
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
            studentNumber: data.studentNumber
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Başlık
    doc.setFontSize(20);
    doc.text('Sinif Okuma Raporu', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${userData?.teacherData?.assignedClass} Sinifi`, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 35, { align: 'center' });
    
    // İstatistikler
    doc.setFontSize(14);
    doc.text('Genel Istatistikler', 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Metrik', 'Deger']],
      body: [
        ['Toplam Ogrenci', classStudents.length.toString()],
        ['Okunan Kitap', classBooks.filter(b => b.returnStatus === 'returned').length.toString()],
        ['Aktif Kitap', classBooks.filter(b => b.returnStatus === 'borrowed').length.toString()],
        ['Ortalama Okuma Hizi', `${readingHabits.averageReadingSpeed} kitap/ogrenci`],
        ['Hic Okumayan', readingHabits.nonReaders.length.toString()]
      ]
    });
    
    // En Popüler Kitaplar
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(14);
    doc.text('En Populer Kitaplar', 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Sira', 'Kitap Adi', 'Yazar', 'Odunc Alinma']],
      body: popularBooks.map((item, idx) => [
        (idx + 1).toString(),
        item.book!.title,
        item.book!.author,
        item.count.toString()
      ])
    });
    
    // En Çok Okuyan Öğrenciler
    const finalY2 = (doc as any).lastAutoTable.finalY || 50;
    doc.setFontSize(14);
    doc.text('En Cok Okuyan Ogrenciler', 14, finalY2 + 10);
    autoTable(doc, {
      startY: finalY2 + 15,
      head: [['Sira', 'Ogrenci Adi', 'Okunan Kitap']],
      body: studentReadingData.slice(0, 10).map((s, idx) => [
        (idx + 1).toString(),
        s.name,
        s.count.toString()
      ])
    });
    
    doc.save(`sinif-raporu-${userData?.teacherData?.assignedClass}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <BarChart className="w-8 h-8 mr-3 text-orange-600" />
              Sınıf Raporları
            </h1>
            <p className="text-gray-600">{userData?.teacherData?.assignedClass} Sınıfı</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            PDF Rapor İndir
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Toplam Öğrenci</p>
                <p className="text-3xl font-bold text-gray-900">{classStudents.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Okunan Kitap</p>
                <p className="text-3xl font-bold text-gray-900">
                  {classBooks.filter(b => b.returnStatus === 'returned').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Aktif Kitap</p>
                <p className="text-3xl font-bold text-gray-900">
                  {classBooks.filter(b => b.returnStatus === 'borrowed').length}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <PieChart className="w-8 h-8 text-orange-600" />
              </div>
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

        {/* Okuma Alışkanlıkları */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Okuma Alışkanlıkları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

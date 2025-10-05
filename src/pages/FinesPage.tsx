import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, AlertCircle, Clock, DollarSign, CheckCircle, Info, X, History, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { useBooks } from '../contexts/BookContext';
import { useSettings } from '../contexts/SettingsContext';

const FinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { borrowedBooks, allBorrowedBooks } = useBooks();
  const { finePerDay, loading: settingsLoading } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');

  const calculateFine = useMemo(() => (book: any): number => {
    if (book.fineStatus === 'paid') {
      return book.fineAmountSnapshot || 0;
    }
    const today = new Date();
    const diffTime = today.getTime() - new Date(book.dueDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * finePerDay : 0;
  }, [finePerDay]);

  const { unpaidFines, paidFines } = useMemo(() => {
    if (settingsLoading) return { unpaidFines: [], paidFines: [] };

    const userBooks = allBorrowedBooks.filter(book => book.borrowedBy === borrowedBooks[0]?.borrowedBy);
    const allFinesSource = userBooks.length > 0 ? userBooks : borrowedBooks;

    const finesWithCalculation = allFinesSource
      .map(book => {
        const isFinalized = book.fineRateSnapshot !== undefined;
        
        const daysOverdue = isFinalized
          ? book.daysOverdueSnapshot
          : Math.max(0, Math.ceil(((book.returnDate ? new Date(book.returnDate).getTime() : new Date().getTime()) - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
        
        const fine = isFinalized ? book.fineAmountSnapshot : calculateFine(book);

        return {
          ...book,
          daysOverdue,
          fine
        }
      })
      .filter(book => (book.fine || 0) > 0 || book.fineStatus === 'paid');

    const unpaid = finesWithCalculation.filter(book => book.fineStatus !== 'paid');
    const paid = finesWithCalculation.filter(book => book.fineStatus === 'paid');
    
    return { unpaidFines: unpaid, paidFines: paid };
  }, [borrowedBooks, allBorrowedBooks, settingsLoading, finePerDay, calculateFine]);

  const totalUnpaidFine = unpaidFines.reduce((sum, book) => sum + (book.fine || 0), 0);

  const currentList = activeTab === 'unpaid' ? unpaidFines : paidFines;

  if (settingsLoading) {
    return <div className="flex justify-center items-center min-h-screen">Ayarlar yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="flex justify-center">
          <DotLottieReact
            src="https://lottie.host/83387e5c-21ba-4d28-a4c2-620848f0a45b/RaxDPFOuNR.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cezalarım</h1>
          <p className="mt-2 text-gray-600">
            Gecikmiş kitaplarınız ve ceza tutarlarınızı buradan takip edebilirsiniz.
          </p>
        </div>

        {activeTab === 'unpaid' && (
          <div className="relative bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 mb-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mr-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Toplam Borcunuz</h2>
                  <p className="text-sm text-white/80">Ödenmemiş tüm cezalar</p>
                </div>
              </div>
              <div className="text-4xl font-bold text-white">
                {totalUnpaidFine} TL
              </div>
            </div>
            {totalUnpaidFine > 0 && (
              <div className="relative mt-4 pt-4 border-t border-white/20">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-xl text-white rounded-xl hover:bg-white/30 transition-all flex items-center justify-center text-sm font-medium"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Nasıl Öderim?
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 bg-white/60 backdrop-blur-xl rounded-2xl p-2 shadow-lg">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center transition-all ${
                activeTab === 'unpaid'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              Ödenmemiş Cezalar
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center transition-all ${
                activeTab === 'paid'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <History className="w-5 h-5 mr-2" />
              Ödeme Geçmişi
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          {currentList.length > 0 ? (
            currentList.map(book => {
              const isFinalized = book.fineRateSnapshot !== undefined;
              const daysOverdue = book.daysOverdue;
              const fineAmount = book.fine;
              const fineRate = isFinalized ? book.fineRateSnapshot : finePerDay;

              return (
              <div key={`fine-${book.id}-${book.borrowedBy}`} className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/20">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="relative">
                      <img 
                        src={book.coverImage} 
                        alt={book.title} 
                        className="w-24 h-32 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
                      <p className="text-gray-600">{book.author}</p>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Son Teslim Tarihi:</span>
                          <span className="ml-2 font-medium">
                            {new Date(book.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {daysOverdue > 0 && (
                          <div className="flex items-center text-sm">
                            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                            <span className="text-red-600">Gecikme:</span>
                            <span className="ml-2 font-medium text-red-600">
                              {daysOverdue} gün
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-bold bg-gradient-to-r ${book.fineStatus === 'paid' ? 'from-green-600 to-emerald-600' : 'from-red-500 to-pink-600'} bg-clip-text text-transparent`}>
                        {fineAmount} TL
                      </div>
                      {book.fineStatus !== 'paid' && daysOverdue > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          ({daysOverdue} gün x {fineRate} TL)
                        </p>
                      )}
                      {book.fineStatus === 'paid' ? (
                        <div className="mt-2">
                          <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium inline-flex items-center shadow-lg">
                            Ödendi
                            {book.paymentDate && (
                              <div className="text-xs text-green-600 mt-1">
                                {new Date(book.paymentDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const doc = new jsPDF();
                              doc.setFont('helvetica', 'normal');
                              const pageWidth = doc.internal.pageSize.getWidth();
                              const pageHeight = doc.internal.pageSize.getHeight();
                              
                              const tr = (text: string) => text.replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
                              
                              const receiptNo = `MKB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                              
                              doc.setFillColor(79, 70, 229);
                              doc.rect(0, 0, pageWidth, 40, 'F');
                              
                              doc.setTextColor(255, 255, 255);
                              doc.setFontSize(22);
                              doc.setFont('helvetica', 'bold');
                              doc.text(tr('ÖDEME MAKBUZU'), pageWidth / 2, 20, { align: 'center' });
                              doc.setFontSize(10);
                              doc.setFont('helvetica', 'normal');
                              doc.text(tr('Data Koleji Kütüphanesi'), pageWidth / 2, 28, { align: 'center' });
                              
                              doc.setFontSize(9);
                              doc.text(`Makbuz No: ${receiptNo}`, pageWidth - 15, 20, { align: 'right' });
                              doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, pageWidth - 15, 27, { align: 'right' });
                              
                              doc.setDrawColor(79, 70, 229);
                              doc.setLineWidth(0.5);
                              doc.rect(10, 45, pageWidth - 20, pageHeight - 65, 'S');
                              
                              doc.setTextColor(0, 0, 0);
                              let y = 60;
                              
                              doc.setFontSize(12);
                              doc.setTextColor(34, 197, 94);
                              doc.setFont('helvetica', 'bold');
                              doc.text(tr('ÖDENDİ'), pageWidth / 2, y, { align: 'center' });
                              y += 15;
                              
                              doc.setTextColor(0, 0, 0);
                              doc.setFontSize(11);
                              doc.text(tr('KİTAP BİLGİLERİ'), 15, y);
                              doc.setFont('helvetica', 'normal');
                              y += 8;
                              
                              doc.setDrawColor(200, 200, 200);
                              doc.setLineWidth(0.3);
                              doc.line(15, y, pageWidth - 15, y);
                              y += 8;
                              
                              doc.setFontSize(10);
                              doc.text(tr('Kitap Adı:'), 20, y);
                              doc.text(tr(book.title), 70, y);
                              y += 7;
                              doc.text(tr('Yazar:'), 20, y);
                              doc.text(tr(book.author), 70, y);
                              y += 7;
                              doc.text(tr('Son Teslim:'), 20, y);
                              doc.text(new Date(book.dueDate).toLocaleDateString('tr-TR'), 70, y);
                              y += 15;
                              
                              doc.setFont('helvetica', 'bold');
                              doc.setFontSize(11);
                              doc.text(tr('CEZA DETAYLARI'), 15, y);
                              doc.setFont('helvetica', 'normal');
                              y += 8;
                              
                              doc.setLineWidth(0.3);
                              doc.line(15, y, pageWidth - 15, y);
                              y += 8;
                              
                              doc.setFontSize(10);
                              doc.text(tr('Gecikme Süresi:'), 20, y);
                              doc.text(tr(`${daysOverdue} gün`), 70, y);
                              y += 7;
                              doc.text(tr('Günlük Ceza:'), 20, y);
                              doc.text(`${fineRate} TL`, 70, y);
                              y += 7;
                              doc.text(tr('Ödeme Tarihi:'), 20, y);
                              doc.text(book.paymentDate ? new Date(book.paymentDate).toLocaleDateString('tr-TR') : '-', 70, y);
                              y += 12;
                              
                              doc.setFillColor(79, 70, 229);
                              doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
                              doc.setTextColor(255, 255, 255);
                              doc.setFont('helvetica', 'bold');
                              doc.setFontSize(12);
                              doc.text(tr('TOPLAM TUTAR:'), 20, y + 3);
                              doc.text(`${fineAmount} TL`, pageWidth - 20, y + 3, { align: 'right' });
                              y += 20;
                              
                              doc.setTextColor(0, 0, 0);
                              doc.setFont('helvetica', 'normal');
                              doc.setFontSize(9);
                              y = pageHeight - 40;
                              doc.line(pageWidth - 70, y, pageWidth - 20, y);
                              doc.text(tr('Yetkili İmza'), pageWidth - 45, y + 5, { align: 'center' });
                              
                              doc.setFillColor(79, 70, 229);
                              doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
                              doc.setTextColor(255, 255, 255);
                              doc.setFontSize(8);
                              doc.text(tr('Data Koleji Kütüphanesi - Tüm hakları saklıdır'), pageWidth / 2, pageHeight - 10, { align: 'center' });
                              
                              doc.save(`makbuz-${receiptNo}.pdf`);
                            }}
                            className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Makbuz İndir
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">
                          Ödeme bekleniyor
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )
            })
            ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center flex flex-col items-center justify-center border border-white/20">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {activeTab === 'unpaid' ? 'Harika! Ödenmemiş cezanız yok.' : 'Geçmişe ait ödenmiş bir cezanız bulunmuyor.'}
                </h3>
                <p className="text-gray-600">{activeTab === 'unpaid' ? 'Kitaplarınızı zamanında getirdiğiniz için teşekkür ederiz.' : 'Tüm kayıtlarınız burada görünecektir.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Info className="w-6 h-6 mr-2 text-indigo-600" />
                Ceza Ödeme Bilgisi
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Tüm para cezaları, kütüphane bankosuna nakit olarak veya kart ile ödenebilir. Lütfen ödeme yaparken öğrenci kimliğinizi yanınızda bulundurunuz.
              </p>
            </div>
            <div className="p-4 bg-gray-50 text-right">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinesPage;

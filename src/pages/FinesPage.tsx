import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, AlertCircle, Clock, DollarSign, CheckCircle, Info, X, History, ListFilter } from 'lucide-react';
import { useBooks } from '../contexts/BookContext';

const FinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { borrowedBooks, allBorrowedBooks } = useBooks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');

  const calculateFine = (book: any): number => {
    if (book.fineStatus === 'paid') {
      return book.fineAmount || 0;
    }
    const today = new Date();
    const diffTime = today.getTime() - new Date(book.dueDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 5 : 0;
  };

  const { unpaidFines, paidFines } = useMemo(() => {
    // Use allBorrowedBooks to get the most up-to-date data including admin updates
    const userBooks = allBorrowedBooks.filter(book => book.borrowedBy === borrowedBooks[0]?.borrowedBy);
    const allFines = userBooks.length > 0 ? userBooks : borrowedBooks;
    
    const finesWithCalculation = allFines
      .map(book => ({
        ...book,
        daysOverdue: Math.max(0, Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24))),
        fine: calculateFine(book)
      }))
      .filter(book => book.fine > 0);

    const unpaid = finesWithCalculation.filter(book => book.fineStatus !== 'paid');
    const paid = finesWithCalculation.filter(book => book.fineStatus === 'paid');
    
    return { unpaidFines: unpaid, paidFines: paid };
  }, [borrowedBooks, allBorrowedBooks]);

  const totalUnpaidFine = unpaidFines.reduce((sum, book) => sum + book.fine, 0);

  const currentList = activeTab === 'unpaid' ? unpaidFines : paidFines;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Toplam Borcunuz</h2>
                  <p className="text-sm text-gray-500">Ödenmemiş tüm cezalar</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-500">
                {totalUnpaidFine} TL
              </div>
            </div>
            {totalUnpaidFine > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Nasıl Öderim?
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'unpaid'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              Ödenmemiş Cezalar
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'paid'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="w-5 h-5 mr-2" />
              Ödeme Geçmişi
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          {currentList.length > 0 ? (
            currentList.map(book => (
              <div key={`fine-${book.id}-${book.borrowedBy}`} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <img 
                      src={book.coverImage} 
                      alt={book.title} 
                      className="w-24 h-32 object-cover rounded-lg"
                    />
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
                        
                        {book.daysOverdue > 0 && (
                          <div className="flex items-center text-sm">
                            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                            <span className="text-red-600">Gecikme:</span>
                            <span className="ml-2 font-medium text-red-600">
                              {book.daysOverdue} gün
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${book.fineStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                        {book.fine} TL
                      </div>
                      {book.fineStatus !== 'paid' && book.daysOverdue > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          ({book.daysOverdue} gün x 5 TL)
                        </p>
                      )}
                      {book.fineStatus === 'paid' ? (
                        <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium inline-block">
                          Ödendi
                          {book.paymentDate && (
                            <div className="text-xs text-green-600 mt-1">
                              {new Date(book.paymentDate).toLocaleDateString()}
                            </div>
                          )}
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
            ))
            ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center">
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
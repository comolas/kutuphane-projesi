import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ChevronLeft, AlertCircle, Clock, DollarSign, CheckCircle, Info, X } from 'lucide-react';
import { useBooks } from '../contexts/BookContext';

const FinesPage: React.FC = () => {
  const navigate = useNavigate();
  const { borrowedBooks } = useBooks();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const calculateFine = (book: BorrowedBook): number => {
    // If fine is already paid, return the stored fine amount
    if (book.fineStatus === 'paid') {
      return book.fineAmount || 0;
    }

    // Calculate fine only if not paid
    const today = new Date();
    const diffTime = today.getTime() - book.dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 5 : 0;
  };

  const overdueBooksWithFines = borrowedBooks
    .map(book => ({
      ...book,
      daysOverdue: Math.ceil(
        (new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
      fine: calculateFine(book)
    }))
    .filter(book => book.fine > 0);

  const totalFine = overdueBooksWithFines.reduce((sum, book) => 
    book.fineStatus === 'paid' ? sum : sum + book.fine, 0
  );

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

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Toplam Ceza</h2>
                <p className="text-sm text-gray-500">Ödenmemiş cezalar için</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-500">
              {totalFine} TL
            </div>
          </div>
          {totalFine > 0 && (
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

        <div className="space-y-4">
          {overdueBooksWithFines.length > 0 ? (
            overdueBooksWithFines.map(book => (
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
                            {book.dueDate.toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm">
                          <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                          <span className="text-red-600">Gecikme:</span>
                          <span className="ml-2 font-medium text-red-600">
                            {book.daysOverdue} gün
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-500">
                        {book.fine} TL
                      </div>
                      {book.fineStatus === 'paid' ? (
                        <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium inline-block">
                          Ödeme Alındı
                          {book.paymentDate && (
                            <div className="text-xs text-green-600 mt-1">
                              {book.paymentDate.toLocaleDateString()}
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
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Harika! Hiç cezanız bulunmuyor.</h3>
                <p className="text-gray-600">Kitaplarınızı zamanında getirdiğiniz için teşekkür ederiz.</p>
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
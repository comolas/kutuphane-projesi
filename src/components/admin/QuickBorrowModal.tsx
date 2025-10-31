import React, { useState, useEffect } from 'react';
import { X, Zap, User, BookOpen, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

interface QuickBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedBookId?: string;
}

const QuickBorrowModal: React.FC<QuickBorrowModalProps> = ({ isOpen, onClose, preSelectedBookId }) => {
  const { campusId } = useAuth();
  const [step, setStep] = useState<'scan-student' | 'scan-book' | 'confirm' | 'success'>('scan-student');
  const [scannedUser, setScannedUser] = useState<any>(null);
  const [scannedBook, setScannedBook] = useState<any>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen && !scanner) {
      const html5QrCode = new Html5Qrcode('qr-reader');
      setScanner(html5QrCode);
    }

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (preSelectedBookId && isOpen) {
      loadBook(preSelectedBookId);
      setStep('scan-student');
    }
  }, [preSelectedBookId, isOpen]);

  const loadBook = async (bookId: string) => {
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    if (bookDoc.exists()) {
      setScannedBook({ id: bookDoc.id, ...bookDoc.data() });
    }
  };

  const startScanning = async (type: 'student' | 'book') => {
    if (isScanning) return;

    try {
      setIsScanning(true);

      // Mobil için Capacitor BarcodeScanner kullan
      if (Capacitor.isNativePlatform()) {
        const status = await BarcodeScanner.checkPermission({ force: true });
        
        if (!status.granted) {
          alert('Kamera izni gerekli. Lütfen uygulama ayarlarından kamera iznini verin.');
          setIsScanning(false);
          return;
        }

        document.body.classList.add('scanner-active');
        await BarcodeScanner.hideBackground();

        const result = await BarcodeScanner.startScan();

        document.body.classList.remove('scanner-active');
        await BarcodeScanner.showBackground();
        setIsScanning(false);

        if (result.hasContent) {
          await handleScanResult(result.content, type);
        }
      } else {
        // Web için html5-qrcode kullan
        if (!scanner) return;
        
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            await handleScanResult(decodedText, type);
            await scanner.stop();
            setIsScanning(false);
          },
          () => {}
        );
      }
    } catch (error) {
      console.error('Tarama başlatılamadı:', error);
      setIsScanning(false);
      if (Capacitor.isNativePlatform()) {
        document.body.classList.remove('scanner-active');
        await BarcodeScanner.showBackground();
      }
      alert('Kamera başlatılamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleScanResult = async (decodedText: string, type: 'student' | 'book') => {
    try {
      const data = JSON.parse(decodedText);
      
      if (type === 'student' && data.type === 'library-card') {
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        if (userDoc.exists()) {
          setScannedUser({ id: userDoc.id, ...userDoc.data() });
          if (preSelectedBookId) {
            setStep('confirm');
          } else {
            setStep('scan-book');
          }
        }
      } else if (type === 'book' && data.isbn) {
        const bookDoc = await getDoc(doc(db, 'books', data.bookId));
        if (bookDoc.exists()) {
          setScannedBook({ id: bookDoc.id, ...bookDoc.data() });
          setStep('confirm');
        }
      }
    } catch (error) {
      console.error('QR kod okunamadı:', error);
    }
  };

  const handleBorrow = async () => {
    if (!scannedUser || !scannedBook) return;

    setProcessing(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const borrowDocId = `${scannedUser.id}_${scannedBook.id}`;
      await setDoc(doc(db, 'borrowedBooks', borrowDocId), {
        book: {
          id: scannedBook.id,
          title: scannedBook.title,
          author: scannedBook.author,
          category: scannedBook.category,
          coverImage: scannedBook.coverImage,
          ...(scannedBook.publisher && { publisher: scannedBook.publisher }),
          ...(scannedBook.location && { location: scannedBook.location }),
          ...(scannedBook.addedDate && { addedDate: scannedBook.addedDate }),
          ...(scannedBook.status && { status: scannedBook.status }),
          ...(scannedBook.tags && { tags: scannedBook.tags })
        },
        bookId: scannedBook.id,
        bookTitle: scannedBook.title,
        bookAuthor: scannedBook.author,
        bookCategory: scannedBook.category,
        userId: scannedUser.id,
        userName: scannedUser.displayName,
        userEmail: scannedUser.email,
        borrowStatus: 'approved',
        borrowDate: Timestamp.now(),
        borrowedAt: Timestamp.now(),
        dueDate: Timestamp.fromDate(dueDate),
        returnStatus: 'borrowed',
        extended: false,
        campusId,
      });

      await updateDoc(doc(db, 'books', scannedBook.id), { available: false });

      setStep('success');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Ödünç verme hatası:', error);
      alert('Ödünç verme işlemi başarısız');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = async () => {
    if (isScanning) {
      if (Capacitor.isNativePlatform()) {
        await BarcodeScanner.stopScan();
        await BarcodeScanner.showBackground();
        document.body.classList.remove('scanner-active');
      } else if (scanner) {
        try {
          await scanner.stop();
        } catch (error) {
          console.log('Scanner zaten durdurulmuş');
        }
      }
      setIsScanning(false);
    }
    setStep('scan-student');
    setScannedUser(null);
    setScannedBook(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const initScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (step === 'scan-student') {
        startScanning('student');
      } else if (step === 'scan-book') {
        startScanning('book');
      }
    };

    initScanner();
  }, [isOpen, step, scanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold">Hızlı Ödünç</h2>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {step === 'scan-student' && (
          <div>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Öğrenci kütüphane kartını tarayın</p>
            <div id="qr-reader" className="w-full"></div>
          </div>
        )}

        {step === 'scan-book' && (
          <div>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Kitap ISBN barkodunu tarayın</p>
            <div id="qr-reader" className="w-full"></div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
                <span className="text-sm sm:text-base font-semibold">{scannedUser?.displayName}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{scannedUser?.studentClass} - {scannedUser?.studentNumber}</p>
            </div>

            <div className="mb-6 p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
                <span className="text-sm sm:text-base font-semibold">{scannedBook?.title}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{scannedBook?.author}</p>
            </div>

            <button
              onClick={handleBorrow}
              disabled={processing}
              className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-semibold min-h-[44px] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all touch-manipulation"
            >
              {processing ? 'İşleniyor...' : 'Ödünç Ver'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6 sm:py-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-green-600 mb-2">Başarılı!</h3>
            <p className="text-sm sm:text-base text-gray-600">Kitap ödünç verildi</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickBorrowModal;

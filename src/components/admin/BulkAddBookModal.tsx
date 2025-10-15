import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Download, X, BookPlus } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../../firebase/config'; // Adjust this path to your Firebase config
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BulkAddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BookRecord {
  [key: string]: any;
}

interface FailedRecord {
  rowData: string;
  error: string;
}

const BulkAddBookModal: React.FC<BulkAddBookModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'parsing' | 'processing' | 'completed'>('idle');
  const [progress, setProgress] = useState({ total: 0, processed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ successCount: number; failures: FailedRecord[] } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const acceptedFile = acceptedFiles[0];
      if (acceptedFile.type === 'text/csv' || acceptedFile.name.endsWith('.csv')) {
        setFile(acceptedFile);
        setError(null);
        setReport(null);
      } else {
        setError('Lütfen sadece .csv formatında bir dosya yükleyin.');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'text/csv': ['.csv']},
    multiple: false
  });

  const resetState = () => {
    setFile(null);
    setProcessingState('idle');
    setProgress({ total: 0, processed: 0 });
    setError(null);
    setReport(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  }

  const handleProcess = async () => {
    if (!file) return;

    setProcessingState('parsing');
    setError(null);
    setReport(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const records = results.data as BookRecord[];
        setProgress({ total: records.length, processed: 0 });
        setProcessingState('processing');

        let successCount = 0;
        const failures: FailedRecord[] = [];
        const booksCollection = collection(db, 'books');

        for (const [index, record] of records.entries()) {
          try {
            // Validation: Check for mandatory fields
            if (!record.title || !record.author || !record.coverImage) {
              throw new Error('Zorunlu alanlar (title, author, coverImage) eksik.');
            }

            // Add to Firestore
            await addDoc(booksCollection, { 
                ...record, 
                pageCount: Number(record.pageCount) || 0,
                addedDate: serverTimestamp() 
            });
            successCount++;

          } catch (e: any) {
            failures.push({ 
              rowData: Object.values(record).join(','), 
              error: e.message 
            });
          }
          setProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
        }

        setProcessingState('completed');
        setReport({ successCount, failures });
      },
      error: (err: any) => {
        setError(`Dosya okunurken bir hata oluştu: ${err.message}`);
        setProcessingState('idle');
      }
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ['title', 'author', 'isbn', 'category', 'Publisher', 'publication_year', 'location', 'coverImage', 'pageCount', 'tags', 'backCover', 'binding', 'dimensions', 'weight'];
    const required = ['title', 'author', 'coverImage'];
    const note = "Lütfen bu şablonu kullanın. Zorunlu alanlar: ${required.join(', ')}. id ve addedDate alanları sistem tarafından otomatik olarak eklenecektir.";
    const csvContent = "data:text/csv;charset=utf-8," + note + "\n" + headers.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kitap_sablonu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadErrorCSV = () => {
    if (!report || report.failures.length === 0) return;
    const csvHeader = "Hata Mesajı," + Object.keys(report.failures[0].rowData).join(',');
    const csvRows = report.failures.map(f => `"${f.error}",${f.rowData}`);
    const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'hatali_kayitlar.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isProcessing = processingState === 'processing' || processingState === 'parsing';
  const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <BookPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Toplu Kitap Ekle</h2>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all disabled:opacity-50" disabled={isProcessing}>
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 sm:p-8 overflow-y-auto">

        {processingState === 'idle' && (
          <div className="space-y-4 sm:space-y-6">
            <div {...getRootProps()} className={`p-6 sm:p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 scale-105' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center text-gray-500">
                <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-indigo-500" />
                {isDragActive ?
                  <p className="text-base sm:text-lg font-bold text-indigo-600">Dosyayı buraya bırakın...</p> :
                  <p className="text-sm sm:text-lg font-bold text-gray-700">CSV dosyanızı buraya sürükleyin veya seçmek için tıklayın</p>
                }
                <p className="text-xs sm:text-sm text-gray-500 mt-2">(Sadece .csv formatı kabul edilmektedir)</p>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 p-3 sm:p-4 rounded-xl border-2 border-indigo-200">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <FileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">{file.name}</span>
                </div>
                <button onClick={() => setFile(null)} className="ml-2 p-1.5 hover:bg-indigo-200 rounded-full transition-colors flex-shrink-0">
                    <X className="w-4 h-4 text-gray-600"/>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-indigo-300 transition-all font-semibold text-sm sm:text-base min-h-[44px]"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Örnek Şablon İndir
              </button>
              <button 
                onClick={handleProcess} 
                disabled={!file}
                className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-lg min-h-[44px]"
              >
                Kitapları Yükle ve İşle
              </button>
            </div>
          </div>
        )}

        {(processingState !== 'idle') && (
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
              {processingState === 'parsing' && 'Dosya okunuyor...'}
              {processingState === 'processing' && 'Kitaplar işleniyor...'}
              {processingState === 'completed' && 'İşlem Tamamlandı'}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2 overflow-hidden shadow-inner">
                <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-center text-gray-700 font-bold mb-6 text-sm sm:text-base">{progress.processed} / {progress.total} kitap işlendi ({percentage}%)</p>

            {report && (
                 <div className="mt-6 p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl border-2 border-gray-200 max-h-64 overflow-y-auto">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">İşlem Raporu</h3>
                    <p className="text-green-700 font-bold text-sm sm:text-base">✓ {report.successCount} kitap başarıyla eklendi.</p>
                    <p className="text-red-700 font-bold text-sm sm:text-base">✗ {report.failures.length} kitap eklenemedi.</p>
                    {report.failures.length > 0 && (
                        <div className="mt-4">
                            <button onClick={downloadErrorCSV} className="px-4 py-2.5 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-xl hover:from-red-200 hover:to-red-300 transition-all font-semibold text-sm sm:text-base border-2 border-red-300 min-h-[44px]">
                                Hatalı Kayıtları İndir (CSV)
                            </button>
                            <ul className="mt-3 text-xs sm:text-sm text-red-700 list-disc list-inside space-y-1">
                                {report.failures.map((fail, index) => (
                                    <li key={index} title={fail.rowData}><b>Satır {index + 2}:</b> {fail.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-800 rounded-xl text-sm sm:text-base font-semibold">
            <p>{error}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BulkAddBookModal;
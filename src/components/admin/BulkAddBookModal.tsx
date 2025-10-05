import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Download, X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl transform transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Toplu Kitap Ekle</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50" disabled={isProcessing}>
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {processingState === 'idle' && (
          <div className="space-y-6">
            <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center text-gray-500">
                <UploadCloud className="w-12 h-12 mb-4" />
                {isDragActive ?
                  <p className="text-lg font-semibold">Dosyayı buraya bırakın...</p> :
                  <p className="text-lg font-semibold">CSV dosyanızı buraya sürükleyin veya seçmek için tıklayın</p>
                }
                <p className="text-sm">(Sadece .csv formatı kabul edilmektedir)</p>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-center bg-gray-100 p-4 rounded-lg">
                <FileIcon className="w-6 h-6 text-gray-600 mr-3" />
                <span className="font-medium text-gray-800">{file.name}</span>
                <button onClick={() => setFile(null)} className="ml-4 p-1 hover:bg-gray-300 rounded-full">
                    <X className="w-4 h-4"/>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                <Download className="w-5 h-5 mr-2" />
                Örnek Şablon İndir
              </button>
              <button 
                onClick={handleProcess} 
                disabled={!file}
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                Kitapları Yükle ve İşle
              </button>
            </div>
          </div>
        )}

        {(processingState !== 'idle') && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {processingState === 'parsing' && 'Dosya okunuyor...'}
              {processingState === 'processing' && 'Kitaplar işleniyor...'}
              {processingState === 'completed' && 'İşlem Tamamlandı'}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                <div 
                    className="bg-green-500 h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-center text-gray-600 font-medium mb-6">{progress.processed} / {progress.total} kitap işlendi ({percentage}%)</p>

            {report && (
                 <div className="mt-6 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                    <h3 className="text-xl font-bold text-gray-800 mb-3">İşlem Raporu</h3>
                    <p className="text-green-700 font-semibold">✓ {report.successCount} kitap başarıyla eklendi.</p>
                    <p className="text-red-700 font-semibold">✗ {report.failures.length} kitap eklenemedi.</p>
                    {report.failures.length > 0 && (
                        <div className="mt-4">
                            <button onClick={downloadErrorCSV} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-semibold">
                                Hatalı Kayıtları İndir (CSV)
                            </button>
                            <ul className="mt-2 text-sm text-red-600 list-disc list-inside space-y-1">
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
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkAddBookModal;
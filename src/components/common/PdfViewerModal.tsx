import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up worker with a fixed, known-good version
const pdfjsVersion = "4.2.677";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

interface PdfViewerModalProps {
  pdfUrl: string;
  onClose: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ pdfUrl, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const goToPrevPage = () => setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  const goToNextPage = () => setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages || 1));

  const zoomIn = () => setScale(prevScale => prevScale + 0.1);
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.1, 0.5));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
            <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 text-xs sm:text-sm touch-manipulation">Önceki</button>
            <span className="text-xs sm:text-sm whitespace-nowrap">Sayfa {pageNumber} / {numPages}</span>
            <button onClick={goToNextPage} disabled={pageNumber >= (numPages || 0)} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 text-xs sm:text-sm touch-manipulation">Sonraki</button>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={zoomOut} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs sm:text-sm touch-manipulation">-</button>
            <span className="text-xs sm:text-sm whitespace-nowrap">Zoom: {Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs sm:text-sm touch-manipulation">+</button>
          </div>
          <button onClick={onClose} className="text-xl sm:text-2xl font-bold touch-manipulation flex-shrink-0">&times;</button>
        </div>
        <div className="flex-grow overflow-auto p-2 sm:p-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            options={{ cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/cmaps/`, cMapPacked: true }}
          >
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;

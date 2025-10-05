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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50">Önceki</button>
            <span>Sayfa {pageNumber} / {numPages}</span>
            <button onClick={goToNextPage} disabled={pageNumber >= (numPages || 0)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50">Sonraki</button>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={zoomOut} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md">-</button>
            <span>Yakınlaştırma: {Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md">+</button>
          </div>
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        <div className="flex-grow overflow-auto p-4">
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

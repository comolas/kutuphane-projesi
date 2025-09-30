
import React from 'react';
import { X, Gift, ChevronsRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthorEvent } from './AuthorCalendar';

interface AuthorAnniversaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: AuthorEvent[];
  selectedDate: Date | null;
}

// A simple component to represent a person who died
const SkullIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-skull">
        <path d="M8 18V15a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v3"/>
        <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
        <path d="M12 12a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z"/>
        <path d="M4.5 8.5a2 2 0 1 0 0-3 2 2 0 0 0 0 3Z"/>
        <path d="M19.5 8.5a2 2 0 1 0 0-3 2 2 0 0 0 0 3Z"/>
    </svg>
);

const AuthorAnniversaryModal: React.FC<AuthorAnniversaryModalProps> = ({
  isOpen,
  onClose,
  events,
  selectedDate,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !selectedDate) return null;

  const handleAuthorClick = (authorId: string) => {
    navigate(`/author/${authorId}`);
    onClose();
  };

  const births = events.filter(e => e.resource.type === 'birth');
  const deaths = events.filter(e => e.resource.type === 'death');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {formatDate(selectedDate)} Tarihindeki Olaylar
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {births.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-green-600 flex items-center mb-3">
                <Gift className="w-5 h-5 mr-2" />
                Doğumlar
              </h4>
              <ul className="space-y-2">
                {births.map(event => (
                  <li key={event.resource.authorId} className="text-gray-700">
                    <button 
                      onClick={() => handleAuthorClick(event.resource.authorId)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                    >
                      <span>
                        {event.resource.authorName}
                        {event.resource.anniversary && <span className="ml-2 text-xs font-bold text-yellow-500 bg-yellow-100 px-2 py-1 rounded-full"> {event.resource.anniversary}. Yıl Dönümü!</span>}
                      </span>
                      <ChevronsRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {deaths.length > 0 && (
            <div>
              <h4 className="font-bold text-red-600 flex items-center mb-3">
                <SkullIcon />
                <span className="ml-2">Vefatlar</span>
              </h4>
              <ul className="space-y-2">
                {deaths.map(event => (
                  <li key={event.resource.authorId} className="text-gray-700">
                     <button 
                      onClick={() => handleAuthorClick(event.resource.authorId)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                    >
                      <span>
                        {event.resource.authorName}
                        {event.resource.anniversary && <span className="ml-2 text-xs font-bold text-yellow-500 bg-yellow-100 px-2 py-1 rounded-full"> {event.resource.anniversary}. Yıl Dönümü!</span>}
                      </span>
                      <ChevronsRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {births.length === 0 && deaths.length === 0 && (
            <p className="text-center text-gray-500">Bu tarih için kayıtlı bir olay bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorAnniversaryModal;

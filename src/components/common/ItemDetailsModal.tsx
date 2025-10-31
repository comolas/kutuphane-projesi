import React from 'react';
import { X } from 'lucide-react';
import { Event, Announcement } from '../../types';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Event | Announcement | null;
}

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!isOpen || !item) return null;

  const getTitle = () => {
    if (item.type === 'event') return item.name;
    return item.title;
  };

  const getContent = () => {
    const description = 'description' in item && item.description ? item.description : ('content' in item ? item.content : '');
    return <p className="text-gray-700 whitespace-pre-line">{description}</p>;
  };

  const getFooterInfo = () => {
    if (item.type === 'announcement') {
      return (
        <>
          <p><strong>Tarih:</strong> {new Date(item.date).toLocaleDateString()}</p>
          <p><strong>Yazar:</strong> {item.author}</p>
        </>
      );
    }
    if (item.type === 'event') {
      return (
        <>
          <p><strong>Tarih:</strong> {new Date(item.date).toLocaleDateString()}</p>
          <p><strong>Konum:</strong> {item.location}</p>
        </>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-2">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {item.coverImage && (
            <img
              src={item.coverImage}
              alt={getTitle()}
              className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg mb-4"
            />
          )}
          {getContent()}
          <div className="mt-4 text-xs sm:text-sm text-gray-500">
            {getFooterInfo()}
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base touch-manipulation min-h-[44px]"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsModal;
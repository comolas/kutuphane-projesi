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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {item.coverImage && (
            <img
              src={item.coverImage}
              alt={getTitle()}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          {getContent()}
          <div className="mt-4 text-sm text-gray-500">
            {getFooterInfo()}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsModal;
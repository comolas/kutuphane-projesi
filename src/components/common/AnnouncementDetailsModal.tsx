import React from 'react';
import { X } from 'lucide-react';
import { Announcement } from '../../types';

interface AnnouncementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

const AnnouncementDetailsModal: React.FC<AnnouncementDetailsModalProps> = ({
  isOpen,
  onClose,
  announcement,
}) => {
  if (!isOpen || !announcement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {announcement.coverImage && (
            <img
              src={announcement.coverImage}
              alt={announcement.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          <p className="text-gray-700 whitespace-pre-line">{announcement.content}</p>
          <div className="mt-4 text-sm text-gray-500">
            <p><strong>Tarih:</strong> {new Date(announcement.date).toLocaleDateString()}</p>
            <p><strong>Yazar:</strong> {announcement.author}</p>
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

export default AnnouncementDetailsModal;
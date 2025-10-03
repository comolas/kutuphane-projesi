import React, { useState, useEffect } from 'react';
import { Game } from '../../contexts/GameContext';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: Omit<Game, 'id'>) => void;
  gameToEdit?: Game;
}

const GameModal: React.FC<GameModalProps> = ({ isOpen, onClose, onSave, gameToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (gameToEdit) {
      setName(gameToEdit.name);
      setDescription(gameToEdit.description);
      setImageUrl(gameToEdit.imageUrl || '');
    } else {
      setName('');
      setDescription('');
      setImageUrl('');
    }
  }, [gameToEdit, isOpen]);

  const handleSave = () => {
    if (!name) {
      alert('Oyun adı zorunludur.');
      return;
    }
    onSave({ name, description, imageUrl });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{gameToEdit ? 'Oyunu Düzenle' : 'Yeni Oyun Ekle'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Oyun Adı</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Resim URL (İsteğe Bağlı)</label>
            <input 
              type="text" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">İptal</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default GameModal;

import React, { useState } from 'react';
import { useGames, Game } from '../../../contexts/GameContext';
import GameModal from '../GameModal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const GameManagementTab: React.FC = () => {
  const { games, addGame, updateGame, deleteGame, loading } = useGames();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | undefined>(undefined);

  const handleOpenModal = (game?: Game) => {
    setGameToEdit(game);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setGameToEdit(undefined);
    setIsModalOpen(false);
  };

  const handleSaveGame = async (gameData: Omit<Game, 'id'>) => {
    try {
      if (gameToEdit) {
        await updateGame(gameToEdit.id, gameData);
        Swal.fire('Başarılı!', 'Oyun başarıyla güncellendi.', 'success');
      } else {
        await addGame(gameData);
        Swal.fire('Başarılı!', 'Oyun başarıyla eklendi.', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save game:", error);
      Swal.fire('Hata!', 'Oyun kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const handleDeleteGame = async (id: string) => {
    Swal.fire({
      title: 'Emin misiniz?',
      text: "Bu oyunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteGame(id);
          Swal.fire(
            'Silindi!',
            'Oyun başarıyla silindi.',
            'success'
          )
        } catch (error) {
          console.error("Failed to delete game:", error);
          Swal.fire(
            'Hata!',
            'Oyun silinirken bir hata oluştu.',
            'error'
          )
        }
      }
    });
  };

  if (loading) {
    return <div>Oyunlar yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Oyun Yönetimi</h2>
        <button 
          onClick={() => handleOpenModal()} 
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Oyun Ekle
        </button>
      </div>

      <GameModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveGame} 
        gameToEdit={gameToEdit} 
      />

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oyun Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eylemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {games.length > 0 ? (
              games.map((game) => (
                <tr key={game.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {game.imageUrl && <img src={game.imageUrl} alt={game.name} className="w-10 h-10 rounded-md mr-4 object-cover"/>}
                      <span className="font-medium text-gray-900">{game.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">{game.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenModal(game)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteGame(game.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">Henüz hiç oyun eklenmemiş.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameManagementTab;
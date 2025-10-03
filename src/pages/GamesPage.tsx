import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGames } from '../contexts/GameContext';
import { Gamepad2, Search, ArrowLeft } from 'lucide-react';

const ITEMS_PER_PAGE = 8;

const GamesPage: React.FC = () => {
  const { games, loading } = useGames();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const filteredGames = useMemo(() => 
    games.filter(game => 
      game.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [games, searchTerm]);

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  const paginatedGames = useMemo(() => 
    filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  , [filteredGames, currentPage]);

  if (loading) {
    return <div className="text-center py-10">Oyunlar yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <ArrowLeft className="w-6 h-6 text-gray-800 dark:text-white" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Oyunlar</h1>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Oyun ara..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      
      {filteredGames.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedGames.map((game) => (
              <Link to={`/games/${game.id}`} key={game.id} className="block group">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-transform duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-xl h-full flex flex-col">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {game.imageUrl ? (
                      <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">{game.name}</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm h-10 overflow-hidden text-ellipsis flex-grow">{game.description}</p>
                    <div className="mt-4">
                      <span className="inline-block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg group-hover:bg-indigo-700 transition-colors">
                        Randevu Al
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                Sayfa {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <Gamepad2 className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{searchTerm ? 'Arama Sonucu Bulunamadı' : 'Henüz Oyun Eklenmemiş'}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{searchTerm ? `"${searchTerm}" ile eşleşen bir oyun bulunamadı.` : 'Yönetici tarafından henüz oynanacak bir oyun eklenmedi.'}</p>
        </div>
      )}
    </div>
  );
};

export default GamesPage;

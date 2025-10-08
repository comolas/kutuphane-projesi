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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-1" />
            Geri Dön
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Oyunlar</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Oyun ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-12 pr-4 py-3 w-full bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/80 transition-all shadow-lg"
            />
          </div>
        </div>
      
      {filteredGames.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedGames.map((game, index) => (
              <Link 
                to={`/games/${game.id}`} 
                key={game.id} 
                className="block group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-2xl h-full flex flex-col border border-white/20">
                  <div className="relative h-64 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                    {game.imageUrl ? (
                      <>
                        <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Gamepad2 className="w-10 h-10 text-white" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-lg">
                        Masa Oyunu
                      </span>
                    </div>
                    
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-md">
                      <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      <span className="text-xs font-bold text-gray-700">4.8</span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 truncate">{game.name}</h2>
                    <p className="text-gray-600 text-sm h-16 overflow-hidden text-ellipsis flex-grow">{game.description}</p>
                    
                    <div className="flex items-center gap-3 mt-3 mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="text-xs font-bold text-indigo-700">2-4 Kişi</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold text-purple-700">10-15 dk</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="inline-block w-full text-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-md group-hover:shadow-lg transition-all">
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
                className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
              >
                Önceki
              </button>
              <span className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl text-gray-700 font-semibold shadow-lg">
                Sayfa {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-6 py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{searchTerm ? 'Arama Sonucu Bulunamadı' : 'Henüz Oyun Eklenmemiş'}</h2>
          <p className="text-gray-600 mt-2">{searchTerm ? `"${searchTerm}" ile eşleşen bir oyun bulunamadı.` : 'Yönetici tarafından henüz oynanacak bir oyun eklenmedi.'}</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default GamesPage;

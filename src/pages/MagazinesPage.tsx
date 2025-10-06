import React, { useState, useMemo } from 'react';
import { useMagazines } from '../contexts/MagazineContext';
import { Search, Tag, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ITEMS_PER_PAGE = 8;

const MagazinesPage: React.FC = () => {
  const { magazines } = useMagazines();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (magazines.length > 0) {
      setIsLoading(false);
    }
  }, [magazines]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    magazines.forEach(magazine => {
      magazine.tags?.forEach(tag => {
        if(tag) tags.add(tag)
      });
    });
    return Array.from(tags);
  }, [magazines]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const processedMagazines = useMemo(() => {
    const filtered = magazines.filter(magazine => {
      const matchesSearch = magazine.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            magazine.issue.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTags = selectedTags.length === 0 ||
                          selectedTags.every(tag => magazine.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });

    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0);
        case 'oldest':
          return (a.addedAt?.seconds || 0) - (b.addedAt?.seconds || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [magazines, searchTerm, selectedTags, sortOrder]);

  const totalPages = Math.ceil(processedMagazines.length / ITEMS_PER_PAGE);
  const paginatedMagazines = processedMagazines.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleReadClick = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="w-80 h-80 mx-auto mb-8">
        <DotLottieReact
          src="https://lottie.host/30027fbc-32a0-428c-858b-fcb4c1dfe97e/mMIQS0vBrY.json"
          loop
          autoplay
        />
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 text-gray-900 dark:text-white">Dergi Arşivi</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Bilgi ve ilham dolu bir dünyaya dalın. Aradığınız sayıyı bulun, yeni konular keşfedin ve okumaya başlayın.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Dergi adı veya sayısında ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                Filtreler
              </h2>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTags([]);
                  setSortOrder('newest');
                  setCurrentPage(1);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Temizle
              </button>
            </div>

            <div className="space-y-6">
              {/* Sort Order */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sıralama</h3>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="title-asc">A'dan Z'ye</option>
                  <option value="title-desc">Z'den A'ya</option>
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Etiketler</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allTags.map(tag => (
                    <label key={tag} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagClick(tag)}
                        className="mr-2"
                      />
                      <span className="text-sm">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="w-full aspect-[3/4] bg-gray-300"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : paginatedMagazines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-32 h-32 mb-6 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Dergi bulunamadı</h3>
          <p className="text-gray-500">Aradığınız kriterlere uygun dergi bulunmuyor.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedMagazines.map(magazine => (
              <div key={magazine.id} className="bg-white rounded-xl shadow-sm overflow-hidden group transform transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="relative overflow-hidden aspect-[3/4]">
                  <img src={magazine.coverImageUrl} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
                      <button 
                        className="w-full bg-white text-gray-900 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                        onClick={() => handleReadClick(magazine.pdfUrl)}
                      >
                        Oku
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors" title={magazine.title}>{magazine.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{magazine.issue}</p>
                  {magazine.tags && magazine.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {magazine.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600">
                Sayfa {currentPage} / {totalPages}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="mr-1" />
                  Önceki
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                  <ChevronRight size={18} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export default MagazinesPage;

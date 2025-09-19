import React, { useState, useMemo } from 'react';
import { useMagazines } from '../contexts/MagazineContext';
import { Search, Tag, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ITEMS_PER_PAGE = 8;

const MagazinesPage: React.FC = () => {
  const { magazines } = useMagazines();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

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

      <div className="mb-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Dergi adı veya sayısında ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700 appearance-none"
            >
              <option value="newest">En Yeni</option>
              <option value="oldest">En Eski</option>
              <option value="title-asc">A'dan Z'ye</option>
              <option value="title-desc">Z'den A'ya</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Tag className="mr-2 text-gray-500 dark:text-gray-400" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 ${
                selectedTags.includes(tag)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-200 dark:hover:bg-indigo-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {paginatedMagazines.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 text-xl py-10">
          Aradığınız kriterlere uygun dergi bulunamadı.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {paginatedMagazines.map(magazine => (
              <div key={magazine.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group">
                <div className="relative">
                  <img src={magazine.coverImageUrl} alt={magazine.title} className="w-full h-110 object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                     <button 
                        className="w-32 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0"
                        onClick={() => handleReadClick(magazine.pdfUrl)}
                      >
                        Oku
                      </button>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-bold truncate" title={magazine.title}>{magazine.title}</h2>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-1">{magazine.issue}</p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center space-x-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <ChevronLeft size={20} className="mr-1" />
                Önceki
              </button>
              <span className="text-gray-700 dark:text-gray-200">
                Sayfa {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Sonraki
                <ChevronRight size={20} className="ml-1" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MagazinesPage;

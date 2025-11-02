import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazines } from '../contexts/MagazineContext';
import { Search, Tag, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ITEMS_PER_PAGE = 8;

const MagazinesPage: React.FC = () => {
  const { t } = useTranslation();
  const { magazines } = useMagazines();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-8">
          <DotLottieReact
            src="https://lottie.host/30027fbc-32a0-428c-858b-fcb4c1dfe97e/mMIQS0vBrY.json"
            loop
            autoplay
            style={{ width: '300px', height: '300px' }}
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('magazines.title')}</h1>
          <p className="text-gray-600">
            {t('magazines.description')}
          </p>
        </div>

        {/* Floating Filter Button (Mobile) */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Filter className="w-6 h-6" />
        </button>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex gap-4 lg:gap-6">
          {/* Sidebar */}
          <aside className={`fixed lg:sticky top-0 left-0 h-full lg:h-auto w-80 lg:w-64 bg-white/90 backdrop-blur-xl lg:rounded-2xl shadow-lg p-4 sm:p-6 z-50 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:flex-shrink-0 border border-white/20`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                {t('magazines.filters')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTags([]);
                    setSortOrder('newest');
                    setCurrentPage(1);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {t('magazines.clear')}
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('magazines.searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div className="space-y-6">
              {/* Sort Order */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('magazines.sorting')}</h3>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="newest">{t('magazines.newest')}</option>
                  <option value="oldest">{t('magazines.oldest')}</option>
                  <option value="title-asc">{t('magazines.titleAsc')}</option>
                  <option value="title-desc">{t('magazines.titleDesc')}</option>
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('magazines.tags')}</h3>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden animate-pulse border border-white/20">
                    <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedMagazines.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-16 text-center border border-white/20">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('magazines.noMagazines')}</h3>
                <p className="text-gray-600">{t('magazines.noMagazinesDesc')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {paginatedMagazines.map((magazine, index) => (
                    <div 
                      key={magazine.id} 
                      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/20"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="relative overflow-hidden aspect-[3/4]">
                        <img src={magazine.coverImageUrl} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <button 
                              className="w-full bg-white text-gray-900 py-2.5 rounded-xl font-semibold shadow-md hover:bg-gray-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                              onClick={() => handleReadClick(magazine.pdfUrl)}
                            >
                              {t('magazines.read')}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h2 className="text-lg font-bold text-gray-900 truncate" title={magazine.title}>{magazine.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{magazine.issue}</p>
                        {magazine.tags && magazine.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {magazine.tags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 rounded-lg text-xs font-medium">
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
                  <div className="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-4">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium flex items-center"
                    >
                      <ChevronLeft size={18} className="mr-1" />
                      {t('magazines.previous')}
                    </button>
                    <span className="px-3 sm:px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl text-sm sm:text-base text-gray-700 font-semibold shadow-lg">
                      {t('magazines.page', { current: currentPage, total: totalPages })}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl text-sm sm:text-base text-gray-700 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-medium flex items-center"
                    >
                      {t('magazines.next')}
                      <ChevronRight size={18} className="ml-1" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagazinesPage;

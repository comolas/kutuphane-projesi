import React, { useState, useEffect } from 'react';
import { useAuthors } from '../contexts/AuthorContext';
import AuthorCard from '../components/common/AuthorCard';
import { Author } from '../types';
import { Search, Tag, Filter, X } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const AuthorsPage: React.FC = () => {
  const { authors, fetchAllAuthors } = useAuthors();
  const [searchQuery, setSearchQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const authorsPerPage = 12;

  useEffect(() => {
    fetchAllAuthors();
  }, [fetchAllAuthors]);

  const filteredAndSortedAuthors = authors
    .filter(author => {
      const nameMatch = author.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
      const tagMatch = !tagQuery || 
        (Array.isArray(author.tags) && author.tags.some(tag => tag.toLocaleLowerCase('tr-TR').includes(tagQuery.toLocaleLowerCase('tr-TR')))) ||
        (typeof author.tags === 'string' && author.tags.toLocaleLowerCase('tr-TR').includes(tagQuery.toLocaleLowerCase('tr-TR')));
      return nameMatch && tagMatch;
    })
    .sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name, 'tr-TR');
      } else {
        return b.name.localeCompare(a.name, 'tr-TR');
      }
    });

  const indexOfLastAuthor = currentPage * authorsPerPage;
  const indexOfFirstAuthor = indexOfLastAuthor - authorsPerPage;
  const paginatedAuthors = filteredAndSortedAuthors.slice(indexOfFirstAuthor, indexOfLastAuthor);
  const totalPages = Math.ceil(filteredAndSortedAuthors.length / authorsPerPage);

  const handleClearFilters = () => {
    setSearchQuery('');
    setTagQuery('');
    setSortOrder('name-asc');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div style={{ height: '400px', display: 'flex', justifyContent: 'center' }}>
            <DotLottieReact
              src="https://lottie.host/d6f2fedf-cff9-4c9a-a5d2-0d8c55ca0cdc/ZjUB9ZbTso.json"
              loop
              autoplay
              backgroundColor="transparent"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Yazarlarımız</h1>
          <p className="mt-2 text-lg text-gray-600">
            Kütüphanemize değer katan yazarları keşfedin.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Yazar adı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Etiket ara..."
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Tag className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="name-asc">Ada Göre (A-Z)</option>
              <option value="name-desc">Ada Göre (Z-A)</option>
            </select>
            <button
              onClick={handleClearFilters}
              className="flex items-center px-4 py-2 border border-red-200 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 focus:ring-2 focus:ring-red-400"
            >
              <X className="w-5 h-5 mr-2" />
              <span>Temizle</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {paginatedAuthors.map(author => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Sayfa {currentPage} / {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorsPage;

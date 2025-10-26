import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import PostCard from '../components/blog/PostCard';
import PageAccessGuard from '../components/PageAccessGuard';
import { Search, X, SlidersHorizontal, FileText, FolderOpen, Heart, MessageCircle, BookOpen, TrendingUp, Clock, Tag, ArrowUp, ChevronLeft } from 'lucide-react';

const BlogPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'mostCommented'>('newest');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const postsPerPage = 9;

  // Scroll to top handler
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate reading time
  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsCollection = collection(db, 'posts');
        const q = query(postsCollection, where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
          const commentsRef = collection(db, 'posts', postDoc.id, 'comments');
          const commentsSnapshot = await getDocs(commentsRef);
          return {
            id: postDoc.id,
            ...postDoc.data(),
            commentCount: commentsSnapshot.size
          };
        })) as Post[];
        setPosts(postsData);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(postsData.map(post => post.category)));
        setCategories(uniqueCategories);

        // Extract and count tags
        const tagMap = new Map<string, number>();
        postsData.forEach(post => {
          if (post.tags) {
            post.tags.forEach(tag => {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
          }
        });
        const sortedTags = Array.from(tagMap.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setAllTags(sortedTags);
      } catch (error) {
        console.error("Error fetching posts: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  useEffect(() => {
    let results = [...posts];
    
    // Search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      results = results.filter(post =>
        post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm)))
      );
    }

    // Tag filter
    if (selectedTag) {
      results = results.filter(post => post.tags && post.tags.includes(selectedTag));
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      results = results.filter(post => post.category === categoryFilter);
    }
    
    // Sort
    if (sortBy === 'newest') {
      results.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    } else if (sortBy === 'popular') {
      results.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortBy === 'mostCommented') {
      results.sort((a, b) => ((b as any).commentCount || 0) - ((a as any).commentCount || 0));
    }
    
    setFilteredPosts(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, categoryFilter, sortBy, selectedTag, posts]);

  return (
    <PageAccessGuard pageId="blog">
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Geri Dön
        </button>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Blog</h1>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <SlidersHorizontal size={20} />
            Filtrele
          </button>
          <Link to="/create-post" className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm sm:text-base">
            Yeni Yazı Ekle
          </Link>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Toplam Yazı</p>
            <p className="text-2xl sm:text-4xl font-bold text-white">{posts.length}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Kategori</p>
            <p className="text-2xl sm:text-4xl font-bold text-white">{categories.length}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Toplam Beğeni</p>
            <p className="text-2xl sm:text-4xl font-bold text-white">{posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0)}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3">
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Toplam Yorum</p>
            <p className="text-2xl sm:text-4xl font-bold text-white">{posts.reduce((sum, post) => sum + ((post as any).commentCount || 0), 0)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 lg:gap-6">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 h-screen lg:h-auto z-50 lg:z-0
          w-80 lg:w-64 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg
          transform transition-transform duration-300 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-bold mb-6">Filtreler</h2>
          
          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Ara</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Yazı ara..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">Kategoriler</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                <input
                  type="radio"
                  name="category"
                  checked={categoryFilter === 'all'}
                  onChange={() => setCategoryFilter('all')}
                  className="mr-3 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tüm Kategoriler</span>
                <span className="ml-auto text-sm text-gray-500">({posts.length})</span>
              </label>
              {categories.map(cat => (
                <label key={cat} className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                  <input
                    type="radio"
                    name="category"
                    checked={categoryFilter === cat}
                    onChange={() => setCategoryFilter(cat)}
                    className="mr-3 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{cat}</span>
                  <span className="ml-auto text-sm text-gray-500">
                    ({posts.filter(p => p.category === cat).length})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">Sıralama</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === 'newest'}
                  onChange={() => setSortBy('newest')}
                  className="mr-3 text-indigo-600 focus:ring-indigo-500"
                />
                <span>En Yeni</span>
              </label>
              <label className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === 'popular'}
                  onChange={() => setSortBy('popular')}
                  className="mr-3 text-indigo-600 focus:ring-indigo-500"
                />
                <span>En Popüler</span>
              </label>
              <label className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === 'mostCommented'}
                  onChange={() => setSortBy('mostCommented')}
                  className="mr-3 text-indigo-600 focus:ring-indigo-500"
                />
                <span>En Çok Yorumlanan</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
              <Tag size={16} />
              Popüler Etiketler
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:scale-105'
                  }`}
                >
                  {tag} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || categoryFilter !== 'all' || sortBy !== 'newest' || selectedTag) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setSortBy('newest');
                setSelectedTag('');
              }}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <X size={18} />
              Filtreleri Temizle
            </button>
          )}
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Active Filters & Results Info */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                  Arama: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  Kategori: {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full text-sm">
                  Sıralama: {sortBy === 'popular' ? 'En Popüler' : 'En Çok Yorumlanan'}
                  <button onClick={() => setSortBy('newest')} className="hover:bg-pink-200 dark:hover:bg-pink-800 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  Etiket: {selectedTag}
                  <button onClick={() => setSelectedTag('')} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                <strong className="text-indigo-600 dark:text-indigo-400">{filteredPosts.length}</strong> yazı bulundu
              </span>
              {filteredPosts.length > 0 && (
                <span>
                  Ortalama okuma süresi: <strong className="text-indigo-600 dark:text-indigo-400">
                    {Math.ceil(filteredPosts.reduce((sum, post) => sum + calculateReadingTime(post.content || ''), 0) / filteredPosts.length)} dk
                  </strong>
                </span>
              )}
            </div>
          </div>
      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse lg:row-span-2">
              <div className="w-full h-96 bg-gray-300 dark:bg-gray-700"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-300 dark:bg-gray-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredPosts.length > 0 ? (
        <>
          <div className="space-y-8">
            {/* Featured Post + Small Posts Section */}
            {filteredPosts.slice((currentPage - 1) * postsPerPage, (currentPage - 1) * postsPerPage + 5).length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Large Featured Post */}
                {filteredPosts[(currentPage - 1) * postsPerPage] && (
                  <Link to={`/blog/${filteredPosts[(currentPage - 1) * postsPerPage].id}`} className="lg:row-span-2 group">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]">
                      <div className="relative h-96">
                        <img 
                          src={filteredPosts[(currentPage - 1) * postsPerPage].coverImageURL} 
                          alt={filteredPosts[(currentPage - 1) * postsPerPage].title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full shadow-lg">
                            {filteredPosts[(currentPage - 1) * postsPerPage].category}
                          </span>
                          <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-sm rounded-full flex items-center gap-1">
                            <Clock size={14} />
                            {calculateReadingTime(filteredPosts[(currentPage - 1) * postsPerPage].content || '')} dk
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-indigo-600 transition-colors">
                          {filteredPosts[(currentPage - 1) * postsPerPage].title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {filteredPosts[(currentPage - 1) * postsPerPage].excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <img 
                              src={filteredPosts[(currentPage - 1) * postsPerPage].authorPhotoURL} 
                              alt={filteredPosts[(currentPage - 1) * postsPerPage].authorName}
                              className="w-10 h-10 rounded-full mr-3 ring-2 ring-transparent group-hover:ring-indigo-500 transition-all"
                            />
                            <div>
                              <p className="font-semibold">{filteredPosts[(currentPage - 1) * postsPerPage].authorName}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(filteredPosts[(currentPage - 1) * postsPerPage].createdAt?.toDate()).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
                
                {/* Small Posts Grid (2x2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-1">
                  {filteredPosts.slice((currentPage - 1) * postsPerPage + 1, (currentPage - 1) * postsPerPage + 5).map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular Grid for Remaining Posts */}
            {filteredPosts.slice((currentPage - 1) * postsPerPage + 5, currentPage * postsPerPage).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.slice((currentPage - 1) * postsPerPage + 5, currentPage * postsPerPage).map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {filteredPosts.length > postsPerPage && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-6 sm:mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm sm:text-base disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Önceki
              </button>
              <span className="px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base">
                Sayfa {currentPage} / {Math.ceil(filteredPosts.length / postsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredPosts.length / postsPerPage)))}
                disabled={currentPage === Math.ceil(filteredPosts.length / postsPerPage)}
                className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm sm:text-base disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* İllüstrasyon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full flex items-center justify-center">
              <Search size={64} className="text-indigo-400 dark:text-indigo-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900 dark:to-pink-800 rounded-full flex items-center justify-center animate-bounce">
              <X size={24} className="text-pink-500 dark:text-pink-400" />
            </div>
          </div>

          {/* Mesaj */}
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Sonuç Bulunamadı
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
            Aradığınız kriterlere uygun yazı bulunamadı. Farklı filtreler deneyebilir veya arama teriminizi değiştirebilirsiniz.
          </p>

          {/* Öneriler */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Tüm Yazılar</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Filtreleri kaldırarak tüm yazıları görüntüleyin
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setSortBy('newest');
                  setSelectedTag('');
                }}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Filtreleri Temizle →
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Popüler Yazılar</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                En çok beğenilen yazıları keşfedin
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setSortBy('popular');
                  setSelectedTag('');
                }}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Popülerleri Gör →
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
                  <Clock size={20} className="text-pink-600 dark:text-pink-400" />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Yeni Yazılar</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                En son yayınlanan içeriklere göz atın
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setSortBy('newest');
                  setSelectedTag('');
                }}
                className="text-sm text-pink-600 dark:text-pink-400 hover:underline font-medium"
              >
                Yenileri Gör →
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 transition-all duration-300 z-50 animate-bounce"
          aria-label="Yukarı Çık"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
    </PageAccessGuard>
  );
};

export default BlogPage;

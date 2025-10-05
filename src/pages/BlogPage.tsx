import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';
import { Link } from 'react-router-dom';
import PostCard from '../components/blog/PostCard';

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'mostCommented'>('newest');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const postsPerPage = 9;

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
  }, [searchTerm, categoryFilter, sortBy, posts]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-center sm:text-left">Blog</h1>
          <Link to="/create-post" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center">
            Yeni Yazı Ekle
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Yazı ara..."
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'mostCommented')}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="newest">En Yeni</option>
            <option value="popular">En Popüler</option>
            <option value="mostCommented">En Çok Yorumlanan</option>
          </select>
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                      <div className="relative h-96">
                        <img 
                          src={filteredPosts[(currentPage - 1) * postsPerPage].coverImageURL} 
                          alt={filteredPosts[(currentPage - 1) * postsPerPage].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full">
                            {filteredPosts[(currentPage - 1) * postsPerPage].category}
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
                              className="w-10 h-10 rounded-full mr-3"
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
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="px-4 py-2">
                Sayfa {currentPage} / {Math.ceil(filteredPosts.length / postsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredPosts.length / postsPerPage)))}
                disabled={currentPage === Math.ceil(filteredPosts.length / postsPerPage)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500">Aradığınız kriterlere uygun yazı bulunmuyor.</div>
      )}
    </div>
  );
};

export default BlogPage;

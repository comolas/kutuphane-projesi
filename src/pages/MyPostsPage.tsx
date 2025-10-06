import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Edit, Trash2, Eye, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Post {
  id: string;
  title: string;
  content: string;
  coverImageURL: string;
  category: string;
  tags: string[];
  sources: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  likes: string[];
  commentCount?: number;
}

const categories = [
  'Kitap İncelemesi',
  'Film İncelemesi',
  'Şiir İncelemesi',
  'Resim İncelemesi',
  'Hikâye',
  'Deneme',
  'Şiir',
];

const MyPostsPage: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'mostCommented'>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMyPosts();
  }, [user]);

  useEffect(() => {
    let results = [...posts];
    
    // Status filter
    if (statusFilter !== 'all') {
      results = results.filter(post => post.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      results = results.filter(post =>
        post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        post.category.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    // Sort
    if (sortBy === 'newest') {
      results.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    } else if (sortBy === 'popular') {
      results.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortBy === 'mostCommented') {
      results.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    }
    
    setFilteredPosts(results);
  }, [posts, statusFilter, sortBy, searchTerm]);

  const fetchMyPosts = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const postsData = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
        const commentsRef = collection(db, 'posts', postDoc.id, 'comments');
        const commentsSnapshot = await getCountFromServer(commentsRef);
        return {
          id: postDoc.id,
          ...postDoc.data(),
          commentCount: commentsSnapshot.data().count
        } as Post;
      }));
      setPosts(postsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        title: editingPost.title,
        content: editingPost.content,
        category: editingPost.category,
        tags: editingPost.tags,
        sources: editingPost.sources,
        coverImageURL: editingPost.coverImageURL,
        authorName: userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Anonim',
        status: 'pending',
      });
      setPosts(posts.map(post => post.id === editingPost.id ? { ...editingPost, status: 'pending' } : post));
      setEditingPost(null);
      alert('Yazınız güncellendi ve admin onayına gönderildi.');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Yazı güncellenirken bir hata oluştu.');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Yazılarım</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-300 dark:bg-gray-700"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: posts.length,
    approved: posts.filter(p => p.status === 'approved').length,
    pending: posts.filter(p => p.status === 'pending').length,
    rejected: posts.filter(p => p.status === 'rejected').length,
    totalLikes: posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
    totalComments: posts.reduce((sum, p) => sum + (p.commentCount || 0), 0),
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Yazılarım</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-indigo-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Yazı</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Onaylanan</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bekleyen</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reddedilen</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-pink-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Beğeni</p>
          <p className="text-2xl font-bold text-pink-600">{stats.totalLikes}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Yorum</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalComments}</p>
        </div>
      </div>

      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold">Yazıyı Düzenle</h3>
              <button onClick={() => setEditingPost(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Başlık</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kapak Resmi URL</label>
                <input
                  type="text"
                  value={editingPost.coverImageURL}
                  onChange={(e) => setEditingPost({...editingPost, coverImageURL: e.target.value})}
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <select
                  value={editingPost.category}
                  onChange={(e) => setEditingPost({...editingPost, category: e.target.value})}
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Etiketler (virgülle ayırın)</label>
                <input
                  type="text"
                  value={editingPost.tags.join(', ')}
                  onChange={(e) => setEditingPost({...editingPost, tags: e.target.value.split(',').map(t => t.trim())})}
                  className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">İçerik</label>
                <ReactQuill
                  value={editingPost.content}
                  onChange={(value) => setEditingPost({...editingPost, content: value})}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      [{ 'font': [] }],
                      [{ 'size': ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kaynaklar</label>
                <ReactQuill
                  value={editingPost.sources || ''}
                  onChange={(value) => setEditingPost({...editingPost, sources: value})}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      ['link'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Kaydet ve Onaya Gönder
                </button>
                <button
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Yazı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="approved">Onaylanan</option>
            <option value="pending">Bekleyen</option>
            <option value="rejected">Reddedilen</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="newest">En Yeni</option>
            <option value="popular">En Popüler</option>
            <option value="mostCommented">En Çok Yorumlanan</option>
          </select>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-32 h-32 mb-6 text-gray-300 dark:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Henüz yazınız yok</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Hemen ilk yazınızı oluşturun ve paylaşın!</p>
          <button
            onClick={() => navigate('/create-post')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Yeni Yazı Oluştur
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-32 h-32 mb-6 text-gray-300 dark:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sonuç bulunamadı</h3>
          <p className="text-gray-500 dark:text-gray-400">Aradığınız kriterlere uygun yazı bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="relative">
                <img src={post.coverImageURL} alt={post.title} className="w-full h-48 object-cover" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    post.status === 'approved' ? 'bg-green-500 text-white' : 
                    post.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {post.status === 'approved' ? '✓ Onaylanı' : post.status === 'rejected' ? '✕ Reddedildi' : '⏳ Bekliyor'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Kategori: {post.category}</p>
                {post.status === 'approved' && (
                  <div className="flex gap-4 mb-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1 text-pink-500" />
                      {post.likes?.length || 0}
                    </span>
                    <span className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-1 text-blue-500" />
                      {post.commentCount || 0}
                    </span>
                  </div>
                )}
                <p className={`text-xs font-medium mb-4 ${
                  post.status === 'approved' ? 'text-green-600' : 
                  post.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  Durum: {post.status === 'approved' ? 'Onaylandı' : post.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/blog/${post.id}`)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Görüntüle
                  </button>
                  <button
                    onClick={() => setEditingPost(post)}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPostsPage;

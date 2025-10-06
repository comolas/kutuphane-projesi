import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  coverImageURL: string;
  authorId: string;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  tags: string[];
  createdAt: any;
}

const BlogManagementTab: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (postId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'posts', postId), { status });
      setPosts(posts.map(post => post.id === postId ? { ...post, status } : post));
    } catch (error) {
      console.error('Error updating post status:', error);
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

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Blog Yazıları Yönetimi</h2>
      
      {viewingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold">{viewingPost.title}</h3>
              <button onClick={() => setViewingPost(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <img src={viewingPost.coverImageURL} alt={viewingPost.title} className="w-full h-64 object-cover rounded-lg mb-4" />
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: viewingPost.content }}></div>
            {viewingPost.sources && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Kaynaklar:</h4>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: viewingPost.sources }}></div>
              </div>
            )}
          </div>
        </div>
      )}

      
      {posts.length === 0 ? (
        <p className="text-gray-500">Henüz yazı bulunmuyor.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-600">Yazar: {post.authorName}</p>
                  <p className="text-sm text-gray-600">Kategori: {post.category}</p>
                  <p className="text-sm text-gray-500 mt-2">{post.excerpt}</p>
                  <div className="flex gap-2 mt-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">{tag}</span>
                    ))}
                  </div>
                  <p className={`text-sm font-medium mt-2 ${
                    post.status === 'approved' ? 'text-green-600' : 
                    post.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    Durum: {post.status === 'approved' ? 'Onaylandı' : post.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingPost(post)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Görüntüle"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {post.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate(post.id, 'approved')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Onayla"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {post.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusUpdate(post.id, 'rejected')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Reddet"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Sil"
                  >
                    <Trash2 className="w-5 h-5" />
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

export default BlogManagementTab;

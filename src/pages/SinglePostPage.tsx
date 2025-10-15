import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Heart } from 'lucide-react';
import CommentSection from '../components/blog/CommentSection';
import PostCard from '../components/blog/PostCard';
import { sanitizeHTML, sanitizeText, sanitizeURL } from '../utils/sanitize';
import 'react-quill/dist/quill.snow.css';

const SinglePostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherPosts, setOtherPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPostAndOtherPosts = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const postDocRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postDocRef);
        if (docSnap.exists()) {
          const fetchedPost = { id: docSnap.id, ...docSnap.data() } as Post;
          setPost(fetchedPost);

          // Fetch other posts by the same author
          if (fetchedPost.authorId) {
            const postsCollection = collection(db, 'posts');
            const q = query(
              postsCollection,
              where('authorId', '==', fetchedPost.authorId),
              where('status', '==', 'approved'),
              orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const otherPostsData = querySnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Post))
              .filter(p => p.id !== postId); // Exclude the current post
            setOtherPosts(otherPostsData);
          }

        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching post or other posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndOtherPosts();
  }, [postId]);

  const handleLike = async () => {
    if (!user || !postId || !post) return;

    const postDocRef = doc(db, 'posts', postId);
    const userHasLiked = post.likes.includes(user.uid);

    try {
      if (userHasLiked) {
        await updateDoc(postDocRef, { likes: arrayRemove(user.uid) });
        setPost(prevPost => prevPost ? { ...prevPost, likes: prevPost.likes.filter(uid => uid !== user.uid) } : null);
      } else {
        await updateDoc(postDocRef, { likes: arrayUnion(user.uid) });
        setPost(prevPost => prevPost ? { ...prevPost, likes: [...prevPost.likes, user.uid] } : null);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Yükleniyor...</div>;
  }

  if (!post) {
    return <div className="text-center p-10">Yazı bulunamadı.</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Cover Image */}
      <div className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
        <img 
          src={sanitizeURL(post.coverImageURL)} 
          alt={sanitizeText(post.title)} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12">
          <div className="container mx-auto max-w-4xl">
            <span className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-full mb-4">
              {sanitizeText(post.category)}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4">{sanitizeText(post.title)}</h1>
            <div className="flex items-center text-white">
              <img src={sanitizeURL(post.authorPhotoURL)} alt={sanitizeText(post.authorName)} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
              <div className="ml-4">
                <p className="font-semibold text-lg">{sanitizeText(post.authorName)}</p>
                <p className="text-sm text-gray-200">{new Date(post.createdAt?.toDate()).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }}></div>
      
        
        {/* Sources Section */}
        {post.sources && typeof post.sources === 'string' && post.sources.replace(/<[^>]*>/g, '').trim() && (
          <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">Kaynaklar</h3>
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.sources) }}></div>
          </div>
        )}

        {/* Tags and Like Section */}
        <div className="mt-12 pt-6 border-t dark:border-gray-700">
          <div className="flex flex-wrap justify-between items-center gap-4">
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Etiketler:</span>
                {post.tags.map(tag => (
                  <span key={tag} className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm rounded-full font-medium">{sanitizeText(tag)}</span>
                ))}
              </div>
            )}
            <button 
              onClick={handleLike} 
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full hover:border-red-500 transition-all shadow-sm hover:shadow-md"
            >
              <Heart className={`w-6 h-6 ${post.likes.includes(user?.uid || '') ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
              <span className="font-semibold">{post.likes.length} Beğeni</span>
            </button>
          </div>
        </div>

        {/* Author Card */}
        <div className="mt-12 p-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-6">
            <img 
              src={sanitizeURL(post.authorPhotoURL)} 
              alt={sanitizeText(post.authorName)} 
              className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
            />
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{sanitizeText(post.authorName)}</h3>
              <p className="text-gray-600 dark:text-gray-400">Yazar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Posts Section */}
      {otherPosts.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8">Yazarın Diğer Yazıları</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherPosts.slice(0, 3).map(otherPost => (
                <PostCard key={otherPost.id} post={otherPost} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <CommentSection postId={post.id} areCommentsEnabled={post.areCommentsEnabled} />
      </div>
    </div>
  );
};

export default SinglePostPage;

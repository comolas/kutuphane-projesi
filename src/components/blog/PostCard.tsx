import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../../types';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <Link to={`/blog/${post.id}`} className="block group">
      <div className="overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <img src={post.coverImageURL} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="p-4">
          <p className="text-sm text-indigo-500 dark:text-indigo-400">{post.category}</p>
          <h3 className="text-lg font-bold mt-1 truncate">{post.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 h-10 overflow-hidden">{post.excerpt || post.content.substring(0, 100)}</p>
          <div className="flex items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <img src={post.authorPhotoURL} alt={post.authorName} className="w-8 h-8 rounded-full object-cover" />
            <div className="ml-3">
              <p className="text-sm font-medium">{post.authorName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.createdAt?.toDate()).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PostCard;

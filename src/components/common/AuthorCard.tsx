import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Author } from '../types';

interface AuthorCardProps {
  author: Author;
}

const AuthorCard: React.FC<AuthorCardProps> = ({ author }) => {
  const navigate = useNavigate();

  const handleInspectAuthor = () => {
    navigate(`/author/${author.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden transform transition-transform duration-300 hover:scale-105">
      <img src={author.image} alt={author.name} className="w-full h-80 object-cover" />
      <div className="p-4 text-center">
        <h3 className="font-semibold text-gray-900 text-lg">{author.name}</h3>
        <button
          onClick={handleInspectAuthor}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          Yazarı İncele
        </button>
      </div>
    </div>
  );
};

export default AuthorCard;

import React from 'react';
import { usePageAccess } from '../hooks/usePageAccess';
import { Lock } from 'lucide-react';

interface PageAccessGuardProps {
  pageId: string;
  children: React.ReactNode;
}

const PageAccessGuard: React.FC<PageAccessGuardProps> = ({ pageId, children }) => {
  const { hasAccess, loading } = usePageAccess(pageId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erişim Engellendi</h2>
          <p className="text-gray-600 mb-6">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Lütfen kampüs yöneticinizle iletişime geçin.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PageAccessGuard;

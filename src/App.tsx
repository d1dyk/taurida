import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingMiniCart } from './components/FloatingMiniCart';
import { ProductModal } from './components/ProductModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { OrderPage } from './pages/OrderPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { FaqPage } from './pages/FaqPage';
import { AdminPage } from './pages/AdminPage';
import { FurnitureItem, NewsPost, FaqItem, SiteSettingsRow } from './lib/db';
import { Loader2, CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});

  const [products, setProducts] = useState<FurnitureItem[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [settings, setSettings] = useState<SiteSettingsRow | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const { toastMessage, clearToast } = useStore();

  const loadAllData = async () => {
    try {
      const [resProd, resNews, resFaq, resSet] = await Promise.all([
        fetch('/api/furniture'),
        fetch('/api/news'),
        fetch('/api/faq'),
        fetch('/api/site-settings')
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resNews.ok) setNews(await resNews.json());
      if (resFaq.ok) setFaq(await resFaq.json());
      if (resSet.ok) setSettings(await resSet.json());
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    setViewParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-[var(--color-gold)] selection:text-black">
      {/* Top Header */}
      <Header currentView={currentView} settings={settings} onNavigate={handleNavigate} />

      {/* Main View Router */}
      <main className="flex-1">
        {isDataLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 gold-text animate-spin" />
            <span className="text-xs uppercase tracking-widest gold-text">
              Загрузка мануфактуры TAURIDA ATELIER...
            </span>
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomePage
                products={products}
                news={news}
                faq={faq}
                settings={settings}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'catalog' && (
              <CatalogPage
                products={products}
                initialCategory={viewParams.category || 'all'}
              />
            )}

            {currentView === 'order' && (
              <OrderPage
                products={products}
                initialProductIds={viewParams.productIds}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'news' && (
              <NewsPage news={news} onNavigate={handleNavigate} />
            )}

            {currentView === 'news-detail' && (
              <NewsDetailPage
                slug={viewParams.slug || ''}
                news={news}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'faq' && (
              <FaqPage faq={faq} onNavigate={handleNavigate} />
            )}

            {currentView === 'admin' && (
              <AdminPage
                onNavigateHome={() => handleNavigate('home')}
                onRefreshData={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer settings={settings} onNavigate={handleNavigate} />

      {/* Global Interactive Modals & Floating Elements */}
      <FloatingMiniCart currentView={currentView} onNavigate={handleNavigate} />
      <ProductModal onNavigate={handleNavigate} />
      <AdminAuthModal onSuccessNavigate={() => handleNavigate('admin')} />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 animate-fade-in">
          <div className="card-luxury p-3.5 pl-4 pr-5 rounded-xl border border-[var(--color-gold)] flex items-center space-x-3 shadow-2xl gold-glow backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 gold-text shrink-0" />
            <span className="text-xs font-medium text-white">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

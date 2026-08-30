import React from 'react';
import { HeroVideo } from '../components/HeroVideo';
import { CategoriesGrid } from '../components/CategoriesGrid';
import { Advantages } from '../components/Advantages';
import { FeaturedProducts } from '../components/FeaturedProducts';
import { CrimeaMapSection } from '../components/CrimeaMapSection';
import { FurnitureItem, NewsPost, FaqItem, SiteSettingsRow } from '../lib/db';
import { t } from '../lib/content';
import { Send, Phone, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface HomePageProps {
  products: FurnitureItem[];
  news: NewsPost[];
  faq: FaqItem[];
  settings: SiteSettingsRow | null;
  onNavigate: (view: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  news,
  faq,
  settings,
  onNavigate
}) => {
  const [openFaqId, setOpenFaqId] = React.useState<number | null>(faq[0]?.id || null);

  const toggleFaq = (id: number) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const recentNews = news.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      {/* 1. Hero with Video/Poster */}
      <HeroVideo settings={settings} onNavigate={onNavigate} />

      {/* 2. Categories Grid */}
      <CategoriesGrid onSelectCategory={(cat) => onNavigate('catalog', { category: cat })} />

      {/* 3. Advantages (4 Luxury Standards) */}
      <Advantages />

      {/* 4. Featured Flagship Products */}
      <FeaturedProducts products={products} onNavigate={onNavigate} />

      {/* 5. Crimean Geography & Measuring Map */}
      <CrimeaMapSection />

      {/* 6. Recent News & Projects */}
      {recentNews.length > 0 && (
        <section className="py-20 sm:py-24 bg-[#0B0B0B] border-b border-[#2A2A2A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
              <div>
                <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
                  {t.news.title}
                </span>
                <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
                  Обзоры проектов и <span className="italic text-[#C5A059]">тренды</span>
                </h2>
              </div>
              <button
                onClick={() => onNavigate('news')}
                className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#C5A059] hover:text-[#DFBE77] transition-colors mt-4 md:mt-0 font-bold group cursor-pointer"
              >
                <span>Все публикации</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {recentNews.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onNavigate('news-detail', { slug: post.slug })}
                  className="bg-[#111111] border border-[#2A2A2A] hover:border-[#C5A059]/40 group cursor-pointer flex flex-col justify-between transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] bg-[#1A1A1A] overflow-hidden">
                    <img
                      src={post.images[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg'}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-[#666666] uppercase tracking-widest font-mono block mb-1">
                        {new Date(post.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <h3 className="serif text-xl font-normal text-[#F5F5F5] group-hover:text-[#C5A059] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-[#A0A0A0] mt-2 line-clamp-3 leading-relaxed font-light">
                        {post.excerpt}
                      </p>
                    </div>
                    <span className="text-xs text-[#C5A059] font-bold uppercase tracking-wider flex items-center space-x-1.5 pt-4 border-t border-[#2A2A2A]">
                      <span>{t.news.readMore}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. FAQ Accordion */}
      {faq.length > 0 && (
        <section className="py-20 sm:py-24 bg-[#111111] border-b border-[#2A2A2A]">
          <div className="max-w-4xl mx-auto px-4 sm:px-8">
            <div className="text-center mb-16">
              <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
                {t.faq.title}
              </span>
              <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
                Часто задаваемые <span className="italic text-[#C5A059]">вопросы</span>
              </h2>
            </div>

            <div className="space-y-4">
              {faq.slice(0, 6).map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#C5A059]/30 transition-all duration-200"
                  >
                    <button
                      onClick={() => toggleFaq(item.id)}
                      className="w-full p-6 text-left flex items-center justify-between space-x-4 cursor-pointer"
                    >
                      <span className="serif text-lg sm:text-xl text-[#F5F5F5] font-normal">
                        {item.question}
                      </span>
                      <span className="p-1.5 bg-[#111111] text-[#C5A059] border border-[#2A2A2A] shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-xs sm:text-sm text-[#A0A0A0] leading-relaxed border-t border-[#2A2A2A] pt-4 font-light">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 8. Bottom CTA Banner */}
      <section className="py-20 sm:py-24 bg-[#0B0B0B] border-b border-[#2A2A2A] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center space-y-6">
          <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] block">
            Индивидуальное проектирование
          </span>
          <h2 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light leading-tight">
            Воплотим интерьер вашей мечты <br />
            <span className="italic text-[#C5A059]">в реальность</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-xl mx-auto leading-relaxed font-light">
            {t.ctaBottom.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={t.contacts.telegram}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto py-4 px-8 gold-gradient hover:brightness-110 text-black font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-xl gold-glow flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{t.ctaBottom.writeTg}</span>
            </a>

            <a
              href={`tel:${t.contacts.phone.replace(/[^\d+]/g, '')}`}
              className="w-full sm:w-auto py-4 px-8 bg-[#1A1A1A] border gold-border hover:bg-[#C5A059]/10 text-[#F5F5F5] hover:text-[#C5A059] text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Phone className="w-4 h-4 text-[#C5A059]" />
              <span>{t.ctaBottom.callUs}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

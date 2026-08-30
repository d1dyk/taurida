import React from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { NewsPost } from '../lib/db';
import { t } from '../lib/content';

interface NewsPageProps {
  news: NewsPost[];
  onNavigate: (view: string, params?: any) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ news, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-8">
          <span className="text-xs uppercase tracking-[0.4em] text-[#C5A059] font-bold mb-2 block">
            Блог мануфактуры и проекты
          </span>
          <h1 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
            {t.news.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-2 max-w-2xl font-light">
            {t.news.subtitle}
          </p>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((post) => (
            <div
              key={post.id}
              onClick={() => onNavigate('news-detail', { slug: post.slug })}
              className="bg-[#111111] border border-[#2A2A2A] hover:border-[#C5A059]/40 group cursor-pointer flex flex-col justify-between transition-all duration-300"
            >
              <div className="relative aspect-[16/10] bg-[#1A1A1A] overflow-hidden">
                <img
                  src={post.images?.[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg'}
                  alt={post.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                  loading="lazy"
                />
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[10px] text-[#666666] font-mono mb-2 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{new Date(post.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <h3 className="serif text-xl font-normal text-[#F5F5F5] group-hover:text-[#C5A059] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-[#A0A0A0] mt-2.5 line-clamp-3 leading-relaxed font-light">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
                  <span className="text-xs text-[#C5A059] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <span>{t.news.readMore}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

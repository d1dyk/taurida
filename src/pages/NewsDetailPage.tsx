import React from 'react';
import { ArrowLeft, Calendar, Share2, Shield } from 'lucide-react';
import { NewsPost } from '../lib/db';
import { t } from '../lib/content';

interface NewsDetailPageProps {
  slug: string;
  news: NewsPost[];
  onNavigate: (view: string) => void;
}

export const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ slug, news, onNavigate }) => {
  const post = news.find(n => n.slug === slug) || news[0];

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] py-20 text-center">
        <p className="text-[#A0A0A0]">Статья не найдена</p>
        <button
          onClick={() => onNavigate('news')}
          className="mt-4 py-3 px-6 gold-gradient text-black text-xs font-bold uppercase tracking-widest"
        >
          {t.news.backToList}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Back Button */}
        <button
          onClick={() => onNavigate('news')}
          className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#A0A0A0] hover:text-[#C5A059] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.news.backToList}</span>
        </button>

        {/* Article Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-xs text-[#666666] font-mono">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{new Date(post.createdAt).toLocaleDateString('ru-RU')}</span>
            </span>
            <span>•</span>
            <span className="text-[#C5A059]">TAURIDA ATELIER Крым</span>
          </div>

          <h1 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light leading-tight">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-[#A0A0A0] leading-relaxed italic border-l-2 border-[#C5A059] pl-4">
            {post.excerpt}
          </p>
        </div>

        {/* Hero image */}
        {post.images?.[0] && (
          <div className="aspect-[16/9] overflow-hidden bg-black/60 border border-[#2A2A2A] shadow-xl">
            <img
              src={post.images[0]}
              alt={post.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Article Body */}
        <div className="text-[#F5F5F5] text-sm sm:text-base leading-relaxed space-y-6 pt-4 font-light">
          {post.content.split('\n\n').map((para, idx) => (
            <p key={idx} className="text-[#A0A0A0] leading-loose">
              {para}
            </p>
          ))}
        </div>

        {/* Secondary Gallery */}
        {post.images && post.images.length > 1 && (
          <div className="pt-8 border-t border-[#2A2A2A] space-y-4">
            <h3 className="serif text-2xl text-[#F5F5F5] font-light">
              Галерея проекта
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {post.images.slice(1).map((img, idx) => (
                <div key={idx} className="aspect-[4/3] overflow-hidden border border-[#2A2A2A]">
                  <img
                    src={img}
                    alt={`Галерея ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA Box */}
        <div className="bg-[#111111] p-8 border border-[#2A2A2A] flex flex-col sm:flex-row items-center justify-between gap-6 mt-12">
          <div className="space-y-1">
            <h4 className="serif text-xl text-[#F5F5F5] font-light">
              Понравились решения в этом проекте?
            </h4>
            <p className="text-xs text-[#666666] font-light">
              Адаптируем дизайн и материалы под планировку вашего дома или виллы.
            </p>
          </div>
          <button
            onClick={() => onNavigate('order')}
            className="py-3 px-6 gold-gradient hover:brightness-110 text-black font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer"
          >
            Рассчитать проект
          </button>
        </div>
      </div>
    </div>
  );
};

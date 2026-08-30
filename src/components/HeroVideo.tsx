import React, { useState, useEffect } from 'react';
import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { t } from '../lib/content';
import { SiteSettingsRow } from '../lib/db';

interface HeroVideoProps {
  settings?: SiteSettingsRow | null;
  onNavigate: (view: string) => void;
}

export const HeroVideo: React.FC<HeroVideoProps> = ({ settings, onNavigate }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasVideo = !!(settings?.heroVideoWebm || settings?.heroVideoMp4);
  const disableVideoOnMobile = settings?.heroDisableMobileVideo ?? true;
  const shouldRenderVideo = hasVideo && !(isMobile && disableVideoOnMobile);

  const posterUrl = settings?.heroPoster || '/src/assets/images/hero_luxury_interior_1787434163465.jpg';
  const heroTitle = settings?.heroTitle || 'Искусство комфорта на заказ';
  const heroSubtitle = settings?.heroSubtitle || t.hero.subtitle;

  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex items-center justify-between px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-[#2A2A2A] bg-[#0B0B0B]">
      {/* Background Media & Geometric Dark Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {shouldRenderVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={posterUrl}
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 opacity-35"
          >
            {settings?.heroVideoWebm && <source src={settings.heroVideoWebm} type="video/webm" />}
            {settings?.heroVideoMp4 && <source src={settings.heroVideoMp4} type="video/mp4" />}
          </video>
        ) : (
          <img
            src={posterUrl}
            alt="TAURIDA ATELIER Luxury Furniture"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30 scale-105"
            loading="eager"
          />
        )}

        {/* Sophisticated Dark Overlays with Skewed Luxury Accent */}
        <div className="absolute inset-0 bg-[#0B0B0B]/85" />
        <div className="hidden lg:block absolute right-0 bottom-0 top-0 w-1/2 bg-[#111111]/80 transform skew-x-[-12deg] translate-x-28 border-l border-[#2A2A2A]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-[#0B0B0B]/60" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-3xl py-20 lg:py-28">
        {/* Prestige Sub-badge */}
        <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-5 block">
          Собственное производство в Севастополе • Фиолентовское шоссе, 11Б
        </span>

        {/* Display Heading */}
        <h1 className="serif text-4xl sm:text-6xl lg:text-7xl font-light text-[#F5F5F5] leading-[1.08] mb-6 tracking-tight">
          Искусство <br className="hidden sm:inline" />
          комфорта <span className="italic text-[#C5A059]">на заказ</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-[#A0A0A0] font-light max-w-xl leading-relaxed mb-10">
          {heroSubtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
          <button
            onClick={() => onNavigate('catalog')}
            className="px-8 py-4 gold-gradient text-black font-bold uppercase text-xs tracking-widest hover:brightness-110 transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-xl gold-glow"
          >
            <span>Смотреть каталог</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('order')}
            className="px-8 py-4 border gold-border text-[#F5F5F5] font-bold uppercase text-xs tracking-widest hover:bg-[#C5A059]/10 hover:text-[#C5A059] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <Compass className="w-4 h-4 text-[#C5A059]" />
            <span>Рассчитать проект</span>
          </button>
        </div>

        {/* Measuring Offer Note */}
        <div className="inline-flex items-center space-x-2.5 text-xs text-[#666666]">
          <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
          <span>{t.hero.measuringOffer}</span>
        </div>
      </div>

      {/* Floating Prestige Side Stats on Large Screens */}
      <div className="hidden lg:flex relative z-10 flex-col gap-10 pr-4 xl:pr-12">
        <div className="text-right glass-card p-6 rounded-lg border-l-2 border-l-[#C5A059]">
          <p className="text-3xl xl:text-4xl serif text-[#C5A059] italic font-medium">Blum / Hettich</p>
          <p className="text-[#A0A0A0] text-[10px] uppercase tracking-widest font-semibold mt-1">
            Австрийская фурнитура высшего класса
          </p>
        </div>

        <div className="text-right glass-card p-6 rounded-lg border-l-2 border-l-[#C5A059]">
          <p className="text-3xl xl:text-4xl serif text-[#C5A059] font-medium">от 14 дней</p>
          <p className="text-[#A0A0A0] text-[10px] uppercase tracking-widest font-semibold mt-1">
            Срок изготовления на фабрике
          </p>
        </div>

        <div className="text-right glass-card p-6 rounded-lg border-l-2 border-l-[#C5A059]">
          <p className="text-3xl xl:text-4xl serif text-[#C5A059] font-medium">Севастополь</p>
          <p className="text-[#A0A0A0] text-[10px] uppercase tracking-widest font-semibold mt-1">
            Собственное производство в Крыму
          </p>
        </div>
      </div>
    </section>
  );
};

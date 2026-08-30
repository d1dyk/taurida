import React from 'react';
import { Phone, MapPin, Send, MessageSquare, Shield, Clock } from 'lucide-react';
import { t } from '../lib/content';
import { useAuth } from '../context/AuthContext';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { openAuthModal, isAdmin } = useAuth();

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#2A2A2A] text-[#A0A0A0] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#2A2A2A]">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <span className="serif text-2xl font-bold tracking-tight text-[#C5A059] uppercase block">
              TAURIDA<span className="text-white font-light">ATELIER</span>
            </span>
            <p className="text-xs text-[#666666] leading-relaxed">
              {t.brand.shortDesc}
            </p>
            <div className="pt-2 flex items-center space-x-3">
              <a
                href={t.contacts.telegram}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#A0A0A0] hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href={t.contacts.vk}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#A0A0A0] hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-colors"
                title="VK"
              >
                <span className="text-xs font-bold">VK</span>
              </a>
              <a
                href={t.contacts.max}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#A0A0A0] hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-colors"
                title="MAX"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation & Sections */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#F5F5F5] font-bold mb-4">
              Навигация
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A0A0A0]">
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-[#C5A059] transition-colors cursor-pointer"
                >
                  Каталог мебели
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('order')}
                  className="hover:text-[#C5A059] transition-colors cursor-pointer"
                >
                  {t.nav.order}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('news')}
                  className="hover:text-[#C5A059] transition-colors cursor-pointer"
                >
                  {t.nav.news} и статьи
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="hover:text-[#C5A059] transition-colors cursor-pointer"
                >
                  {t.nav.faq}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Crimean Geography */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#F5F5F5] font-bold mb-4">
              География Крыма
            </h4>
            <p className="text-xs text-[#666666] mb-2">
              Выезд на замер и доставка по Крыму:
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {t.geography.cities.map((c) => (
                <span
                  key={c.name}
                  className="px-2 py-1 rounded-sm bg-[#111111] border border-[#2A2A2A] text-[#A0A0A0] whitespace-nowrap"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Col 4: Contacts & Production */}
          <div className="space-y-3 text-xs">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#F5F5F5] font-bold mb-4">
              Контакты ателье
            </h4>
            <div className="flex items-start space-x-2.5">
              <Phone className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
              <div>
                <a
                  href={`tel:${t.contacts.phone.replace(/[^\d+]/g, '')}`}
                  className="text-[#F5F5F5] font-medium hover:text-[#C5A059] block tabular-nums"
                >
                  {t.contacts.phone}
                </a>
                <span className="text-[11px] text-[#666666]">{t.contacts.phoneLabel}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 pt-1">
              <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-1 text-[#A0A0A0]">
                <p className="text-[#F5F5F5] font-medium">{t.contacts.addressSevastopol}</p>
                <p className="text-[10px] text-[#666666]">Работаем и доставляем по всему Крыму</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 pt-1 text-[11px] text-[#666666]">
              <Clock className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>{t.contacts.workingHours}</span>
            </div>
          </div>
        </div>

        {/* Bottom Prestige Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#666666] uppercase tracking-[0.2em] gap-4">
          <div>
            © {new Date().getFullYear()} {t.brand.name}. PREMIUM FURNITURE SOLUTIONS.
          </div>

          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Производство в Севастополе • Доставка по всему Крыму</span>
            </span>

            {/* Admin entry point button */}
            <button
              onClick={isAdmin ? () => onNavigate('admin') : openAuthModal}
              className="text-[#666666] hover:text-[#C5A059] transition-colors underline underline-offset-4 cursor-pointer"
            >
              {isAdmin ? 'Админ-панель' : 'Управление'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { ShoppingBag, Settings, Menu, X, Phone } from 'lucide-react';
import { t } from '../lib/content';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { SiteSettingsRow } from '../lib/db';

interface HeaderProps {
  currentView: string;
  settings?: SiteSettingsRow | null;
  onNavigate: (view: string, params?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, settings, onNavigate }) => {
  const { selectedProductIds } = useStore();
  const { isAdmin, handleLogoClick } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayPhone = settings?.phone || t.contacts.phone;
  const displayAddress = settings?.addressSevastopol || 'Севастополь, Фиолентовское ш., 11Б';

  const navItems = [
    { key: 'home', label: t.nav.home },
    { key: 'catalog', label: t.nav.catalog },
    { key: 'news', label: t.nav.news },
    { key: 'faq', label: t.nav.faq }
  ];

  const handleNavClick = (key: string) => {
    setMobileMenuOpen(false);
    onNavigate(key);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all duration-200 border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Zone (Single text element with Easter Egg click handler) */}
        <div
          onClick={handleLogoClick}
          className="cursor-pointer select-none py-1 group shrink-0"
          title="Секретный доступ в управление (5 быстрых кликов)"
        >
          <span className="serif text-2xl sm:text-3xl font-bold tracking-tight text-[#C5A059] whitespace-nowrap">
            TAURIDA<span className="text-white font-light">ATELIER</span>
          </span>
        </div>

        {/* Navigation Links Zone (4-6 links, single line) */}
        <nav className="hidden lg:flex items-center space-x-8 text-xs uppercase tracking-widest font-semibold text-[#A0A0A0]">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`transition-colors duration-200 whitespace-nowrap cursor-pointer hover:text-[#C5A059] ${
                currentView === item.key
                  ? 'text-[#C5A059] border-b border-[#C5A059] pb-0.5'
                  : 'text-[#A0A0A0]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Primary Action Zone */}
        <div className="flex items-center space-x-4 sm:space-x-6 shrink-0">
          {/* Direct phone / city on desktop */}
          <div className="hidden xl:block text-right">
            <p className="text-[10px] text-[#666666] uppercase tracking-widest font-semibold truncate max-w-[260px]">
              {displayAddress}
            </p>
            <a
              href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`}
              className="text-xs sm:text-sm font-medium text-[#F5F5F5] hover:text-[#C5A059] transition-colors tabular-nums"
            >
              {displayPhone}
            </a>
          </div>

          {/* Admin Indicator (Visible when authenticated) */}
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`w-9 h-9 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                currentView === 'admin'
                  ? 'bg-[#C5A059] text-black border-[#C5A059]'
                  : 'border gold-border text-[#C5A059] hover:bg-[#C5A059]/10'
              }`}
              title={t.nav.admin}
              aria-label={t.nav.admin}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Cart / Order CTA Button */}
          <button
            onClick={() => onNavigate('order')}
            className={`relative flex items-center space-x-2 py-2.5 px-4 sm:px-5 text-xs font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap cursor-pointer ${
              selectedProductIds.length > 0
                ? 'gold-gradient text-black shadow-lg gold-glow hover:brightness-110'
                : 'border gold-border text-[#F5F5F5] hover:bg-[#C5A059]/10 hover:text-[#C5A059]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.nav.order}</span>
            {selectedProductIds.length > 0 && (
              <span className="ml-1 bg-black text-[#C5A059] text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                {selectedProductIds.length}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#A0A0A0] hover:text-white focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-panel border-t border-[#2A2A2A] px-6 pt-4 pb-6 space-y-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`text-left py-2 px-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
                  currentView === item.key
                    ? 'bg-[#1A1A1A] text-[#C5A059]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}

            {isAdmin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('admin');
                }}
                className="text-left py-2 px-3 text-xs uppercase tracking-widest text-[#C5A059] font-bold flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>{t.nav.admin}</span>
              </button>
            )}

            <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs text-[#666666]">
              <span className="uppercase tracking-widest text-[10px] truncate max-w-[180px]">{displayAddress}</span>
              <a href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`} className="text-[#C5A059] font-medium">
                {displayPhone}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

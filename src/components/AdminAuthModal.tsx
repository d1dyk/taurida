import React, { useState } from 'react';
import { X, Lock, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/content';

interface AdminAuthModalProps {
  onSuccessNavigate?: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ onSuccessNavigate }) => {
  const { isAuthModalOpen, closeAuthModal, login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Заполните логин и пароль');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await login(username, password);
    setIsSubmitting(false);

    if (res.success) {
      setPassword('');
      if (onSuccessNavigate) {
        onSuccessNavigate();
      }
    } else {
      setErrorMsg(res.error || 'Ошибка входа');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md bg-[#111111] border border-[#C5A059]/40 p-8 shadow-2xl space-y-6 gold-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#666666] hover:text-white transition-colors cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#1A1A1A] border border-[#C5A059]/30 flex items-center justify-center mx-auto text-[#C5A059]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="serif text-2xl text-[#F5F5F5] font-light">
            {t.admin.loginTitle}
          </h3>
          <p className="text-xs text-[#A0A0A0] leading-relaxed font-light">
            {t.admin.loginDesc}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-sm bg-red-950/40 border border-red-500/30 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-[#A0A0A0] uppercase tracking-widest block mb-1.5 font-bold">
              {t.admin.loginField}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#A0A0A0] uppercase tracking-widest block mb-1.5 font-bold">
              {t.admin.passwordField}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 gold-gradient hover:brightness-110 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg gold-glow cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Проверка...</span>
                </>
              ) : (
                <>
                  <span>{t.admin.loginBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-2 flex items-center justify-center space-x-1.5 text-[10px] text-[#666666] uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Защищенный шлюз (Bcrypt + JWT)</span>
        </div>
      </div>
    </div>
  );
};

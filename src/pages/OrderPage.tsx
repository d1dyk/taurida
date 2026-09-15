import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowLeft, Send, CheckCircle2, AlertCircle, Trash2, ShieldCheck, Ruler, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';
import { FurnitureItem } from '../lib/db';
import { t, fmtPrice } from '../lib/content';

interface OrderPageProps {
  products: FurnitureItem[];
  onNavigate: (view: string, params?: any) => void;
  directProductIds?: string;
  initialProductIds?: string;
}

export const OrderPage: React.FC<OrderPageProps> = ({
  products,
  onNavigate,
  directProductIds,
  initialProductIds
}) => {
  const { selectedProductIds, removeFromOrder, clearOrder, addToOrder } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [comment, setComment] = useState('');
  const [preferredContact, setPreferredContact] = useState<'max' | 'whatsapp' | 'call'>('max');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If navigated with directProductIds or initialProductIds query
  const rawProductIds = directProductIds || initialProductIds;
  useEffect(() => {
    if (rawProductIds) {
      const ids = rawProductIds.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      ids.forEach(id => {
        const prod = products.find(p => p.id === id);
        if (prod) addToOrder(prod);
      });
    }
  }, [rawProductIds, products, addToOrder]);

  const selectedItems = products.filter(p => selectedProductIds.includes(p.id));
  const estimatedTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || customerName.trim().length < 2) {
      setErrorMessage('Пожалуйста, укажите Ваше имя (не менее 2 символов)');
      return;
    }

    if (!customerPhone || customerPhone.replace(/[^\d+]/g, '').length < 7) {
      setErrorMessage('Укажите корректный контактный номер телефона');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          productIds: selectedProductIds.join(', '),
          comment: `[Канал: ${preferredContact}] ${comment}`.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success || data.id || data.orderId)) {
        const orderId = data.orderId || data.id || 1;
        setOrderSuccess(orderId);
        clearOrder();
      } else {
        setErrorMessage(data.error || 'Произошла ошибка при отправке заявки');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка сети при отправке заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[80vh] bg-[#0B0B0B] py-20 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-[#111111] border border-[#C5A059] p-8 sm:p-12 text-center space-y-6 shadow-2xl gold-glow">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#C5A059] flex items-center justify-center mx-auto text-[#C5A059]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-[10px] text-[#C5A059] uppercase tracking-[0.3em] font-bold block">
            Заявка зарегистрирована
          </span>

          <h2 className="serif text-3xl sm:text-4xl text-[#F5F5F5] font-light">
            {t.order.orderSuccessNum}{orderSuccess} принят
          </h2>

          <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed font-light">
            {t.order.orderSuccessDesc}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('home')}
              className="py-3 px-6 gold-gradient text-black text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              На главную
            </button>
            <button
              onClick={() => onNavigate('catalog')}
              className="py-3 px-6 bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] text-xs font-bold uppercase tracking-widest hover:border-[#C5A059]/40 cursor-pointer"
            >
              {t.order.backToCatalog}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
        {/* Back navigation */}
        <button
          onClick={() => onNavigate('catalog')}
          className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#A0A0A0] hover:text-[#C5A059] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.order.backToCatalog}</span>
        </button>

        {/* Header */}
        <div className="border-b border-[#2A2A2A] pb-8">
          <span className="text-[#C5A059] text-xs font-bold uppercase tracking-[0.4em] mb-2 block">
            Индивидуальный расчет проекта
          </span>
          <h1 className="serif text-3xl sm:text-5xl text-[#F5F5F5] font-light">
            {t.order.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-2 font-light">
            {t.order.subtitle}
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-[#111111] p-6 sm:p-8 border border-[#2A2A2A]">
            <h3 className="serif text-2xl text-[#F5F5F5] font-light mb-6">
              Контактные данные
            </h3>

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold block mb-2">
                  {t.order.formName}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.order.formNamePlaceholder}
                  className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold block mb-2">
                  {t.order.formPhone}
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t.order.formPhonePlaceholder}
                  className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold block mb-2">
                  {t.order.formEmail}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t.order.formEmailPlaceholder}
                  className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors font-mono"
                />
              </div>

              {/* Preferred messenger */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold block mb-2">
                  Удобный способ связи
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'max', label: 'MAX' },
                    { key: 'whatsapp', label: 'WhatsApp' },
                    { key: 'call', label: 'Звонок' }
                  ].map((chan) => (
                    <button
                      type="button"
                      key={chan.key}
                      onClick={() => setPreferredContact(chan.key as any)}
                      className={`py-2.5 px-3 text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                        preferredContact === chan.key
                          ? 'bg-[#C5A059] text-black border-[#C5A059]'
                          : 'bg-[#1A1A1A] text-[#A0A0A0] border-[#2A2A2A] hover:border-[#C5A059]/40'
                      }`}
                    >
                      {chan.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold block mb-2">
                  {t.order.formComment}
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.order.formCommentPlaceholder}
                  className="w-full py-3 px-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#C5A059] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 gold-gradient hover:brightness-110 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-xl gold-glow flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? t.order.submitting : t.order.submitButton}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#111111] p-6 sm:p-8 border border-[#2A2A2A] space-y-6">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
                <h3 className="serif text-xl text-[#F5F5F5] font-light">
                  {t.order.selectedProducts} ({selectedItems.length})
                </h3>
                {selectedItems.length > 0 && (
                  <button
                    onClick={clearOrder}
                    className="text-[10px] uppercase tracking-widest text-[#666666] hover:text-red-400 transition-colors"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {selectedItems.length > 0 ? (
                <div className="divide-y divide-[#2A2A2A] max-h-72 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <img
                          src={item.images?.[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg'}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover border border-[#2A2A2A] shrink-0"
                          loading="lazy"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-mono text-[#C5A059] block">
                            Арт. №{item.id}
                          </span>
                          <h4 className="text-xs text-[#F5F5F5] truncate">{item.name}</h4>
                          <span className="text-xs font-semibold text-[#A0A0A0]">
                            {fmtPrice(item.price)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromOrder(item.id)}
                        className="p-1.5 text-[#666666] hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#666666] space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-[#2A2A2A]" />
                  <p>{t.order.noProductsSelected}</p>
                  <p className="text-[11px] text-[#A0A0A0]">
                    Вы можете оформить заявку на индивидуальный дизайн-проект с нуля.
                  </p>
                </div>
              )}

              {selectedItems.length > 0 && (
                <div className="pt-4 border-t border-[#2A2A2A] flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                    Ориентировочная сумма:
                  </span>
                  <span className="serif text-2xl text-[#C5A059] font-medium">
                    {fmtPrice(estimatedTotal)}
                  </span>
                </div>
              )}
            </div>

            {/* Guarantee Box */}
            <div className="bg-[#111111] p-6 border border-[#2A2A2A] space-y-3 text-xs text-[#A0A0A0]">
              <div className="flex items-center space-x-2 text-[#C5A059] font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Сервис под ключ в Крыму</span>
              </div>
              <ul className="space-y-2 text-[11px] text-[#666666] list-disc list-inside">
                <li>Выезд мастера на замер после обсуждения проекта (расчет от Севастополя)</li>
                <li>3D-визуализация и точная сметная спецификация</li>
                <li>Доставка собственным транспортом и бережный монтаж</li>
                <li>Официальный договор и фиксированная смета</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

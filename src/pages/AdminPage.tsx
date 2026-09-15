import React, { useState, useEffect } from 'react';
import {
  Package,
  ClipboardList,
  Newspaper,
  HelpCircle,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Download,
  Upload,
  LogOut,
  CheckCircle,
  CheckCircle2,
  Check,
  X,
  Star,
  Send,
  Loader2,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  MessageCircle,
  Database,
  Terminal,
  HardDrive,
  Play,
  RefreshCw,
  FileCode,
  Server,
  AlertCircle,
  Bot,
  ExternalLink,
  Info,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../store/useStore';
import { authFetch, downloadAdminFile } from '../lib/api-client';
import { FurnitureItem, Order, NewsPost, FaqItem, SiteSettingsRow, DatabaseStats, SqlQueryResult } from '../lib/db';
import { t, fmtPrice, getCategoryTitle } from '../lib/content';

interface AdminPageProps {
  onNavigateHome: () => void;
  onRefreshData: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome, onRefreshData }) => {
  const { isAdmin, logout, openAuthModal } = useAuth();
  const { showToast } = useStore();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'news' | 'faq' | 'settings' | 'database'>('products');

  // State collections
  const [products, setProducts] = useState<FurnitureItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [settings, setSettings] = useState<SiteSettingsRow | null>(null);

  // SQLite Database & Backups state
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM furniture ORDER BY id DESC LIMIT 10;');
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('furniture');

  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Expandable comments state for orders
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [copiedCommentId, setCopiedCommentId] = useState<number | null>(null);

  // Drawer / Modal states for CRUD
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<FurnitureItem> | null>(null);

  const [isNewsDrawerOpen, setIsNewsDrawerOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<Partial<NewsPost> | null>(null);

  const [isFaqDrawerOpen, setIsFaqDrawerOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [testNotificationResult, setTestNotificationResult] = useState<string | null>(null);
  const [testNotificationDetails, setTestNotificationDetails] = useState<{
    maxSent?: boolean;
    maxMessage?: string;
    telegramSent?: boolean;
    telegramMessage?: string;
    smsSent?: boolean;
    smsMessage?: string;
  } | null>(null);

  const [isVerifyingMax, setIsVerifyingMax] = useState(false);
  const [maxVerifyResult, setMaxVerifyResult] = useState<{
    ok: boolean;
    bot?: { username?: string; name?: string };
    channel?: { id?: string | number; title?: string };
    webhook?: { url: string; status: string };
    error?: string;
    hint?: string;
  } | null>(null);

  const [isVerifyingTelegram, setIsVerifyingTelegram] = useState(false);
  const [telegramVerifyResult, setTelegramVerifyResult] = useState<{
    ok: boolean;
    bot?: { id: number; username: string; firstName: string };
    chat?: { id: string | number; title?: string; username?: string; type?: string };
    error?: string;
    hint?: string;
  } | null>(null);

  // Fetch all admin data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resProd, resOrd, resNews, resFaq, resSet] = await Promise.all([
        authFetch('/api/furniture'),
        authFetch('/api/orders'),
        authFetch('/api/news'),
        authFetch('/api/faq'),
        authFetch('/api/site-settings')
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resOrd.ok) setOrders(await resOrd.json());
      if (resNews.ok) setNews(await resNews.json());
      if (resFaq.ok) setFaq(await resFaq.json());
      if (resSet.ok) setSettings(await resSet.json());
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  /* =========================================================================
     PRODUCT ACTIONS
     ========================================================================= */
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.category || editingProduct?.price === undefined) {
      alert('Заполните обязательные поля');
      return;
    }

    try {
      const method = editingProduct.id ? 'PUT' : 'POST';
      const url = editingProduct.id ? `/api/furniture/${editingProduct.id}` : '/api/furniture';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });

      if (res.ok) {
        notify(editingProduct.id ? 'Изделие обновлено' : 'Изделие создано');
        setIsProductDrawerOpen(false);
        setEditingProduct(null);
        fetchData();
        onRefreshData();
      } else {
        const d = await res.json();
        alert(d.error || 'Ошибка сохранения');
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка сети');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm(`Удалить изделие Арт. №${id}?`)) return;
    try {
      const res = await authFetch(`/api/furniture/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify(`Изделие Арт. №${id} удалено`);
        fetchData();
        onRefreshData();
      }
    } catch (e) {
      alert('Ошибка при удалении');
    }
  };

  const handleDuplicateProduct = async (id: number) => {
    try {
      const res = await authFetch(`/api/furniture/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        notify('Копия изделия успешно создана');
        fetchData();
        onRefreshData();
      }
    } catch (e) {
      alert('Ошибка дублирования');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: 'products' | 'news' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authFetch(`/api/upload?folder=${folder}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.url) {
        notify('Файл успешно загружен');
        if (folder === 'products' && editingProduct) {
          const isVid = data.url.endsWith('.webm') || data.url.endsWith('.mp4');
          if (isVid) {
            setEditingProduct({
              ...editingProduct,
              videos: [...(editingProduct.videos || []), data.url]
            });
          } else {
            setEditingProduct({
              ...editingProduct,
              images: [...(editingProduct.images || []), data.url]
            });
          }
        } else if (folder === 'news' && editingNews) {
          setEditingNews({
            ...editingNews,
            images: [...(editingNews.images || []), data.url]
          });
        } else if (folder === 'hero' && settings) {
          setSettings({
            ...settings,
            heroPoster: data.url
          });
        }
      } else {
        alert(data.error || 'Ошибка загрузки файла');
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка сети при загрузке');
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================================================================
     ORDER ACTIONS
     ========================================================================= */
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        notify(`Статус заказа #${orderId} изменен на "${newStatus}"`);
        setOrders(orders.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
      }
    } catch (e) {
      alert('Ошибка изменения статуса');
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm(`Удалить заказ #${orderId}?`)) return;
    try {
      const res = await authFetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        notify(`Заказ #${orderId} удален`);
        setOrders(orders.filter(o => o.id !== orderId));
      }
    } catch (e) {
      alert('Ошибка при удалении заказа');
    }
  };

  const handleExportOrdersCsv = async () => {
    try {
      notify('Экспорт заявок в CSV...');
      await downloadAdminFile('/api/orders-export/csv', `taurida_orders_${new Date().toISOString().slice(0, 10)}.csv`);
      notify('CSV файл успешно выгружен');
    } catch (e: any) {
      alert('Ошибка экспорта CSV: ' + (e.message || String(e)));
    }
  };

  const toggleCommentExpanded = (orderId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const toggleAllComments = (expand: boolean) => {
    const next: Record<number, boolean> = {};
    if (expand) {
      orders.forEach((o) => {
        if (o.comment) next[o.id] = true;
      });
    }
    setExpandedComments(next);
  };

  const handleCopyComment = async (orderId: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommentId(orderId);
      notify('Текст сообщения скопирован');
      setTimeout(() => setCopiedCommentId(null), 2500);
    } catch (err) {
      notify('Не удалось скопировать текст');
    }
  };

  const parseOrderComment = (raw?: string) => {
    if (!raw) return { channel: null, text: '' };
    const trimmed = raw.trim();
    const channelMatch = trimmed.match(/^\[Канал:\s*([^\]]+)\]\s*/i);
    if (channelMatch) {
      return {
        channel: channelMatch[1].trim(),
        text: trimmed.slice(channelMatch[0].length).trim()
      };
    }
    return { channel: null, text: trimmed };
  };

  /* =========================================================================
     NEWS ACTIONS
     ========================================================================= */
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews?.title || !editingNews?.content) {
      alert('Заполните заголовок и текст статьи');
      return;
    }

    try {
      const method = editingNews.id ? 'PUT' : 'POST';
      const url = editingNews.id ? `/api/news/${editingNews.id}` : '/api/news';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingNews)
      });

      if (res.ok) {
        notify('Статья сохранена');
        setIsNewsDrawerOpen(false);
        setEditingNews(null);
        fetchData();
      }
    } catch (e) {
      alert('Ошибка сохранения статьи');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!confirm('Удалить эту статью?')) return;
    try {
      const res = await authFetch(`/api/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Статья удалена');
        fetchData();
      }
    } catch (e) {
      alert('Ошибка при удалении');
    }
  };

  /* =========================================================================
     FAQ ACTIONS
     ========================================================================= */
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq?.question || !editingFaq?.answer) {
      alert('Заполните вопрос и ответ');
      return;
    }

    try {
      const method = editingFaq.id ? 'PUT' : 'POST';
      const url = editingFaq.id ? `/api/faq/${editingFaq.id}` : '/api/faq';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFaq)
      });

      if (res.ok) {
        notify('Вопрос сохранен');
        setIsFaqDrawerOpen(false);
        setEditingFaq(null);
        fetchData();
      }
    } catch (e) {
      alert('Ошибка сохранения FAQ');
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      const res = await authFetch(`/api/faq/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Вопрос удален');
        fetchData();
      }
    } catch (e) {
      alert('Ошибка удаления FAQ');
    }
  };

  /* =========================================================================
     SETTINGS ACTIONS
     ========================================================================= */
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    setIsSavingSettings(true);
    setSettingsSaveSuccess(false);

    try {
      const res = await authFetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.id) {
          setSettings(updated);
        }
        notify('Настройки сайта успешно сохранены и применены');
        showToast('Настройки сайта успешно обновлены в SQLite!');
        setSettingsSaveSuccess(true);
        onRefreshData();
        setTimeout(() => setSettingsSaveSuccess(false), 4000);
      } else {
        notify('Ошибка сервера при сохранении настроек');
      }
    } catch (e) {
      notify('Ошибка сохранения настроек');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleVerifyMax = async () => {
    if (!settings?.maxWebhookUrl?.trim() && !settings?.maxBotToken?.trim()) {
      notify('Сначала введите MAX Webhook URL или токен бота');
      return;
    }

    setIsVerifyingMax(true);
    setMaxVerifyResult(null);

    try {
      const res = await authFetch('/api/site-settings/verify-max', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.maxBotToken,
          chatId: settings.maxChatId,
          webhookUrl: settings.maxWebhookUrl
        })
      });

      const d = await res.json();
      setMaxVerifyResult(d);

      if (d.ok) {
        notify('Шлюз MAX успешно проверен и подключен!');
        showToast('Шлюз мессенджера MAX подключен!');
      } else {
        notify(d.error || 'Ошибка проверки шлюза MAX');
      }
    } catch (e) {
      setMaxVerifyResult({
        ok: false,
        error: 'Ошибка соединения с сервером',
        hint: 'Проверьте доступность интернета и повторите попытку.'
      });
    } finally {
      setIsVerifyingMax(false);
    }
  };

  const handleVerifyTelegram = async () => {
    if (!settings?.telegramBotToken?.trim()) {
      notify('Сначала введите токен Telegram бота');
      return;
    }

    setIsVerifyingTelegram(true);
    setTelegramVerifyResult(null);

    try {
      const res = await authFetch('/api/site-settings/verify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.telegramBotToken,
          chatId: settings.telegramChatId
        })
      });

      const d = await res.json();
      setTelegramVerifyResult(d);

      if (d.ok) {
        notify(`Бот найден: @${d.bot?.username || 'Telegram Bot'}`);
        showToast(`Бот @${d.bot?.username} успешно подключен!`);
      } else {
        notify(d.error || 'Ошибка проверки Telegram бота');
      }
    } catch (e) {
      setTelegramVerifyResult({
        ok: false,
        error: 'Ошибка соединения с сервером',
        hint: 'Проверьте доступность интернета и повторите попытку.'
      });
    } finally {
      setIsVerifyingTelegram(false);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationResult('Отправка тестового уведомления...');
    setTestNotificationDetails(null);

    try {
      const res = await authFetch('/api/site-settings/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings || {})
      });
      const d = await res.json();
      if (res.ok) {
        setTestNotificationDetails(d);
        setTestNotificationResult(
          `MAX: ${d.maxSent ? '✅ Доставлено' : '⚠️ ' + (d.maxMessage || 'Пропущено')} | SMS: ${d.smsSent ? '✅ Отправлено' : '⚠️ ' + (d.smsMessage || 'Пропущено')}`
        );
        if (d.maxSent) {
          showToast('Тестовое уведомление успешно доставлено в MAX!');
        } else if (d.telegramSent) {
          showToast('Тестовое уведомление доставлено в Telegram!');
        }
      } else {
        setTestNotificationResult('Ошибка тестовой отправки');
      }
    } catch (e) {
      setTestNotificationResult('Ошибка соединения с сервером');
    }
  };

  /* =========================================================================
     SQLITE DATABASE & BACKUP ACTIONS
     ========================================================================= */
  const fetchDbStats = async () => {
    try {
      const res = await authFetch('/api/database/stats');
      if (res.ok) {
        const stats = await res.json();
        setDbStats(stats);
      }
    } catch (e) {
      console.error('Failed to load database stats:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'database' && isAdmin) {
      fetchDbStats();
      if (!queryResult) {
        handleRunQuery('SELECT * FROM furniture ORDER BY id DESC LIMIT 10;');
      }
    }
  }, [activeTab, isAdmin]);

  const handleRunQuery = async (customSql?: string) => {
    const queryToExecute = customSql !== undefined ? customSql : sqlQuery;
    if (!queryToExecute.trim()) return;

    setIsQueryRunning(true);
    try {
      const res = await authFetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToExecute })
      });

      const data: SqlQueryResult = await res.json();
      setQueryResult(data);
      if (data.success && !customSql) {
        fetchDbStats();
      }
    } catch (e: any) {
      setQueryResult({
        success: false,
        error: e.message || 'Ошибка сети при выполнении запроса',
        executionTimeMs: 0
      });
    } finally {
      setIsQueryRunning(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      notify('Подготовка .sqlite бэкапа...');
      await downloadAdminFile('/api/database/backup', `taurida_backup_${new Date().toISOString().slice(0, 10)}.sqlite`);
      notify('Резервная копия .sqlite успешно скачана');
    } catch (e: any) {
      alert('Ошибка при скачивании бэкапа: ' + (e.message || String(e)));
    }
  };

  const handleDownloadSqlDump = async () => {
    try {
      notify('Подготовка SQL-дампа...');
      await downloadAdminFile('/api/database/export-sql', `taurida_dump_${new Date().toISOString().slice(0, 10)}.sql`);
      notify('SQL-дамп успешно скачан');
    } catch (e: any) {
      alert('Ошибка при скачивании дампа: ' + (e.message || String(e)));
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      `Внимание! Восстановление базы данных из файла "${file.name}" заменит текущие данные. Перед восстановлением будет автоматически создана резервная копия. Продолжить?`
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/database/restore', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        notify(result.message || 'База данных успешно восстановлена!');
        fetchData();
        fetchDbStats();
        handleRunQuery('SELECT * FROM furniture ORDER BY id DESC LIMIT 10;');
        onRefreshData();
      } else {
        alert(result.error || 'Ошибка восстановления базы данных');
      }
    } catch (err: any) {
      alert('Ошибка при отправке файла: ' + (err.message || String(err)));
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    const sql = `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 25;`;
    setSqlQuery(sql);
    handleRunQuery(sql);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] py-24 flex items-center justify-center">
        <div className="card-luxury p-10 rounded-2xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] flex items-center justify-center mx-auto text-[var(--color-gold)]">
            <Sliders className="w-8 h-8" />
          </div>
          <h2 className="heading-serif text-3xl text-white font-normal">Панель управления</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Для доступа к управлению заказами и каталогом требуется авторизация.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full py-3 px-6 rounded-full bg-[var(--color-gold)] text-black font-semibold text-xs uppercase tracking-wider cursor-pointer"
          >
            Войти в систему
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] py-8 text-[var(--color-text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Control Banner */}
        <div className="card-luxury p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-[var(--color-border-strong)]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)] text-black flex items-center justify-center font-bold text-xl shadow-lg">
              TA
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest gold-text font-semibold">
                Административный центр
              </span>
              <h1 className="heading-serif text-2xl text-white font-medium">
                {t.brand.name} Control Panel
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateHome}
              className="py-2.5 px-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-white/20 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              Перейти на сайт
            </button>

            <button
              onClick={logout}
              className="py-2.5 px-4 rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-950/60 text-xs text-red-400 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.admin.logoutBtn}</span>
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-gold)] text-white text-xs flex items-center space-x-2 shadow-lg gold-glow animate-fade-in">
            <CheckCircle className="w-4 h-4 gold-text shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Tab Navigation Navigation (Avito style tabs) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{t.admin.tabs.products} ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{t.admin.tabs.orders} ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'news'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>{t.admin.tabs.news} ({news.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.admin.tabs.faq} ({faq.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{t.admin.tabs.settings}</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-medium flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-[var(--color-gold)] text-black font-semibold shadow-md'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>База данных & Бэкапы</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS LIST */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="heading-serif text-2xl text-white font-normal">
                Каталог мебели мануфактуры
              </h3>
              <button
                onClick={() => {
                  setEditingProduct({
                    name: '',
                    category: 'Kuhni',
                    price: 150000,
                    description: '',
                    dimensions: '',
                    material: '',
                    images: [],
                    videos: [],
                    isFeatured: false
                  });
                  setIsProductDrawerOpen(true);
                }}
                className="py-2.5 px-5 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-semibold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.admin.products.add}</span>
              </button>
            </div>

            <div className="card-luxury rounded-2xl overflow-hidden border-[var(--color-border)]">
              <div className="divide-y divide-[var(--color-border)]">
                {products.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-bg-elevated)]/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.images?.[0] || '/src/assets/images/hero_luxury_interior_1787434163465.jpg'}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 bg-black"
                        loading="lazy"
                      />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[11px] font-mono gold-text font-semibold">
                            Арт. №{item.id}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">•</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {getCategoryTitle(item.category)}
                          </span>
                          {item.isFeatured && (
                            <span className="px-2 py-0.5 rounded bg-yellow-950/50 border border-yellow-500/30 text-[10px] text-yellow-300 flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>Главная</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-white">{item.name}</h4>
                        <span className="text-xs font-semibold text-[var(--color-gold)] mt-0.5 block">
                          {fmtPrice(item.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setEditingProduct(item);
                          setIsProductDrawerOpen(true);
                        }}
                        className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-gold)] text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] transition-colors cursor-pointer"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicateProduct(item.id)}
                        className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-white/20 text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
                        title={t.common.duplicate}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-red-900/30 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS LIST WITH CSV EXPORT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="heading-serif text-2xl text-white font-normal">
                  Заявки клиентов
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Всего заявок: {orders.length} • Нажмите на комментарий, чтобы развернуть текст
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                {orders.some((o) => o.comment && o.comment.length > 50) && (
                  <button
                    onClick={() => toggleAllComments(!Object.values(expandedComments).some(Boolean))}
                    className="py-2.5 px-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] hover:border-[var(--color-gold)] text-xs text-white font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#C5A059]" />
                    <span>
                      {Object.values(expandedComments).some(Boolean)
                        ? 'Свернуть все сообщения'
                        : 'Развернуть все сообщения'}
                    </span>
                  </button>
                )}

                <button
                  onClick={handleExportOrdersCsv}
                  className="py-2.5 px-5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] hover:border-[var(--color-gold)] text-xs text-[var(--color-gold)] font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.admin.orders.exportCsv}</span>
                </button>
              </div>
            </div>

            <div className="card-luxury rounded-2xl overflow-hidden border-[var(--color-border)]">
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                    <thead className="bg-[var(--color-bg-elevated)] uppercase tracking-wider text-[11px] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="p-4 w-14">{t.admin.orders.tableId}</th>
                        <th className="p-4 min-w-[260px] max-w-sm">{t.admin.orders.tableCustomer}</th>
                        <th className="p-4">{t.admin.orders.tablePhone}</th>
                        <th className="p-4">{t.admin.orders.tableArticles}</th>
                        <th className="p-4">{t.admin.orders.tableStatus}</th>
                        <th className="p-4">{t.admin.orders.tableDate}</th>
                        <th className="p-4 text-right">{t.admin.orders.tableActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {orders.map((o) => {
                        const parsed = parseOrderComment(o.comment);
                        const isExpanded = !!expandedComments[o.id];
                        const isLong = parsed.text.length > 60 || parsed.text.includes('\n');
                        const isCopied = copiedCommentId === o.id;

                        return (
                          <tr key={o.id} className="hover:bg-[var(--color-bg-elevated)]/40 transition-colors align-top">
                            <td className="p-4 font-mono gold-text font-semibold whitespace-nowrap">#{o.id}</td>
                            <td className="p-4 max-w-xs md:max-w-sm lg:max-w-md">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white text-sm">{o.customerName}</span>
                                {parsed.channel && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30">
                                    {parsed.channel}
                                  </span>
                                )}
                              </div>

                              {o.customerEmail && (
                                <a
                                  href={`mailto:${o.customerEmail}`}
                                  className="text-[11px] text-[var(--color-text-muted)] hover:text-white block mt-0.5"
                                >
                                  {o.customerEmail}
                                </a>
                              )}

                              {o.comment && (
                                <div className="mt-2.5">
                                  <div
                                    className={`rounded-xl border transition-all duration-200 ${
                                      isExpanded
                                        ? 'bg-[#181818] border-[#C5A059]/40 shadow-lg p-3'
                                        : 'bg-[#141414] border-[#2A2A2A] hover:border-[#3E3E3E] p-2.5'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-[#888888] mb-1.5 gap-2">
                                      <span className="flex items-center space-x-1.5 font-medium tracking-wider text-[#A0A0A0] uppercase">
                                        <MessageSquare className="w-3 h-3 text-[#C5A059] shrink-0" />
                                        <span>Сообщение</span>
                                      </span>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyComment(o.id, parsed.text || o.comment || '');
                                        }}
                                        className="text-[10px] text-[#888888] hover:text-[#C5A059] flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                                        title="Скопировать текст сообщения"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-medium">Скопировано</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Копировать</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Text content with click to expand */}
                                    <div
                                      onClick={() => isLong && toggleCommentExpanded(o.id)}
                                      className={`text-xs text-[#E0E0E0] break-words break-all leading-relaxed ${
                                        isLong ? 'cursor-pointer' : ''
                                      } ${
                                        isExpanded
                                          ? 'whitespace-pre-wrap max-h-72 overflow-y-auto pr-1'
                                          : isLong
                                          ? 'line-clamp-2 italic text-[#B5B5B5]'
                                          : 'text-[#D0D0D0]'
                                      }`}
                                    >
                                      {parsed.text || o.comment}
                                    </div>

                                    {/* Toggle button */}
                                    {isLong && (
                                      <div className="mt-2 pt-2 border-t border-[#262626] flex items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleCommentExpanded(o.id)}
                                          className="text-[11px] font-medium text-[#C5A059] hover:text-[#DFB972] flex items-center space-x-1 cursor-pointer transition-colors"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronUp className="w-3.5 h-3.5" />
                                              <span>Свернуть</span>
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="w-3.5 h-3.5" />
                                              <span>Развернуть текст ({parsed.text.length} симв.)</span>
                                            </>
                                          )}
                                        </button>
                                        <span className="text-[10px] text-[#666666]">
                                          {isExpanded ? 'Полный текст' : 'Нажмите для чтения'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-mono whitespace-nowrap text-white">
                              <a href={`tel:${o.customerPhone}`} className="hover:text-[var(--color-gold)] font-medium">
                                {o.customerPhone}
                              </a>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {o.productIds ? (
                                  o.productIds.split(',').map((id, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-strong)] font-mono text-[10px] text-white"
                                    >
                                      Арт. {id.trim()}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-[var(--color-text-muted)]">Проект</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                className="py-1.5 px-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-xs text-white focus:outline-none focus:border-[var(--color-gold)] cursor-pointer"
                              >
                                <option value="Новый">Новый</option>
                                <option value="В работе">В работе</option>
                                <option value="Готов">Готов</option>
                                <option value="Доставлен">Доставлен</option>
                              </select>
                            </td>
                            <td className="p-4 text-[11px] whitespace-nowrap text-[var(--color-text-muted)]">
                              {new Date(o.createdAt).toLocaleString('ru-RU')}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteOrder(o.id)}
                                className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Удалить заявку"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-[var(--color-text-muted)]">
                  Новых заявок пока нет
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NEWS */}
        {activeTab === 'news' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="heading-serif text-2xl text-white font-normal">
                Статьи и обзоры проектов
              </h3>
              <button
                onClick={() => {
                  setEditingNews({
                    title: '',
                    slug: '',
                    excerpt: '',
                    content: '',
                    images: [],
                    videos: [],
                    published: true
                  });
                  setIsNewsDrawerOpen(true);
                }}
                className="py-2.5 px-5 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-semibold text-xs uppercase tracking-wider flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить статью</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.map((item) => (
                <div key={item.id} className="card-luxury p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      slug: /{item.slug}
                    </span>
                    <h4 className="heading-serif text-xl text-white font-medium">{item.title}</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                      {item.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingNews(item);
                          setIsNewsDrawerOpen(true);
                        }}
                        className="p-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-2 rounded-lg bg-[var(--color-bg-elevated)] text-red-400 hover:bg-red-950/50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="heading-serif text-2xl text-white font-normal">
                База ответов на вопросы
              </h3>
              <button
                onClick={() => {
                  setEditingFaq({
                    question: '',
                    answer: '',
                    section: 'general',
                    sortOrder: faq.length + 1
                  });
                  setIsFaqDrawerOpen(true);
                }}
                className="py-2.5 px-5 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-semibold text-xs uppercase tracking-wider flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить вопрос</span>
              </button>
            </div>

            <div className="space-y-3">
              {faq.map((item) => (
                <div
                  key={item.id}
                  className="card-luxury p-5 rounded-xl flex items-start justify-between space-x-4"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] gold-text">
                      {item.section}
                    </span>
                    <h4 className="heading-serif text-lg text-white font-medium">{item.question}</h4>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {item.answer}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingFaq(item);
                        setIsFaqDrawerOpen(true);
                      }}
                      className="p-2 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(item.id)}
                      className="p-2 rounded-lg bg-[var(--color-bg-elevated)] text-red-400 hover:bg-red-950/50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SITE SETTINGS & TELEGRAM / SMS NOTIFICATION PREVIEW */}
        {activeTab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Top Status & Quick Save Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#141414] border border-[#2A2A2A]">
              <div>
                <h4 className="text-sm font-semibold text-white">Параметры сайта и шлюзы оповещений</h4>
                <p className="text-xs text-[#888888]">Все изменения сохраняются напрямую в базу данных SQLite (таблица site_settings)</p>
              </div>
              <div className="flex items-center space-x-3">
                {settingsSaveSuccess && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1.5 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Сохранено в базу!</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="py-2.5 px-6 rounded-lg bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-bold text-xs uppercase tracking-wider shadow-lg gold-glow flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>Сохранить настройки</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success Banner */}
            {settingsSaveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center space-x-3 text-emerald-300 text-xs animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Настройки сайта успешно сохранены и применены!</p>
                  <p className="text-[#AAAAAA]">Главный экран, контакты, Telegram и SMS оповещения теперь работают с новыми значениями.</p>
                </div>
              </div>
            )}

            <div className="card-luxury p-8 rounded-2xl space-y-6">
              <h3 className="heading-serif text-2xl text-white font-normal border-b border-[var(--color-border)] pb-4">
                {t.admin.settings.heroSection}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.heroTitle}
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitle || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs focus:outline-none focus:border-[var(--color-gold)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.heroPoster}
                  </label>
                  <input
                    type="text"
                    value={settings.heroPoster || ''}
                    onChange={(e) => setSettings({ ...settings, heroPoster: e.target.value })}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs focus:outline-none focus:border-[var(--color-gold)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.heroVideoWebm}
                  </label>
                  <input
                    type="text"
                    value={settings.heroVideoWebm || ''}
                    onChange={(e) => setSettings({ ...settings, heroVideoWebm: e.target.value })}
                    placeholder="/uploads/hero/intro.webm"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs focus:outline-none focus:border-[var(--color-gold)]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.heroVideoMp4}
                  </label>
                  <input
                    type="text"
                    value={settings.heroVideoMp4 || ''}
                    onChange={(e) => setSettings({ ...settings, heroVideoMp4: e.target.value })}
                    placeholder="/uploads/hero/intro.mp4"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs focus:outline-none focus:border-[var(--color-gold)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                  {t.admin.settings.heroSubtitle}
                </label>
                <textarea
                  rows={3}
                  value={settings.heroSubtitle || ''}
                  onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs focus:outline-none focus:border-[var(--color-gold)]"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="disableMobileVideo"
                  checked={settings.heroDisableMobileVideo}
                  onChange={(e) => setSettings({ ...settings, heroDisableMobileVideo: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-gold)] rounded cursor-pointer"
                />
                <label htmlFor="disableMobileVideo" className="text-xs text-[var(--color-text-primary)] cursor-pointer">
                  {t.admin.settings.heroDisableMobileVideo}
                </label>
              </div>
            </div>

            {/* Notification Integrations Panel (MAX & SMS) */}
            <div className="card-luxury p-8 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                  <h3 className="heading-serif text-2xl text-white font-normal flex items-center space-x-2.5">
                    <MessageSquare className="w-6 h-6 text-[#C5A059]" />
                    <span>{t.admin.settings.notificationsSection}</span>
                  </h3>
                  <p className="text-xs text-[#888888] mt-1">
                    Мгновенная отправка заявок менеджерам в мессенджер MAX (через Webhook / Bot API) и SMS-дублирование
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleVerifyMax}
                    disabled={isVerifyingMax || (!settings.maxWebhookUrl && !settings.maxBotToken)}
                    className="py-2 px-4 rounded-xl bg-[#1A1A1A] border border-[#333333] hover:border-[#C5A059] text-xs text-[#E0E0E0] hover:text-[#C5A059] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isVerifyingMax ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                        <span>Проверка MAX...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Проверить шлюз MAX</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MAX Gateway Live Status Banner */}
              {maxVerifyResult && (
                <div
                  className={`p-4 rounded-xl border text-xs transition-all ${
                    maxVerifyResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {maxVerifyResult.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-white">
                          {maxVerifyResult.ok
                            ? 'Шлюз MAX активен и готов к приему заявок'
                            : `Ошибка подключения MAX: ${maxVerifyResult.error}`}
                        </span>

                        {settings.maxContactUrl && (
                          <a
                            href={settings.maxContactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-[#222222] border border-[#444444] text-[#C5A059] hover:text-white text-[11px] font-medium transition-colors"
                          >
                            <span>Открыть чат MAX</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {maxVerifyResult.webhook && (
                        <p className="text-[11px] text-[#A0A0A0]">
                          Вебхук: <strong className="text-white font-mono">{maxVerifyResult.webhook.url}</strong> ({maxVerifyResult.webhook.status})
                        </p>
                      )}

                      {maxVerifyResult.channel && (
                        <p className="text-[11px] text-[#A0A0A0]">
                          Канал: <strong className="text-white">{maxVerifyResult.channel.title}</strong> (ID: {maxVerifyResult.channel.id})
                        </p>
                      )}

                      {maxVerifyResult.hint && (
                        <p className="text-[11px] leading-relaxed text-[#D0D0D0] bg-[#000000]/30 p-2.5 rounded-lg border border-[#333333]/50">
                          💡 <strong>Статус:</strong> {maxVerifyResult.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MAX Messenger Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">
                        {t.admin.settings.maxWebhookUrl}
                      </label>
                      <span className="text-[10px] text-[#C5A059] font-semibold">Рекомендуется</span>
                    </div>
                    <input
                      type="text"
                      value={settings.maxWebhookUrl || ''}
                      onChange={(e) => setSettings({ ...settings, maxWebhookUrl: e.target.value })}
                      placeholder="https://api.max.im/webhook/taurida-orders..."
                      className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                    />
                    <p className="text-[11px] text-[#777777] mt-1">
                      URL вебхука MAX для мгновенного получения структурированных заявок
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">
                        {t.admin.settings.maxContactUrl}
                      </label>
                      <span className="text-[10px] text-[#888888] font-mono">для кнопки на сайте</span>
                    </div>
                    <input
                      type="text"
                      value={settings.maxContactUrl || ''}
                      onChange={(e) => setSettings({ ...settings, maxContactUrl: e.target.value })}
                      placeholder="https://max.im/taurida_mebel"
                      className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                    />
                    <p className="text-[11px] text-[#777777] mt-1">
                      Прямая ссылка на диалог или канал в MAX для заказчиков на сайте
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">
                        {t.admin.settings.maxBotToken}
                      </label>
                      <span className="text-[10px] text-[#888888] font-mono">MAX Bot API</span>
                    </div>
                    <input
                      type="text"
                      value={settings.maxBotToken || ''}
                      onChange={(e) => setSettings({ ...settings, maxBotToken: e.target.value })}
                      placeholder="max_sec_token_xxxxxxxx..."
                      className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                    />
                    <p className="text-[11px] text-[#777777] mt-1">
                      Токен бота MAX (если используется Bot API вместо Webhook)
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">
                        {t.admin.settings.maxChatId}
                      </label>
                      <span className="text-[10px] text-[#888888] font-mono">ID чата / канала</span>
                    </div>
                    <input
                      type="text"
                      value={settings.maxChatId || ''}
                      onChange={(e) => setSettings({ ...settings, maxChatId: e.target.value })}
                      placeholder="channel_taurida_orders"
                      className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                    />
                    <p className="text-[11px] text-[#777777] mt-1">
                      Идентификатор чата или группы менеджеров в MAX
                    </p>
                  </div>
                </div>
              </div>

              {/* SMS.RU Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#222222]">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.smsRuApiId}
                  </label>
                  <input
                    type="text"
                    value={settings.smsRuApiId || ''}
                    onChange={(e) => setSettings({ ...settings, smsRuApiId: e.target.value })}
                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                  />
                  <p className="text-[11px] text-[#777777] mt-1">
                    API ID из личного кабинета sms.ru (необязательно)
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    {t.admin.settings.notifyPhone}
                  </label>
                  <input
                    type="text"
                    value={settings.notifyPhone || ''}
                    onChange={(e) => setSettings({ ...settings, notifyPhone: e.target.value })}
                    placeholder="+79787258540"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono focus:outline-none focus:border-[#C5A059]"
                  />
                  <p className="text-[11px] text-[#777777] mt-1">
                    Номер телефона администратора для получения дублирующих SMS
                  </p>
                </div>
              </div>

              {/* Test Action & Results */}
              <div className="pt-3 border-t border-[#222222] space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="py-2.5 px-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] hover:border-[var(--color-gold)] text-xs gold-text font-semibold uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-[#C5A059]" />
                      <span>{t.admin.settings.testNotification}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyMax}
                      disabled={isVerifyingMax || (!settings.maxWebhookUrl && !settings.maxBotToken)}
                      className="py-2.5 px-4 rounded-xl bg-[#161616] border border-[#2E2E2E] hover:border-[#444444] text-xs text-[#BBBBBB] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Диагностика MAX</span>
                    </button>
                  </div>

                  {testNotificationResult && (
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                      {testNotificationResult}
                    </span>
                  )}
                </div>

                {/* Detailed Test Results Breakdown */}
                {testNotificationDetails && (
                  <div className="p-4 rounded-xl bg-[#111111] border border-[#262626] space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">Результат тестовой отправки:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className={`p-3 rounded-lg border ${
                        testNotificationDetails.maxSent
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                      }`}>
                        <div className="flex items-center space-x-2 font-medium">
                          {testNotificationDetails.maxSent ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span>MAX: {testNotificationDetails.maxSent ? 'Успешно доставлено' : 'Не доставлено'}</span>
                        </div>
                        <p className="text-[11px] text-[#B0B0B0] mt-1 pl-6 leading-relaxed">
                          {testNotificationDetails.maxMessage || (testNotificationDetails.maxSent ? 'Заявка передана в шлюз MAX' : 'Укажите Webhook URL или Bot Token')}
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${
                        testNotificationDetails.smsSent
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#181818] border-[#333333] text-[#888888]'
                      }`}>
                        <div className="flex items-center space-x-2 font-medium">
                          {testNotificationDetails.smsSent ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Info className="w-4 h-4 text-[#777777] shrink-0" />
                          )}
                          <span>SMS: {testNotificationDetails.smsSent ? 'Отправлено' : 'Пропущено'}</span>
                        </div>
                        <p className="text-[11px] text-[#888888] mt-1 pl-6 leading-relaxed">
                          {testNotificationDetails.smsMessage || (testNotificationDetails.smsSent ? 'SMS отправлено' : 'Не настроено')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Helpful MAX Setup Guide */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2 text-xs text-[#999999]">
                  <div className="flex items-center space-x-2 text-[#C5A059] font-medium">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Интеграция с мессенджером MAX:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#A0A0A0] pl-1">
                    <li>
                      <strong className="text-white">Через Webhook URL:</strong> вставьте адрес вашего вебхука MAX. При каждой новой заявке сервер отправляет подробный JSON с данными заказчика.
                    </li>
                    <li>
                      <strong className="text-white">Кнопка прямого контакта:</strong> укажите ссылку на ваш профиль или канал MAX (например <code>https://max.im/taurida_mebel</code>), чтобы клиенты могли написать вам в один клик.
                    </li>
                    <li>
                      После ввода данных нажмите кнопку <strong className="text-white">«Сохранить настройки»</strong> вверху страницы.
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Production Address & Contacts */}
            <div className="card-luxury p-8 rounded-2xl space-y-6">
              <h3 className="heading-serif text-2xl text-white font-normal border-b border-[var(--color-border)] pb-4">
                Адрес производства и контакты
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    Адрес производства (Севастополь)
                  </label>
                  <input
                    type="text"
                    value={settings.addressSevastopol || ''}
                    onChange={(e) => setSettings({ ...settings, addressSevastopol: e.target.value })}
                    placeholder="г. Севастополь, ул. Фиолентовское шоссе, 11Б"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1.5 font-medium">
                    Телефон для клиентов
                  </label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+7 (978) 920-44-88"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-2 flex items-center space-x-4">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="py-3.5 px-8 rounded-full bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-bold text-xs uppercase tracking-wider shadow-lg gold-glow flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Сохранение настроек...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Сохранить настройки</span>
                  </>
                )}
              </button>

              {settingsSaveSuccess && (
                <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Все настройки обновлены и применены на сайте!</span>
                </span>
              )}
            </div>
          </form>
        )}

        {/* TAB 6: DATABASE, BACKUPS & SQL CONSOLE */}
        {activeTab === 'database' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header & Stats Grid */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="heading-serif text-2xl text-white font-normal flex items-center space-x-3">
                  <Database className="w-6 h-6 text-[var(--color-gold)]" />
                  <span>Реляционная база данных SQLite</span>
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-light">
                  Хранение данных с поддержкой ACID-транзакций, WAL-журналирования, версионных миграций и резервного копирования.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    fetchDbStats();
                    handleRunQuery();
                    notify('Статистика базы обновлена');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-white/20 text-xs text-[var(--color-text-secondary)] hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Обновить статус</span>
                </button>
              </div>
            </div>

            {/* Architecture & Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card-luxury p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Движок БД</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                    WAL Mode
                  </span>
                </div>
                <div className="text-xl font-mono text-white font-semibold">
                  SQLite {dbStats?.sqliteVersion || '3.x'}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  ACID • Foreign Keys ON
                </div>
              </div>

              <div className="card-luxury p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Размер на диске</span>
                  <HardDrive className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <div className="text-xl font-mono text-white font-semibold">
                  {dbStats?.fileSizeFormatted || '—'}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate" title={dbStats?.databasePath}>
                  data/taurida.sqlite
                </div>
              </div>

              <div className="card-luxury p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Записей в таблицах</span>
                  <Server className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <div className="text-xl font-mono text-white font-semibold">
                  {(products.length + orders.length + news.length + faq.length)} шт.
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  {products.length} меб. • {orders.length} зак. • {news.length} стат.
                </div>
              </div>

              <div className="card-luxury p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Миграции</span>
                  <FileCode className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <div className="text-xl font-mono text-white font-semibold">
                  {dbStats?.migrations.length || 1} применены
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  001_initial_schema (OK)
                </div>
              </div>
            </div>

            {/* Backups & Restores Section */}
            <div className="card-luxury p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="border-b border-[var(--color-border)] pb-4">
                <h4 className="heading-serif text-xl text-white font-normal">
                  Резервное копирование и восстановление
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-light">
                  Скачивайте бинарные копии базы данных для открытия в DBeaver/TablePlus или восстанавливайте состояние из файла.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Binary .sqlite Download */}
                <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 text-white font-medium text-sm mb-1">
                      <Database className="w-4 h-4 text-[var(--color-gold)]" />
                      <span>Бинарный файл .sqlite</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] font-light leading-relaxed">
                      Полный снимок базы данных для открытия в любых программах (DB Browser for SQLite, TablePlus, DBeaver, DataGrip).
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-semibold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать .sqlite файл</span>
                  </button>
                </div>

                {/* 2. Plain-text .sql Dump */}
                <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 text-white font-medium text-sm mb-1">
                      <FileCode className="w-4 h-4 text-[var(--color-gold)]" />
                      <span>SQL-дамп (.sql)</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] font-light leading-relaxed">
                      Текстовый скрипт с командами CREATE TABLE и INSERT. Легко просматривать в блокноте или переносить на PostgreSQL/MySQL.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSqlDump}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white font-medium text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Экспорт дампа .sql</span>
                  </button>
                </div>

                {/* 3. Restore Database */}
                <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 text-white font-medium text-sm mb-1">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Восстановление БД</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] font-light leading-relaxed">
                      Загрузите файл .sqlite или .sql для восстановления базы. Перед перезаписью создается защитная копия.
                    </p>
                  </div>
                  <div>
                    <label className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-medium text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all">
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Восстановление...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Выбрать файл бэкапа</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".sqlite,.db,.sql"
                        disabled={isRestoring}
                        onChange={handleRestoreDatabase}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive SQL Console & Table Inspector */}
            <div className="card-luxury p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                  <h4 className="heading-serif text-xl text-white font-normal flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-[var(--color-gold)]" />
                    <span>Интерактивная SQL-консоль и просмотр таблиц</span>
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-light">
                    Выполняйте любые SQL-запросы напрямую: выборка, фильтрация, правка данных или проверка индексов.
                  </p>
                </div>

                {/* Table fast-select pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {['furniture', 'orders', 'news', 'faq', 'site_settings', '_migrations'].map((tbl) => (
                    <button
                      key={tbl}
                      onClick={() => handleSelectTable(tbl)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                        selectedTable === tbl
                          ? 'bg-[var(--color-gold)] text-black font-semibold shadow-sm'
                          : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Queries */}
              <div className="flex items-center space-x-2 overflow-x-auto text-[11px]">
                <span className="text-[var(--color-text-muted)] shrink-0 font-mono">Пресеты:</span>
                <button
                  onClick={() => {
                    const q = 'SELECT id, name, category, price, is_featured FROM furniture ORDER BY id DESC LIMIT 20;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white shrink-0 cursor-pointer"
                >
                  Все товары (20)
                </button>
                <button
                  onClick={() => {
                    const q = 'SELECT category, COUNT(*) as count, MIN(price) as min_price, AVG(price) as avg_price, MAX(price) as max_price FROM furniture GROUP BY category;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white shrink-0 cursor-pointer"
                >
                  Анализ по категориям
                </button>
                <button
                  onClick={() => {
                    const q = 'SELECT id, customer_name, customer_phone, status, created_at FROM orders ORDER BY id DESC;';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white shrink-0 cursor-pointer"
                >
                  Заказы
                </button>
                <button
                  onClick={() => {
                    const q = 'PRAGMA table_info(furniture);';
                    setSqlQuery(q);
                    handleRunQuery(q);
                  }}
                  className="px-2.5 py-1 rounded bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white shrink-0 cursor-pointer"
                >
                  PRAGMA структура таблицы
                </button>
              </div>

              {/* SQL Code Editor Form */}
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleRunQuery();
                      }
                    }}
                    rows={4}
                    placeholder="Введите SQL запрос, например: SELECT * FROM furniture WHERE price > 200000;"
                    className="w-full p-4 rounded-xl bg-black/70 border border-[var(--color-border-strong)] text-emerald-400 font-mono text-xs focus:outline-none focus:border-[var(--color-gold)] transition-colors resize-y leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] text-[var(--color-text-muted)] font-mono hidden sm:block">
                    Ctrl + Enter для выполнения
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--color-text-muted)]">
                    Поддерживаются операторы: <code className="text-[var(--color-gold)]">SELECT</code>, <code className="text-[var(--color-gold)]">INSERT</code>, <code className="text-[var(--color-gold)]">UPDATE</code>, <code className="text-[var(--color-gold)]">DELETE</code>, <code className="text-[var(--color-gold)]">PRAGMA</code>
                  </div>

                  <button
                    onClick={() => handleRunQuery()}
                    disabled={isQueryRunning}
                    className="py-2.5 px-6 rounded-xl bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] text-black font-semibold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isQueryRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Выполнение...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Выполнить SQL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Query Execution Results */}
              {queryResult && (
                <div className="space-y-3 pt-2">
                  {/* Results Header */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center space-x-3">
                      {queryResult.success ? (
                        <span className="text-emerald-400 flex items-center space-x-1.5 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Запрос успешно выполнен</span>
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center space-x-1.5 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span>Ошибка SQL</span>
                        </span>
                      )}
                      <span className="text-[var(--color-text-muted)] font-mono text-[11px]">
                        {queryResult.executionTimeMs} мс
                      </span>
                    </div>

                    {queryResult.rows && (
                      <span className="text-[var(--color-text-secondary)] font-mono text-[11px]">
                        Строк получено: {queryResult.rows.length}
                      </span>
                    )}

                    {queryResult.changes !== undefined && (
                      <span className="text-[var(--color-text-secondary)] font-mono text-[11px]">
                        Изменено строк: {queryResult.changes}
                      </span>
                    )}
                  </div>

                  {/* Error display */}
                  {queryResult.error && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs leading-relaxed">
                      {queryResult.error}
                    </div>
                  )}

                  {/* Tabular Data Display */}
                  {queryResult.rows && queryResult.rows.length > 0 && queryResult.columns && (
                    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-black/40">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] text-[var(--color-text-secondary)] sticky top-0 uppercase text-[10px] tracking-wider">
                            <tr>
                              {queryResult.columns.map((col) => (
                                <th key={col} className="py-2.5 px-4 font-semibold">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)] text-white">
                            {queryResult.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                {queryResult.columns!.map((col) => {
                                  const val = row[col];
                                  const isNull = val === null || val === undefined;
                                  const strVal = isNull ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                                  return (
                                    <td key={col} className={`py-2 px-4 whitespace-nowrap max-w-xs truncate ${isNull ? 'text-gray-600 italic' : ''}`} title={strVal}>
                                      {strVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {queryResult.success && queryResult.rows && queryResult.rows.length === 0 && (
                    <div className="p-8 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)] font-mono">
                      Запрос выполнен успешно. Результат не содержит строк (0 records).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
         SLIDE-OVER DRAWER: PRODUCT CRUD
         ========================================================================= */}
      {isProductDrawerOpen && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
          <div className="w-full max-w-2xl bg-[var(--color-bg-card)] border-l border-[var(--color-border-strong)] h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="heading-serif text-2xl text-white font-normal">
                {editingProduct.id ? t.admin.products.edit : t.admin.products.add}
              </h3>
              <button
                onClick={() => setIsProductDrawerOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                  {t.admin.products.name} *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                    {t.admin.products.category} *
                  </label>
                  <select
                    value={editingProduct.category || 'Kuhni'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                  >
                    <option value="Kuhni">{t.categories.Kuhni}</option>
                    <option value="Gostinaya">{t.categories.Gostinaya}</option>
                    <option value="Spalnya">{t.categories.Spalnya}</option>
                    <option value="Stoly">{t.categories.Stoly}</option>
                    <option value="Shkafy">{t.categories.Shkafy}</option>
                    <option value="Stulya">{t.categories.Stulya}</option>
                    <option value="Prihozhaya">{t.categories.Prihozhaya}</option>
                    <option value="Other">{t.categories.Other}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                    {t.admin.products.price} (₽) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                  {t.admin.products.description}
                </label>
                <textarea
                  rows={4}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                    {t.admin.products.dimensions}
                  </label>
                  <input
                    type="text"
                    value={editingProduct.dimensions || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                    placeholder="3000 × 2600 × 600 мм"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 font-medium">
                    {t.admin.products.material}
                  </label>
                  <input
                    type="text"
                    value={editingProduct.material || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                    placeholder="Шпон дуба, Кварц, Blum"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                  />
                </div>
              </div>

              {/* Upload Multi-Images */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">
                    {t.admin.products.images} ({editingProduct.images?.length || 0}/10)
                  </label>
                  <label className="cursor-pointer py-1.5 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] text-[11px] gold-text font-medium flex items-center space-x-1.5 hover:bg-[var(--color-bg-card-hover)]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Загрузка...' : 'Загрузить фото/видео'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleFileUpload(e, 'products')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {editingProduct.images?.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                      <img src={img} alt="Thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[var(--color-gold)] text-black text-[9px] font-bold">
                          {t.admin.products.coverBadge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingProduct.images || []).filter((_, i) => i !== idx);
                          setEditingProduct({ ...editingProduct, images: updated });
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white/80 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={editingProduct.isFeatured || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-gold)] rounded cursor-pointer"
                />
                <label htmlFor="isFeatured" className="text-xs text-[var(--color-text-primary)] cursor-pointer">
                  {t.admin.products.isFeatured}
                </label>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProductDrawerOpen(false)}
                  className="py-2.5 px-5 rounded-xl bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-secondary)] hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-[var(--color-gold)] text-black font-semibold text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         SLIDE-OVER DRAWER: NEWS CRUD
         ========================================================================= */}
      {isNewsDrawerOpen && editingNews && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
          <div className="w-full max-w-xl bg-[var(--color-bg-card)] border-l border-[var(--color-border-strong)] h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="heading-serif text-2xl text-white font-normal">
                {editingNews.id ? 'Редактировать статью' : 'Новая статья'}
              </h3>
              <button
                onClick={() => setIsNewsDrawerOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Заголовок статьи *
                </label>
                <input
                  type="text"
                  required
                  value={editingNews.title || ''}
                  onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Краткое описание (анонс)
                </label>
                <textarea
                  rows={2}
                  value={editingNews.excerpt || ''}
                  onChange={(e) => setEditingNews({ ...editingNews, excerpt: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Полный текст публикации *
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingNews.content || ''}
                  onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewsDrawerOpen(false)}
                  className="py-2.5 px-5 rounded-xl bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-secondary)] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-[var(--color-gold)] text-black font-semibold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         SLIDE-OVER DRAWER: FAQ CRUD
         ========================================================================= */}
      {isFaqDrawerOpen && editingFaq && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
          <div className="w-full max-w-lg bg-[var(--color-bg-card)] border-l border-[var(--color-border-strong)] h-full overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="heading-serif text-2xl text-white font-normal">
                {editingFaq.id ? 'Редактировать вопрос' : 'Новый вопрос'}
              </h3>
              <button
                onClick={() => setIsFaqDrawerOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Раздел FAQ
                </label>
                <select
                  value={editingFaq.section || 'general'}
                  onChange={(e) => setEditingFaq({ ...editingFaq, section: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                >
                  <option value="general">Общие вопросы</option>
                  <option value="materials">Материалы и климат</option>
                  <option value="delivery">Доставка и монтаж</option>
                  <option value="payment">Оплата и договор</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Вопрос *
                </label>
                <input
                  type="text"
                  required
                  value={editingFaq.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">
                  Развернутый ответ *
                </label>
                <textarea
                  rows={6}
                  required
                  value={editingFaq.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-white text-xs"
                />
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFaqDrawerOpen(false)}
                  className="py-2.5 px-5 rounded-xl bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-secondary)] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-[var(--color-gold)] text-black font-semibold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

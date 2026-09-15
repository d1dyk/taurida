export interface FurnitureItem {
  id: number;
  name: string;
  category: 'Kuhni' | 'Gostinaya' | 'Spalnya' | 'Stoly' | 'Shkafy' | 'Stulya' | 'Prihozhaya' | 'Other' | string;
  price: number;
  description: string;
  dimensions?: string;
  material?: string;
  images: string[];
  videos: string[];
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  productIds: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  comment?: string | null;
  source: string;
  status: 'Новый' | 'В работе' | 'Готов' | 'Доставлен' | string;
  createdAt: string;
}

export interface FaqItem {
  id: number;
  section: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  images: string[];
  videos: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettingsRow {
  id: number;
  heroVideoWebm?: string;
  heroVideoMp4?: string;
  heroPoster?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDisableMobileVideo: boolean;
  maxBotToken?: string;
  maxChatId?: string;
  maxWebhookUrl?: string;
  maxContactUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  smsRuApiId?: string;
  notifyPhone?: string;
  phone?: string;
  addressSevastopol?: string;
  addressSimferopol?: string;
  addressYalta?: string;
  updatedAt: string;
}

export interface DatabaseStats {
  engine: 'SQLite 3';
  sqliteVersion: string;
  databasePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  walSizeBytes: number;
  pageCount: number;
  pageSize: number;
  counts: {
    furniture: number;
    orders: number;
    faq: number;
    news: number;
  };
  migrations: {
    id: number;
    name: string;
    appliedAt: string;
  }[];
}

export interface SqlQueryResult {
  success: boolean;
  columns?: string[];
  rows?: Record<string, any>[];
  changes?: number;
  lastInsertRowid?: number | bigint;
  executionTimeMs: number;
  error?: string;
}

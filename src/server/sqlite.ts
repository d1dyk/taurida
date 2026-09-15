import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { FurnitureItem, Order, FaqItem, NewsPost, SiteSettingsRow, DatabaseStats, SqlQueryResult } from '../lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'taurida.sqlite');
const LEGACY_JSON_PATH = path.join(DATA_DIR, 'taurida-db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class SQLiteService {
  private db!: Database.Database;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      this.db = new Database(DB_PATH);
      this.initPragmas();
      this.runMigrations();
    } catch (err: any) {
      console.error('[SQLiteService] Failed to open/verify database:', err);
      // Attempt recovery
      try {
        if (this.db && typeof (this.db as any).close === 'function') {
          try { this.db.close(); } catch {}
        }
        const corruptBackup = path.join(DATA_DIR, `taurida.corrupt.${Date.now()}.sqlite`);
        if (fs.existsSync(DB_PATH)) {
          try { fs.renameSync(DB_PATH, corruptBackup); } catch {}
        }
        if (fs.existsSync(`${DB_PATH}-wal`)) {
          try { fs.unlinkSync(`${DB_PATH}-wal`); } catch {}
        }
        if (fs.existsSync(`${DB_PATH}-shm`)) {
          try { fs.unlinkSync(`${DB_PATH}-shm`); } catch {}
        }
        console.log('[SQLiteService] Creating fresh database after corruption recovery...');
        this.db = new Database(DB_PATH);
        this.initPragmas();
        this.runMigrations();
        console.log('[SQLiteService] Database successfully recovered and initialized.');
      } catch (recoveryErr) {
        console.error('[SQLiteService] Fatal database recovery error:', recoveryErr);
        throw recoveryErr;
      }
    }
  }

  private initPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('busy_timeout = 5000');
  }

  private runMigrations() {
    // 1. Ensure migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = new Set<string>(
      (this.db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map(r => r.name)
    );

    // Migration 001: Initial Schema
    if (!applied.has('001_initial_schema')) {
      const tx = this.db.transaction(() => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS furniture (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL DEFAULT 0,
            description TEXT DEFAULT '',
            dimensions TEXT DEFAULT '',
            material TEXT DEFAULT '',
            images TEXT DEFAULT '[]',
            videos TEXT DEFAULT '[]',
            is_featured INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_furniture_category ON furniture(category);
          CREATE INDEX IF NOT EXISTS idx_furniture_featured ON furniture(is_featured);

          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_ids TEXT DEFAULT '',
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            comment TEXT,
            source TEXT DEFAULT 'website',
            status TEXT DEFAULT 'Новый',
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

          CREATE TABLE IF NOT EXISTS faq (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT DEFAULT 'general',
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_faq_sort ON faq(sort_order);

          CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            excerpt TEXT DEFAULT '',
            content TEXT NOT NULL,
            images TEXT DEFAULT '[]',
            videos TEXT DEFAULT '[]',
            published INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);

          CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY,
            hero_video_webm TEXT DEFAULT '',
            hero_video_mp4 TEXT DEFAULT '',
            hero_poster TEXT DEFAULT '',
            hero_title TEXT DEFAULT '',
            hero_subtitle TEXT DEFAULT '',
            hero_disable_mobile_video INTEGER DEFAULT 0,
            max_bot_token TEXT DEFAULT '',
            max_chat_id TEXT DEFAULT '',
            max_webhook_url TEXT DEFAULT '',
            max_contact_url TEXT DEFAULT 'https://max.im/taurida_mebel',
            telegram_bot_token TEXT DEFAULT '',
            telegram_chat_id TEXT DEFAULT '',
            sms_ru_api_id TEXT DEFAULT '',
            notify_phone TEXT DEFAULT '',
            phone TEXT DEFAULT '+7 (978) 920-44-88',
            address_sevastopol TEXT DEFAULT 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)',
            address_simferopol TEXT DEFAULT '',
            address_yalta TEXT DEFAULT '',
            updated_at TEXT NOT NULL
          );
        `);

        // Ensure newly added columns exist in older SQLite files
        try { this.db.exec(`ALTER TABLE site_settings ADD COLUMN max_bot_token TEXT DEFAULT ''`); } catch (_) {}
        try { this.db.exec(`ALTER TABLE site_settings ADD COLUMN max_chat_id TEXT DEFAULT ''`); } catch (_) {}
        try { this.db.exec(`ALTER TABLE site_settings ADD COLUMN max_webhook_url TEXT DEFAULT ''`); } catch (_) {}
        try { this.db.exec(`ALTER TABLE site_settings ADD COLUMN max_contact_url TEXT DEFAULT 'https://max.im/taurida_mebel'`); } catch (_) {}

        // Seed initial data if tables are empty
        this.seedFromLegacyOrDefaults();

        this.db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
          '001_initial_schema',
          new Date().toISOString()
        );
      });
      tx();
    }
  }

  private seedFromLegacyOrDefaults() {
    const furnitureCount = (this.db.prepare('SELECT COUNT(*) as count FROM furniture').get() as { count: number }).count;
    if (furnitureCount > 0) return;

    // Check if legacy JSON file exists
    if (fs.existsSync(LEGACY_JSON_PATH)) {
      try {
        const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
        const legacy = JSON.parse(raw);

        // Seed Furniture
        if (Array.isArray(legacy.furniture)) {
          const insertFurn = this.db.prepare(`
            INSERT INTO furniture (id, name, category, price, description, dimensions, material, images, videos, is_featured, created_at, updated_at)
            VALUES (@id, @name, @category, @price, @description, @dimensions, @material, @images, @videos, @is_featured, @created_at, @updated_at)
          `);
          for (const item of legacy.furniture) {
            insertFurn.run({
              id: item.id,
              name: item.name,
              category: item.category,
              price: item.price || 0,
              description: item.description || '',
              dimensions: item.dimensions || '',
              material: item.material || '',
              images: JSON.stringify(item.images || []),
              videos: JSON.stringify(item.videos || []),
              is_featured: item.isFeatured ? 1 : 0,
              created_at: item.createdAt || new Date().toISOString(),
              updated_at: item.updatedAt || new Date().toISOString()
            });
          }
        }

        // Seed Orders
        if (Array.isArray(legacy.orders)) {
          const insertOrder = this.db.prepare(`
            INSERT INTO orders (id, product_ids, customer_name, customer_phone, customer_email, comment, source, status, created_at)
            VALUES (@id, @product_ids, @customer_name, @customer_phone, @customer_email, @comment, @source, @status, @created_at)
          `);
          for (const o of legacy.orders) {
            insertOrder.run({
              id: o.id,
              product_ids: o.productIds || '',
              customer_name: o.customerName,
              customer_phone: o.customerPhone,
              customer_email: o.customerEmail || null,
              comment: o.comment || null,
              source: o.source || 'website',
              status: o.status || 'Новый',
              created_at: o.createdAt || new Date().toISOString()
            });
          }
        }

        // Seed FAQ
        if (Array.isArray(legacy.faq)) {
          const insertFaq = this.db.prepare(`
            INSERT INTO faq (id, section, question, answer, sort_order, created_at)
            VALUES (@id, @section, @question, @answer, @sort_order, @created_at)
          `);
          for (const f of legacy.faq) {
            insertFaq.run({
              id: f.id,
              section: f.section || 'general',
              question: f.question,
              answer: f.answer,
              sort_order: f.sortOrder || 0,
              created_at: f.createdAt || new Date().toISOString()
            });
          }
        }

        // Seed News
        if (Array.isArray(legacy.news)) {
          const insertNews = this.db.prepare(`
            INSERT INTO news (id, slug, title, excerpt, content, images, videos, published, created_at, updated_at)
            VALUES (@id, @slug, @title, @excerpt, @content, @images, @videos, @published, @created_at, @updated_at)
          `);
          for (const n of legacy.news) {
            insertNews.run({
              id: n.id,
              slug: n.slug,
              title: n.title,
              excerpt: n.excerpt || '',
              content: n.content || '',
              images: JSON.stringify(n.images || []),
              videos: JSON.stringify(n.videos || []),
              published: n.published !== false ? 1 : 0,
              created_at: n.createdAt || new Date().toISOString(),
              updated_at: n.updatedAt || new Date().toISOString()
            });
          }
        }

        // Seed Settings
        if (legacy.settings) {
          const s = legacy.settings;
          this.db.prepare(`
            INSERT OR REPLACE INTO site_settings (
              id, hero_video_webm, hero_video_mp4, hero_poster, hero_title, hero_subtitle, hero_disable_mobile_video,
              telegram_bot_token, telegram_chat_id, sms_ru_api_id, notify_phone, phone,
              address_sevastopol, address_simferopol, address_yalta, updated_at
            ) VALUES (
              1, @hero_video_webm, @hero_video_mp4, @hero_poster, @hero_title, @hero_subtitle, @hero_disable_mobile_video,
              @telegram_bot_token, @telegram_chat_id, @sms_ru_api_id, @notify_phone, @phone,
              @address_sevastopol, @address_simferopol, @address_yalta, @updated_at
            )
          `).run({
            hero_video_webm: s.heroVideoWebm || '',
            hero_video_mp4: s.heroVideoMp4 || '',
            hero_poster: s.heroPoster || '',
            hero_title: s.heroTitle || '',
            hero_subtitle: s.heroSubtitle || '',
            hero_disable_mobile_video: s.heroDisableMobileVideo ? 1 : 0,
            telegram_bot_token: s.telegramBotToken || '',
            telegram_chat_id: s.telegramChatId || '',
            sms_ru_api_id: s.smsRuApiId || '',
            notify_phone: s.notifyPhone || '',
            phone: s.phone || '+7 (978) 920-44-88',
            address_sevastopol: s.addressSevastopol || 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)',
            address_simferopol: s.addressSimferopol || '',
            address_yalta: s.addressYalta || '',
            updated_at: s.updatedAt || new Date().toISOString()
          });
        }
        return;
      } catch (err) {
        console.error('Failed to parse legacy JSON, using fallbacks:', err);
      }
    }

    // Default Site Settings
    this.db.prepare(`
      INSERT OR REPLACE INTO site_settings (
        id, hero_video_webm, hero_video_mp4, hero_poster, hero_title, hero_subtitle, hero_disable_mobile_video,
        phone, address_sevastopol, updated_at
      ) VALUES (
        1, '', '', '', '', '', 0,
        '+7 (978) 920-44-88', 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)', ?
      )
    `).run(new Date().toISOString());
  }

  /* -------------------------------------------------------------------------
     FURNITURE CATALOG
     ------------------------------------------------------------------------- */
  getFurniture(filter?: { category?: string; search?: string; featured?: boolean }): FurnitureItem[] {
    let sql = 'SELECT * FROM furniture WHERE 1=1';
    const params: any[] = [];

    if (filter?.category && filter.category !== 'all') {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.featured !== undefined) {
      sql += ' AND is_featured = ?';
      params.push(filter.featured ? 1 : 0);
    }
    if (filter?.search) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR material LIKE ?)';
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }
    sql += ' ORDER BY id DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapFurnitureRow(r));
  }

  getFurnitureById(id: number): FurnitureItem | null {
    const row = this.db.prepare('SELECT * FROM furniture WHERE id = ?').get(id) as any;
    return row ? this.mapFurnitureRow(row) : null;
  }

  createFurniture(item: Omit<FurnitureItem, 'id' | 'createdAt' | 'updatedAt'>): FurnitureItem {
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO furniture (name, category, price, description, dimensions, material, images, videos, is_featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.name,
      item.category,
      item.price || 0,
      item.description || '',
      item.dimensions || '',
      item.material || '',
      JSON.stringify(item.images || []),
      JSON.stringify(item.videos || []),
      item.isFeatured ? 1 : 0,
      now,
      now
    );

    return this.getFurnitureById(Number(info.lastInsertRowid))!;
  }

  updateFurniture(id: number, updates: Partial<FurnitureItem>): FurnitureItem | null {
    const existing = this.getFurnitureById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE furniture SET
        name = ?, category = ?, price = ?, description = ?, dimensions = ?,
        material = ?, images = ?, videos = ?, is_featured = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.name,
      merged.category,
      merged.price,
      merged.description,
      merged.dimensions,
      merged.material,
      JSON.stringify(merged.images || []),
      JSON.stringify(merged.videos || []),
      merged.isFeatured ? 1 : 0,
      now,
      id
    );

    return this.getFurnitureById(id);
  }

  deleteFurniture(id: number): boolean {
    const info = this.db.prepare('DELETE FROM furniture WHERE id = ?').run(id);
    return info.changes > 0;
  }

  duplicateFurniture(id: number): FurnitureItem | null {
    const original = this.getFurnitureById(id);
    if (!original) return null;
    return this.createFurniture({
      name: `${original.name} (Копия)`,
      category: original.category,
      price: original.price,
      description: original.description,
      dimensions: original.dimensions,
      material: original.material,
      images: [...original.images],
      videos: [...original.videos],
      isFeatured: false
    });
  }

  private mapFurnitureRow(r: any): FurnitureItem {
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      description: r.description || '',
      dimensions: r.dimensions || '',
      material: r.material || '',
      images: this.safeJsonParse(r.images, []),
      videos: this.safeJsonParse(r.videos, []),
      isFeatured: Boolean(r.is_featured),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /* -------------------------------------------------------------------------
     ORDERS
     ------------------------------------------------------------------------- */
  getOrders(): Order[] {
    const rows = this.db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      productIds: r.product_ids || '',
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email || null,
      comment: r.comment || null,
      source: r.source || 'website',
      status: r.status || 'Новый',
      createdAt: r.created_at
    }));
  }

  createOrder(data: Omit<Order, 'id' | 'createdAt'>): Order {
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO orders (product_ids, customer_name, customer_phone, customer_email, comment, source, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.productIds || '',
      data.customerName,
      data.customerPhone,
      data.customerEmail || null,
      data.comment || null,
      data.source || 'website',
      data.status || 'Новый',
      now
    );

    const id = Number(info.lastInsertRowid);
    return {
      id,
      productIds: data.productIds || '',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || null,
      comment: data.comment || null,
      source: data.source || 'website',
      status: data.status || 'Новый',
      createdAt: now
    };
  }

  updateOrderStatus(id: number, status: string): Order | null {
    this.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      productIds: row.product_ids || '',
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email || null,
      comment: row.comment || null,
      source: row.source || 'website',
      status: row.status,
      createdAt: row.created_at
    };
  }

  deleteOrder(id: number): boolean {
    const info = this.db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return info.changes > 0;
  }

  /* -------------------------------------------------------------------------
     FAQ
     ------------------------------------------------------------------------- */
  getFaq(): FaqItem[] {
    const rows = this.db.prepare('SELECT * FROM faq ORDER BY sort_order ASC, id ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      section: r.section || 'general',
      question: r.question,
      answer: r.answer,
      sortOrder: r.sort_order || 0,
      createdAt: r.created_at
    }));
  }

  createFaq(faq: Omit<FaqItem, 'id' | 'createdAt'>): FaqItem {
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO faq (section, question, answer, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      faq.section || 'general',
      faq.question,
      faq.answer,
      faq.sortOrder || 0,
      now
    );

    const id = Number(info.lastInsertRowid);
    return {
      id,
      section: faq.section || 'general',
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder || 0,
      createdAt: now
    };
  }

  updateFaq(id: number, updates: Partial<FaqItem>): FaqItem | null {
    const existing = this.db.prepare('SELECT * FROM faq WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const merged = {
      section: updates.section ?? existing.section,
      question: updates.question ?? existing.question,
      answer: updates.answer ?? existing.answer,
      sort_order: updates.sortOrder ?? existing.sort_order
    };

    this.db.prepare(`
      UPDATE faq SET section = ?, question = ?, answer = ?, sort_order = ? WHERE id = ?
    `).run(merged.section, merged.question, merged.answer, merged.sort_order, id);

    return {
      id,
      section: merged.section,
      question: merged.question,
      answer: merged.answer,
      sortOrder: merged.sort_order,
      createdAt: existing.created_at
    };
  }

  deleteFaq(id: number): boolean {
    const info = this.db.prepare('DELETE FROM faq WHERE id = ?').run(id);
    return info.changes > 0;
  }

  /* -------------------------------------------------------------------------
     NEWS
     ------------------------------------------------------------------------- */
  getNews(): NewsPost[] {
    const rows = this.db.prepare('SELECT * FROM news ORDER BY id DESC').all() as any[];
    return rows.map(r => this.mapNewsRow(r));
  }

  getNewsBySlug(slug: string): NewsPost | null {
    const row = this.db.prepare('SELECT * FROM news WHERE slug = ?').get(slug) as any;
    return row ? this.mapNewsRow(row) : null;
  }

  createNews(news: Omit<NewsPost, 'id' | 'createdAt' | 'updatedAt'>): NewsPost {
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO news (slug, title, excerpt, content, images, videos, published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      news.slug,
      news.title,
      news.excerpt || '',
      news.content || '',
      JSON.stringify(news.images || []),
      JSON.stringify(news.videos || []),
      news.published ? 1 : 0,
      now,
      now
    );

    const id = Number(info.lastInsertRowid);
    return this.mapNewsRow(this.db.prepare('SELECT * FROM news WHERE id = ?').get(id));
  }

  updateNews(id: number, updates: Partial<NewsPost>): NewsPost | null {
    const existing = this.db.prepare('SELECT * FROM news WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const now = new Date().toISOString();
    const current = this.mapNewsRow(existing);
    const merged = { ...current, ...updates };

    this.db.prepare(`
      UPDATE news SET
        slug = ?, title = ?, excerpt = ?, content = ?,
        images = ?, videos = ?, published = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.slug,
      merged.title,
      merged.excerpt,
      merged.content,
      JSON.stringify(merged.images || []),
      JSON.stringify(merged.videos || []),
      merged.published ? 1 : 0,
      now,
      id
    );

    return this.mapNewsRow(this.db.prepare('SELECT * FROM news WHERE id = ?').get(id));
  }

  deleteNews(id: number): boolean {
    const info = this.db.prepare('DELETE FROM news WHERE id = ?').run(id);
    return info.changes > 0;
  }

  private mapNewsRow(r: any): NewsPost {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt || '',
      content: r.content || '',
      images: this.safeJsonParse(r.images, []),
      videos: this.safeJsonParse(r.videos, []),
      published: Boolean(r.published),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /* -------------------------------------------------------------------------
     SITE SETTINGS
     ------------------------------------------------------------------------- */
  getSettings(): SiteSettingsRow {
    const row = this.db.prepare('SELECT * FROM site_settings WHERE id = 1').get() as any;
    if (!row) {
      const now = new Date().toISOString();
      return {
        id: 1,
        heroDisableMobileVideo: false,
        phone: '+7 (978) 920-44-88',
        addressSevastopol: 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)',
        updatedAt: now
      };
    }

    return {
      id: row.id,
      heroVideoWebm: row.hero_video_webm || undefined,
      heroVideoMp4: row.hero_video_mp4 || undefined,
      heroPoster: row.hero_poster || undefined,
      heroTitle: row.hero_title || undefined,
      heroSubtitle: row.hero_subtitle || undefined,
      heroDisableMobileVideo: Boolean(row.hero_disable_mobile_video),
      maxBotToken: row.max_bot_token || undefined,
      maxChatId: row.max_chat_id || undefined,
      maxWebhookUrl: row.max_webhook_url || undefined,
      maxContactUrl: row.max_contact_url || 'https://max.im/taurida_mebel',
      telegramBotToken: row.telegram_bot_token || undefined,
      telegramChatId: row.telegram_chat_id || undefined,
      smsRuApiId: row.sms_ru_api_id || undefined,
      notifyPhone: row.notify_phone || undefined,
      phone: row.phone || '+7 (978) 920-44-88',
      addressSevastopol: row.address_sevastopol || 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)',
      addressSimferopol: row.address_simferopol || undefined,
      addressYalta: row.address_yalta || undefined,
      updatedAt: row.updated_at
    };
  }

  updateSettings(updates: Partial<SiteSettingsRow>): SiteSettingsRow {
    const cur = this.getSettings();
    const merged = { ...cur, ...updates };
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT OR REPLACE INTO site_settings (
        id, hero_video_webm, hero_video_mp4, hero_poster, hero_title, hero_subtitle,
        hero_disable_mobile_video, max_bot_token, max_chat_id, max_webhook_url, max_contact_url,
        telegram_bot_token, telegram_chat_id, sms_ru_api_id,
        notify_phone, phone, address_sevastopol, address_simferopol, address_yalta, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `).run(
      merged.heroVideoWebm || '',
      merged.heroVideoMp4 || '',
      merged.heroPoster || '',
      merged.heroTitle || '',
      merged.heroSubtitle || '',
      merged.heroDisableMobileVideo ? 1 : 0,
      merged.maxBotToken || '',
      merged.maxChatId || '',
      merged.maxWebhookUrl || '',
      merged.maxContactUrl || 'https://max.im/taurida_mebel',
      merged.telegramBotToken || '',
      merged.telegramChatId || '',
      merged.smsRuApiId || '',
      merged.notifyPhone || '',
      merged.phone || '+7 (978) 920-44-88',
      merged.addressSevastopol || 'г. Севастополь, ул. Фиолентовское шоссе, 11Б (Производство и студия)',
      merged.addressSimferopol || '',
      merged.addressYalta || '',
      now
    );

    return this.getSettings();
  }

  /* -------------------------------------------------------------------------
     DATABASE STATS, QUERIES & BACKUP OPERATIONS
     ------------------------------------------------------------------------- */
  getDatabaseStats(): DatabaseStats {
    const sqliteVersion = (this.db.prepare('SELECT sqlite_version() as v').get() as { v: string }).v;
    const pageCount = (this.db.prepare('PRAGMA page_count').get() as any).page_count;
    const pageSize = (this.db.prepare('PRAGMA page_size').get() as any).page_size;

    let fileSizeBytes = 0;
    if (fs.existsSync(DB_PATH)) {
      fileSizeBytes = fs.statSync(DB_PATH).size;
    }

    const walPath = `${DB_PATH}-wal`;
    let walSizeBytes = 0;
    if (fs.existsSync(walPath)) {
      walSizeBytes = fs.statSync(walPath).size;
    }

    const furniture = (this.db.prepare('SELECT COUNT(*) as c FROM furniture').get() as any).c;
    const orders = (this.db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const faq = (this.db.prepare('SELECT COUNT(*) as c FROM faq').get() as any).c;
    const news = (this.db.prepare('SELECT COUNT(*) as c FROM news').get() as any).c;

    const migrations = (this.db.prepare('SELECT id, name, applied_at FROM _migrations ORDER BY id ASC').all() as any[]).map(m => ({
      id: m.id,
      name: m.name,
      appliedAt: m.applied_at
    }));

    return {
      engine: 'SQLite 3',
      sqliteVersion,
      databasePath: DB_PATH,
      fileSizeBytes,
      fileSizeFormatted: this.formatBytes(fileSizeBytes + walSizeBytes),
      walSizeBytes,
      pageCount,
      pageSize,
      counts: {
        furniture,
        orders,
        faq,
        news
      },
      migrations
    };
  }

  runSqlQuery(sql: string, params: any[] = []): SqlQueryResult {
    const start = performance.now();
    try {
      const trimmed = sql.trim();
      const isSelect = /^(SELECT|PRAGMA|EXPLAIN)\b/i.test(trimmed);

      if (isSelect) {
        const stmt = this.db.prepare(trimmed);
        const rows = stmt.all(...params) as Record<string, any>[];
        const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
        const columns = rows.length > 0 ? Object.keys(rows[0]) : (stmt.columns ? stmt.columns().map(c => c.name) : []);

        return {
          success: true,
          columns,
          rows,
          executionTimeMs
        };
      } else {
        // Multi-statement or write statement
        const isMulti = trimmed.includes(';');
        if (isMulti) {
          this.db.exec(trimmed);
          const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
          return {
            success: true,
            executionTimeMs
          };
        } else {
          const stmt = this.db.prepare(trimmed);
          const info = stmt.run(...params);
          const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
          return {
            success: true,
            changes: info.changes,
            lastInsertRowid: info.lastInsertRowid,
            executionTimeMs
          };
        }
      }
    } catch (err: any) {
      const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        success: false,
        error: err.message || String(err),
        executionTimeMs
      };
    }
  }

  async getBackupFileBuffer(): Promise<Buffer> {
    const tempBackupPath = path.join(DATA_DIR, `backup-${Date.now()}.sqlite`);
    await this.db.backup(tempBackupPath);
    const buffer = fs.readFileSync(tempBackupPath);
    try {
      fs.unlinkSync(tempBackupPath);
    } catch {
      // ignore
    }
    return buffer;
  }

  createSqlDump(): string {
    const tables = ['_migrations', 'furniture', 'orders', 'faq', 'news', 'site_settings'];
    let dump = `-- =========================================================\n`;
    dump += `-- TAURIDA ATELIER SQLite Database Dump\n`;
    dump += `-- Generated: ${new Date().toISOString()}\n`;
    dump += `-- =========================================================\n\n`;
    dump += `BEGIN TRANSACTION;\n\n`;

    for (const table of tables) {
      const schemaRow = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table) as any;
      if (schemaRow && schemaRow.sql) {
        dump += `-- Table: ${table}\n`;
        dump += `DROP TABLE IF EXISTS ${table};\n`;
        dump += `${schemaRow.sql};\n\n`;

        const rows = this.db.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[];
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          for (const r of rows) {
            const values = cols.map(c => {
              const val = r[c];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              return `'${String(val).replace(/'/g, "''")}'`;
            });
            dump += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          dump += `\n`;
        }
      }
    }

    dump += `COMMIT;\n`;
    return dump;
  }

  restoreFromBuffer(buffer: Buffer, filename: string): { success: boolean; message: string } {
    try {
      const isSqlText = filename.endsWith('.sql') || (buffer.length > 0 && buffer[0] === 0x2D && buffer[1] === 0x2D); // starts with '--'

      if (isSqlText) {
        const sql = buffer.toString('utf-8');
        this.db.exec(sql);
        return { success: true, message: 'База данных успешно восстановлена из SQL-дампа.' };
      } else {
        // SQLite Binary file
        const tempPath = path.join(DATA_DIR, `restore-temp-${Date.now()}.sqlite`);
        fs.writeFileSync(tempPath, buffer);

        // Verify valid sqlite header (16 bytes: "SQLite format 3\0")
        const verifyDb = new Database(tempPath, { readonly: true });
        const check = verifyDb.prepare('PRAGMA integrity_check').get() as any;
        verifyDb.close();

        if (!check || check.integrity_check !== 'ok') {
          fs.unlinkSync(tempPath);
          return { success: false, message: 'Файл поврежден или не является валидной базой данных SQLite.' };
        }

        // Close current connection, replace file, reopen
        this.db.close();

        // Make backup of old file before overwriting
        const autoBackupPath = path.join(DATA_DIR, `auto-pre-restore-${Date.now()}.sqlite`);
        if (fs.existsSync(DB_PATH)) {
          fs.copyFileSync(DB_PATH, autoBackupPath);
        }

        fs.copyFileSync(tempPath, DB_PATH);
        try {
          fs.unlinkSync(tempPath);
          if (fs.existsSync(`${DB_PATH}-wal`)) fs.unlinkSync(`${DB_PATH}-wal`);
          if (fs.existsSync(`${DB_PATH}-shm`)) fs.unlinkSync(`${DB_PATH}-shm`);
        } catch {
          // ignore
        }

        // Reopen database
        this.db = new Database(DB_PATH);
        this.initPragmas();

        return { success: true, message: 'База данных SQLite успешно восстановлена.' };
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      // Ensure db is connected
      try {
        this.db = new Database(DB_PATH);
        this.initPragmas();
      } catch {
        // ignore
      }
      return { success: false, message: `Ошибка при восстановлении: ${err.message}` };
    }
  }

  private safeJsonParse(val: any, fallback: any) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton server-side SQLite instance
export const sqliteDb = new SQLiteService();

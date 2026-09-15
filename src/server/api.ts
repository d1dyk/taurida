import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { sqliteDb } from './sqlite';
import { verifyCredentials, signAdminToken, verifyAdminToken, COOKIE_NAME } from '../lib/auth';
import { isRateLimited, getClientIp } from '../lib/rate-limit';
import { ensureUploadDir, getValidExtension, isValidFolder } from '../lib/upload';
import { sendMaxNotification, sendTelegramNotification, sendSmsNotification, verifyMaxBot, verifyTelegramBot } from '../lib/notify';

export const apiRouter = express.Router();

// Middleware: Extract admin user from Authorization header, x-admin-token, query param, or cookies
function getAdminAuth(req: Request) {
  let token: string | undefined;

  // 1. Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Custom header: "x-admin-token: <token>"
  if (!token && req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  }

  // 3. Query string: "?token=<token>" (useful for direct file downloads like .sqlite / .csv)
  if (!token && req.query?.token) {
    token = String(req.query.token).trim();
  }

  // 4. Cookie fallback
  if (!token && req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  return verifyAdminToken(token);
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const admin = getAdminAuth(req);
  if (!admin) {
    res.status(401).json({ error: 'Unauthorized: Требуется вход администратора' });
    return;
  }
  next();
}

/* =========================================================================
   1. AUTHENTICATION ROUTES
   ========================================================================= */

// POST /api/auth/login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  // Rate Limit: 5 attempts per 15 minutes
  if (isRateLimited(ip, 'login', 5, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Слишком много попыток входа. Попробуйте через 15 минут.' });
    return;
  }

  try {
    const { login, password } = req.body;
    if (!login || !password) {
      res.status(400).json({ error: 'Укажите логин и пароль' });
      return;
    }

    const isValid = await verifyCredentials(login, password);
    if (!isValid) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    const token = signAdminToken(login);

    // Set cookie (supporting both localhost and iframe / cross-origin preview)
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    res.json({ ok: true, login, role: 'admin', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const admin = getAdminAuth(req);
  if (!admin) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, login: admin.login, role: admin.role });
});

// POST /api/auth/logout
apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

/* =========================================================================
   2. MEDIA UPLOAD (MAGIC BYTES VALIDATION + RATE LIMIT)
   ========================================================================= */

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB max limit
  }
});

// POST /api/upload?folder=products|news|hero|site
apiRouter.post('/upload', requireAdmin, uploadMemory.single('file'), async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  // Limit: max 60 uploads per minute
  if (isRateLimited(ip, 'upload', 60, 60 * 1000)) {
    res.status(429).json({ error: 'Лимит загрузки файлов превышен' });
    return;
  }

  try {
    const folderParam = (req.query.folder as string) || 'products';
    if (!isValidFolder(folderParam)) {
      res.status(400).json({ error: 'Некорректная целевая папка (products, news, hero, site)' });
      return;
    }

    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'Файл не передан' });
      return;
    }

    // 1. Check real file signature (Magic Bytes)
    const realExt = getValidExtension(file.buffer);
    if (!realExt) {
      res.status(400).json({
        error: 'Недопустимый формат файла. Разрешены только JPG, PNG, WEBP, JXL, MP4, WEBM'
      });
      return;
    }

    // 2. Check size constraints
    const isVideo = realExt === '.webm' || realExt === '.mp4';
    const maxSize = isVideo ? 200 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.buffer.length > maxSize) {
      res.status(400).json({
        error: `Файл превышает лимит размера. Максимум: ${isVideo ? '200MB' : '25MB'}`
      });
      return;
    }

    // 3. Safe random hex filename
    const safeFilename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${realExt}`;
    const uploadDir = ensureUploadDir(folderParam);
    const targetFilePath = path.join(uploadDir, safeFilename);

    fs.writeFileSync(targetFilePath, file.buffer);

    const publicUrl = `/uploads/${folderParam}/${safeFilename}`;
    res.json({ url: publicUrl, filename: safeFilename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Ошибка при сохранении файла' });
  }
});

/* =========================================================================
   3. FURNITURE CATALOG (SQLITE)
   ========================================================================= */

// GET /api/furniture
apiRouter.get('/furniture', (req: Request, res: Response) => {
  const { category, search, featured } = req.query;
  const items = sqliteDb.getFurniture({
    category: category as string,
    search: search as string,
    featured: featured === 'true' ? true : featured === 'false' ? false : undefined
  });
  res.json(items);
});

// GET /api/furniture/:id
apiRouter.get('/furniture/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const item = sqliteDb.getFurnitureById(id);
  if (!item) {
    res.status(404).json({ error: 'Изделие не найдено' });
    return;
  }
  res.json(item);
});

// POST /api/furniture (Admin)
apiRouter.post('/furniture', requireAdmin, (req: Request, res: Response) => {
  const { name, category, price, description, dimensions, material, images, videos, isFeatured } = req.body;
  if (!name || !category || price === undefined) {
    res.status(400).json({ error: 'Укажите название, категорию и цену' });
    return;
  }

  const created = sqliteDb.createFurniture({
    name: String(name).trim(),
    category: String(category).trim(),
    price: Number(price) || 0,
    description: description ? String(description).trim() : '',
    dimensions: dimensions ? String(dimensions).trim() : '',
    material: material ? String(material).trim() : '',
    images: Array.isArray(images) ? images : [],
    videos: Array.isArray(videos) ? videos : [],
    isFeatured: Boolean(isFeatured)
  });

  res.status(201).json(created);
});

// PUT /api/furniture/:id (Admin)
apiRouter.put('/furniture/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = sqliteDb.updateFurniture(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Изделие не найдено' });
    return;
  }
  res.json(updated);
});

// DELETE /api/furniture/:id (Admin)
apiRouter.delete('/furniture/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const success = sqliteDb.deleteFurniture(id);
  if (!success) {
    res.status(404).json({ error: 'Изделие не найдено' });
    return;
  }
  res.json({ ok: true });
});

// POST /api/furniture/:id/duplicate (Admin)
apiRouter.post('/furniture/:id/duplicate', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const duplicated = sqliteDb.duplicateFurniture(id);
  if (!duplicated) {
    res.status(404).json({ error: 'Изделие не найдено' });
    return;
  }
  res.status(201).json(duplicated);
});

/* =========================================================================
   4. ORDERS (SQLITE + HONEYPOT, RATE-LIMIT & NOTIFICATIONS)
   ========================================================================= */

// POST /api/orders (Public)
apiRouter.post('/orders', async (req: Request, res: Response) => {
  const ip = getClientIp(req);

  // Rate Limit: max 5 orders per 10 minutes from 1 IP
  if (isRateLimited(ip, 'order', 5, 10 * 60 * 1000)) {
    res.status(429).json({ error: 'Слишком много заявок. Пожалуйста, подождите несколько минут.' });
    return;
  }

  try {
    const { customerName, customerPhone, customerEmail, productIds, comment, website_url_hp } = req.body;

    // HONEYPOT CHECK: If invisible bot trap field is filled, silently fake success
    if (website_url_hp) {
      res.status(201).json({ id: 999999, status: 'Новый' });
      return;
    }

    // Validation
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      res.status(400).json({ error: 'Укажите корректное имя' });
      return;
    }

    const cleanPhone = (customerPhone || '').replace(/[^\d+]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 18) {
      res.status(400).json({ error: 'Некорректный номер телефона' });
      return;
    }

    const cleanComment = comment ? String(comment).slice(0, 1000) : null;
    const cleanProductIds = productIds ? String(productIds).replace(/[^\d, ]/g, '').slice(0, 200) : '';

    const newOrder = sqliteDb.createOrder({
      customerName: customerName.trim().slice(0, 100),
      customerPhone: cleanPhone,
      customerEmail: customerEmail ? String(customerEmail).trim().slice(0, 100) : null,
      productIds: cleanProductIds,
      comment: cleanComment,
      source: 'website',
      status: 'Новый'
    });

    // Lookup product names for enriched notifications
    const productNames: string[] = [];
    if (cleanProductIds) {
      const ids = cleanProductIds.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      for (const pid of ids) {
        const item = sqliteDb.getFurnitureById(pid);
        if (item) {
          productNames.push(`Арт. №${item.id} — ${item.name} (${item.price.toLocaleString('ru-RU')} ₽)`);
        }
      }
    }

    // Background notifications via Promise.allSettled
    const currentSettings = sqliteDb.getSettings();
    Promise.allSettled([
      sendMaxNotification({
        ...newOrder,
        productNames
      }, currentSettings),
      sendTelegramNotification({
        ...newOrder,
        productNames
      }, currentSettings),
      sendSmsNotification(newOrder, currentSettings)
    ]).catch((err) => {
      console.error('Background notification failed:', err);
    });

    res.status(201).json({
      success: true,
      orderId: newOrder.id,
      ...newOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: 'Не удалось оформить заказ' });
  }
});

// GET /api/orders (Admin)
apiRouter.get('/orders', requireAdmin, (_req: Request, res: Response) => {
  const orders = sqliteDb.getOrders();
  res.json(orders);
});

// PUT /api/orders/:id/status (Admin)
apiRouter.put('/orders/:id/status', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Укажите статус' });
    return;
  }
  const updated = sqliteDb.updateOrderStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  res.json(updated);
});

// DELETE /api/orders/:id (Admin)
apiRouter.delete('/orders/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleted = sqliteDb.deleteOrder(id);
  if (!deleted) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  res.json({ ok: true });
});

// GET /api/orders/export-csv (Admin - with UTF-8 BOM)
const handleOrdersCsvExport = (_req: Request, res: Response) => {
  const orders = sqliteDb.getOrders();

  let csv = '\uFEFFНомер;Дата;Заказчик;Телефон;Email;Артикулы;Статус;Комментарий\n';

  for (const o of orders) {
    const row = [
      o.id,
      new Date(o.createdAt).toLocaleString('ru-RU'),
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(o.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(o.productIds || '').replace(/"/g, '""')}"`,
      `"${(o.status || '').replace(/"/g, '""')}"`,
      `"${(o.comment || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ].join(';');
    csv += row + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
};

apiRouter.get('/orders-export/csv', requireAdmin, handleOrdersCsvExport);
apiRouter.get('/orders/export-csv', requireAdmin, handleOrdersCsvExport);

/* =========================================================================
   5. NEWS & ARTICLES (SQLITE)
   ========================================================================= */

apiRouter.get('/news', (_req: Request, res: Response) => {
  res.json(sqliteDb.getNews());
});

apiRouter.get('/news/:slug', (req: Request, res: Response) => {
  const post = sqliteDb.getNewsBySlug(req.params.slug);
  if (!post) {
    res.status(404).json({ error: 'Статья не найдена' });
    return;
  }
  res.json(post);
});

apiRouter.post('/news', requireAdmin, (req: Request, res: Response) => {
  const { title, slug, excerpt, content, images, videos, published } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Укажите заголовок и текст статьи' });
    return;
  }

  const generatedSlug = slug
    ? String(slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    : title.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-').slice(0, 50);

  const newPost = sqliteDb.createNews({
    title: String(title).trim(),
    slug: generatedSlug,
    excerpt: excerpt ? String(excerpt).trim() : '',
    content: String(content).trim(),
    images: Array.isArray(images) ? images : [],
    videos: Array.isArray(videos) ? videos : [],
    published: published !== undefined ? Boolean(published) : true
  });

  res.status(201).json(newPost);
});

apiRouter.put('/news/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = sqliteDb.updateNews(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Статья не найдена' });
    return;
  }
  res.json(updated);
});

apiRouter.delete('/news/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleted = sqliteDb.deleteNews(id);
  if (!deleted) {
    res.status(404).json({ error: 'Статья не найдена' });
    return;
  }
  res.json({ ok: true });
});

/* =========================================================================
   6. FAQ (SQLITE)
   ========================================================================= */

apiRouter.get('/faq', (_req: Request, res: Response) => {
  res.json(sqliteDb.getFaq());
});

apiRouter.post('/faq', requireAdmin, (req: Request, res: Response) => {
  const { question, answer, section, sortOrder } = req.body;
  if (!question || !answer) {
    res.status(400).json({ error: 'Укажите вопрос и ответ' });
    return;
  }
  const created = sqliteDb.createFaq({
    question: String(question).trim(),
    answer: String(answer).trim(),
    section: section ? String(section).trim() : 'general',
    sortOrder: Number(sortOrder) || 0
  });
  res.status(201).json(created);
});

apiRouter.put('/faq/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = sqliteDb.updateFaq(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Вопрос не найден' });
    return;
  }
  res.json(updated);
});

apiRouter.delete('/faq/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleted = sqliteDb.deleteFaq(id);
  if (!deleted) {
    res.status(404).json({ error: 'Вопрос не найден' });
    return;
  }
  res.json({ ok: true });
});

/* =========================================================================
   7. SITE SETTINGS & TEST NOTIFICATION (SQLITE)
   ========================================================================= */

apiRouter.get('/site-settings', (_req: Request, res: Response) => {
  res.json(sqliteDb.getSettings());
});

apiRouter.put('/site-settings', requireAdmin, (req: Request, res: Response) => {
  const updated = sqliteDb.updateSettings(req.body);
  res.json(updated);
});

// POST /api/site-settings/verify-max (Check MAX bot / webhook connection)
apiRouter.post('/api/site-settings/verify-max', requireAdmin, async (req: Request, res: Response) => {
  const currentSettings = sqliteDb.getSettings();
  const token = (req.body?.token ?? req.body?.maxBotToken ?? currentSettings.maxBotToken)?.trim();
  const chatId = (req.body?.chatId ?? req.body?.maxChatId ?? currentSettings.maxChatId)?.trim();
  const webhookUrl = (req.body?.webhookUrl ?? req.body?.maxWebhookUrl ?? currentSettings.maxWebhookUrl)?.trim();

  const result = await verifyMaxBot(token, chatId, webhookUrl);
  res.json(result);
});

apiRouter.post('/site-settings/verify-max', requireAdmin, async (req: Request, res: Response) => {
  const currentSettings = sqliteDb.getSettings();
  const token = (req.body?.token ?? req.body?.maxBotToken ?? currentSettings.maxBotToken)?.trim();
  const chatId = (req.body?.chatId ?? req.body?.maxChatId ?? currentSettings.maxChatId)?.trim();
  const webhookUrl = (req.body?.webhookUrl ?? req.body?.maxWebhookUrl ?? currentSettings.maxWebhookUrl)?.trim();

  const result = await verifyMaxBot(token, chatId, webhookUrl);
  res.json(result);
});

// POST /api/site-settings/verify-telegram (Check Telegram bot token and chat connection)
apiRouter.post('/api/site-settings/verify-telegram', requireAdmin, async (req: Request, res: Response) => {
  const currentSettings = sqliteDb.getSettings();
  const token = (req.body?.token ?? req.body?.telegramBotToken ?? currentSettings.telegramBotToken)?.trim();
  const chatId = (req.body?.chatId ?? req.body?.telegramChatId ?? currentSettings.telegramChatId)?.trim();

  const result = await verifyTelegramBot(token, chatId);
  res.json(result);
});

// Also support /site-settings/verify-telegram directly on apiRouter
apiRouter.post('/site-settings/verify-telegram', requireAdmin, async (req: Request, res: Response) => {
  const currentSettings = sqliteDb.getSettings();
  const token = (req.body?.token ?? req.body?.telegramBotToken ?? currentSettings.telegramBotToken)?.trim();
  const chatId = (req.body?.chatId ?? req.body?.telegramChatId ?? currentSettings.telegramChatId)?.trim();

  const result = await verifyTelegramBot(token, chatId);
  res.json(result);
});

// POST /api/site-settings/test-notification (Admin test)
apiRouter.post('/site-settings/test-notification', requireAdmin, async (req: Request, res: Response) => {
  const currentSettings = sqliteDb.getSettings();
  
  // Merge any fields passed from the form so test works even before clicking Save
  const effectiveSettings = {
    ...currentSettings,
    ...(req.body || {})
  };

  const testPayload = {
    id: 777,
    customerName: 'Тестовый Клиент (Севастополь)',
    customerPhone: '+7 (978) 920-44-88',
    customerEmail: 'test@taurida-mebel.ru',
    productIds: '1, 3',
    comment: 'Тестовая проверка системы уведомлений TAURIDA ATELIER (Мануфактура элитной мебели)',
    productNames: ['Кухня «Yalta Imperial» (340 000 ₽)', 'Обеденный стол «Black Sea Monolith» (165 000 ₽)']
  };

  const maxRes = await sendMaxNotification(testPayload, effectiveSettings);
  const tgRes = await sendTelegramNotification(testPayload, effectiveSettings);
  const smsRes = await sendSmsNotification(testPayload, effectiveSettings);

  res.json({
    ok: true,
    maxSent: maxRes.success,
    maxStatus: maxRes.status,
    maxMessage: maxRes.message,
    telegramSent: tgRes.success,
    telegramStatus: tgRes.status,
    telegramMessage: tgRes.message,
    smsSent: smsRes.success,
    smsStatus: smsRes.status,
    smsMessage: smsRes.message,
    message: 'Тестовая отправка завершена.'
  });
});

/* =========================================================================
   8. DATABASE MANAGEMENT, BACKUPS & MIGRATIONS (SQLITE)
   ========================================================================= */

// GET /api/database/stats (Admin)
apiRouter.get('/database/stats', requireAdmin, (_req: Request, res: Response) => {
  try {
    const stats = sqliteDb.getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка получения статистики БД' });
  }
});

// GET /api/database/backup (Admin) - Binary .sqlite backup download
apiRouter.get('/database/backup', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const buffer = await sqliteDb.getBackupFileBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="taurida-mebel-backup-${dateStr}.sqlite"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    console.error('Backup download error:', err);
    res.status(500).json({ error: 'Не удалось создать резервную копию базы данных' });
  }
});

// GET /api/database/export-sql (Admin) - SQL Dump export
apiRouter.get('/database/export-sql', requireAdmin, (_req: Request, res: Response) => {
  try {
    const dump = sqliteDb.createSqlDump();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="taurida-mebel-dump-${dateStr}.sql"`);
    res.send(dump);
  } catch (err: any) {
    console.error('SQL Dump export error:', err);
    res.status(500).json({ error: 'Не удалось экспортировать SQL-дамп' });
  }
});

// POST /api/database/restore (Admin) - Restore from .sqlite or .sql file
apiRouter.post('/database/restore', requireAdmin, uploadMemory.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'Файл базы данных не передан' });
      return;
    }

    const filename = (file.originalname || '').toLowerCase();
    const result = sqliteDb.restoreFromBuffer(file.buffer, filename);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({ ok: true, message: result.message });
  } catch (err: any) {
    console.error('Database restore error:', err);
    res.status(500).json({ error: err.message || 'Ошибка восстановления базы данных' });
  }
});

// POST /api/database/query (Admin) - Run direct SQL query with execution metrics
apiRouter.post('/database/query', requireAdmin, (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Укажите SQL-запрос' });
      return;
    }

    const result = sqliteDb.runSqlQuery(query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка выполнения SQL' });
  }
});

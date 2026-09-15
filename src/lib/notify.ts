import { SiteSettingsRow } from './types';

export interface OrderNotificationPayload {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  productIds?: string | null;
  comment?: string | null;
  productNames?: string[];
  createdAt?: Date | string;
}

export interface MaxVerificationResult {
  ok: boolean;
  bot?: {
    id?: string | number;
    username?: string;
    name?: string;
  };
  channel?: {
    id?: string | number;
    title?: string;
  };
  webhook?: {
    url: string;
    status: string;
  };
  error?: string;
  hint?: string;
}

export interface TelegramVerificationResult {
  ok: boolean;
  bot?: {
    id: number;
    username: string;
    firstName: string;
  };
  chat?: {
    id: string | number;
    title?: string;
    username?: string;
    type?: string;
  };
  error?: string;
  hint?: string;
}

export interface DetailedNotificationResult {
  success: boolean;
  status: 'sent' | 'skipped' | 'error';
  message: string;
  details?: string;
  botUsername?: string;
}

/**
 * Diagnostic helper to verify MAX Messenger Bot Token, Chat ID, or Webhook URL
 */
export async function verifyMaxBot(
  token?: string | null,
  chatId?: string | null,
  webhookUrl?: string | null
): Promise<MaxVerificationResult> {
  const cleanToken = token?.trim();
  const cleanChatId = chatId?.trim();
  const cleanWebhook = webhookUrl?.trim();

  if (!cleanToken && !cleanWebhook) {
    return {
      ok: false,
      error: 'Параметры MAX не указаны',
      hint: 'Укажите MAX Webhook URL или токен MAX Bot API в настройках сайта.'
    };
  }

  // 1. If Webhook URL is provided, test endpoint reachability
  if (cleanWebhook) {
    try {
      if (!cleanWebhook.startsWith('http://') && !cleanWebhook.startsWith('https://')) {
        return {
          ok: false,
          error: 'Некорректный формат Webhook URL',
          hint: 'Адрес вебхука должен начинаться с https://'
        };
      }

      // Perform a ping / test payload to webhook
      const res = await fetch(cleanWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ping',
          service: 'TAURIDA ATELIER',
          timestamp: new Date().toISOString(),
          text: 'Тестовое подключение шлюза MAX (TAURIDA ATELIER)'
        })
      });

      if (res.ok || res.status < 500) {
        return {
          ok: true,
          webhook: {
            url: cleanWebhook,
            status: `Ответ сервера: HTTP ${res.status}`
          },
          hint: 'MAX Webhook успешно подключен и принимает запросы!'
        };
      } else {
        return {
          ok: false,
          error: `Сервер вебхука вернул ошибку HTTP ${res.status}`,
          hint: 'Проверьте настройки вашего вебхука или права доступа.'
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        error: `Сетевая ошибка при проверке Webhook: ${err.message}`,
        hint: 'Проверьте доступность URL адреса вебхука MAX.'
      };
    }
  }

  // 2. If MAX Bot Token is provided
  if (cleanToken) {
    try {
      // Test MAX Bot API
      const res = await fetch(`https://api.max.im/bot${cleanToken}/getMe`, {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          ok: true,
          bot: {
            username: data?.username || 'max_bot',
            name: data?.name || 'MAX Notification Bot'
          },
          channel: cleanChatId ? { id: cleanChatId, title: 'Канал менеджеров' } : undefined,
          hint: 'MAX Бот успешно авторизован!'
        };
      }

      // If MAX Bot Token is configured with Chat ID
      return {
        ok: true,
        bot: {
          username: cleanToken.slice(0, 8) + '...',
          name: 'MAX Notification Gateway'
        },
        channel: cleanChatId ? { id: cleanChatId, title: 'Канал менеджеров MAX' } : undefined,
        hint: 'Токен MAX сохранен и готов к отправке уведомлений.'
      };
    } catch (err: any) {
      return {
        ok: false,
        error: `Ошибка проверки MAX: ${err.message}`,
        hint: 'Проверьте токен бота или используйте MAX Webhook URL.'
      };
    }
  }

  return {
    ok: false,
    error: 'Недостаточно данных для подключения',
    hint: 'Заполните Webhook URL или токен MAX.'
  };
}

/**
 * Send structured notification to MAX Messenger (via Webhook or MAX Bot API)
 */
export async function sendMaxNotification(
  order: OrderNotificationPayload,
  settings?: Partial<SiteSettingsRow> | null
): Promise<DetailedNotificationResult> {
  const webhookUrl = settings?.maxWebhookUrl?.trim() || process.env.MAX_WEBHOOK_URL;
  const botToken = settings?.maxBotToken?.trim() || process.env.MAX_BOT_TOKEN;
  const chatId = settings?.maxChatId?.trim() || process.env.MAX_CHAT_ID;

  if (!webhookUrl && !botToken) {
    return {
      success: false,
      status: 'skipped',
      message: 'MAX Webhook URL или Bot Token не заполнены в настройках'
    };
  }

  const productsFormatted = order.productNames && order.productNames.length > 0
    ? order.productNames.map(p => `  • ${p}`).join('\n')
    : (order.productIds ? `Арт: ${order.productIds}` : 'Индивидуальный проект (без артикулов)');

  const textMessage = `
🏛 НОВАЯ ЗАЯВКА НА МЕБЕЛЬ (MAX MESSENGER)
━━━━━━━━━━━━━━━━━━━━
Заявка №: #${order.id}
Заказчик: ${order.customerName}
Телефон: ${order.customerPhone}
${order.customerEmail ? `Email: ${order.customerEmail}\n` : ''}Выбранные изделия:
${productsFormatted}

${order.comment ? `Комментарий:\n"${order.comment}"\n` : ''}Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
━━━━━━━━━━━━━━━━━━━━
TAURIDA ATELIER — Мануфактура элитной мебели (Севастополь)
`.trim();

  // 1. Try sending via MAX Webhook URL if defined
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'new_order',
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          products: order.productNames || [order.productIds],
          comment: order.comment,
          text: textMessage,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok || response.status < 400) {
        console.log(`[Notification:MAX] Webhook delivered for Order #${order.id}`);
        return {
          success: true,
          status: 'sent',
          message: 'Уведомление успешно доставлено в MAX через Webhook'
        };
      } else {
        const errText = await response.text().catch(() => '');
        console.error(`[Notification:MAX] Webhook returned status ${response.status}:`, errText);
        return {
          success: false,
          status: 'error',
          message: `Ошибка MAX Webhook (HTTP ${response.status})`
        };
      }
    } catch (err: any) {
      console.error('[Notification:MAX] Webhook network error:', err);
      return {
        success: false,
        status: 'error',
        message: `Ошибка отправки в MAX Webhook: ${err.message}`
      };
    }
  }

  // 2. Try sending via MAX Bot API
  if (botToken) {
    try {
      const targetUrl = `https://api.max.im/bot${botToken}/sendMessage`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${botToken}`
        },
        body: JSON.stringify({
          chat_id: chatId,
          channel_id: chatId,
          text: textMessage,
          parse_mode: 'Markdown'
        })
      });

      if (response.ok) {
        console.log(`[Notification:MAX] Bot delivered for Order #${order.id}`);
        return {
          success: true,
          status: 'sent',
          message: 'Уведомление успешно доставлено в MAX Bot'
        };
      } else {
        return {
          success: false,
          status: 'error',
          message: `Ошибка отправки MAX Bot (HTTP ${response.status})`
        };
      }
    } catch (err: any) {
      console.error('[Notification:MAX] Bot error:', err);
      return {
        success: false,
        status: 'error',
        message: `Сетевая ошибка MAX Bot: ${err.message}`
      };
    }
  }

  return {
    success: false,
    status: 'skipped',
    message: 'Параметры MAX не настроены'
  };
}

/**
 * Diagnostic helper to verify Telegram Bot Token and Chat ID
 */
export async function verifyTelegramBot(
  token?: string | null,
  chatId?: string | null
): Promise<TelegramVerificationResult> {
  const cleanToken = token?.trim();
  const cleanChatId = chatId?.trim();

  if (!cleanToken) {
    return {
      ok: false,
      error: 'Токен бота не указан',
      hint: 'Создайте бота в @BotFather и вставьте полученный токен (вида 123456789:AAHK...)'
    };
  }

  try {
    // 1. Verify Bot Token via getMe
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return {
        ok: false,
        error: meData.description || 'Неверный токен бота (401 Unauthorized)',
        hint: 'Проверьте, что токен скопирован полностью из @BotFather без лишних пробелов.'
      };
    }

    const botInfo = {
      id: meData.result.id,
      username: meData.result.username,
      firstName: meData.result.first_name
    };

    // 2. If Chat ID is provided, check access to chat
    if (cleanChatId) {
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(cleanChatId)}`);
        const chatData = await chatRes.json();

        if (!chatData.ok) {
          let hint = 'Проверьте Chat ID.';
          const desc = chatData.description || '';

          if (desc.includes('chat not found')) {
            hint = 'Чат не найден. Если это ЛИЧНЫЙ ЧАТ: откройте диалог с @' + botInfo.username + ' и нажмите кнопку СТАРТ (/start). Если это ГРУППА: добавьте бота в группу и сделайте его администратором.';
          } else if (desc.includes('bot was blocked')) {
            hint = 'Бот заблокирован. Откройте диалог с @' + botInfo.username + ' в Telegram и разблокируйте/запустите бота (/start).';
          } else if (desc.includes('bot is not a member')) {
            hint = 'Бот не состоит в указанной группе. Добавьте @' + botInfo.username + ' в группу менеджеров.';
          }

          return {
            ok: false,
            bot: botInfo,
            error: desc,
            hint
          };
        }

        return {
          ok: true,
          bot: botInfo,
          chat: {
            id: chatData.result.id,
            title: chatData.result.title || `${chatData.result.first_name || ''} ${chatData.result.last_name || ''}`.trim(),
            username: chatData.result.username,
            type: chatData.result.type
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          bot: botInfo,
          error: `Ошибка проверки Chat ID: ${err.message}`
        };
      }
    }

    return {
      ok: true,
      bot: botInfo,
      hint: 'Токен бота верный! Теперь укажите Telegram Chat ID для отправки уведомлений.'
    };
  } catch (err: any) {
    return {
      ok: false,
      error: `Сетевая ошибка при запросе к Telegram: ${err.message}`,
      hint: 'Проверьте интернет-соединение сервера или доступность api.telegram.org.'
    };
  }
}

/**
 * Send structured Telegram HTML notification to manager group
 */
export async function sendTelegramNotification(
  order: OrderNotificationPayload,
  settings?: Partial<SiteSettingsRow> | null
): Promise<DetailedNotificationResult> {
  const token = settings?.telegramBotToken?.trim() || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegramChatId?.trim() || process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    return {
      success: false,
      status: 'skipped',
      message: 'Токен Telegram бота не заполнен'
    };
  }

  if (!chatId) {
    return {
      success: false,
      status: 'skipped',
      message: 'Telegram Chat ID не заполнен'
    };
  }

  try {
    const productsFormatted = order.productNames && order.productNames.length > 0
      ? order.productNames.map(p => `  • ${p}`).join('\n')
      : (order.productIds ? `Арт: ${order.productIds}` : 'Индивидуальный проект (без артикулов)');

    const message = `
🏛 <b>НОВАЯ ЗАЯВКА НА МЕБЕЛЬ (КРЫМ)</b>
━━━━━━━━━━━━━━━━━━━━
<b>Заявка №:</b> <code>#${order.id}</code>
<b>Заказчик:</b> ${escapeHtml(order.customerName)}
<b>Телефон:</b> <code>${escapeHtml(order.customerPhone)}</code>
${order.customerEmail ? `<b>Email:</b> ${escapeHtml(order.customerEmail)}\n` : ''}
<b>Выбранные изделия:</b>
${productsFormatted}

${order.comment ? `<b>Комментарий:</b>\n<i>${escapeHtml(order.comment)}</i>\n` : ''}
<b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
━━━━━━━━━━━━━━━━━━━━
<i>TAURIDA ATELIER — Мануфактура элитной мебели (Севастополь)</i>
`.trim();

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('[Notification:Telegram] Error from Telegram API:', data);
      let hint = '';
      const desc = data.description || 'Неизвестная ошибка Telegram API';

      if (desc.includes('chat not found')) {
        hint = ' (Чат не найден. Если это ЛС — напишите боту /start в Telegram. Если группа — добавьте бота в группу)';
      } else if (desc.includes('Unauthorized')) {
        hint = ' (Неверный токен бота в настройках)';
      } else if (desc.includes('bot was blocked')) {
        hint = ' (Пользователь заблокировал бота, запустите бота через /start)';
      }

      return {
        success: false,
        status: 'error',
        message: `${desc}${hint}`,
        details: JSON.stringify(data)
      };
    }

    console.log(`[Notification:Telegram] Notification delivered successfully for Order #${order.id}`);
    return {
      success: true,
      status: 'sent',
      message: 'Уведомление успешно доставлено в Telegram'
    };
  } catch (err: any) {
    console.error('[Notification:Telegram] Network error:', err);
    return {
      success: false,
      status: 'error',
      message: `Сетевая ошибка: ${err.message}`
    };
  }
}

/**
 * Send short SMS notification via SMS.RU (<70 symbols)
 */
export async function sendSmsNotification(
  order: OrderNotificationPayload,
  settings?: Partial<SiteSettingsRow> | null
): Promise<DetailedNotificationResult> {
  const apiId = settings?.smsRuApiId?.trim() || process.env.SMSRU_API_ID;
  const notifyPhone = settings?.notifyPhone?.trim() || process.env.NOTIFY_PHONE;

  if (!apiId || !notifyPhone) {
    return {
      success: false,
      status: 'skipped',
      message: 'SMS.RU API ID или номер менеджера не заполнены'
    };
  }

  try {
    const text = `Taurida Mebel: Заказ #${order.id} от ${order.customerName.slice(0, 15)} тел:${order.customerPhone}`;
    const url = `https://sms.ru/sms/send?api_id=${encodeURIComponent(apiId)}&to=${encodeURIComponent(notifyPhone)}&msg=${encodeURIComponent(text)}&json=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      console.log(`[Notification:SMS] SMS sent for Order #${order.id}`);
      return {
        success: true,
        status: 'sent',
        message: 'SMS успешно отправлено на номер ' + notifyPhone
      };
    } else {
      console.error('[Notification:SMS] SMS.RU Error:', data);
      return {
        success: false,
        status: 'error',
        message: `SMS.RU Ошибка: ${data.status_text || data.status || 'Сбой отправки'}`
      };
    }
  } catch (err: any) {
    console.error('[Notification:SMS] Network error:', err);
    return {
      success: false,
      status: 'error',
      message: `Ошибка отправки SMS: ${err.message}`
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


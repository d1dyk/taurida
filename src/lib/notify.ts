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


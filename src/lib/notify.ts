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

/**
 * Send structured Telegram HTML notification to manager group
 */
export async function sendTelegramNotification(order: OrderNotificationPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log(`[Notification:Telegram] Skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured). Order #${order.id}`);
    return false;
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
<i>TAURIDA ATELIER — Мануфактура элитной мебели</i>
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
      return false;
    }

    console.log(`[Notification:Telegram] Notification sent for Order #${order.id}`);
    return true;
  } catch (err) {
    console.error('[Notification:Telegram] Network error:', err);
    return false;
  }
}

/**
 * Send short SMS notification via SMS.RU (<70 symbols)
 */
export async function sendSmsNotification(order: OrderNotificationPayload): Promise<boolean> {
  const apiId = process.env.SMSRU_API_ID;
  const notifyPhone = process.env.NOTIFY_PHONE;

  if (!apiId || !notifyPhone) {
    console.log(`[Notification:SMS] Skipped (SMSRU_API_ID or NOTIFY_PHONE not configured). Order #${order.id}`);
    return false;
  }

  try {
    const text = `Taurida Mebel: Заказ #${order.id} от ${order.customerName.slice(0, 15)} тел:${order.customerPhone}`;
    const url = `https://sms.ru/sms/send?api_id=${encodeURIComponent(apiId)}&to=${encodeURIComponent(notifyPhone)}&msg=${encodeURIComponent(text)}&json=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      console.log(`[Notification:SMS] SMS sent for Order #${order.id}`);
      return true;
    } else {
      console.error('[Notification:SMS] SMS.RU Error:', data);
      return false;
    }
  } catch (err) {
    console.error('[Notification:SMS] Network error:', err);
    return false;
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

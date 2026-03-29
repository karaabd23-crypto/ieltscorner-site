const BOT_DIRECT_URL = 'https://t.me/Ewithkpaybot';

export const TELEGRAM_SIGNATURE_SEPARATOR = '➖➖➖➖➖➖➖➖➖';
export const TELEGRAM_SIGNATURE_HEADING = "🇨🇦 KAY' S ENGLISH CORNER 🇨🇦";

export const TELEGRAM_SIGNATURE_LINKS = [
  {
    text: '📅 Book your free consultation',
    href: 'https://calendar.app.google/nzoni849GjBUfEac6',
  },
  {
    text: '📲 Question? Ask on WhatsApp',
    href: 'https://wa.me/17789942315',
  },
  {
    text: '🤖 Use the Robot',
    href: BOT_DIRECT_URL,
  },
  {
    text: '🌐 Website: CELPIPcorner.ca',
    href: 'https://ieltscorner.ca',
  },
  {
    text: '📢 Our WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  },
  {
    text: '📸 Instagram',
    href: 'https://instagram.com/ieltscorner.ca',
  },
];

export const TELEGRAM_SIGNATURE_LINES = [
  TELEGRAM_SIGNATURE_SEPARATOR,
  TELEGRAM_SIGNATURE_HEADING,
  TELEGRAM_SIGNATURE_SEPARATOR,
  ...TELEGRAM_SIGNATURE_LINKS.map((item) => item.text),
];

export const TELEGRAM_SIGNATURE_TEXT = TELEGRAM_SIGNATURE_LINES.join('\n\n');

export function hasTelegramSignature(text = '') {
  const value = String(text ?? '');
  return value.includes(TELEGRAM_SIGNATURE_HEADING) || value.includes(TELEGRAM_SIGNATURE_SEPARATOR);
}

export function appendTelegramSignature(body = '') {
  const cleanBody = String(body ?? '').trim();
  if (!cleanBody) return TELEGRAM_SIGNATURE_TEXT;
  if (hasTelegramSignature(cleanBody)) return cleanBody;
  return `${cleanBody}\n\n${TELEGRAM_SIGNATURE_TEXT}`;
}

export function preserveTelegramSpacing(text = '') {
  return String(text).replace(/ /g, '\u00A0');
}

export function getTelegramSignatureLink(text = '') {
  const match = TELEGRAM_SIGNATURE_LINKS.find((item) => item.text === text);
  return match?.href || '';
}

export function formatTelegramSignatureLine(line, escapeTelegramHtml) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return null;

  if (trimmed === TELEGRAM_SIGNATURE_SEPARATOR) {
    return escapeTelegramHtml(trimmed);
  }

  if (trimmed === TELEGRAM_SIGNATURE_HEADING) {
    return `<b>${escapeTelegramHtml(preserveTelegramSpacing(trimmed))}</b>`;
  }

  const signatureHref = getTelegramSignatureLink(trimmed);
  if (signatureHref) {
    return `<a href="${escapeTelegramHtml(signatureHref)}">${escapeTelegramHtml(preserveTelegramSpacing(trimmed))}</a>`;
  }

  return null;
}

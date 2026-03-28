const BOT_DIRECT_URL = 'https://t.me/Ewithkpaybot';

export const TELEGRAM_SIGNATURE_HEADER = "➖➖➖🇨🇦 K A Y ' S    E N G L I S H    C O R N E R 🇨🇦➖➖➖";

export const TELEGRAM_SIGNATURE_LINKS = [
  {
    text: '📅   Book your free consultation',
    href: 'https://calendar.app.google/nzoni849GjBUfEac6',
  },
  {
    text: '📲   Question? Ask us on WhatsApp',
    href: 'https://wa.me/17789942315',
  },
  {
    text: '🤖   Use the Channel Robot',
    href: BOT_DIRECT_URL,
  },
  {
    text: '🌐   Website: https://celpipcorner.ca',
    href: 'https://ieltscorner.ca',
  },
  {
    text: '📢   Follow our WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  },
  {
    text: '📸   Instagram',
    href: 'https://instagram.com/ieltscorner.ca',
  },
];

export const TELEGRAM_SIGNATURE_LINES = [
  TELEGRAM_SIGNATURE_HEADER,
  ...TELEGRAM_SIGNATURE_LINKS.map((item) => item.text),
];

export const TELEGRAM_SIGNATURE_TEXT = TELEGRAM_SIGNATURE_LINES.join('\n\n');

export function hasTelegramSignature(text = '') {
  return String(text ?? '').includes(TELEGRAM_SIGNATURE_HEADER);
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

  if (trimmed === TELEGRAM_SIGNATURE_HEADER) {
    return escapeTelegramHtml(preserveTelegramSpacing(trimmed));
  }

  const signatureHref = getTelegramSignatureLink(trimmed);
  if (signatureHref) {
    return `<a href="${escapeTelegramHtml(signatureHref)}">${escapeTelegramHtml(preserveTelegramSpacing(trimmed))}</a>`;
  }

  return null;
}

// shared/constants.ts
import { ColorblindSymbol, GameLength } from './types';

export const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 4;

export const PLAYER_PALETTE: Array<{ color: string; symbol: ColorblindSymbol; symbolName: string }> = [
  { color: '#EF4444', symbol: 'circle', symbolName: 'Daire' },       // Kırmızı
  { color: '#3B82F6', symbol: 'star', symbolName: 'Yıldız' },        // Mavi
  { color: '#10B981', symbol: 'triangle', symbolName: 'Üçgen' },     // Zümrüt Yeşil
  { color: '#F59E0B', symbol: 'square', symbolName: 'Kare' },        // Amber
  { color: '#8B5CF6', symbol: 'diamond', symbolName: 'Elmas' },      // Mor
  { color: '#EC4899', symbol: 'hexagon', symbolName: 'Altıgen' },    // Pembe
  { color: '#06B6D4', symbol: 'cross', symbolName: 'Artı' },         // Turkuaz
  { color: '#F97316', symbol: 'heart', symbolName: 'Kalp' },         // Turuncu
  { color: '#84CC16', symbol: 'shield', symbolName: 'Kalkan' },      // Limon Yeşili
  { color: '#6366F1', symbol: 'sun', symbolName: 'Güneş' }           // Çivit Mavi
];

export const GAME_LENGTH_CONFIG: Record<GameLength, { capitalHp: number; doomsdaySeconds: number; label: string }> = {
  short: { capitalHp: 2, doomsdaySeconds: 10 * 60, label: 'Kısa (2 Can / 10 Dk)' },
  normal: { capitalHp: 3, doomsdaySeconds: 14 * 60, label: 'Normal (3 Can / 14 Dk)' },
  long: { capitalHp: 4, doomsdaySeconds: 18 * 60, label: 'Uzun (4 Can / 18 Dk)' }
};

export const TIMERS = {
  COUNTDOWN_SECONDS: 5,
  QUESTION_DEFAULT_SECONDS: 20,
  QUESTION_RESULT_SECONDS: 6,
  CAPITAL_SELECTION_SECONDS: 12,
  TURN_MOVE_SECONDS: 9,
  DISCONNECT_GRACE_SECONDS: 20
};

export const CATEGORY_NAMES: Record<string, string> = {
  turkiye_cografyasi: 'Türkiye Coğrafyası',
  tarih: 'Tarih',
  genel_kultur: 'Genel Kültür',
  bilim_teknoloji: 'Bilim & Teknoloji',
  doga_hayvanlar: 'Doğa & Hayvanlar',
  spor: 'Spor',
  sanat_edebiyat: 'Sanat & Edebiyat',
  sinema: 'Sinema & Tiyatro',
  yemek_kultur: 'Yemek & Kültür',
  dunya_cografyasi: 'Dünya Coğrafyası'
};

export const REACTION_EMOJIS = ['🔥', '👏', '🎯', '🤔', '😱', '👑', '🛡️', '⚡'];

// Simple profanity filter for nicknames
const PROFANITY_WORDS = [
  'amk', 'aq', 'oç', 'orospu', 'piç', 'sik', 'yarrak', 'göt', 'ibne', 'puşt', 'amcık',
  'kahpe', 'pezevenk', 'yarak', 'siktir', 'orospuçocuğu'
];

export function validatePlayerName(name: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'İsim alanı boş bırakılamaz.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'İsim en az 2 karakter olmalıdır.' };
  }
  if (trimmed.length > 14) {
    return { valid: false, error: 'İsim en fazla 14 karakter olabilir.' };
  }
  // Allow Turkish letters, numbers, spaces
  const regex = /^[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]+$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: 'İsimde emoji veya özel karakter kullanılamaz.' };
  }
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  for (const word of PROFANITY_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, error: 'Lütfen uygun bir takma ad seçiniz.' };
    }
  }
  return { valid: true, sanitized: trimmed };
}

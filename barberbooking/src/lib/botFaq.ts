import { BUSINESS_ADDRESS } from './siteConfig';

export type FaqEntry = {
  keywords: string[];
  answer: string;
};

// Edit freely — each entry replies with `answer` if any of its `keywords` appears in the user message.
export const BOT_FAQ: FaqEntry[] = [
  {
    keywords: ['שעות', 'פתוח', 'פתוחים', 'מתי', 'סגור'],
    answer: 'אנחנו פתוחים ראשון–שישי 9:00–19:00. בשבת סגור. 🗓️',
  },
  {
    keywords: ['מחיר', 'עולה', 'כמה', 'מחירון', 'תעריף'],
    answer: 'תספורת 60₪ · עיצוב זקן 40₪ · תספורת+זקן 90₪ · תספורת ילדים 40₪ · פייד 70₪',
  },
  {
    keywords: ['כתובת', 'איפה', 'מיקום', 'חניה', 'להגיע'],
    answer: `אנחנו ב${BUSINESS_ADDRESS}. לפרטי הגעה מדויקים שלחו הודעה בוואטסאפ 💬`,
  },
  {
    keywords: ['ביטול', 'לבטל', 'לשנות', 'שינוי', 'לדחות'],
    answer: 'לביטול או שינוי תור — צרו קשר בוואטסאפ ונסדר הכל. 🙏',
  },
  {
    keywords: ['תשלום', 'אשראי', 'מזומן', 'ביט', 'לשלם'],
    answer: 'התשלום במספרה — מזומן, אשראי או ביט. 💳',
  },
];

export function matchFaq(text: string): string | null {
  const lower = text.trim();
  for (const entry of BOT_FAQ) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return null;
}

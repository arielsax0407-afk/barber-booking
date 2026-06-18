// Default WhatsApp message templates — editable by the admin via
// the Settings tab (stored in the `wa_templates` table, falling
// back to these defaults when no override exists).

export type WaTemplateKey = 'approve' | 'reject' | 'reschedule' | 'cancel';

export const WA_TEMPLATE_KEYS: WaTemplateKey[] = ['approve', 'reject', 'reschedule', 'cancel'];

export const WA_TEMPLATE_LABELS: Record<WaTemplateKey, string> = {
  approve: 'אישור תור',
  reject: 'דחיית תור',
  reschedule: 'שינוי תור',
  cancel: 'ביטול תור',
};

export const DEFAULT_WA_TEMPLATES: Record<WaTemplateKey, string> = {
  approve: `שלום {{name}}! 🎉\nהתור שלך אושר:\n✂️ {{service}}\n📅 {{date}}\n⏰ {{time}}\n\nמחכים לך ב-ברבר פרמיום! 💈`,
  reject: `שלום {{name}},\nמצטערים, לא נוכל לקבל אותך בזמן שביקשת.\nאנחנו מזמינים אותך לקבוע תור חדש דרך האתר.\nתודה! 🙏`,
  reschedule: `שלום {{name}},\nנשמח לשנות את התור שלך.\nאנא היכנס לאתר וקבע תור חדש.\nתודה! 💈`,
  cancel: `שלום {{name}},\nלצערנו נאלצנו לבטל את התור שלך:\n✂️ {{service}}\n📅 {{date}} בשעה {{time}}\nמוזמן/ת לקבוע תור חדש דרך האתר בכל זמן שנוח לך.\nמצטערים על האי-נוחות 🙏`,
};

export const WA_PLACEHOLDER_HELP = '{{name}} · {{service}} · {{date}} · {{time}} · {{price}}';

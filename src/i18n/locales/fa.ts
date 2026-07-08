/**
 * Persian (فارسی) translations.
 *
 * معیارهای ترجمه:
 * - متن‌های فنی (مثل "Lite / Pro / Max") که برند محصول هستن، ترجمه نمی‌شن.
 * - اعداد به فارسی نمایش داده می‌شن (۱، ۲، ۳) ولی در فرمول‌ها انگلیسی می‌مونن.
 * - افعال به صورت محاوره‌ای ترجمه می‌شن، نه کتابی.
 */

export const fa: Record<string, string> = {
  // ── عمومی ───────────────────────────────────────────────────────────
  'common.save': 'ذخیره',
  'common.cancel': 'انصراف',
  'common.delete': 'حذف',
  'common.confirm': 'تأیید',
  'common.close': 'بستن',
  'common.back': 'بازگشت',
  'common.done': 'تمام',
  'common.loading': 'در حال بارگذاری…',
  'common.error': 'خطا',
  'common.retry': 'تلاش دوباره',
  'common.send': 'ارسال',
  'common.edit': 'ویرایش',
  'common.rename': 'تغییر نام',
  'common.search': 'جستجو',
  'common.none': 'هیچ',
  'common.yes': 'بله',
  'common.no': 'خیر',

  // ── نوار پایین ──────────────────────────────────────────────────────
  'nav.chat': 'گفتگو',
  'nav.context': 'زمینه',
  'nav.npcs': 'شخصیت‌ها',
  'nav.settings': 'تنظیمات',

  // ── تنظیمات ─────────────────────────────────────────────────────────
  'settings.title': 'تنظیمات',
  'settings.providers': 'ارائه‌دهنده‌ها',
  'settings.presets': 'پیش‌تنظیم‌ها',
  'settings.global': 'عمومی',
  'settings.advanced': 'پیشرفته',
  'settings.debug': 'اشکال‌زدایی',
  'settings.language': 'زبان',
  'settings.language.desc': 'زبان برنامه را انتخاب کنید',

  // ── تنظیمات → عمومی ─────────────────────────────────────────────────
  'settings.global.title': 'ترجیحات عمومی',
  'settings.global.maxContext': 'حداکثر زمینه (توکن)',
  'settings.global.matureMode': 'حالت بزرگسال',
  'settings.global.matureMode.desc': 'ویژگی‌ها، خواسته‌ها و واکنش‌های NPC در سطح بزرگسال را باز می‌کند (تم‌های تاریک‌تر و بزرگسالانه).',
  'settings.global.tts': 'خواندن با صدا (TTS)',
  'settings.global.tts.desc': 'دکمه بلندگو روی پیام‌های استاد بازی، پاسخ را با صدا می‌خواند. از صدای داخلی دستگاه شما استفاده می‌کند (آفلاین، بدون دانلود).',
  'settings.global.tts.rate': 'سرعت پخش',
  'settings.global.tts.rateSlow': '۰.۵× کند',
  'settings.global.tts.rateFast': '۲× تند',

  // ── گفتگو ───────────────────────────────────────────────────────────
  'chat.input.placeholder': 'چه می‌کنی؟',
  'chat.send': 'ارسال',
  'chat.stop': 'توقف',
  'chat.regenerate': 'تولید دوباره',
  'chat.retry': 'تلاش دوباره',
  'chat.thinking': 'در حال فکر کردن…',
  'chat.empty': 'ماجراجویی‌ات را آغاز کن',
  'chat.empty.desc': 'برای شروع داستانت پایین تایپ کن',
  'chat.copy': 'کپی',
  'chat.copied': 'کپی شد',
  'chat.readAloud': 'خواندن با صدا',
  'chat.stopReading': 'توقف خواندن',

  // ─ـ هاب کمپین ───────────────────────────────────────────────────────
  'campaign.title': 'کمپین‌ها',
  'campaign.new': 'کمپین جدید',
  'campaign.edit': 'ویرایش کمپین',
  'campaign.name': 'نام کمپین',
  'campaign.cover': 'تصویر جلد',
  'campaign.cover.drop': 'کلیک کن یا تصویر را رها کن',
  'campaign.lore': 'فایل لور',
  'campaign.lore.desc': 'با هدرهای ### به تکه‌هایی برای بازیابی پویا تقسیم می‌شود',
  'campaign.rules': 'فایل قوانین',
  'campaign.rules.desc': 'قوانین سیستم — همیشه فعال',
  'campaign.loot': 'فایل غنائم',
  'campaign.loot.desc': 'درخت غنائم جهان — دکمه غنیمت را تغذیه می‌کند (افتادگی‌های دستی)',
  'campaign.delete': 'این کمپین حذف شود؟ تمام داده‌ها (گفتگو، لور، ذخیره‌ها) از بین می‌رود.',
  'campaign.noBackups': 'هنوز پشتیبانی وجود ندارد',
  'campaign.noBackups.desc': 'اولین پشتیبان خود را در بالا بسازید',
  'campaign.play': 'بازی',
  'campaign.lastPlayed': 'آخرین بازی',
  'campaign.continue': 'ادامه',

  // ── هدر ─────────────────────────────────────────────────────────────
  'header.roll': 'پرتاب (۱d20)',
  'header.advantage': 'برتری (۲d20 ↑)',
  'header.disadvantage': 'برتری منفی (۲d20 ↓)',
  'header.tier': 'سطح',
  'header.tier.lite': 'سبک',
  'header.tier.pro': 'حرفه‌ای',
  'header.tier.max': 'حداکثر',

  // ── NPC ─────────────────────────────────────────────────────────────
  'npc.ledger.title': 'دفترچه NPC',
  'npc.ledger.empty': 'هنوز NPC وجود ندارد',
  'npc.ledger.empty.desc': 'NPCها با ورود به داستانت اینجا ظاهر می‌شوند',
  'npc.add': 'افزودن NPC',
  'npc.hasDrives': 'انگیزه دارد',
  'npc.hasTriggers': 'محرک دارد',

  // ── پشتیبان ─────────────────────────────────────────────────────────
  'backup.title': 'پشتیبان‌های کمپین',
  'backup.create': 'ایجاد پشتیبان',
  'backup.restore': 'بازیابی',
  'backup.export': 'خروجی',
  'backup.import': 'ورودی',

  // ── کشوی زمینه ──────────────────────────────────────────────────────
  'context.title': 'زمینه',
  'context.lore': 'لور',
  'context.chapters': 'فصل‌ها',
  'context.facts': 'حقایق',
  'context.pinned': 'سنجاق شده',
};

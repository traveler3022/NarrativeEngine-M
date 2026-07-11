# Evidence-First Discovery Protocol

## Zero Assumption Rule

هیچ نتیجه، نمودار، مرز معماری، Capability، Responsibility یا پیشنهاد
Refactor نباید بر اساس:

- حافظه مدل
- گفتگوهای قبلی
- طراحی پیشنهادی
- الگوهای معماری
- حدس

تولید شود.

تنها منبع حقیقت، Repository فعلی است.

هر نتیجه باید یکی از این وضعیت‌ها را داشته باشد:

- ✅ Verified — مستقیماً از روی کد اثبات شده است.
- ⚠️ Inferred — از روی کد قابل استنباط است ولی شواهد کامل ندارد.
- ❌ Unknown — از روی Repository قابل تعیین نیست.

## Evidence Requirement

هر ادعا باید Evidence داشته باشد:

| Field | Description |
|-------|-------------|
| Files | فایل‌های مرتبط |
| Symbols | نمادهای (توابع/کلاس‌ها) مرتبط |
| Imports | import‌های مرتبط |
| Callers | چه کسی صدا می‌زند |
| Callees | خودش چه چیزی صدا می‌زند |
| Lines | خطوط مرتبط |
| Extraction Method | روش استخراج (AST, grep, scan) |
| Confidence | Verified / Inferred / Unknown |

## Deliverables per Step

هر مرحله فقط زمانی Complete محسوب می‌شود که شامل:

1. REPORT.md
2. RAW_DATA.json
3. Evidence (in REPORT or separate)
4. Generated Diagrams
5. Summary
6. Open Questions
7. Unknowns
8. Architecture Risks
9. Recommendations
10. Git Commit
11. Git Push
12. Review (human)

## Completion Gate

قبل از ورود به مرحله بعد:

- همه ادعاها Evidence دارند.
- همه نمودارها از روی Repository تولید شده‌اند.
- هیچ بخشی بر اساس حدس نوشته نشده است.
- Open Questionها ثبت شده‌اند.
- Unknownها ثبت شده‌اند.
- Commit و Push انجام شده‌اند.
- Review تأیید شده است.

## Discovery is Truth

اگر در هر مرحله نتیجه Discovery با فرضیات یا طراحی قبلی مغایرت داشت،
Discovery مرجع حقیقت است و تمام فرضیات قبلی باید کنار گذاشته شوند.
هیچ طراحی، Port، Repository یا Boundary قبل از پایان کامل Discovery
معتبر نیست.

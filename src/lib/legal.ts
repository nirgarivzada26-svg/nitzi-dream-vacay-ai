// Legal documents — client-safe content.
//
// Every document is rendered from here at /legal/{slug} and linked from the
// footer. Company-specific facts (name, tax id, address, contacts) are injected
// from system_settings.company_profile — when a value is missing the document
// says so explicitly instead of inventing a detail.

import type { CompanyProfile } from "./company";

export type LegalSlug =
  | "privacy"
  | "terms"
  | "cookies"
  | "accessibility"
  | "refunds"
  | "cancellation"
  | "travel-terms";

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const missing = "לא הוגדר — יש להשלים בהגדרות המערכת";
const val = (s: string) => (s.trim() ? s.trim() : missing);

export function buildLegalDocuments(c: CompanyProfile): LegalDocument[] {
  const operator = `${val(c.business_name)} (ח.פ ${val(c.tax_id)}), ${val(c.address)}`;
  const support = `${val(c.support_email)} · ${val(c.support_phone)}`;

  return [
    {
      slug: "privacy",
      title: "מדיניות פרטיות",
      summary: "אילו נתונים נאספים, לשם מה, וכיצד ניתן לממש זכויות מידע.",
      sections: [
        {
          heading: "מי מפעיל את השירות",
          body: [`השירות מופעל על ידי ${operator}. פניות בנושא פרטיות: ${val(c.legal_contact)}.`],
        },
        {
          heading: "מידע שנאסף",
          body: [
            "פרטי חשבון: כתובת אימייל ומזהה משתמש, לצורך התחברות וניהול ההזמנות.",
            "פרטי הזמנה: שמות נוסעים, תאריכי לידה, פרטי דרכון, אימייל וטלפון — נדרשים על ידי ספקי הטיסות והמלונות לצורך הנפקת ההזמנה.",
            "נתוני שימוש: חיפושים, יעדים שנצפו ואירועי מערכת, לצורך שיפור ההמלצות ואיתור תקלות.",
            "נתוני תשלום: פרטי הכרטיס נמסרים ישירות לחברת הסליקה. NITZI שומרת רק מזהה עסקה, סכום, מטבע וסטטוס.",
          ],
        },
        {
          heading: "העברת מידע לצדדים שלישיים",
          body: [
            "מידע מועבר רק לספקים הדרושים לביצוע ההזמנה: ספקי טיסות ומלונות, חברת סליקה, ספק דיוור וספק הודעות SMS.",
            "המידע אינו נמכר ואינו מועבר לצרכי פרסום של צד שלישי.",
          ],
        },
        {
          heading: "שמירה ומחיקה",
          body: [
            "מסמכי הזמנה וחשבוניות נשמרים כנדרש בדין לצורכי מס וחשבונאות.",
            `למימוש זכות עיון, תיקון או מחיקה יש לפנות אל ${val(c.legal_contact)}. מענה יינתן בתוך 30 יום.`,
          ],
        },
        {
          heading: "אבטחת מידע",
          body: [
            "התעבורה מוצפנת ב-HTTPS, ההרשאות למסד הנתונים נאכפות ברמת השורה, וסודות הפרודקשן נשמרים במאגר סודות מנוהל ולא בקוד.",
          ],
        },
      ],
    },
    {
      slug: "terms",
      title: "תנאי שימוש",
      summary: "הכללים לשימוש בפלטפורמה ולביצוע הזמנות דרכה.",
      sections: [
        {
          heading: "הגדרת השירות",
          body: [
            `${val(c.business_name)} מפעילה פלטפורמה לחיפוש והזמנת טיסות, מלונות וחבילות נופש, לרבות המלצות מבוססות AI.`,
            "המחירים מוצגים רק כאשר התקבל אימות מהספק. מוצר שלא אומת מוצג כ״לא זמין כרגע״.",
          ],
        },
        {
          heading: "כשרות משפטית",
          body: [
            "השימוש מותר מגיל 18 ומעלה ובעל כשרות משפטית להתקשר בחוזה.",
            "המשתמש אחראי לנכונות פרטי הנוסעים; פרטים שגויים עלולים לגרור דמי שינוי מצד הספק.",
          ],
        },
        {
          heading: "אחריות",
          body: [
            "שירותי הטיסה והלינה מסופקים על ידי הספקים עצמם ובכפוף לתנאיהם.",
            "NITZI אחראית לתהליך ההזמנה, לגבייה ולתמיכה, ואינה אחראית לשינויים תפעוליים של הספק (עיכובים, שינויי לוח זמנים, סגירת מתקנים).",
          ],
        },
        {
          heading: "יצירת קשר",
          body: [`תמיכה: ${support}. פניות משפטיות: ${val(c.legal_contact)}.`],
        },
      ],
    },
    {
      slug: "cookies",
      title: "מדיניות עוגיות",
      summary: "אילו עוגיות נשמרות בדפדפן ולאיזו מטרה.",
      sections: [
        {
          heading: "עוגיות הכרחיות",
          body: [
            "עוגיות התחברות (Session) המאפשרות להישאר מחוברים ולגשת לאזור האישי. ללא עוגיות אלה לא ניתן לבצע הזמנה.",
          ],
        },
        {
          heading: "העדפות",
          body: ["אחסון מקומי בדפדפן שומר את החיפוש האחרון, רשימת ההשוואה והעדפות תצוגה."],
        },
        {
          heading: "ניהול",
          body: [
            "ניתן למחוק עוגיות בכל עת דרך הגדרות הדפדפן. מחיקה תנתק את החשבון ותאפס העדפות תצוגה.",
          ],
        },
      ],
    },
    {
      slug: "accessibility",
      title: "הצהרת נגישות",
      summary: "רמת הנגישות של האתר ודרכי פנייה לרכז הנגישות.",
      sections: [
        {
          heading: "מחויבות",
          body: [
            `${val(c.business_name)} פועלת להנגשת השירות לכלל המשתמשים, לרבות אנשים עם מוגבלות.`,
            "האתר נבנה עם HTML סמנטי, ניגודיות צבעים גבוהה, תמיכה מלאה בעברית ו-RTL, ניווט מקלדת ותוויות ARIA לרכיבים אינטראקטיביים.",
          ],
        },
        {
          heading: "מגבלות ידועות",
          body: ["רכיבי מפה ואנימציה מסוימים עשויים להיות מוגבלים בקוראי מסך. אנו פועלים לשיפורם."],
        },
        {
          heading: "פנייה לרכז הנגישות",
          body: [
            `ניתן לדווח על בעיית נגישות בכתובת ${val(c.support_email)} או בטלפון ${val(c.support_phone)}.`,
          ],
        },
      ],
    },
    {
      slug: "refunds",
      title: "מדיניות החזרים",
      summary: "מתי מגיע החזר, כמה זמן הוא לוקח ולאן פונים.",
      sections: [
        {
          heading: "זכאות",
          body: [
            "ביטול בהתאם לחוק הגנת הצרכן: תוך 14 ימים ממועד ביצוע העסקה ובלבד שנותרו לפחות 7 ימי עסקים עד מועד היציאה.",
            "מעבר לכך חלים תנאי הספק המוצגים בעמוד הדיל לפני התשלום.",
          ],
        },
        {
          heading: "אופן הביצוע",
          body: [
            "החזר מבוצע לאמצעי התשלום המקורי בלבד, דרך חברת הסליקה, ומתועד בהזמנה עם סטטוס ההחזר.",
            "זמן זיכוי משוער: עד 14 ימי עסקים, בכפוף לחברת האשראי.",
          ],
        },
        { heading: "פנייה", body: [`בקשות החזר: ${val(c.refund_contact)}.`] },
      ],
    },
    {
      slug: "cancellation",
      title: "מדיניות ביטולים",
      summary: "דמי ביטול, מועדים ותהליך הביטול.",
      sections: [
        {
          heading: "ביטול יזום על ידי הלקוח",
          body: [
            "ניתן לבקש ביטול מתוך עמוד ניהול ההזמנה באזור האישי.",
            "דמי הביטול נקבעים על ידי הספק ומוצגים בעמוד ההזמנה לפני האישור.",
          ],
        },
        {
          heading: "ביטול על ידי הספק",
          body: [
            "בוטלה הטיסה או הלינה על ידי הספק — יבוצע החזר מלא של הרכיב שבוטל, או הצעת חלופה לאישור הלקוח.",
          ],
        },
        {
          heading: "תיעוד",
          body: ["כל ביטול נרשם בהזמנה עם מועד הביטול, סטטוס ההחזר ומזהה עסקת הסליקה."],
        },
      ],
    },
    {
      slug: "travel-terms",
      title: "תנאי נסיעה",
      summary: "דרכונים, ויזות, בריאות וכבודה — באחריות הנוסע.",
      sections: [
        {
          heading: "מסמכי נסיעה",
          body: [
            "על הנוסע לוודא דרכון בתוקף של לפחות 6 חודשים ממועד היציאה, ואשרות כניסה ככל שנדרשות ליעד.",
            "כניסה שנמנעה בשל מסמך חסר אינה מזכה בהחזר.",
          ],
        },
        {
          heading: "בריאות וביטוח",
          body: ["מומלץ לרכוש ביטוח נסיעות. דרישות חיסון או בריאות ביעד הן באחריות הנוסע."],
        },
        {
          heading: "כבודה ושינויים",
          body: [
            "מדיניות הכבודה מוצגת בפרטי הטיסה כפי שהתקבלה מהספק.",
            "שינוי שם, תאריך או מסלול כפוף לתנאי הספק ולדמי שינוי.",
          ],
        },
        { heading: "כתובת המפעיל", body: [operator] },
      ],
    },
  ];
}

export const LEGAL_SLUGS: LegalSlug[] = [
  "privacy",
  "terms",
  "cookies",
  "accessibility",
  "refunds",
  "cancellation",
  "travel-terms",
];

export const LEGAL_TITLES: Record<LegalSlug, string> = {
  privacy: "מדיניות פרטיות",
  terms: "תנאי שימוש",
  cookies: "מדיניות עוגיות",
  accessibility: "הצהרת נגישות",
  refunds: "מדיניות החזרים",
  cancellation: "מדיניות ביטולים",
  "travel-terms": "תנאי נסיעה",
};

/** The exact links the footer renders — the launch checklist verifies this list. */
export const FOOTER_LEGAL_LINKS = LEGAL_SLUGS.map((slug) => ({
  slug,
  label: LEGAL_TITLES[slug],
  href: `/legal/${slug}`,
}));

export function getLegalDocument(slug: string, c: CompanyProfile): LegalDocument | null {
  return buildLegalDocuments(c).find((d) => d.slug === slug) ?? null;
}

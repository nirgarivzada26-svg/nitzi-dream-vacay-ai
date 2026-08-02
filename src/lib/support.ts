// Support center data layer. Requests are stored per user (RLS scoped);
// staff can read them from the admin area.

import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_TOPICS = [
  { id: "booking", label: "שאלה על הזמנה קיימת" },
  { id: "cancel", label: "ביטול הזמנה" },
  { id: "refund", label: "בקשת החזר כספי" },
  { id: "payment", label: "תשלום וחשבונית" },
  { id: "problem", label: "דיווח על תקלה" },
  { id: "other", label: "אחר" },
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]["id"];

export interface SupportRequestRow {
  id: string;
  topic: string;
  email: string;
  message: string;
  status: string;
  booking_id: string | null;
  created_at: string;
}

export function topicLabel(id: string) {
  return SUPPORT_TOPICS.find((t) => t.id === id)?.label ?? id;
}

export async function createSupportRequest(input: {
  topic: SupportTopic;
  email: string;
  message: string;
  bookingId?: string | null;
}): Promise<SupportRequestRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("צריך להתחבר כדי לפתוח פנייה");
  const message = input.message.trim();
  if (message.length < 10) throw new Error("נא לפרט מעט יותר (לפחות 10 תווים)");
  if (message.length > 4000) throw new Error("ההודעה ארוכה מדי");
  if (!/\S+@\S+\.\S+/.test(input.email)) throw new Error("כתובת אימייל לא תקינה");

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      topic: input.topic,
      email: input.email.trim(),
      message,
      booking_id: input.bookingId ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as SupportRequestRow;
}

export async function listSupportRequests(): Promise<SupportRequestRow[]> {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as SupportRequestRow[];
}

export const SUPPORT_FAQ: { q: string; a: string }[] = [
  {
    q: "איך אני מבטל הזמנה?",
    a: "באזור האישי → ההזמנות שלי → ניהול הזמנה → ביטול הזמנה. הביטול נרשם מיידית והסטטוס מתעדכן ל״מבוטלת״. בדילים עם ביטול חינם לא נגבים דמי ביטול.",
  },
  {
    q: "מתי מתקבל ההחזר הכספי?",
    a: "לאחר בקשת החזר הסטטוס עובר ל״בטיפול״. במצב הדמו הסליקה אינה אמיתית ולכן לא מבוצע חיוב או זיכוי בפועל.",
  },
  {
    q: "איפה השובר והחשבונית שלי?",
    a: "בעמוד ניהול ההזמנה אפשר להוריד אישור הזמנה, שובר נסיעה וחשבונית. כל מסמך נפתח כדף מוכן להדפסה ונשמר כ-PDF דרך Ctrl/Cmd + P.",
  },
  {
    q: "המחיר השתנה בין החיפוש לתשלום — למה?",
    a: "לפני כל חיוב NITZI מריצה בדיקת מחיר וזמינות מול הספק. אם המחיר השתנה נציג את השינוי ונבקש אישור מפורש לפני המשך.",
  },
  {
    q: "האם ההזמנות אמיתיות?",
    a: "NITZI פועלת כרגע במצב הדגמה: הנתונים מגיעים משכבת ספקים אחידה והתשלום אינו אמיתי. המעבר לספקים חיים אינו דורש שינוי במסכים.",
  },
  {
    q: "איך פותחים התראת מחיר?",
    a: "בעמוד הדיל לוחצים על ״התראת מחיר״ ומגדירים מחיר יעד לאדם. נעדכן אתכם כשהמחיר יורד אל היעד.",
  },
];

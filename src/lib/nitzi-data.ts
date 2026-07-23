export type TripType = "beach" | "adventure" | "romantic" | "family" | "friends" | "nightlife" | "nature";
export type TripStyle = "chill" | "luxury" | "young" | "smart";

export interface QuizAnswers {
  type: TripType | null;
  destination: string;
  days: number;
  budget: number;
  people: number;
  style: TripStyle | null;
}

export const defaultAnswers: QuizAnswers = {
  type: null,
  destination: "",
  days: 5,
  budget: 5000,
  people: 2,
  style: null,
};

export const tripTypes: { id: TripType; label: string; emoji: string; desc: string }[] = [
  { id: "beach", label: "ים ושמש", emoji: "🏖️", desc: "חופים לבנים ומים טורקיז" },
  { id: "adventure", label: "הרפתקה", emoji: "🏔️", desc: "טרקים, אקסטרים ואדרנלין" },
  { id: "romantic", label: "זוגי", emoji: "💞", desc: "שקיעות ורגעים קסומים" },
  { id: "family", label: "משפחה", emoji: "👨‍👩‍👧", desc: "כיף לכל הגילאים" },
  { id: "friends", label: "חברים", emoji: "🎉", desc: "טיול של חבורה" },
  { id: "nightlife", label: "חיי לילה", emoji: "🌃", desc: "מועדונים, ברים ובילויים" },
  { id: "nature", label: "טבע", emoji: "🌿", desc: "נופים פראיים ושקט" },
];

export const styles: { id: TripStyle; label: string; emoji: string }[] = [
  { id: "chill", label: "רגוע", emoji: "🧘" },
  { id: "luxury", label: "יוקרתי", emoji: "✨" },
  { id: "young", label: "צעיר", emoji: "🕶️" },
  { id: "smart", label: "זול וחכם", emoji: "🎯" },
];

interface Destination {
  name: string;
  country: string;
  emoji: string;
  matches: TripType[];
  tagline: string;
  hotels: { name: string; note: string }[];
  attractions: string[];
  restaurants: string[];
  itinerary: string[];
}

const destinations: Destination[] = [
  {
    name: "מיקונוס",
    country: "יוון",
    emoji: "🇬🇷",
    matches: ["beach", "nightlife", "friends", "romantic"],
    tagline: "האי הלבן-כחול של האגאי — שילוב מושלם של חופים, מסיבות שקיעה ואווירה ים תיכונית קסומה.",
    hotels: [
      { name: "Cavo Tagoo", note: "בוטיק עם בריכת אינפיניטי מול הים" },
      { name: "Semeli Hotel", note: "לב העיר, יחס איכות־מחיר מעולה" },
      { name: "Rocabella", note: "נוף מטורף לשקיעה של מיקונוס" },
    ],
    attractions: ["חוף Paradise ו-Super Paradise", "העיר העתיקה Chora וטחנות הרוח", "שייט סאנסט לדלוס", "מסיבת יום ב-Scorpios"],
    restaurants: ["Kiki's Tavern — דגים על הגריל", "Nammos — בראנץ' על החוף", "Ling Ling — אסייתי יוקרתי"],
    itinerary: [
      "נחיתה, צ'ק־אין וסיבוב בעיר העתיקה עם שקיעה בליטל ונציה",
      "יום חוף ב-Paradise Beach ומסיבת יום",
      "שייט פרטי לדלוס עם עצירות שנורקלינג",
      "יום ספא + ארוחת ערב יוקרתית ב-Nammos",
      "בוקר רגוע, קניות בעיר וטיסה חזרה",
    ],
  },
  {
    name: "באלי",
    country: "אינדונזיה",
    emoji: "🇮🇩",
    matches: ["nature", "adventure", "romantic", "chill" as unknown as TripType],
    tagline: "אי של אורז, מקדשים וגלים — חוויה רוחנית וטרופית שמשלבת הרפתקה, יוגה וחופים אינסופיים.",
    hotels: [
      { name: "Hanging Gardens Ubud", note: "בריכות מדורגות בג'ונגל" },
      { name: "Potato Head Suites", note: "בסמוק לצד החוף והמועדון" },
      { name: "Bambu Indah", note: "וילות במבוק אקולוגיות" },
    ],
    attractions: ["מקדש Tanah Lot בשקיעה", "מדרגות האורז ב-Tegallalang", "גלישה ב-Uluwatu", "הר הגעש Mount Batur לזריחה"],
    restaurants: ["Locavore — טעימות שף באובוד", "La Brisa — על החוף בצ'נגו", "Room4Dessert — קינוחים אמנותיים"],
    itinerary: [
      "נחיתה בדנפסאר, מנוחה בווילה עם בריכה פרטית",
      "יום באובוד: מקדש הקופים ומדרגות האורז",
      "טיפוס לזריחה על Mount Batur",
      "יום גלישה וספא בסמוק",
      "מקדשים ב-Uluwatu + מופע קצ'אק לשקיעה",
      "צ'ילינג בנוסה דואה",
      "קניות ופרידה בצ'נגו",
    ],
  },
  {
    name: "לפלנד",
    country: "פינלנד",
    emoji: "🇫🇮",
    matches: ["adventure", "family", "nature", "romantic"],
    tagline: "ממלכת שלג קסומה עם זוהר צפוני, מזחלות האסקי ובקתות זכוכית מתחת לכוכבים.",
    hotels: [
      { name: "Kakslauttanen Igloo", note: "איגלו זכוכית לצפייה בזוהר הצפוני" },
      { name: "Arctic TreeHouse", note: "בקתות עץ מודרניות ביער" },
      { name: "Santa's Hotel", note: "אווירת חג לכל המשפחה" },
    ],
    attractions: ["ציד זוהר צפוני", "מזחלות האסקי וראיינדיר", "כפר סנטה קלאוס ברובנימי", "סנואומוביל ביערות הקפואים"],
    restaurants: ["Nili — מטבח לאפי אותנטי", "Aanaar — סלמון מעושן על עצי אלון", "Roka Kitchen — נורדי מודרני"],
    itinerary: [
      "נחיתה ברובנימי, ערב אח וסאונה",
      "מזחלות האסקי + סיור בכפר סנטה",
      "יום סנואומוביל בטבע הפראי",
      "לילה באיגלו זכוכית עם זוהר צפוני",
      "סקי קל וספא לפני חזרה",
    ],
  },
  {
    name: "טוקיו",
    country: "יפן",
    emoji: "🇯🇵",
    matches: ["nightlife", "adventure", "friends", "young" as unknown as TripType],
    tagline: "עיר שלא ישנה — נאונים, סושי, מקדשים עתיקים ותרבות פופ בלי סוף.",
    hotels: [
      { name: "Aman Tokyo", note: "יוקרה יפנית מודרנית עם נוף עוצר נשימה" },
      { name: "Hoshinoya Tokyo", note: "ריוקאן עירוני עם אונסן פרטי" },
      { name: "Shibuya Stream Excel", note: "מרכזי, ליד המעבר המפורסם" },
    ],
    attractions: ["מעבר שיבויה וטיילת הרג'וקו", "מקדש סנסו-ג'י באסאקוסה", "TeamLab Planets", "סיור אוכל בשינג'וקו גולדן גאי"],
    restaurants: ["Sukiyabashi Jiro — סושי אגדי", "Ichiran Ramen — טונקוצו קלאסי", "Narisawa — מטבח קייסקי עכשווי"],
    itinerary: [
      "נחיתה, מנוחה וסיור לילי בשינג'וקו",
      "אסאקוסה, אואנו ומוזיאון TeamLab",
      "יום קניות בהרג'וקו + שיבויה",
      "טיול יום להאקונה למעיינות חמים",
      "אקיהברה, גיימינג וברים נסתרים",
      "שוק צוקיג'י ובראנץ' סושי + טיסה",
    ],
  },
  {
    name: "ליסבון",
    country: "פורטוגל",
    emoji: "🇵🇹",
    matches: ["romantic", "friends", "nightlife", "family"],
    tagline: "עיר של אריחים, פאדו וגבעות עם נוף לים — טעימה של אירופה עם נשמה חמה.",
    hotels: [
      { name: "Memmo Alfama", note: "בוטיק עם בריכה ונוף לטאז'ו" },
      { name: "The Lumiares", note: "סוויטות מעוצבות בבאירו אלטו" },
      { name: "Santiago de Alfama", note: "מלון קסום ברובע העתיק" },
    ],
    attractions: ["טרמוויי 28", "מגדל בלם ומנזר ז'רונימוש", "סינטרה — טירת פנה", "מופע פאדו באלפמה"],
    restaurants: ["Time Out Market", "Cervejaria Ramiro — פירות ים", "Belcanto — כוכב מישלן של ז'וזה אבילז"],
    itinerary: [
      "צ'ק־אין ושקיעה במירדורו סנטה קתרינה",
      "אלפמה, מבצר סאו ז'ורז' ופאדו בערב",
      "יום בסינטרה וקאסקאיש",
      "בלם, פסטל דה נאטה ואופניים לחוף",
      "בראנץ' בטיים אאוט ופרידה",
    ],
  },
];

export function pickDestination(a: QuizAnswers): Destination {
  if (a.destination.trim() && a.destination !== "surprise") {
    const custom = destinations.find((d) => d.name.includes(a.destination) || a.destination.includes(d.name));
    if (custom) return custom;
    return {
      ...destinations[0],
      name: a.destination,
      country: "היעד שלך",
      emoji: "📍",
      tagline: `בנינו לך מסלול מותאם ל${a.destination} על בסיס הסגנון והתקציב שבחרת.`,
    };
  }
  const scored = destinations
    .map((d) => ({ d, score: a.type && d.matches.includes(a.type) ? 10 : 0 }))
    .sort((x, y) => y.score - x.score);
  return scored[0].d;
}

export const popularDestinations = [
  "יוון", "איטליה", "תאילנד", "יפן", "ספרד", "פורטוגל", "באלי", "מלדיביים", "דובאי", "ניו יורק",
];

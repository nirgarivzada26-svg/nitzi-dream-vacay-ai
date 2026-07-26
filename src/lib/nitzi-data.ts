import santoriniImg from "@/assets/dest-santorini.jpg";
import baliImg from "@/assets/dest-bali.jpg";
import maldivesImg from "@/assets/dest-maldives.jpg";
import tokyoImg from "@/assets/dest-tokyo.jpg";
import laplandImg from "@/assets/dest-lapland.jpg";
import amalfiImg from "@/assets/dest-amalfi.jpg";
import dubaiImg from "@/assets/dest-dubai.jpg";

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

export interface Destination {
  name: string;
  country: string;
  emoji: string;
  image: string;
  matches: TripType[];
  tagline: string;
  weather: string;
  flightHours: number;
  avgBudgetPerPerson: number;
  hotels: { name: string; note: string }[];
  attractions: string[];
  restaurants: string[];
  itinerary: string[];
}

export const destinations: Destination[] = [
  {
    name: "סנטוריני",
    country: "יוון",
    emoji: "🇬🇷",
    image: santoriniImg,
    matches: ["beach", "romantic", "friends"],
    tagline: "האי הלבן-כחול של האגאי — שקיעות מהאגדות, כנסיות עם כיפות כחולות ומסיבות ים תיכוניות.",
    weather: "28° בהיר",
    flightHours: 3.5,
    avgBudgetPerPerson: 6500,
    hotels: [
      { name: "Cavo Tagoo", note: "בוטיק עם בריכת אינפיניטי מול הים" },
      { name: "Semeli Hotel", note: "לב העיר, יחס איכות־מחיר מעולה" },
      { name: "Rocabella", note: "נוף מטורף לשקיעה" },
    ],
    attractions: ["שקיעה באויה", "חוף אדום", "שייט לקלדרה", "כרם יין באי"],
    restaurants: ["Ambrosia — פיין דיינינג", "Metaxi Mas — טברנה יוונית", "Lauda — כוכב מישלן"],
    itinerary: [
      "נחיתה, צ'ק־אין וסיבוב בעיר העתיקה עם שקיעה בליטל ונציה",
      "יום חוף אדום + מסיבת יום",
      "שייט פרטי לקלדרה עם עצירות שנורקלינג",
      "יום ספא + ארוחת ערב באויה",
      "בוקר רגוע, קניות בפירה וטיסה חזרה",
    ],
  },
  {
    name: "באלי",
    country: "אינדונזיה",
    emoji: "🇮🇩",
    image: baliImg,
    matches: ["nature", "adventure", "romantic"],
    tagline: "אי של אורז, מקדשים וגלים — חוויה רוחנית וטרופית שמשלבת הרפתקה, יוגה וחופים אינסופיים.",
    weather: "31° חם ולח",
    flightHours: 13,
    avgBudgetPerPerson: 8000,
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
    name: "מלדיביים",
    country: "האוקיינוס ההודי",
    emoji: "🏝️",
    image: maldivesImg,
    matches: ["beach", "romantic"],
    tagline: "וילות מעל המים, שוניות אלמוגים ושקט מוחלט — גן עדן לזוגיות.",
    weather: "30° טרופי",
    flightHours: 10,
    avgBudgetPerPerson: 18000,
    hotels: [
      { name: "Soneva Fushi", note: "וילות עץ עם מגלשות לים" },
      { name: "Anantara Kihavah", note: "מסעדת אקווריום מתחת למים" },
      { name: "Baros Maldives", note: "אינטימי ורומנטי" },
    ],
    attractions: ["שנורקלינג עם צבי ים", "שקיעה בקטמרן", "ספא צף", "דולפינים בשחר"],
    restaurants: ["Sea Fire Salt Sky", "By The Sea", "Fresh in the Garden"],
    itinerary: [
      "נחיתה במאלה + טיסת סירה לוילה",
      "יום שנורקלינג באי הרפתקאות",
      "ספא זוגי + ארוחת שקיעה",
      "טיול דולפינים ולילה תחת הכוכבים",
      "בוקר עצל וטיסה חזרה",
    ],
  },
  {
    name: "טוקיו",
    country: "יפן",
    emoji: "🇯🇵",
    image: tokyoImg,
    matches: ["nightlife", "adventure", "friends"],
    tagline: "עיר שלא ישנה — נאונים, סושי, מקדשים עתיקים ותרבות פופ בלי סוף.",
    weather: "22° נעים",
    flightHours: 14,
    avgBudgetPerPerson: 12000,
    hotels: [
      { name: "Aman Tokyo", note: "יוקרה יפנית מודרנית" },
      { name: "Hoshinoya Tokyo", note: "ריוקאן עירוני עם אונסן פרטי" },
      { name: "Shibuya Stream Excel", note: "מרכזי, ליד המעבר המפורסם" },
    ],
    attractions: ["מעבר שיבויה", "מקדש סנסו-ג'י", "TeamLab Planets", "גולדן גאי בשינג'וקו"],
    restaurants: ["Sukiyabashi Jiro — סושי אגדי", "Ichiran Ramen", "Narisawa — מטבח קייסקי"],
    itinerary: [
      "נחיתה, מנוחה וסיור לילי בשינג'וקו",
      "אסאקוסה, אואנו ומוזיאון TeamLab",
      "יום קניות בהרג'וקו + שיבויה",
      "טיול יום להאקונה",
      "אקיהברה וברים נסתרים",
      "שוק צוקיג'י ובראנץ' סושי + טיסה",
    ],
  },
  {
    name: "לפלנד",
    country: "פינלנד",
    emoji: "🇫🇮",
    image: laplandImg,
    matches: ["adventure", "family", "nature", "romantic"],
    tagline: "ממלכת שלג קסומה עם זוהר צפוני, מזחלות האסקי ובקתות זכוכית מתחת לכוכבים.",
    weather: "-8° מושלג",
    flightHours: 6,
    avgBudgetPerPerson: 9500,
    hotels: [
      { name: "Kakslauttanen Igloo", note: "איגלו זכוכית לצפייה בזוהר הצפוני" },
      { name: "Arctic TreeHouse", note: "בקתות עץ מודרניות ביער" },
      { name: "Santa's Hotel", note: "אווירת חג לכל המשפחה" },
    ],
    attractions: ["ציד זוהר צפוני", "מזחלות האסקי", "כפר סנטה קלאוס", "סנואומוביל"],
    restaurants: ["Nili — מטבח לאפי", "Aanaar — סלמון מעושן", "Roka Kitchen — נורדי מודרני"],
    itinerary: [
      "נחיתה ברובנימי, ערב אח וסאונה",
      "מזחלות האסקי + סיור בכפר סנטה",
      "יום סנואומוביל בטבע הפראי",
      "לילה באיגלו זכוכית עם זוהר צפוני",
      "סקי קל וספא לפני חזרה",
    ],
  },
  {
    name: "אמלפי",
    country: "איטליה",
    emoji: "🇮🇹",
    image: amalfiImg,
    matches: ["romantic", "family", "beach"],
    tagline: "כפרים פסטליים על צוקי הים, לימונדות טריות ופסטה שקוראים לה מהחלומות.",
    weather: "27° חמים",
    flightHours: 4,
    avgBudgetPerPerson: 7500,
    hotels: [
      { name: "Le Sirenuse", note: "מלון בוטיק אייקוני בפוזיטאנו" },
      { name: "Hotel Santa Caterina", note: "צוק מעל הים באמלפי" },
      { name: "Casa Angelina", note: "מודרני-מינימלי עם נוף עוצר נשימה" },
    ],
    attractions: ["פוזיטאנו וסיירנטו", "האי קפרי + הגרוטו הכחול", "טרק שביל האלים", "שייט חוף אמלפי"],
    restaurants: ["Da Vincenzo", "La Sponda", "Il Ritrovo"],
    itinerary: [
      "נחיתה בנאפולי + צ'ק אין בפוזיטאנו",
      "יום קפרי והגרוטו הכחול",
      "טרק Sentiero degli Dei",
      "רבלו וגני וילה צימברונה",
      "יום חוף בנרנו + פרידה",
    ],
  },
  {
    name: "דובאי",
    country: "איחוד האמירויות",
    emoji: "🇦🇪",
    image: dubaiImg,
    matches: ["family", "nightlife", "friends"],
    tagline: "יוקרה בלי גבולות, גורדי שחקים, מדבר וקניות של פעם בחיים.",
    weather: "33° בהיר",
    flightHours: 3,
    avgBudgetPerPerson: 8500,
    hotels: [
      { name: "Burj Al Arab", note: "האייקון של דובאי" },
      { name: "Atlantis The Palm", note: "פארק מים ואקווריום" },
      { name: "Bulgari Resort", note: "אי פרטי אינטימי" },
    ],
    attractions: ["בורג' חליפה", "ספארי מדבר", "Dubai Mall + Fountain", "פאלם ג'ומיירה"],
    restaurants: ["Nobu", "Zuma", "Pierchic — על המים"],
    itinerary: [
      "נחיתה + סאנסט בבורג' חליפה",
      "ספארי מדבר וגמלים",
      "יום פארק מים באטלנטיס",
      "קניות במרינה + סירת אבּרה",
      "בראנץ' יוקרתי ופרידה",
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

export type CategoryId = "popular" | "romantic" | "family" | "summer" | "winter" | "luxury" | "lastminute" | "ai";

export interface Category {
  id: CategoryId;
  title: string;
  subtitle: string;
  destinations: string[]; // destination names
}

export const categories: Category[] = [
  { id: "popular", title: "יעדים פופולריים", subtitle: "הכי מבוקשים החודש", destinations: ["סנטוריני", "באלי", "טוקיו", "אמלפי", "דובאי"] },
  { id: "romantic", title: "חופשות זוגיות", subtitle: "רומנטיקה במיטבה", destinations: ["סנטוריני", "מלדיביים", "אמלפי", "באלי"] },
  { id: "family", title: "חופשות משפחתיות", subtitle: "כיף לכל הגילאים", destinations: ["דובאי", "לפלנד", "אמלפי"] },
  { id: "summer", title: "יעדי קיץ", subtitle: "שמש, ים וטורקיז", destinations: ["סנטוריני", "אמלפי", "מלדיביים", "באלי"] },
  { id: "winter", title: "יעדי חורף", subtitle: "שלג, אח ורומנטיקה", destinations: ["לפלנד", "טוקיו"] },
  { id: "luxury", title: "חופשות יוקרה", subtitle: "החוויה הכי פרימיום", destinations: ["מלדיביים", "דובאי", "אמלפי"] },
  { id: "lastminute", title: "דילים של הרגע האחרון", subtitle: "טיסה השבוע", destinations: ["דובאי", "סנטוריני", "אמלפי"] },
  { id: "ai", title: "המלצות NITZI השבוע", subtitle: "נבחר במיוחד עבורך על ידי AI", destinations: ["באלי", "לפלנד", "טוקיו"] },
];

export const tripPurposes = [
  { id: "any", label: "כל סוג" },
  { id: "beach", label: "🏖️ ים ושמש" },
  { id: "romantic", label: "💞 זוגי" },
  { id: "family", label: "👨‍👩‍👧 משפחה" },
  { id: "adventure", label: "🏔️ הרפתקה" },
  { id: "nightlife", label: "🌃 חיי לילה" },
];

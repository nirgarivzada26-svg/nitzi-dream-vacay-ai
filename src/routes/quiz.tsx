import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { NitziLogo } from "@/components/NitziLogo";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import {
  defaultAnswers,
  popularDestinations,
  styles,
  tripTypes,
  type QuizAnswers,
  type TripStyle,
  type TripType,
} from "@/lib/nitzi-data";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "שיחה עם NITZI — בונים חופשה" },
      { name: "description", content: "שיחה קצרה עם ה-AI שבונה את החופשה המושלמת עבורך." },
      { property: "og:title", content: "שאלון החופשה של NITZI" },
      { property: "og:description", content: "שיחה קצרה עם ה-AI שבונה את החופשה שלך." },
    ],
  }),
  component: Quiz,
});

type Step = 0 | 1 | 2 | 3 | 4 | 5;
const totalSteps = 6;

const intro = "שלום 👋 אני NITZI. בוא נמצא יחד את החופשה המושלמת עבורך.";

const questions = [
  "קודם כל — איזה סוג חופשה מדגדג לך הפעם?",
  "מעולה בחירה! יש לך יעד שאתה חולם עליו? או שאבחר לך?",
  "כמה ימים תהיו בחו״ל?",
  "מה התקציב לאדם? (בשקלים)",
  "כמה אנשים נוסעים איתך?",
  "אחרון — איזה סגנון חופשה הכי מתאים לך עכשיו?",
];

const reactions: (a: QuizAnswers) => string = (a) => {
  const lastType = tripTypes.find((t) => t.id === a.type)?.label;
  return "";
};

function reactionFor(step: number, a: QuizAnswers): string | null {
  switch (step) {
    case 1: {
      const t = tripTypes.find((x) => x.id === a.type);
      return t ? `${t.emoji} ${t.label} — קלאסיקה. יש לי כמה יעדים שיתאימו לך בול.` : null;
    }
    case 2:
      return a.destination === "surprise"
        ? "אוהב אתגרים ✨ אני אבחר לך משהו מיוחד."
        : a.destination
          ? `${a.destination} — טעם מעולה!`
          : null;
    case 3:
      return `${a.days} ימים — טיים־פריים מושלם 👌`;
    case 4:
      return `תקציב של ₪${a.budget.toLocaleString()} — יש איפה לשחק.`;
    case 5:
      return `${a.people} נוסעים — סגור. עוד שאלה אחרונה.`;
    default:
      return null;
  }
}

function Quiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [typing, setTyping] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const seed = sessionStorage.getItem("nitzi:seed");
      if (seed) {
        const s = JSON.parse(seed);
        setAnswers((a) => ({
          ...a,
          destination: s.destination || "",
          people: s.people || a.people,
          budget: s.budget || a.budget,
          type: s.purpose && s.purpose !== "any" ? s.purpose : null,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 700);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [step, typing]);

  const next = () => {
    if (step === 5) {
      try { sessionStorage.setItem("nitzi:answers", JSON.stringify(answers)); } catch {}
      navigate({ to: "/result" });
      return;
    }
    setStep((s) => Math.min(5, s + 1) as Step);
  };
  const back = () => (step === 0 ? navigate({ to: "/" }) : setStep((s) => Math.max(0, s - 1) as Step));

  const canProceed =
    (step === 0 && answers.type) ||
    (step === 1) ||
    (step === 2 && answers.days > 0) ||
    (step === 3 && answers.budget > 0) ||
    (step === 4 && answers.people > 0) ||
    (step === 5 && answers.style);

  return (
    <div dir="rtl" className="relative flex min-h-[100dvh] flex-col bg-background">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-20 h-72 w-72 rounded-full bg-gradient-sunset opacity-25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-gradient-ocean opacity-25 blur-3xl" />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3">
          <button
            onClick={back}
            aria-label="חזרה"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <span className="text-xs font-bold text-muted-foreground">
            {step + 1}/{totalSteps}
          </span>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-gradient-sunset transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-5 py-6">
        <AiBubble text={intro} />
        {Array.from({ length: step + 1 }).map((_, i) => {
          const react = i > 0 ? reactionFor(i, answers) : null;
          return (
            <div key={i} className="space-y-3">
              {react && <AiBubble text={react} />}
              <ChatBlock index={i as Step} answers={answers} setAnswers={setAnswers} active={i === step} />
            </div>
          );
        })}
        {typing && <TypingBubble />}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/90 px-5 py-4 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <div className="flex-1 truncate rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {getSummary(step, answers)}
          </div>
          <button
            onClick={next}
            disabled={!canProceed}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={step === 5 ? "צור חופשה" : "המשך"}
          >
            {step === 5 ? <Sparkles className="h-5 w-5" /> : <Send className="h-5 w-5 rtl:rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-sunset text-white shadow-glow">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-card px-4 py-3 text-sm font-medium leading-relaxed text-foreground shadow-soft">
        {text}
      </div>
    </div>
  );
}

function getSummary(step: number, a: QuizAnswers) {
  switch (step) {
    case 0: return a.type ? `בחרת: ${tripTypes.find(t => t.id === a.type)?.label}` : "בחר/י סוג חופשה";
    case 1: return a.destination ? `יעד: ${a.destination === "surprise" ? "תפתיע אותי" : a.destination}` : "בחר/י יעד";
    case 2: return `${a.days} ימים`;
    case 3: return `₪${a.budget.toLocaleString()} לאדם`;
    case 4: return `${a.people} נוסעים`;
    case 5: return a.style ? `סגנון: ${styles.find(s => s.id === a.style)?.label} — סיימנו!` : "בחר/י סגנון";
    default: return "";
  }
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-sunset text-white shadow-glow">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex gap-1 rounded-2xl rounded-br-sm bg-card px-4 py-3 shadow-soft">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

interface BlockProps {
  index: Step;
  answers: QuizAnswers;
  setAnswers: (a: QuizAnswers) => void;
  active: boolean;
}

function ChatBlock({ index, answers, setAnswers, active }: BlockProps) {
  return (
    <div className="space-y-3 animate-fade-up">
      <AiBubble text={questions[index]} />
      <div className={`pr-10 ${active ? "" : "opacity-60 pointer-events-none"}`}>
        {index === 0 && <TypeGrid value={answers.type} onChange={(v) => setAnswers({ ...answers, type: v })} />}
        {index === 1 && (
          <DestinationPicker
            value={answers.destination}
            onChange={(v) => setAnswers({ ...answers, destination: v })}
          />
        )}
        {index === 2 && (
          <NumberChooser value={answers.days} min={2} max={21} step={1} suffix="ימים" presets={[3, 5, 7, 10, 14]} onChange={(v) => setAnswers({ ...answers, days: v })} />
        )}
        {index === 3 && (
          <NumberChooser value={answers.budget} min={1000} max={30000} step={500} suffix="₪ לאדם" presets={[3000, 5000, 8000, 12000, 20000]} onChange={(v) => setAnswers({ ...answers, budget: v })} />
        )}
        {index === 4 && (
          <NumberChooser value={answers.people} min={1} max={10} step={1} suffix="נוסעים" presets={[1, 2, 3, 4, 6]} onChange={(v) => setAnswers({ ...answers, people: v })} />
        )}
        {index === 5 && <StyleGrid value={answers.style} onChange={(v) => setAnswers({ ...answers, style: v })} />}
      </div>
    </div>
  );
}

function TypeGrid({ value, onChange }: { value: TripType | null; onChange: (v: TripType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {tripTypes.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition ${
              active ? "border-transparent bg-gradient-sunset text-white shadow-glow" : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            <div className="text-2xl">{t.emoji}</div>
            <div className="mt-1 text-sm font-bold">{t.label}</div>
            <div className={`text-[11px] ${active ? "text-white/85" : "text-muted-foreground"}`}>{t.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function StyleGrid({ value, onChange }: { value: TripStyle | null; onChange: (v: TripStyle) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {styles.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${
              active ? "border-transparent bg-gradient-aurora text-white shadow-glow" : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-sm font-bold">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DestinationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <input
        value={value === "surprise" ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="כתוב יעד או עיר..."
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
      />
      <button
        onClick={() => onChange("surprise")}
        className={`w-full rounded-2xl border-2 border-dashed p-3 text-sm font-bold transition ${
          value === "surprise" ? "border-primary bg-primary/10 text-primary" : "border-border bg-transparent text-muted-foreground hover:border-primary/50"
        }`}
      >
        ✨ תפתיע/י אותי — NITZI יבחר יעד מושלם
      </button>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {popularDestinations.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              value === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberChooser({
  value, min, max, step, suffix, presets, onChange,
}: {
  value: number; min: number; max: number; step: number; suffix: string; presets: number[]; onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-center">
        <div className="text-4xl font-black text-gradient-sunset">{value.toLocaleString()}</div>
        <div className="text-xs font-semibold text-muted-foreground">{suffix}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-4 w-full accent-primary" />
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              value === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"
            }`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
}

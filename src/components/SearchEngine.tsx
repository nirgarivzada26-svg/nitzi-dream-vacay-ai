import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronDown, MapPin, PlaneTakeoff, Search, Sparkles, Users, Wallet } from "lucide-react";
import { tripPurposes } from "@/lib/nitzi-data";
import { DestinationPicker } from "@/components/DestinationPicker";

export function SearchEngine({ size = "md" }: { size?: "md" | "lg" }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("תל אביב");
  const [destination, setDestination] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [people, setPeople] = useState(2);
  const [purpose, setPurpose] = useState("any");
  const [budget, setBudget] = useState(5000);

  const runAi = () => {
    try {
      sessionStorage.setItem("nitzi:seed", JSON.stringify({ destination, people, budget, purpose }));
    } catch {}
    navigate({ to: "/quiz" });
  };

  const runSearch = () => {
    try {
      sessionStorage.setItem(
        "nitzi:answers",
        JSON.stringify({
          type: purpose === "any" ? null : purpose,
          destination,
          days: 5,
          budget,
          people,
          style: null,
        }),
      );
    } catch {}
    navigate({ to: "/result" });
  };

  const lg = size === "lg";
  const pad = lg ? "p-5 sm:p-7" : "p-4";
  const gridCols = lg ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : "grid-cols-2";
  const inputTxt = lg ? "text-base" : "text-sm";
  const btnPad = lg ? "py-4 sm:py-5 text-base" : "py-3 text-sm";

  const destLabel =
    destination === "surprise" ? "✨ NITZI יבחר בשבילי" : destination || "בחר יעד...";

  return (
    <>
      <div className={`rounded-[2rem] border border-white/50 bg-white/90 shadow-glow backdrop-blur-2xl ${pad}`}>
        <div className={`grid gap-2 ${gridCols}`}>
          <Field lg={lg} icon={<PlaneTakeoff className="h-4 w-4" />} label="מאיפה">
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} className={`w-full bg-transparent ${inputTxt} font-bold text-foreground outline-none`} />
          </Field>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`group block rounded-2xl border border-border/60 bg-white/70 text-right transition hover:border-primary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ${lg ? "px-4 py-3" : "px-3 py-2"}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="text-primary"><MapPin className="h-4 w-4" /></span> לאן
            </div>
            <div className={`mt-0.5 flex items-center justify-between gap-1 ${inputTxt} font-bold ${destination ? "text-foreground" : "text-muted-foreground"}`}>
              <span className="truncate">{destLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </div>
          </button>
          <Field lg={lg} icon={<Calendar className="h-4 w-4" />} label="יציאה">
            <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={`w-full bg-transparent ${inputTxt} font-bold text-foreground outline-none`} />
          </Field>
          <Field lg={lg} icon={<Calendar className="h-4 w-4" />} label="חזרה">
            <input type="date" value={ret} onChange={(e) => setRet(e.target.value)} className={`w-full bg-transparent ${inputTxt} font-bold text-foreground outline-none`} />
          </Field>
          <Field lg={lg} icon={<Users className="h-4 w-4" />} label="נוסעים">
            <select value={people} onChange={(e) => setPeople(Number(e.target.value))} className={`w-full bg-transparent ${inputTxt} font-bold text-foreground outline-none`}>
              {[1, 2, 3, 4, 5, 6].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </Field>
          <Field lg={lg} icon={<Sparkles className="h-4 w-4" />} label="סוג חופשה">
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={`w-full bg-transparent ${inputTxt} font-bold text-foreground outline-none`}>
              {tripPurposes.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </select>
          </Field>
        </div>

        <div className={`mt-3 rounded-2xl border border-border/60 bg-muted/50 ${lg ? "p-4" : "p-3"}`}>
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> תקציב לאדם</span>
            <span className={`text-gradient-sunset ${lg ? "text-base" : "text-sm"}`}>₪{budget.toLocaleString()}</span>
          </div>
          <input type="range" min={1500} max={30000} step={500} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-2 w-full accent-primary" />
        </div>

        <div className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2`}>
          <button onClick={runSearch} className={`flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 font-black text-foreground transition active:scale-95 ${btnPad}`}>
            <Search className="h-4 w-4" /> חפש חופשה
          </button>
          <button onClick={runAi} className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-sunset px-4 font-black text-white shadow-glow transition active:scale-95 ${btnPad}`}>
            <Sparkles className="h-4 w-4" /> תן ל-NITZI לבחור
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>
        </div>
      </div>

      <DestinationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => setDestination(v)}
      />
    </>
  );
}

function Field({ icon, label, children, lg }: { icon: React.ReactNode; label: string; children: React.ReactNode; lg?: boolean }) {
  return (
    <label className={`block rounded-2xl border border-border/60 bg-white/70 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 ${lg ? "px-4 py-3" : "px-3 py-2"}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span> {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

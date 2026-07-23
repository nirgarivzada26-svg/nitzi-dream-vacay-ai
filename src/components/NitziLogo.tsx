export function NitziLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} dir="ltr">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-sunset shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </svg>
      </div>
      <span className="text-2xl font-black tracking-tight">
        <span className="text-gradient-sunset">NITZI</span>
      </span>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Heart,
  Home,
  LifeBuoy,
  Menu,
  Plane,
  Palmtree,
  User as UserIcon,
  X,
  LogIn,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { SignInModal } from "@/components/SignInModal";
import { displayNameOf, useAuth } from "@/lib/auth";

type Variant = "solid" | "overlay";

const ITEMS = [
  { to: "/", label: "בית", icon: Home },
  { to: "/flights", label: "טיסות", icon: Plane },
  { to: "/packages", label: "חבילות", icon: Palmtree },
  { to: "/ai", label: "NITZI AI", icon: Bot },
  { to: "/support", label: "תמיכה", icon: LifeBuoy },
] as const;

/** Global navigation. `overlay` renders on top of a hero image. */
export function TopNav({ variant = "solid" }: { variant?: Variant }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const overlay = variant === "overlay";
  const wrap = overlay
    ? "absolute inset-x-0 top-0 z-30"
    : "sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg";
  const linkBase = overlay
    ? "text-white/90 hover:text-white"
    : "text-muted-foreground hover:text-foreground";
  const activeCls = overlay
    ? "bg-white/20 text-white backdrop-blur-md"
    : "bg-primary/10 text-primary";

  const goFavorites = () => {
    if (user) navigate({ to: "/account", search: { tab: "favorites" } });
    else setSignInOpen(true);
  };

  return (
    <div className={wrap} dir="rtl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <NitziLogo />
          <nav className="hidden items-center gap-1 lg:flex">
            {ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ className: activeCls }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-black transition ${linkBase}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goFavorites}
            className={`hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-black transition lg:flex ${linkBase}`}
          >
            <Heart className="h-4 w-4" /> מועדפים
          </button>
          {user ? (
            <Link
              to="/account"
              search={{ tab: "bookings" }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${
                overlay
                  ? "border border-white/40 bg-white/20 text-white backdrop-blur-md"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" /> {displayNameOf(user)}
            </Link>
          ) : (
            <button
              onClick={() => setSignInOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3.5 py-2 text-xs font-black text-white shadow-glow"
            >
              <LogIn className="h-3.5 w-3.5" /> התחבר
            </button>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="תפריט"
            className={`grid h-10 w-10 place-items-center rounded-full lg:hidden ${
              overlay
                ? "border border-white/40 bg-white/20 text-white backdrop-blur-md"
                : "border border-border bg-card text-foreground"
            }`}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <div className="mx-4 mb-3 grid gap-1 rounded-3xl border border-border bg-card p-2 shadow-soft">
            {ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ className: "bg-primary/10 text-primary" }}
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-foreground"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                goFavorites();
              }}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 text-right text-sm font-black text-foreground"
            >
              <Heart className="h-4 w-4" /> מועדפים
            </button>
          </div>
        </div>
      )}

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => navigate({ to: "/account", search: { tab: "bookings" } })}
      />
    </div>
  );
}

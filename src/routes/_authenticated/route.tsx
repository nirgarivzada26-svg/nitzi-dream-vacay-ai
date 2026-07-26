// Auth gate for anything under /_authenticated/*.
// SSR is off because Supabase's session lives in localStorage — a server render
// would think the user is signed out on every hard refresh and cause redirect loops.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { setAuthIntent } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      try { setAuthIntent(location.href); } catch {}
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

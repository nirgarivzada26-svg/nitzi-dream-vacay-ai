// Post-launch monitoring pulse — public cron endpoint.
//
// Called by an external scheduler. Protected by a shared secret so the metrics
// and admin alerting can't be triggered anonymously.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/monitoring/pulse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["NITZI_MONITOR_SECRET"];
        if (!secret) return new Response("Monitoring secret not configured", { status: 503 });

        const provided =
          request.headers.get("x-monitor-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(secret);
        const equal = a.length === b.length && a.every((v, i) => v === b[i]);
        if (!equal) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const windowHours = Math.min(
          168,
          Math.max(1, Number(url.searchParams.get("windowHours") ?? 1) || 1),
        );

        const { runMonitorPulse } = await import("@/lib/launch/monitor.server");
        const pulse = await runMonitorPulse(windowHours);
        return Response.json({
          ranAt: pulse.ranAt,
          windowHours: pulse.windowHours,
          alerts: pulse.alerts.length,
          notified: pulse.notified,
        });
      },
    },
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

/** The questionnaire was replaced by the NITZI AI agent at /ai. */
export const Route = createFileRoute("/quiz")({
  beforeLoad: () => {
    throw redirect({ to: "/ai" });
  },
});

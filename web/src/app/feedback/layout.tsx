/**
 * Feedback layout - elegant layout matching auth pages.
 * Centers the feedback form with ambient purple gradient orbs.
 */
export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Purple gradient orb - top left */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-[#6214d9]/60 via-purple-400/40 to-transparent blur-3xl dark:from-[#6214d9]/40 dark:via-purple-500/25" />
      </div>
      {/* Purple gradient orb - bottom right */}
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-[#6214d9]/60 via-purple-400/40 to-transparent blur-3xl dark:from-[#6214d9]/40 dark:via-purple-500/25" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

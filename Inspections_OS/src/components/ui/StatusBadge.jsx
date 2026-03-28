export default function StatusBadge({ tone, children }) {
  const className =
    tone === "ok"
      ? "badge ok"
      : tone === "warn"
      ? "badge warn"
      : "badge fail";
  return <span className={className}>{children}</span>;
}

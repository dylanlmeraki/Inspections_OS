import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";

export default function GateSummaryPanel({ evaluation }) {
  if (!evaluation) return null;
  const tone = evaluation.status === "pass" ? "ok" : "fail";
  return (
    <Panel title="Gate Summary">
      <StatusBadge tone={tone}>{evaluation.status.toUpperCase()}</StatusBadge>
      <p className="small">
        Met: {evaluation.metCount} · Unmet: {evaluation.unmetCount}
      </p>

      <div className="list">
        {evaluation.requirements.map((requirement) => (
          <div key={`${requirement.type}-${requirement.key}`} className="list-item">
            <StatusBadge tone={requirement.met ? "ok" : requirement.severity === "warning" ? "warn" : "fail"}>
              {requirement.met ? "MET" : requirement.severity.toUpperCase()}
            </StatusBadge>
            <div>
              <strong>{requirement.key}</strong>
            </div>
            <div className="small">{requirement.message}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

import ActionButton from "@/components/ui/ActionButton";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";

export default function GateManagerPanel({
  evaluation,
  onWaive,
  onAdvance,
  canWaive = false,
}) {
  if (!evaluation) return null;

  return (
    <Panel title="Gate Manager Panel">
      <StatusBadge tone={evaluation.status === "pass" ? "ok" : "fail"}>
        {evaluation.status.toUpperCase()}
      </StatusBadge>
      <p className="small">
        Rule snapshot: <span className="code">{evaluation.ruleSnapshotId}</span>
      </p>
      <p className="small">
        Sources used: {evaluation.sourceRecordIdsUsed.join(", ") || "None"}
      </p>

      {evaluation.blockers.length > 0 ? (
        <div className="list">
          {evaluation.blockers.map((blocker) => (
            <div className="list-item" key={blocker.code}>
              <StatusBadge tone="fail">BLOCKER</StatusBadge>
              <div>
                <strong>{blocker.code}</strong>
              </div>
              <div className="small">{blocker.message}</div>
              <div className="small">Waiver allowed: {blocker.waiverAllowed ? "Yes" : "No"}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="small">No blockers. This stage is eligible to advance.</p>
      )}

      {evaluation.warnings.length > 0 ? (
        <div className="list" style={{ marginTop: 12 }}>
          {evaluation.warnings.map((warning) => (
            <div className="list-item" key={warning.code}>
              <StatusBadge tone="warn">WARNING</StatusBadge>
              <div>
                <strong>{warning.code}</strong>
              </div>
              <div className="small">{warning.message}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="row wrap" style={{ marginTop: 14 }}>
        <ActionButton variant="primary" onClick={onAdvance} disabled={evaluation.status !== "pass"}>
          Advance Stage
        </ActionButton>
        <ActionButton variant="warn" onClick={onWaive} disabled={!canWaive || evaluation.blockers.length === 0}>
          Waive Blockers
        </ActionButton>
      </div>
    </Panel>
  );
}

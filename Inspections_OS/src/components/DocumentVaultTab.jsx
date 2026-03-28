import Panel from "@/components/ui/Panel";
import { useVaultSlotsQuery } from "@/lib/hooks/useInspectionQueries";

export default function DocumentVaultTab({ projectId, attachedDocuments }) {
  const { data: requiredSlots = [] } = useVaultSlotsQuery(projectId);
  const attachedSet = new Set(attachedDocuments || []);

  return (
    <Panel title="Document Vault">
      <p className="small">
        Deterministic required slots resolved from project + active program set.
      </p>
      <div className="list">
        {requiredSlots.map((slot) => (
          <div className="list-item" key={slot}>
            <strong>{slot}</strong>
            <div className="small">
              {attachedSet.has(slot) ? "Attached" : "Missing"}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

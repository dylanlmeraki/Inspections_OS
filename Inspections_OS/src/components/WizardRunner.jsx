import { useEffect, useMemo, useState } from "react";
import GateManagerPanel from "@/components/GateManagerPanel";
import GateSummaryPanel from "@/components/GateSummaryPanel";
import DocumentVaultTab from "@/components/DocumentVaultTab";
import WizardPlanCard from "@/components/WizardPlanCard";
import ActionButton from "@/components/ui/ActionButton";
import { evaluateGate } from "@/lib/gateEngine";
import {
  useCreateIssueMutation,
  useProjectsQuery,
} from "@/lib/hooks/useInspectionQueries";
import { localDb } from "@/lib/localDb";
import { createTransitionAttempt } from "@/lib/transitionEngine";
import { buildWizardPlan, listWizardOptions } from "@/lib/wizardAbstractionService";
import { logAuditEvent } from "@/lib/auditLogger";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseJsonInput(raw, fallback) {
  try {
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export default function WizardRunner() {
  const { data: projects = [] } = useProjectsQuery();
  const createIssueMutation = useCreateIssueMutation();

  const [projectId, setProjectId] = useState("");
  const [programKey, setProgramKey] = useState("");
  const [stageCode, setStageCode] = useState("");
  const [inspectionTypeCode, setInspectionTypeCode] = useState("");
  const [mode, setMode] = useState(/** @type {"mobile"|"desktop"} */ ("mobile"));

  const wizardOptions = useMemo(
    () => listWizardOptions().filter((option) => projects.some((item) => item.id === option.project.id)),
    [projects]
  );

  const selectedProjectOption = useMemo(
    () => wizardOptions.find((option) => option.project.id === projectId) || wizardOptions[0] || null,
    [wizardOptions, projectId]
  );

  const selectedProgramOption = useMemo(
    () =>
      selectedProjectOption?.availablePrograms.find((program) => program.key === programKey) ||
      selectedProjectOption?.availablePrograms[0] ||
      null,
    [selectedProjectOption, programKey]
  );

  const [answerText, setAnswerText] = useState(
    '{\n  "site": {},\n  "swppp": {},\n  "specialInspections": {},\n  "opening": {},\n  "closeout": {}\n}'
  );
  const [documentsText, setDocumentsText] = useState("");
  const [attachmentsText, setAttachmentsText] = useState("[]");
  const [waiverReason, setWaiverReason] = useState("Manual compliance override");
  const [plan, setPlan] = useState(null);
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    if (!projectId && wizardOptions.length > 0) {
      setProjectId(wizardOptions[0].project.id);
    }
  }, [projectId, wizardOptions]);

  useEffect(() => {
    if (!selectedProjectOption) return;
    const nextProgramKey = selectedProjectOption.availablePrograms[0]?.key || "";
    if (!programKey || !selectedProjectOption.availablePrograms.some((item) => item.key === programKey)) {
      setProgramKey(nextProgramKey);
      setPlan(null);
      setEvaluation(null);
    }
  }, [programKey, selectedProjectOption]);

  useEffect(() => {
    if (!selectedProgramOption) return;
    const nextStageCode = selectedProgramOption.stages[0]?.code || "";
    const nextInspectionTypeCode = selectedProgramOption.inspectionTypes[0]?.code || "";

    if (!stageCode || !selectedProgramOption.stages.some((item) => item.code === stageCode)) {
      setStageCode(nextStageCode);
      setPlan(null);
      setEvaluation(null);
    }

    if (
      !inspectionTypeCode ||
      !selectedProgramOption.inspectionTypes.some((item) => item.code === inspectionTypeCode)
    ) {
      setInspectionTypeCode(nextInspectionTypeCode);
      setPlan(null);
      setEvaluation(null);
    }
  }, [inspectionTypeCode, selectedProgramOption, stageCode]);

  const parsedAnswers = parseJsonInput(answerText, {});
  const attachedDocuments = documentsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const parsedAttachments = parseJsonInput(attachmentsText, []);
  const attachments = Array.isArray(parsedAttachments) ? parsedAttachments : [];

  const canWaive = Boolean(
    evaluation &&
      evaluation.blockers.length > 0 &&
      evaluation.blockers.every((item) => item.waiverAllowed)
  );

  const handleResolve = () => {
    if (!selectedProjectOption || !selectedProgramOption || !stageCode || !inspectionTypeCode) return;

    const resolvedPlan = buildWizardPlan({
      projectId: selectedProjectOption.project.id,
      programKey: selectedProgramOption.key,
      inspectionTypeCode,
      stageCode,
      mode,
    });
    setPlan(resolvedPlan);
    setEvaluation(null);
  };

  const handleEvaluate = () => {
    if (!plan) return;
    const result = evaluateGate({
      plan,
      answers: parsedAnswers,
      attachedDocuments,
      attachments,
    });
    setEvaluation(result);
  };

  const handleAdvance = () => {
    if (!plan || !evaluation) return;
    const attempt = createTransitionAttempt({
      runId: "pending_run",
      context: plan.context,
      evaluation,
      action: "advance",
    });
    localDb.createTransitionAttempt(attempt);
    logAuditEvent({
      eventType: "stage_transition_attempted",
      actorId: "local_user",
      projectId: plan.context.projectId,
      runId: attempt.runId,
      transitionAttemptId: attempt.attemptId,
      details: attempt,
    });
  };

  const handleWaive = () => {
    if (!plan || !evaluation) return;
    const attempt = createTransitionAttempt({
      runId: "pending_run",
      context: plan.context,
      evaluation,
      action: "waive",
      waiverReason,
    });
    localDb.createTransitionAttempt(attempt);
    logAuditEvent({
      eventType: "stage_waiver_attempted",
      actorId: "local_user",
      projectId: plan.context.projectId,
      runId: attempt.runId,
      transitionAttemptId: attempt.attemptId,
      details: { ...attempt, waiverReason },
    });
  };

  const handleSaveAndExport = async () => {
    if (!plan) return;
    const nextEvaluation =
      evaluation ||
      evaluateGate({
        plan,
        answers: parsedAnswers,
        attachedDocuments,
        attachments,
      });
    setEvaluation(nextEvaluation);

    const run = localDb.createRun({
      projectId: plan.context.projectId,
      projectName: plan.context.projectName,
      programKey: plan.context.programFamilyKey,
      inspectionTypeCode: plan.context.inspectionTypeCode,
      stageCode: plan.context.workflowStageCode,
      mode,
      answers: parsedAnswers,
      attachedDocuments,
      attachments,
      status: nextEvaluation.status === "pass" ? "submitted" : "draft",
    });

    localDb.upsertRuleSnapshot({
      id: nextEvaluation.ruleSnapshotId,
      context: plan.context,
      ruleIds: nextEvaluation.ruleIdsUsed,
      sourceRecordIds: nextEvaluation.sourceRecordIdsUsed,
      generatedAt: new Date().toISOString(),
    });

    const stageEvaluationRecord = localDb.createStageGateEvaluation({
      runId: run.id,
      context: plan.context,
      evaluation: nextEvaluation,
      ruleSnapshotId: nextEvaluation.ruleSnapshotId,
      sourceRecordIdsUsed: nextEvaluation.sourceRecordIdsUsed,
    });

    for (const blocker of nextEvaluation.blockers) {
      await createIssueMutation.mutateAsync({
        projectId: plan.context.projectId,
        runId: run.id,
        code: blocker.code,
        message: blocker.message,
      });
    }

    const { createExportJob, renderPacketPdf } = await import("@/lib/exportEngine");
    const { packet, exportRecord, manifestRecord } = await createExportJob({
      runId: run.id,
      stageGateEvaluationId: stageEvaluationRecord.id,
      attachments,
    });

    logAuditEvent({
      eventType: "export_job_created",
      actorId: "local_user",
      projectId: plan.context.projectId,
      runId: run.id,
      exportJobId: exportRecord.id,
      details: {
        stageGateEvaluationId: stageEvaluationRecord.id,
        manifestId: manifestRecord.id,
        ruleSnapshotId: nextEvaluation.ruleSnapshotId,
      },
    });

    downloadBlob(renderPacketPdf(packet), `${run.id}.pdf`);
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h1 className="title">Wizard Runner</h1>
        <p className="subtitle">
          Project to jurisdiction to program family to inspection type to workflow
          stage to gate to transition to export manifest.
        </p>
        <div className="grid" style={{ gap: 14 }}>
          <div>
            <div className="label">Project</div>
            <select
              className="select"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setProgramKey("");
                setStageCode("");
                setInspectionTypeCode("");
                setPlan(null);
                setEvaluation(null);
              }}
            >
              {wizardOptions.map((item) => (
                <option key={item.project.id} value={item.project.id}>
                  {item.project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Program Family</div>
            <select
              className="select"
              value={programKey}
              onChange={(event) => {
                setProgramKey(event.target.value);
                setStageCode("");
                setInspectionTypeCode("");
                setPlan(null);
                setEvaluation(null);
              }}
            >
              {selectedProjectOption?.availablePrograms?.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <div className="label">Workflow Stage</div>
              <select
                className="select"
                value={stageCode}
                onChange={(event) => setStageCode(event.target.value)}
              >
                {(selectedProgramOption?.stages || []).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">Inspection Type</div>
              <select
                className="select"
                value={inspectionTypeCode}
                onChange={(event) => setInspectionTypeCode(event.target.value)}
              >
                {(selectedProgramOption?.inspectionTypes || []).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="label">Mode</div>
            <select
              className="select"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value === "desktop" ? "desktop" : "mobile")
              }
            >
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop / Tablet</option>
            </select>
          </div>

          <div className="row wrap">
            <ActionButton variant="primary" onClick={handleResolve}>
              Resolve Wizard Plan
            </ActionButton>
            <ActionButton onClick={handleEvaluate} disabled={!plan}>
              Run Gate Evaluation
            </ActionButton>
            <ActionButton variant="warn" onClick={handleSaveAndExport} disabled={!plan}>
              Save Run + Export PDF
            </ActionButton>
          </div>

          <div>
            <div className="label">Answer payload (JSON)</div>
            <textarea
              className="textarea"
              rows={12}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
            />
          </div>
          <div>
            <div className="label">Attached documents (comma-separated keys)</div>
            <input
              className="input"
              value={documentsText}
              onChange={(event) => setDocumentsText(event.target.value)}
              placeholder="swppp_prd_set, swppp_eauthorization"
            />
          </div>
          <div>
            <div className="label">Attachments (JSON array)</div>
            <textarea
              className="textarea"
              rows={6}
              value={attachmentsText}
              onChange={(event) => setAttachmentsText(event.target.value)}
            />
          </div>
          <div>
            <div className="label">Waiver reason</div>
            <input
              className="input"
              value={waiverReason}
              onChange={(event) => setWaiverReason(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid">
        <WizardPlanCard plan={plan} />
        <GateSummaryPanel evaluation={evaluation} />
        <GateManagerPanel
          evaluation={evaluation}
          onAdvance={handleAdvance}
          onWaive={handleWaive}
          canWaive={canWaive}
        />
        <DocumentVaultTab
          projectId={plan?.context.projectId || projectId}
          attachedDocuments={attachedDocuments}
        />
      </div>
    </div>
  );
}

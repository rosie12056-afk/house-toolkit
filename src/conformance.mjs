import { readFileSync } from "node:fs";
import { validateProtocol } from "house-protocols";

export function runMigrationConformance(path) {
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { schema_version: "1", tool: "house-conformance", profile: "migration", ok: false, input_error: true, records: [], error: error.message };
  }
  if (fixture?.migration !== "0.1-to-0.2" || !Array.isArray(fixture.records)) {
    return { schema_version: "1", tool: "house-conformance", profile: "migration", ok: false, input_error: true, records: [], error: "expected a 0.1-to-0.2 migration fixture" };
  }

  const records = fixture.records.map((record, index) => {
    const before = validateProtocol(record.kind, record.before, { profile: "0.1" });
    const after = validateProtocol(record.kind, record.after, { profile: "0.2" });
    return { index, kind: record.kind, ok: before.ok && after.ok, before, after };
  });
  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "migration:0.1-to-0.2",
    ok: records.length > 0 && records.every((record) => record.ok),
    records,
    summary: { records_checked: records.length, records_failed: records.filter((record) => !record.ok).length },
  };
}

export function runLifecycleConformance(path) {
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { schema_version: "1", tool: "house-conformance", profile: "lifecycle:0.2", ok: false, input_error: true, records: [], error: error.message };
  }
  if (!Array.isArray(fixture?.records)) {
    return { schema_version: "1", tool: "house-conformance", profile: "lifecycle:0.2", ok: false, input_error: true, records: [], error: "expected a lifecycle records fixture" };
  }
  const allowed = new Set(["life_state", "lifecycle_opportunity", "journal_entry", "dream_record", "handoff_record"]);
  const records = fixture.records.map((record, index) => {
    const result = allowed.has(record.kind)
      ? validateProtocol(record.kind, record.document, { profile: "0.2" })
      : { ok: false, schema_errors: [{ code: "E_PROTOCOL_KIND_UNKNOWN", message: `Unsupported lifecycle kind: ${record.kind}` }], semantic_errors: [] };
    return { index, kind: record.kind, ok: result.ok, result };
  });
  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "lifecycle:0.2",
    ok: records.length > 0 && records.every((record) => record.ok),
    records,
    summary: { records_checked: records.length, records_failed: records.filter((record) => !record.ok).length },
  };
}

const MEMORY_PORT_METHODS = Object.freeze([
  "health",
  "queryMemories",
  "putMemory",
  "latestResignature",
  "queryResignatures",
  "appendResignature",
]);

function portCheck(checks, code, run) {
  return Promise.resolve()
    .then(run)
    .then(() => checks.push({ code, ok: true }))
    .catch((error) => checks.push({ code, ok: false, error_code: error?.code || "E_MEMORY_PORT_CHECK", message: error?.message || String(error) }));
}

function memoryFixtures() {
  return {
    older: {
      memory_id: "memory:fictional:older",
      subject_id: "agent:lantern",
      kind: "reflection",
      body: "An older fictional reflection.",
      source_refs: [{ ref_id: "event:fictional:older", kind: "event", locator: "events/fictional-older" }],
      evidence_refs: ["evidence:fictional:older"],
      status: "active",
      created_at: "2032-04-05T09:00:00.000Z",
    },
    newer: {
      memory_id: "memory:fictional:newer",
      subject_id: "agent:lantern",
      kind: "reflection",
      body: "A newer fictional reflection.",
      source_refs: [{ ref_id: "event:fictional:newer", kind: "event", locator: "events/fictional-newer" }],
      evidence_refs: ["evidence:fictional:newer"],
      status: "active",
      created_at: "2032-04-05T10:00:00.000Z",
    },
    quarantined: {
      memory_id: "memory:fictional:quarantined",
      subject_id: "agent:lantern",
      kind: "reflection",
      body: "A quarantined fictional reflection.",
      source_refs: [{ ref_id: "event:fictional:quarantined", kind: "event", locator: "events/fictional-quarantined" }],
      evidence_refs: ["evidence:fictional:quarantined"],
      status: "quarantined",
      created_at: "2032-04-05T11:00:00.000Z",
    },
    otherSubject: {
      memory_id: "memory:fictional:harbor",
      subject_id: "agent:harbor",
      kind: "reflection",
      body: "A reflection owned by another fictional subject.",
      source_refs: [{ ref_id: "event:fictional:harbor", kind: "event", locator: "events/fictional-harbor" }],
      evidence_refs: ["evidence:fictional:harbor"],
      status: "active",
      created_at: "2032-04-05T12:00:00.000Z",
    },
    firstResignature: {
      protocol_version: "0.2",
      resignature_id: "resignature:fictional:one",
      subject_id: "agent:lantern",
      source_ref: { ref_id: "event:fictional:older", kind: "event", locator: "events/fictional-older" },
      layer: 1,
      stance: "recognize",
      claim_scope: "interpretation_only",
      reflection_body: "A first fictional interpretation.",
      evidence_refs: ["evidence:fictional:older"],
      created_at: "2032-04-05T09:01:00.000Z",
      provenance: { origin: "self_reflection", recorded_by: "agent:lantern" },
    },
    secondResignature: {
      protocol_version: "0.2",
      resignature_id: "resignature:fictional:two",
      subject_id: "agent:lantern",
      source_ref: { ref_id: "event:fictional:newer", kind: "event", locator: "events/fictional-newer" },
      previous_resignature_id: "resignature:fictional:one",
      layer: 2,
      stance: "revise",
      claim_scope: "interpretation_only",
      reflection_body: "A second fictional interpretation.",
      evidence_refs: ["evidence:fictional:newer"],
      created_at: "2032-04-05T10:01:00.000Z",
      provenance: { origin: "self_reflection", recorded_by: "agent:lantern" },
    },
  };
}

export async function runMemoryPortConformance({ createPort, reopenPort, closePort = async () => {} } = {}) {
  const checks = [];
  if (typeof createPort !== "function" || typeof reopenPort !== "function") {
    return {
      schema_version: "1",
      tool: "house-conformance",
      profile: "memory-port:candidate-v1",
      ok: false,
      input_error: true,
      checks,
      error: "createPort and reopenPort factories are required",
    };
  }

  const fixture = memoryFixtures();
  let port;
  await portCheck(checks, "M01_METHODS", async () => {
    port = await createPort();
    for (const method of MEMORY_PORT_METHODS) {
      if (typeof port?.[method] !== "function") throw new Error(`Memory Port must implement ${method}()`);
    }
  });
  if (!port) return { schema_version: "1", tool: "house-conformance", profile: "memory-port:candidate-v1", ok: false, checks };

  await portCheck(checks, "M02_HEALTH", async () => {
    const health = await port.health();
    if (health?.ok !== true) throw new Error("health() must return { ok: true }");
  });
  await portCheck(checks, "M03_IDEMPOTENT_MEMORY_WRITE", async () => {
    await port.putMemory({ operationId: "memory-operation:older", runId: "run:fictional:older", memory: structuredClone(fixture.older) });
    await port.putMemory({ operationId: "memory-operation:older", runId: "run:fictional:older", memory: structuredClone(fixture.older) });
    await port.putMemory({ operationId: "memory-operation:newer", runId: "run:fictional:newer", memory: structuredClone(fixture.newer) });
    await port.putMemory({ operationId: "memory-operation:quarantined", runId: "run:fictional:quarantined", memory: structuredClone(fixture.quarantined) });
    await port.putMemory({ operationId: "memory-operation:harbor", runId: "run:fictional:harbor", memory: structuredClone(fixture.otherSubject) });
    const records = await port.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: true });
    if (records.filter((item) => item.memory_id === fixture.older.memory_id).length !== 1) throw new Error("an idempotent write created duplicate memory");
  });
  await portCheck(checks, "M04_FILTER_ORDER_LIMIT", async () => {
    const active = await port.queryMemories({ subjectId: "agent:lantern", limit: 1, includeQuarantined: false });
    if (active.length !== 1 || active[0].memory_id !== fixture.newer.memory_id) throw new Error("active memories must be filtered, newest-first, and limited");
    const all = await port.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: true });
    if (all[0]?.memory_id !== fixture.quarantined.memory_id || all.length !== 3) throw new Error("includeQuarantined must preserve newest-first ordering");
  });
  await portCheck(checks, "M05_SUBJECT_ISOLATION", async () => {
    const records = await port.queryMemories({ subjectId: "agent:harbor", limit: 20, includeQuarantined: true });
    if (records.length !== 1 || records[0].subject_id !== "agent:harbor") throw new Error("queries must isolate subjects");
  });
  await portCheck(checks, "M06_RETURN_VALUE_ISOLATION", async () => {
    const first = await port.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: false });
    first[0].body = "mutated by caller";
    const second = await port.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: false });
    if (second[0].body === "mutated by caller") throw new Error("returned records must not mutate stored data");
  });
  await portCheck(checks, "M07_ATOMIC_RESIGNATURE_APPEND", async () => {
    await port.appendResignature({ operationId: "resignature-operation:one", runId: "run:fictional:older", expectedPreviousId: null, resignature: structuredClone(fixture.firstResignature) });
    await port.appendResignature({ operationId: "resignature-operation:one", runId: "run:fictional:older", expectedPreviousId: null, resignature: structuredClone(fixture.firstResignature) });
    await port.appendResignature({ operationId: "resignature-operation:two", runId: "run:fictional:newer", expectedPreviousId: fixture.firstResignature.resignature_id, resignature: structuredClone(fixture.secondResignature) });
    let conflict = null;
    try {
      await port.appendResignature({ operationId: "resignature-operation:conflict", runId: "run:fictional:conflict", expectedPreviousId: null, resignature: { ...structuredClone(fixture.secondResignature), resignature_id: "resignature:fictional:conflict" } });
    } catch (error) {
      conflict = error;
    }
    if (conflict?.code !== "E_RESIGNATURE_CONFLICT") throw new Error("stale append must fail with E_RESIGNATURE_CONFLICT");
    const latest = await port.latestResignature({ subjectId: "agent:lantern" });
    const records = await port.queryResignatures({ subjectId: "agent:lantern", limit: 20 });
    if (latest?.resignature_id !== fixture.secondResignature.resignature_id || records.length !== 2) throw new Error("resignature chain must be append-only and newest-first");
  });

  await closePort(port);
  port = null;
  await portCheck(checks, "M08_REOPEN_DURABILITY", async () => {
    port = await reopenPort();
    const memories = await port.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: true });
    const latest = await port.latestResignature({ subjectId: "agent:lantern" });
    if (memories.length !== 3 || latest?.resignature_id !== fixture.secondResignature.resignature_id) throw new Error("records did not survive reopen");
  });
  if (port) await closePort(port);

  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "memory-port:candidate-v1",
    ok: checks.length === 8 && checks.every((check) => check.ok),
    checks,
    summary: { checks_run: checks.length, checks_failed: checks.filter((check) => !check.ok).length },
  };
}

export function formatConformanceReport(report) {
  const lines = [`house-conformance: ${report.ok ? "PASS" : "FAIL"}`, `Profile: ${report.profile}`];
  if (report.error) lines.push(`- ${report.error}`);
  for (const record of report.records || []) lines.push(`- ${record.kind}: ${record.ok ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}

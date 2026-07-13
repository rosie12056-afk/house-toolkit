const CLIENT_METHODS = Object.freeze(["health", "submit", "getRun", "queryMemories", "request"]);

async function check(records, clientName, code, operation) {
  try {
    await operation();
    records.push({ client: clientName, code, ok: true });
  } catch (error) {
    records.push({ client: clientName, code, ok: false, error_code: error?.code || "E_CLIENT_CHECK", message: error?.message || String(error) });
  }
}

export async function runRuntimeClientConformance({ createClients } = {}) {
  if (typeof createClients !== "function") {
    return { schema_version: "1", tool: "house-conformance", profile: "runtime-client:candidate-v1", ok: false, input_error: true, records: [], error: "createClients is required" };
  }
  const entries = await createClients();
  if (!Array.isArray(entries) || entries.length < 2) {
    return { schema_version: "1", tool: "house-conformance", profile: "runtime-client:candidate-v1", ok: false, input_error: true, records: [], error: "at least two independently configured clients are required" };
  }

  const records = [];
  for (const [index, entry] of entries.entries()) {
    const name = entry?.name || `client-${index + 1}`;
    const client = entry?.client;
    await check(records, name, "C01_METHODS", async () => {
      for (const method of CLIENT_METHODS) if (typeof client?.[method] !== "function") throw new Error(`Runtime client must implement ${method}()`);
    });
    await check(records, name, "C02_HEALTH", async () => {
      const health = await client.health();
      if (health?.ok !== true || typeof health.runtime_version !== "string") throw new Error("health response is invalid");
    });
    let submitted = null;
    await check(records, name, "C03_IDEMPOTENT_SUBMIT", async () => {
      const input = { roomId: "room:fictional", agentId: "agent:lantern", message: "Create a fictional client artifact.", idempotencyKey: `client-conformance-${index}` };
      submitted = await client.submit(input);
      const repeated = await client.submit(input);
      if (submitted?.run_id !== repeated?.run_id || submitted?.status !== "completed") throw new Error("submit must preserve Runtime idempotency");
    });
    await check(records, name, "C04_READ_AFTER_WRITE", async () => {
      const run = await client.getRun(submitted.run_id);
      if (run?.run_id !== submitted.run_id || run?.result?.evidence_bundle_id == null) throw new Error("completed Run is not readable with Evidence linkage");
      const memories = await client.queryMemories({ subjectId: "agent:lantern", limit: 20, includeQuarantined: false });
      if (!Array.isArray(memories)) throw new Error("memory query must return an array");
    });
    await check(records, name, "C05_STABLE_METHOD_ERROR", async () => {
      let failure = null;
      try {
        await client.request("unsupported.method", {});
      } catch (error) {
        failure = error;
      }
      if (failure?.code !== "E_METHOD_NOT_FOUND") throw new Error("unsupported methods must fail with E_METHOD_NOT_FOUND");
    });
    await check(records, name, "C06_AUTH_FIELD_REJECTION", async () => {
      let failure = null;
      try {
        await client.request("run.get", { runId: submitted.run_id, authenticated_by: "forged-client-value" });
      } catch (error) {
        failure = error;
      }
      if (failure?.code !== "E_RESERVED_AUTH_FIELD") throw new Error("client-supplied authentication fields must be rejected");
    });
    if (typeof entry.close === "function") await entry.close();
  }

  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "runtime-client:candidate-v1",
    ok: records.length === entries.length * 6 && records.every((record) => record.ok),
    records,
    summary: { clients_checked: entries.length, checks_run: records.length, checks_failed: records.filter((record) => !record.ok).length },
  };
}

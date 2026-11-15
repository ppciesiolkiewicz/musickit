import type { Deps } from "./query";
import type { Scope } from "./types";
import { LIBRARY_TOOLS, callTool, type ToolDef } from "./tools";

/** The two arguments only the local dev endpoint reads. The scope of a tool call is built from them here, nowhere else. */
export const DEV_ARGS = { player: "a user id (dev only)", include_not_enabled: "also show examples and plans not enabled for reuse (dev only)" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_PROTOCOL = "2025-06-18";
const READ_FAILED = "The library could not be read.";

/** The library tools with the two dev arguments added to each schema. */
export function devTools(): ToolDef[] {
  return LIBRARY_TOOLS.map((t) => {
    const s = t.inputSchema as { properties: Record<string, unknown> };
    return {
      ...t,
      inputSchema: {
        ...s,
        properties: {
          ...s.properties,
          player: { type: "string", description: DEV_ARGS.player },
          include_not_enabled: { type: "boolean", description: DEV_ARGS.include_not_enabled },
        },
      },
    };
  });
}

/** Takes `player` and `include_not_enabled` out of the arguments and builds the scope from them; the rest goes on to the tool. */
export async function devScope(args: unknown, d: Deps): Promise<{ scope: Scope; args: unknown } | { error: string }> {
  if (args === undefined || args === null) return { scope: {}, args: {} };
  if (typeof args !== "object" || Array.isArray(args)) return { error: "the arguments must be an object" };
  const { player, include_not_enabled, ...rest } = args as Record<string, unknown>;
  const scope: Scope = {};
  if (include_not_enabled !== undefined) {
    if (typeof include_not_enabled !== "boolean") return { error: `"include_not_enabled" must be true or false` };
    if (include_not_enabled) scope.includeNotEnabled = true;
  }
  if (player !== undefined) {
    if (typeof player !== "string" || !UUID.test(player)) return { error: `"player" must be a user id (a UUID)` };
    if (!(await d.library.userExists(player))) return { error: `"player": no such user` };
    scope.player = player;
  }
  return { scope, args: rest };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const hostName = (hostPort: string) => hostPort.replace(/:\d+$/, "").toLowerCase();

/** A request from this machine: a `Host` of localhost, 127.0.0.1 or [::1], and no `Origin` or a local one. Stops DNS rebinding and cross-site posts. */
export function localRequest(headers: { origin: string | null; host: string | null }): boolean {
  if (headers.host === null || !LOCAL_HOSTS.has(hostName(headers.host))) return false;
  if (headers.origin === null) return true;
  const m = /^http:\/\/([^/:]+|\[[0-9a-f:]+\])(:\d+)?$/i.exec(headers.origin);
  return m !== null && LOCAL_HOSTS.has(m[1].toLowerCase());
}

type Id = string | number | null;
const reply = (id: Id, result: unknown) => ({ status: 200, body: { jsonrpc: "2.0", id, result } });
const fail = (id: Id, code: number, message: string) => ({ status: 200, body: { jsonrpc: "2.0", id, error: { code, message } } });
const toolResult = (text: string, isError: boolean) => ({ content: [{ type: "text", text }], isError });

/** One JSON-RPC message of the MCP streamable HTTP transport, stateless, answered as plain JSON. */
export async function handleRpc(d: Deps, body: unknown): Promise<{ status: number; body?: unknown }> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail(null, -32600, "Invalid request");
  const m = body as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  const hasId = Object.hasOwn(m, "id");
  const idOk = typeof m.id === "string" || typeof m.id === "number";
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string" || (hasId && !idOk)) return fail(idOk ? (m.id as Id) : null, -32600, "Invalid request");
  if (!hasId) return { status: 202 };
  const id = m.id as Id;
  const params = (typeof m.params === "object" && m.params !== null && !Array.isArray(m.params) ? m.params : {}) as Record<string, unknown>;
  switch (m.method) {
    case "initialize":
      return reply(id, {
        protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : FALLBACK_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "musickit-library", version: "1" },
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: devTools() });
    case "tools/call": {
      if (typeof params.name !== "string") return fail(id, -32602, "Invalid params: name is required");
      try {
        const s = await devScope(params.arguments, d);
        if ("error" in s) return reply(id, toolResult(s.error, true));
        const r = await callTool(d, s.scope, params.name, s.args);
        return reply(id, r.ok ? toolResult(JSON.stringify(r.data), false) : toolResult(r.error, true));
      } catch (e) {
        console.error("library tool failed", params.name, e);
        return reply(id, toolResult(READ_FAILED, true));
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${m.method}`);
  }
}

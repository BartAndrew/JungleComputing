# Jungle MCP - Direct AI Interaction

**Edition:** 14 September 2026. This describes the implementation in `core/mcp`, not an already-connected ChatGPT app.

## 1. Two separate interfaces

**Jungle Platform MCP** handles platform observation and fixed diagnostic jobs. **Repair Network MCP** handles case observation and the implemented repair lifecycle. Connecting an AI to repair work does not have to grant platform-administration tools.

The adapters use the official Python MCP SDK's maintained v1 API (`mcp>=1.28,<2`). They expose tools, resources and review prompts. Rust services remain authoritative; MCP is another API client, not a new database. No model/provider key is bundled or required by the adapters. Your AI host supplies the model, dispatches tools and obtains approvals. Its provider may still receive tool results or charge for model use.

## 2. Security and approvals

Start read-only. Write tools are absent unless the particular server starts with `--allow-writes`; the domain adapter also enforces that mode. A host allowlist can further restrict tools.

For a write, a preparation tool stores the exact arguments for 300 seconds and returns a preview and confirmation ID. The AI shows that preview, obtains explicit user approval, and invokes the matching commit tool with the ID and `confirmed=true`. The commit cannot replace the case or payload. Successful confirmation results are cached within that process/expiry window.

**This does not prove human consent independently.** An AI can supply a boolean. Configure the host to require human approval before dispatching commit tools. MCP annotations describe risk, not authorisation enforcement. [Tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

This is one local operator, not tenant identity. Tools do not accept arbitrary URLs, SQL, shell commands, filesystem paths, secrets, payments or insurance decisions. Backend calls are fixed local routes, identifiers are validated, redirects and proxy-environment routing are disabled, responses are bounded and arbitrary node metadata is excluded.

## 3. Install

Start the core stack following the user manual. From the repository root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r core/mcp/requirements.txt
```

Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r core/mcp/requirements.txt
```

Use Python 3.11+. Keep the SDK below major version 2 until a deliberate migration is tested. The maintained SDK documentation recommends a bounded v1 dependency for applications using that API. [Official SDK](https://py.sdk.modelcontextprotocol.io/v1/).

Defaults are `JUNGLE_BASE_URL=http://127.0.0.1:8080` and `JUNGLE_MCP_REGISTER=true`. Only an explicit localhost HTTP port is accepted. Tools cannot override the origin. The MCP client does not need the registry service token: the fixed local gateway calls the internal repair API.

## 4. Connect a local AI host through stdio

Generate configuration with the interpreter that has the SDK installed:

```bash
.venv/bin/python core/mcp/configure.py --format codex
```

Review and copy the printed absolute-path entries into your client's configuration. The helper does not edit the client or activate an app in this conversation. For the common JSON shape use `--format json`. On Windows substitute `.venv\Scripts\python.exe`.

Representative Codex configuration:

```toml
[mcp_servers.jungle-platform]
command = "/absolute/path/JungleComputing/.venv/bin/python"
args = ["/absolute/path/JungleComputing/core/mcp/server.py", "platform"]
startup_timeout_sec = 20
tool_timeout_sec = 30
default_tools_approval_mode = "prompt"

[mcp_servers.jungle-platform.env]
JUNGLE_BASE_URL = "http://127.0.0.1:8080"

[mcp_servers.jungle-repair]
command = "/absolute/path/JungleComputing/.venv/bin/python"
args = ["/absolute/path/JungleComputing/core/mcp/server.py", "repair-network"]
startup_timeout_sec = 20
tool_timeout_sec = 30
default_tools_approval_mode = "prompt"

[mcp_servers.jungle-repair.env]
JUNGLE_BASE_URL = "http://127.0.0.1:8080"
```

Codex documents stdio/HTTP, configuration, tool allowlists and approval settings. Check your installed version when a setting differs. [Official setup](https://developers.openai.com/codex/mcp).

Restart/refresh the host and confirm both servers initialize with different tool lists. Ask for capabilities first. A command such as `python core/mcp/server.py platform` waits for MCP messages on stdin; it is not a chat UI. The host normally launches it.

### Enable only necessary writes

Add `--allow-writes` to the desired layer's argument list:

```toml
args = ["/absolute/path/JungleComputing/core/mcp/server.py", "repair-network", "--allow-writes"]
```

Keep host approval prompts enabled. The configuration helper's write flag enables both printed entries; edit the result to least privilege. Reconnect to refresh discovery.

## 5. Protected local Streamable HTTP

This alternative is for HTTP-capable local hosts. It binds only `127.0.0.1`, not a public interface, and does not implement OAuth.

In separate POSIX terminals:

```bash
export JUNGLE_PLATFORM_MCP_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
.venv/bin/python core/mcp/server.py platform --transport http --port 8787
```

```bash
export JUNGLE_REPAIR_MCP_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
.venv/bin/python core/mcp/server.py repair-network --transport http --port 8788
```

Configure each client securely with the corresponding token from that server's environment. Do not print/store it in a committed file or confuse it with `JUNGLE_SERVICE_TOKEN`. Read-only HTTP also requires authentication. Endpoints:

```text
http://127.0.0.1:8787/mcp    Jungle Platform
http://127.0.0.1:8788/mcp    Repair Network
```

Clients send `Authorization: Bearer <layer-specific-token>`. Codex supports `bearer_token_env_var` rather than a literal secret. The variable must exist in the process launching that client; another terminal's variables are not automatically shared.

The wrapper rejects invalid Host/Origin, missing/duplicate authorization headers, other paths and oversized requests. No unrestricted CORS is added. Bearer protection does not create per-user permissions or OAuth discovery. Stdio uses a subprocess owned by the host and does not require these HTTP tokens.

## 6. Hosted ChatGPT

Repository code does not make an MCP app available inside this conversation. ChatGPT web does not read your local client configuration or directly reach your machine's localhost.

OpenAI currently documents remote MCP apps and a Secure MCP Tunnel for supported private-network environments. Workspace administrators control availability. [Developer mode and MCP apps](https://help.openai.com/en/articles/12584461), [connect/test guidance](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).

For this release use local stdio or protected local HTTP. Hosted access is a separate deployment/configuration task: preserve authentication, establish an approved endpoint/bridge, validate Host/Origin behaviour, configure workspace approval rules and test reads before writes. A bridge that changes Host can be rejected; do not simply remove validation. Never publish the unauthenticated development gateway at port 8080.

This commit creates no public URL, OAuth provider, managed tunnel or ChatGPT workspace connection. Real-customer use also needs backend identity and tenant/resource policy, not merely a reachable MCP endpoint.

## 7. Complete platform tool catalogue

Eight read tools are advertised by default. Write mode adds two preparation tools and one commit tool.

| Tool | Inputs | Behaviour |
|---|---|---|
| `jungle_capabilities` | None | Server mode, write access and limitations |
| `jungle_read_manual` | user/ai/operations/developer/status chapter | One fixed documentation chapter |
| `jungle_health` | None | Registry/database readiness, not whole-platform SLA |
| `jungle_list_nodes` | query/status/island/include_simulators; limit 1-200 | Filtered nodes, freshness/simulation labels and truncation counts |
| `jungle_get_node` | Full node UUID | Allowlisted identity/measurement fields |
| `jungle_recent_events` | source/event_type; limit 1-100 | Filter of latest 100 retained events, not a full audit |
| `jungle_topology_history` | minutes 1-60; latest-sample limit 1-60 | Saved samples only; no interpolation |
| `jungle_list_health_checks` | None | Latest 50 diagnostic records |
| `jungle_prepare_health_check` | registry-database or repair-network | Preview/confirmation ID; no job yet |
| `jungle_prepare_cancel_health_check` | job UUID | Proposal for a still-queued job |
| `jungle_commit_change` | confirmation ID, confirmed boolean | WRITE: execute the approved exact proposal |

No platform tool edits repair cases or restarts arbitrary services. Extra targets require reviewed code/tests, not a prompt.

## 8. Complete Repair Network tool catalogue

Six read tools are advertised by default. Write mode adds two preparation tools and one commit tool.

| Tool | Inputs | Behaviour |
|---|---|---|
| `repair_capabilities` | None | Application-layer mode and limitations |
| `repair_read_manual` | One allowlisted chapter | Documentation, not arbitrary file access |
| `repair_summary` | None | All-case totals, statuses and outbox backlog |
| `repair_list_cases` | query/status/active_only; limit 1-100 | Search within latest 100 created cases; descriptions omitted |
| `repair_get_case` | Full case UUID | Fresh details/version and valid next states |
| `repair_workflow` | None | Exact transition graph and internal-approval caveat |
| `repair_prepare_create_case` | vehicle, repairer, description | Validated fictional case proposal; no save |
| `repair_prepare_status_change` | case UUID, status, expected_version | Proposal against fresh version and valid transition |
| `repair_commit_change` | confirmation ID, confirmed boolean | WRITE: execute approved exact application proposal |

Search cannot see beyond the working window. A known UUID can be read directly. There are no booking, insurer, evidence-upload, supplier/procurement or payment tools because those workflows are not implemented.

## 9. Resources and prompts

Resources are `jungle://guide`, `jungle://capabilities`, `repair://guide` and `repair://capabilities`, each on its corresponding server. The guide reads a fixed documentation path and capabilities reflects active server policy.

`platform_health_review` prompts a read-only review of readiness, nodes and retained events. `repair_workload_review` prompts a read-only review of all-case totals versus the bounded working list. Prompts are instructions, not background schedules or permission grants.

## 10. Worked interactions

### Observe

Ask: “Which Jungle services are real, and which need attention?” The AI calls `jungle_list_nodes`, separates simulators from real nodes, reads effective status/heartbeat age and identifies unknown values. It should state the observation time and source limits rather than infer a health score from colour.

### Create

Ask: “Prepare a fictional Corolla case at Demo Workshop for bumper damage.” The AI calls `repair_prepare_create_case`, shows the exact preview, and waits for approval. After host approval of the commit call, it reports the actual case UUID/version. It must not claim a booking, insurer authorisation or supplier order was made.

### Progress

Ask: “Move this case to assessing.” The AI reads the identified case, checks the valid next state and fresh version, and prepares a transition. It shows from/to and obtains approval. A concurrent record change produces a conflict; the AI must reread and seek approval for a new proposal rather than overwriting.

### Diagnose

Ask: “Run a recorded health check for Repair Network.” Prepare through the platform server, approve, commit, then read the resulting job. Queued means accepted, not successful. Only a completed outcome establishes what the check found.

### Recover uncertainty

After a create timeout, retry the same confirmation ID while valid, not a new case plan. The original request ID is reused and the backend deduplicates it. After expiry/restart the memory plan is gone: read current records before creating another. A status change that committed but lost its response can produce a version conflict on retry; reread to establish actual state.

## 11. Presence and logging

By default each bridge registers in AI Gateways and reports every five seconds. This operational presence occurs even when exposed business tools are read-only. Set `JUNGLE_MCP_REGISTER=false` to disable it. Use one process per layer in this development workspace because the node ID is stable per layer.

Heartbeats include call/error counts, write mode and last tool name, not arguments or case content. Counts restart with the process. Completion logs go to stderr, never the protocol stdout. These are local operational records, not a durable tamper-proof audit or verified human approval. The host/model provider can still retain tool results under its own policy.

Stopping an MCP process eventually marks that node stale/offline while the application can remain available.

## 12. Errors and revocation

A tool error is not an empty successful result. Unknown IDs, denied writes, expired plans, invalid transitions, version conflicts and unreachable services have explicit failures. Do not invent replacement records or retry writes with new identifiers indiscriminately.

Revoke writes by removing `--allow-writes` and restarting/reconnecting, or disable commit tools in the host. Revoke an HTTP client by rotating that layer's bearer and restarting. Disable the host server to stop all access. None of these actions deletes case records.

Before production implement backend principals, resource/tenant permissions, appropriately deployed OAuth, scoped credentials, durable audit, rate limits, rotation and security review. Separating two tool surfaces is useful least privilege, not tenant isolation.

## Sources

- [Official Python SDK maintenance line](https://py.sdk.modelcontextprotocol.io/v1/)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP transports and origin rules](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [ChatGPT developer mode/MCP](https://help.openai.com/en/articles/12584461)

External client interfaces can change. These sources were checked for this edition; source code and automated tests define implemented Jungle behaviour.

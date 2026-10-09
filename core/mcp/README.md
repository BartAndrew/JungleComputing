# Jungle MCP: platform and application interfaces

Two isolated tool surfaces using the official MCP Python SDK. The adapter is Python; authoritative platform/application services remain Rust/PostgreSQL.

- Platform: 8 read tools; 3 additional prepare/commit tools when enabled.
- Repair Network: 6 read tools; 3 additional prepare/commit tools when enabled.
- Each has two resources and one review prompt.
- Default stdio/read-only. Optional bearer-protected loopback Streamable HTTP.

## Install and connect

From the repository root using Python 3.11+:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r core/mcp/requirements.txt
.venv/bin/python core/mcp/configure.py --format codex
```

On Windows use `python` and `.venv\Scripts\python.exe`. Review/copy the printed absolute-path configuration into the AI host; the helper does not edit it. For other clients use `--format json`. Keep approval prompts enabled. Use `--allow-writes` only for the intended server layer.

Commands `python core/mcp/server.py platform` and `... repair-network` wait for MCP input; they are not chat interfaces. Normally the AI host starts them. The adapter itself needs no model-provider API key.

## Documentation

[User manual](../../docs/manual/USER_MANUAL.md) | [AI setup and complete tools](../../docs/manual/MCP_GUIDE.md) | [Operations](../../docs/manual/OPERATIONS.md) | [Developer reference](../../docs/manual/DEVELOPER_GUIDE.md) | [Verification status](../../docs/manual/RELEASE_STATUS.md)

## Tests

```bash
python3 -m unittest discover -s core/mcp/tests -p test_engine.py -v
.venv/bin/python core/mcp/tests/sdk_smoke.py
# With actual Jungle services running:
.venv/bin/python core/mcp/tests/sdk_smoke.py --live
```

Default protocol tests use a clearly fictional HTTP fixture. Live mode creates a fictional case in the actual stack. Read the current CI result before claiming these integration checks passed.

## Boundary

One local operator, not production identity/tenancy. Read-only concerns exposed business tools; optional node registration/heartbeats still occur. Set `JUNGLE_MCP_REGISTER=false` to disable presence. No arbitrary metadata/URLs/files/shell/SQL or credentials are exposed.

Five-minute plans bind exact arguments but do not prove human approval; the host must obtain it. HTTP bearer auth is transport protection, not OAuth or insurer permission. Case text may be sent to the chosen model provider. Use fictional data and do not publish the development gateway.

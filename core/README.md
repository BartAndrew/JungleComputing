# Jungle Core - Canopy, Repair Network and MCP

A local-development application platform, separate from the public concept site. Network Observatory is the default Canopy screen. Repair Network is the first real Rust/PostgreSQL application. Two MCP interfaces expose platform and application capabilities to AI hosts.

**Fictional data only.** User identity, tenancy and insurer integration are not implemented. A source commit is not a production deployment.

## Start

From the repository root:

```bash
python3 core/tools/init_local.py
cd core
docker compose up --build
```

The helper preserves an existing `.env`. Windows users can use `python` instead of `python3`.

- `http://localhost:8080` or `/network`: 3D observatory, node inspection, saved topology and diagnostics.
- `http://localhost:8080/overview`: conventional overview.
- `http://localhost:8080/repair`: repair cases.

Only the registry is exposed on loopback. Ordinary restarts preserve the database volume. `docker compose down -v` destroys stored development data.

## Detailed documentation

[Documentation library](../docs/manual/README.md)

- [Detailed user manual](../docs/manual/USER_MANUAL.md)
- [AI/MCP setup and tools](../docs/manual/MCP_GUIDE.md)
- [Operations/recovery](../docs/manual/OPERATIONS.md)
- [Developer/API reference](../docs/manual/DEVELOPER_GUIDE.md)
- [Release scope and verification](../docs/manual/RELEASE_STATUS.md)

## Connect an AI locally

```bash
# Repository root, not core:
python3 -m venv .venv
.venv/bin/python -m pip install -r core/mcp/requirements.txt
.venv/bin/python core/mcp/configure.py --format codex
```

Review/copy the printed configuration. On Windows use `.venv\Scripts\python.exe`. Default read-only; enable only the required layer's writes and require human approval. See [MCP README](mcp/README.md) for stdio/local HTTP. No public URL, OAuth provider or connection to this ChatGPT conversation is provisioned.

## Observation paths

```text
Case change -> case + outbox -> retained registry event -> SSE/recent feed -> Canopy
Service/MCP process -> heartbeat -> registry topology -> Canopy
Registry -> 15-second saved samples -> replay
Fixed diagnostic -> queued/running/result record -> Canopy
Service metrics -> OpenTelemetry Collector -> debug exporter
```

The 3D scene uses registered records. Authority/Worker remain labelled simulations. Links are schematic registry relationships, not measured P2P traffic. Missing values stay unknown. Full metric history, distributed tracing and production audit remain future work.

## Verification

```bash
python3 -m unittest discover -s core/mcp/tests -p test_engine.py -v
.venv/bin/python core/mcp/tests/sdk_smoke.py
# Actual running stack:
python3 core/tests/smoke.py
.venv/bin/python core/mcp/tests/sdk_smoke.py --live
```

Default SDK tests use a fictional HTTP backend with actual MCP transports. Live mode exercises Rust/PostgreSQL and creates fictional records. Check current-commit CI, not an older green result.

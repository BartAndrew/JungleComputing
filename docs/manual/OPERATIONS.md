# Jungle Operations and Recovery Runbook

**Edition:** 14 September 2026. **Scope:** one local development workspace. This is not a production high-availability, disaster-recovery or security certification. Read the [user manual](USER_MANUAL.md) and [release status](RELEASE_STATUS.md) before operating the stack.

## 1. Startup and readiness

From the repository root, run `python3 core/tools/init_local.py` to initialise configuration without overwriting it. Enter `core`, run `docker compose up -d --build`, then inspect `docker compose ps`. PostgreSQL must become ready before dependent services. A valid Compose configuration is not proof that compilation or startup succeeded.

Open Canopy and distinguish actual services from labelled simulators. Inspect heartbeat freshness, repair summary and pending event age. A live simulator does not compensate for an unavailable application. Run a fixed diagnostic when it provides useful evidence, not simply to create activity.

Preserve `.env` and the PostgreSQL named volume between starts. Never generate a replacement token on every restart. Keep secrets, dumps and private operational exports out of the public repository.

## 2. Logs and evidence

```bash
cd core
docker compose ps
docker compose logs --tail=100 registry
docker compose logs --tail=100 repair-network
docker compose logs --tail=100 otel-collector
```

Add `-f` deliberately for a local live view; Ctrl+C stops log following, not the service. Review extracts before sharing them: logs can contain operational identifiers and backend error details. Never share `.env`, connection strings or database dumps with a model or public issue.

Repair request logs have timing and request IDs, not a complete distributed trace. Collector debug output confirms receipt of measurements, not retained historical monitoring. Registry health, browser connectivity, application readiness and outbox delivery are different evidence sources.

MCP completion logs go to stderr, never the protocol stdout. A stdio client owns the process and may retain stderr; HTTP bridge logs belong to the launch terminal. Arguments and case descriptions are excluded from adapter logs, but the host/model provider can retain tool results under its own policy.

## 3. Incident: Repair Network unavailable

Distinguish browser and service failures. Is the registry reachable? Does its `/healthz` readiness check succeed? Does Compose show Repair Network healthy? Read the repair logs before restarting.

An operator can restart the repair container:

```bash
docker compose restart repair-network
```

This preserves PostgreSQL records but can interrupt requests. After an ambiguous write, inspect the actual case before repeating it. A restart does not recompile changed source; use a rebuild after updates. No current MCP tool executes this restart command.

If PostgreSQL is unavailable, application queries and writes cannot be assumed successful. Restore database availability first. Do not substitute zero cases or zero queue depth for failed reads.

## 4. Incident: outgoing events accumulate

Inspect both pending count and oldest age. A transient count during restart can be normal; a rising oldest age means work is not being acknowledged. Verify registry reachability and matching `JUNGLE_SERVICE_TOKEN` configuration in both services. Read registry and repair logs.

The outbox retries stored events and the registry deduplicates identical event IDs. Do not delete outbox records to make a counter green. The business transaction may already have committed while its event waits; confirm the case directly. After recovery check the backlog falls and expected events arrive. Older delivered events can fall outside the bounded recent feed.

## 5. Incident: stale topology, missing snapshots or interrupted diagnostics

Inspect a node's last heartbeat and process. A stopped MCP client makes its gateway node stale/offline without necessarily affecting Repair Network. The registry collects approximately one topology sample every 15 seconds and prunes old samples.

Keep gaps as gaps. Missing samples may reflect downtime or write failures. Check registry/database errors and snapshot age; never manufacture historic healthy observations. The UI browses a maximum 60-minute window even though stored snapshot retention is 24 hours.

Abandoned diagnostic claims are eventually recorded as interrupted failures. Read the outcome and consciously resubmit a check if useful. Admission is bounded to four queued/running jobs, with a submission-rate guard. This is not a general workload scheduler.

## 6. Back up the development database

A useful backup combines database content, privately stored deployment configuration and the matching Git revision. A screenshot is not a backup. Create a private backup directory outside the repository.

For a maintenance backup, stop writers but leave PostgreSQL running:

```bash
cd core
docker compose stop repair-network simulator registry
```

Create a custom-format PostgreSQL dump inside the container and copy the binary to the host. Replace the destination with an existing private directory. This avoids binary redirection differences between shells, including older PowerShell.

```bash
docker compose exec -T postgres pg_dump -U jungle -d jungle -Fc -f /tmp/jungle-backup.dump
docker compose cp postgres:/tmp/jungle-backup.dump /absolute/private-backups/jungle-backup.dump
docker compose exec -T postgres rm /tmp/jungle-backup.dump
```

Inspect the dump's structure and restart writers:

```bash
docker compose cp /absolute/private-backups/jungle-backup.dump postgres:/tmp/jungle-verify.dump
docker compose exec -T postgres pg_restore --list /tmp/jungle-verify.dump
docker compose exec -T postgres rm /tmp/jungle-verify.dump
docker compose start registry repair-network simulator
```

A successful listing checks structure, not successful restoration. Test a full restore in a disposable environment before relying on backups. Record the Git commit, database version, backup time and whether writers were stopped. Do not attach the dump or secrets to GitHub.

## 7. Restore - destructive to the selected target

**The following restore replaces matching objects in the target development database. Back up its current content first.** Confirm the target, selected backup and compatible source revision. This is not a merge of old and new repairs.

Stop registry, repair and simulator writers as above, leaving PostgreSQL running. Copy the selected backup and inspect it before the destructive step:

```bash
docker compose cp /absolute/private-backups/jungle-backup.dump postgres:/tmp/jungle-restore.dump
docker compose exec -T postgres pg_restore --list /tmp/jungle-restore.dump
# DESTRUCTIVE replacement in this selected development database:
docker compose exec -T postgres pg_restore -U jungle -d jungle --clean --if-exists --no-owner /tmp/jungle-restore.dump
docker compose exec -T postgres rm /tmp/jungle-restore.dump
docker compose start registry repair-network simulator
```

Check service readiness, case totals, a known case, pending/delivered events and observation tables. Restored heartbeats can initially be old; clients should report new observations. Do not treat restored historic snapshots as proof of current availability.

Schemas currently use startup migrations. An older binary may not understand a newer schema. Restore a compatible source/database pair; switching Git alone is not a database rollback.

## 8. Updating and rolling back

Record `git rev-parse HEAD`, back up the database and preserve `.env` before updating. Pull the intended branch without discarding local modifications. Rebuild from `core`:

```bash
docker compose up -d --build
```

Inspect build output, container health and the UI. Run smoke tests using fictional records. Validate MCP discovery and approval behaviour before enabling AI writes after a change.

Rollback is an explicit operator decision using a reviewed previous revision and compatible database state. Do not use force pushes, `git reset --hard` or volume deletion as generic fixes. No current MCP tool deploys, restarts, rolls back or deletes the database.

## 9. Separate tokens and rotation

`JUNGLE_SERVICE_TOKEN` protects internal development gateway/application calls. `JUNGLE_PLATFORM_MCP_TOKEN` and `JUNGLE_REPAIR_MCP_TOKEN` protect the separate optional local HTTP MCP endpoints. Use different random values. Stdio does not use these HTTP tokens.

Rotate internal tokens coherently: update private configuration, recreate affected services, and verify gateway access plus event delivery. Rotate a layer's HTTP token by restarting its bridge and updating authorised clients. Never embed secrets in committed configs, screenshots or tool results.

MCP bearer protection does not create user roles, protect every other backend route or establish tenancy. The registry remains a loopback-only, unauthenticated user workspace. Keep real-customer data out until identity/resource policy is implemented.

## 10. Retention and persistence

| Data | Current behaviour |
|---|---|
| Repair cases | Persist until intentionally removed outside current UI; no deletion workflow |
| Repair outbox | Persists including delivery acknowledgement |
| Application/diagnostic events | Persisted; recent API returns latest 100; no general retention policy yet |
| Node SSE events | Transient process broadcast, not durable replay |
| Topology snapshots | Pruned after 24 hours; API window up to 60 minutes |
| Finished health checks | Pruned after seven days; latest-50 read API |
| Request/MCP counters | Reset with their process |
| MCP confirmation plans | Memory only, five-minute expiry, lost at restart |
| Browser theme | Per-browser local setting |

A contractual customer-data retention policy is a production prerequisite. Indefinite development storage is not such a policy.

## 11. Production gate

Before external or real-customer use implement user identity, verified service/node principals, tenant/resource policy, TLS, scoped credentials, appropriately deployed MCP OAuth, durable audit, dependency locks/auditing, secure files, rate limits and load tests. Separate database roles and improve migration discipline. Add monitored telemetry retention and test backup/restore objectives.

Public hosting and confidential insurer integrations require a separate security/deployment review. They are not activated by a feature flag, a hosted MCP URL or a tower labelled live.

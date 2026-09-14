# Release Scope and Verification

**Edition:** 14 September 2026. **Branch:** `build/jungle-core-v0.1`. Source changes are proposed for review, not automatically merged, deployed on the user's server or connected to this ChatGPT conversation.

## Included code

- Existing Rust/PostgreSQL registry, Repair Network cases and transactional event outbox.
- Previously drafted Network Observatory files connected to `/` and `/network`; `/overview` retains the earlier view.
- Source-backed 3D registered-node display, filters/layers, list fallback, activity and saved topology replay.
- Sample storage and bounded, fixed-target diagnostic jobs.
- Two official-SDK MCP surfaces: platform and repair, read-only by default, optional exact prepared/confirmed writes.
- Stdio and protected local Streamable HTTP, documentation resources, review prompts and configuration generator.
- Detailed user, AI, operations and developer manuals; safe non-overwriting local bootstrap; test workflows.

## Verification evidence

During authoring, 35 dependency-free Python domain/security tests passed. They covered read-only enforcement, layer separation, exact plans, expiry, repeated confirmations, uncertain-create retry safety, version/lifecycle conflicts, metadata minimisation, localhost restrictions and bearer/Host/Origin/body guards. Python syntax was checked.

The authoring environment could not install the MCP SDK or execute Docker/Rust because network/toolchain support was unavailable. Those local tests therefore do not establish a successful SDK handshake, running Rust stack or rendered 3D browser session. New CI checks exercise SDK negotiation and a separate real-stack build/integration. Inspect the current commit's GitHub Actions for additional evidence.

Previous screenshots used fictional browser fixture responses. They are not customer telemetry or fresh verification of this observatory revision. Do not infer production readiness from them.

## Explicit exclusions

No user login, tenant/resource isolation, verified machine enrolment, OAuth deployment, public ChatGPT app connection, production hosting, booking capacity, insurer integration, repair-method/evidence files, parts ordering, payments, general distributed-job orchestration, measured P2P traffic, complete OTLP history, tamper-proof audit or certified disaster recovery.

Authority-01 and Worker-01 remain simulated. Unreported actual resource values remain unknown. Foundation floors/capability strings do not prove features are implemented or secure.

## Acceptance gates

1. Review the exact source/dependency diff.
2. Require current-commit unit and SDK protocol checks.
3. Require a successful Rust/Compose build and live MCP smoke test.
4. Verify desktop/mobile, graphics and accessible-list behaviour on the target device.
5. Keep fictional data and loopback bindings until production identity exists.
6. Configure the AI client read-only before enabling a particular layer's writes.
7. Confirm host human-approval settings; a boolean is not consent evidence.
8. Merge/deploy only through an explicit operator action.

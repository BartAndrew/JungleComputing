# Release Scope and Verification

**Edition:** 14 September 2026. **Branch:** `build/jungle-core-v0.1`. Source changes are proposed for review, not automatically merged, installed on the user's server or connected to this ChatGPT conversation.

## Included code

- Rust/PostgreSQL registry, real Repair Network cases and transactional event outbox.
- Previously drafted Network Observatory wired to `/` and `/network`; conventional view retained at `/overview`.
- Registered-node 3D display, filters/layers, list fallback, live activity and recorded topology replay.
- Bounded snapshot storage and fixed-target diagnostic jobs.
- Separate official-SDK platform and Repair Network MCP interfaces, read-only by default with optional exact prepared/confirmed writes.
- Stdio and protected local Streamable HTTP, documentation resources, review prompts and client configuration generator.
- Detailed user, AI, operations and developer manuals; safe non-overwriting bootstrap and test workflows.

## Verified implementation revision

The code revision tested is **`215e1cec32b03e5687a5a7f81223c1b1ddac280f`**. Subsequent documentation-only revisions do not alter that implementation.

Observed GitHub Actions results:

| Check | Observed result |
|---|---|
| Python domain/security unit tests | **35 passed** |
| Platform MCP stdio: read-only and write-enabled discovery/calls | Passed |
| Repair MCP stdio: read-only and write-enabled discovery/calls | Passed |
| Resources and review prompts on both servers | Passed |
| Create/transition preparation, denied false confirmation and duplicate confirmation | Passed against fictional HTTP fixture |
| Actual SDK Streamable HTTP initialization/discovery/tool call | Passed against fictional HTTP fixture |
| HTTP bearer requirement and hostile Origin rejection | Passed |
| Rust registry crate tests | Passed |
| Rust Repair Network crate tests | Passed |
| Compose configuration validation | Passed |
| Full container build and real Rust/PostgreSQL MCP integration | Still running at the evidence check; not claimed as passed |

[MCP workflow and logs](https://github.com/BartAndrew/JungleComputing/actions/runs/34793526759) and [Rust/Core workflow](https://github.com/BartAndrew/JungleComputing/actions/runs/34793526643).

The protocol workflow installed the official **MCP Python SDK 1.30.0** under the bounded v1 dependency range. These were real SDK handshakes, not a handwritten protocol imitation. Its default backend was explicitly fictional, so successful protocol tests must not be relabelled as successful real-stack or production tests. The separate `--live` job exercises the actual application stack.

The authoring sandbox lacked the SDK/network/Docker/Rust environment for local integration. Dependency-free tests also ran during authoring; full protocol checks were executed by GitHub Actions. There is no fresh rendered-browser verification of the new observatory in this revision. Older screenshots used fictional browser fixture responses, not real customers.

## Explicit exclusions

No user login, tenant/resource isolation, verified machine enrolment, OAuth deployment, public ChatGPT app connection, production hosting, booking capacity, insurer integration, repair-method/evidence files, parts ordering, payments, general distributed-job orchestration, measured P2P traffic, complete OTLP history, tamper-proof audit or certified disaster recovery.

Authority-01 and Worker-01 remain simulated. Unreported actual measurements remain unknown. Architectural floors and capability strings do not prove that features are implemented or secure. A confirmation boolean does not prove a human approved: the AI host must enforce approval before writes.

## Acceptance gates

1. Review exact source/dependency differences.
2. Check the current implementation's unit and SDK protocol results.
3. Require successful full-stack build and live MCP integration before merging for use.
4. Verify desktop/mobile, graphics and accessible-list behaviour on the target device.
5. Retain fictional data and loopback bindings until production identity exists.
6. Configure AI access read-only before enabling the intended layer's writes.
7. Confirm host human-approval policy.
8. Merge/deploy only through an explicit operator action.

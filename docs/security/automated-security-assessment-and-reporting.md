# Jungle Computing Security Audit — Automated Assessment & Reporting Specification

## Why this exists

The internal questionnaire covers controls that cannot be reliably observed from outside an application. It should be paired with automated technical evidence so that a security review does not depend only on self-attestation.

The automated assessment should inspect externally visible attack surface and CI/CD evidence, classify findings, calculate category scores, and produce a report with remediation guidance.

## Core report structure

Each audit report should contain:

1. **Application profile**
   - application/service name;
   - owner;
   - primary domain;
   - criticality tier;
   - repositories;
   - hosting provider/regions;
   - data classification;
   - AI usage;
   - assessment date.

2. **Overall security rating**
   - 0–950 score;
   - letter grade A–F;
   - internal questionnaire score;
   - automated technical score;
   - count of Critical, High, Medium and Low findings;
   - trend over time.

3. **Category scores**
   - Internal Questionnaire;
   - Website / HTTP Security;
   - Encryption / TLS;
   - IP & Domain Reputation;
   - Operational / AI Risk;
   - Email Security;
   - DNS Security;
   - Network Exposure;
   - Data Leakage;
   - Attack Surface;
   - Vulnerability Management;
   - CI/CD & Software Supply Chain.

4. **Finding detail**
   - finding title;
   - affected asset(s);
   - severity;
   - evidence;
   - explanation;
   - recommended remediation;
   - compensating control;
   - owner;
   - due date;
   - status.

5. **Evidence inventory**
   - scanned domains/IPs;
   - repositories/pipelines assessed;
   - questionnaire version;
   - scan timestamp;
   - tools/versions used.

---

# Suggested scoring model

Use 950 as the maximum score so reports can retain an intuitive category model.

Suggested letter grades:

| Score | Grade | Interpretation |
|---:|:---:|---|
| 801–950 | A | Robust posture; good control coverage |
| 601–800 | B | Reasonable controls; material gaps may remain |
| 401–600 | C | Poor control coverage; serious issues require action |
| 201–400 | D | Severe security gaps; sensitive workloads should require explicit risk approval |
| 0–200 | F | Basic controls absent; not acceptable for production |

Do **not** allow a strong automated score to hide a weak questionnaire result. Display both separately and combine only after applying category weights.

Suggested starting weights:

| Category | Weight |
|---|---:|
| Internal Questionnaire | 25% |
| Vulnerability Management | 12% |
| Application / Website Security | 10% |
| Encryption / TLS | 10% |
| Identity & Access evidence | 10% |
| CI/CD & Supply Chain | 8% |
| Network / Attack Surface | 7% |
| DNS | 5% |
| Email | 4% |
| Data Leakage | 4% |
| Operational / AI Risk | 5% |

Weights should be configurable by application tier.

## Severity model

- **Critical** — immediate, credible path to material compromise, data breach or arbitrary privileged action.
- **High** — severe weakness requiring urgent remediation.
- **Medium** — meaningful weakness that increases likelihood/impact of compromise.
- **Low** — hardening or hygiene improvement.

Suggested score deductions must be capped per category to avoid double-counting one root cause across many assets.

---

# Automated checks

## 1. Website / HTTP security

Check each internet-facing web asset for:

- Content-Security-Policy present and safely configured;
- frame protection using CSP `frame-ancestors` and/or X-Frame-Options;
- X-Content-Type-Options: nosniff;
- Referrer-Policy;
- Permissions-Policy where appropriate;
- secure cookie flags;
- server/version disclosure;
- default/unmaintained pages;
- directory listing;
- exposed diagnostic endpoints;
- exposed source maps where inappropriate;
- HTTP methods that should be disabled;
- sensitive response caching behavior;
- CORS configuration;
- mixed content;
- redirect behavior.

## 2. Encryption / TLS

Check for:

- TLS certificate availability;
- hostname/certificate match;
- expiration and renewal window;
- complete trust chain;
- TLS 1.2+ only;
- weak TLS 1.2 cipher suites;
- HTTPS redirect;
- HSTS;
- includeSubDomains where safe;
- optional HSTS preload eligibility;
- insecure renegotiation or legacy protocol support;
- certificate transparency anomalies where tooling supports it.

## 3. DNS security

Check:

- DNSSEC status;
- CAA records;
- dangling CNAMEs / takeover risk;
- abandoned subdomains;
- public zone leakage;
- name-server consistency;
- unexpected MX records;
- domain expiration horizon;
- risky wildcard DNS;
- unexpected records created by old infrastructure.

## 4. Email security

For domains that send or receive mail:

- SPF present and syntactically valid;
- SPF does not use permissive `?all`;
- progress from `~all` to `-all` where operationally safe;
- SPF lookup count within limits;
- DKIM present;
- DMARC present;
- DMARC alignment;
- DMARC policy progressing from `p=none` to `quarantine`/ `reject`;
- reporting addresses configured and reviewed;
- MX/TLS configuration where measurable.

## 5. Network exposure

Inventory public ports and services.

Flag, unless explicitly required:

- databases;
- remote admin protocols;
- file sharing;
- orchestration/admin dashboards;
- debug ports;
- message brokers;
- caches;
- unauthenticated metrics endpoints.

For HTTP port 80, verify it only redirects to HTTPS.

## 6. Attack surface

Continuously discover:

- domains;
- subdomains;
- IPs;
- certificates;
- cloud-hosted endpoints;
- public object storage;
- forgotten environments;
- temporary/test systems;
- staging sites;
- exposed admin consoles.

Any asset not mapped to a current owner should become a finding.

## 7. Vulnerability management

Detect:

- end-of-life web servers/runtimes/frameworks;
- known CVEs;
- known exploited vulnerabilities;
- vulnerable container images;
- vulnerable JavaScript/package dependencies;
- exposed versions that cannot be verified as patched.

Prioritize findings using exploitability, internet exposure, privileges and data sensitivity rather than CVSS alone.

## 8. Data leakage

Search approved sources for accidental exposure of:

- API keys;
- passwords;
- private keys;
- access tokens;
- connection strings;
- credentials in Git history;
- public storage buckets;
- sensitive documents;
- stack traces containing secrets;
- environment files.

Automated discovery must follow legal and ethical boundaries and only assess assets/repositories Jungle Computing is authorized to test.

## 9. IP/domain reputation

Check whether owned domains/IPs appear associated with:

- malware;
- phishing;
- spam;
- unwanted software;
- malicious redirects;
- compromise/blocklists.

Reputation findings should trigger incident investigation, not merely a configuration ticket.

## 10. CI/CD and software supply chain

Collect evidence from GitHub and CI/CD:

- branch protection;
- required review;
- dependency scanning;
- secret scanning;
- SAST;
- IaC scanning;
- container scanning;
- build provenance;
- artifact signing where enabled;
- Dependabot/renovation equivalents;
- unresolved Critical/High findings;
- stale dependencies;
- unsupported runtime versions;
- overly broad workflow permissions;
- unpinned third-party CI actions;
- production secrets exposed to untrusted pull-request contexts.

## 11. AI / agent operational risk

Detect and/or attest:

- third-party AI usage;
- external model endpoints;
- AI features publicly advertised;
- unrestricted agent tools;
- tools capable of destructive or privileged operations;
- lack of rate/spend limits;
- lack of human approval for high-impact actions;
- model/provider retention or training use not documented;
- prompt injection defenses absent;
- retrieval stores without tenant-aware authorization;
- lack of AI kill switch/fallback.

Some AI controls cannot be inferred externally; the report should clearly mark these as questionnaire-derived rather than scanner-derived.

---

# Risk examples to include in reports

The reporting engine should be able to express findings such as:

- CSP missing or unsafe;
- frame protections missing;
- X-Content-Type-Options missing;
- server version exposed;
- unmaintained/default page detected;
- SSL/TLS unavailable;
- certificate hostname mismatch;
- HTTPS redirect missing;
- HSTS not enforced;
- legacy TLS enabled;
- weak cipher suites enabled;
- SPF missing or permissive;
- DMARC monitoring-only policy;
- DNSSEC absent;
- CAA absent;
- internet-exposed unnecessary service;
- end-of-life software;
- known vulnerable application/framework;
- sensitive data stored outside approved region;
- production data copied into test without controlled approval/masking;
- developers with persistent production access;
- backup restore not tested;
- third-party risk process absent;
- regular security event review absent;
- secure development training absent;
- web filtering/endpoint protective control absent where required;
- AI customer data usage unclear;
- AI tool permissions too broad;
- AI prompt-injection controls absent.

---

# Report UI concept

The future Jungle Computing administration dashboard should present security as a first-class foundation layer.

Recommended widgets:

- **Overall Security Rating** gauge and grade.
- **Automated vs Questionnaire** score side-by-side.
- **Risk count by severity**.
- **Category score bars** with industry/internal baseline.
- **12-month trend**.
- **Top remediation actions** sorted by risk reduction.
- **Asset inventory** showing owned, unknown and stale assets.
- **AI risk panel** showing models/providers/tools and approval boundaries.
- **Exceptions expiring soon**.
- **Evidence freshness** showing when each control was last verified.

Clicking a category should drill into findings, evidence, owner and remediation state.

---

# Automation roadmap

## Phase 1 — Documentation
- maintain questionnaire as Markdown;
- run manual audit;
- record findings in issues or structured JSON.

## Phase 2 — Machine-readable controls
Create:
- `security/controls.yaml`
- `security/findings.schema.json`
- `security/scoring.yaml`

Each control should have:
- ID;
- title;
- category;
- question;
- applicability condition;
- evidence type;
- default severity;
- framework mappings;
- automated/manual/hybrid flag.

## Phase 3 — Repository checks
GitHub Actions should run:
- secret scanning;
- dependency audit;
- SAST;
- IaC scanning;
- container scanning;
- SBOM generation;
- security-header/TLS tests against preview/prod URLs.

## Phase 4 — External scanner
Build a small service that:
- discovers configured domains;
- scans DNS/TLS/headers/ports;
- stores evidence;
- compares results to previous scan;
- generates findings automatically.

## Phase 5 — Audit dashboard
Add an administration UI for:
- questionnaire completion;
- evidence attachments;
- automated scan ingestion;
- risk acceptance;
- remediation workflows;
- report generation;
- historical trends.

---

# Recommended framework mappings

Where practical, map controls to:

- NIST Cybersecurity Framework 2.0;
- ISO/IEC 27001/27002;
- CIS Controls;
- OWASP ASVS;
- OWASP Top 10;
- OWASP API Security Top 10;
- OWASP SAMM;
- OWASP Top 10 for LLM Applications / GenAI security guidance;
- relevant privacy and regulatory obligations for the deployed region.

Framework mapping should support audit evidence reuse, not turn the questionnaire into a compliance-only exercise.

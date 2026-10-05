# Jungle Computing Internal Application Security Audit Framework

## Purpose

This document defines a reusable security audit for applications, APIs, websites, AI features, agents, MCP servers, and supporting infrastructure created or operated within Jungle Computing.

The audit uses two evidence streams:

1. **Internal control questionnaire** — governance, architecture, data handling, identity, development, AI, resilience, suppliers, monitoring and incident response.
2. **Automated technical assessment** — externally observable controls such as TLS, DNS, HTTP security headers, exposed services, vulnerable software, email security and attack surface.

The output should be a single risk register, score and remediation plan.

## Audit principles

- Evidence over assertion.
- Application-first scoping.
- Risk-based depth and frequency.
- Secure-by-default baselines.
- Least privilege for people, services and AI agents.
- Continuous assurance through CI/CD and scheduled scans.
- AI-specific threat modelling for prompt injection, tool abuse, sensitive-data disclosure and provider risk.
- Every exception must have an owner, rationale and expiry/review date.

## Audit lifecycle

### Gate 0 — Scope and classify
Capture application/service name, owner, purpose, repositories, production domains/API endpoints, hosting providers and regions, data classes, authentication model, third parties, AI models/providers, agents/tools/MCP servers, criticality, regulatory obligations, RTO and RPO.

### Gate 1 — Design review
Complete architecture review, data-flow mapping, threat modelling, privacy review and AI threat review where applicable.

### Gate 2 — Build assurance
Run dependency, secret, SAST, IaC and container checks. Enforce branch protection and code review.

### Gate 3 — Pre-production audit
Complete the questionnaire, automated external scan, vulnerability assessment and penetration test appropriate to risk.

### Gate 4 — Release approval
No unresolved Critical findings. High risks require explicit acceptance and a dated remediation plan.

### Gate 5 — Continuous monitoring
Run technical controls continuously or at least monthly. Repeat the full questionnaire on material change and at least annually for production services.

---

# Questionnaire

Recommended answer values: **Yes / Partially / No / Not Applicable**. Require evidence for High/Critical controls and comments for Partially, No and N/A.

## 1. Scope, service and data

1. Are business and technical owners identified?
2. Is the business purpose documented?
3. Are all production domains, APIs, IPs and externally reachable endpoints inventoried?
4. Are source repositories and deployment pipelines identified?
5. Are hosting providers, cloud accounts/projects and deployment regions documented?
6. Is application data classified?
7. Does the application store, process or transmit confidential, personal, financial, authentication or regulated information?
8. Is only the minimum necessary data collected?
9. Are data flows and trust boundaries documented?
10. Are cross-border transfers and data-sovereignty requirements identified?
11. Are third-party APIs, SaaS services, subprocessors and fourth-party dependencies documented?
12. Is a confidentiality/integrity/availability criticality tier assigned?
13. Are RTO and RPO defined where needed?
14. Are user populations documented, including administrators, service accounts and machines?
15. If AI is used, are models, providers, model endpoints, agents, tools, MCP servers, vector stores and datasets identified?

## 2. Governance and security ownership

16. Is a named person accountable for application security risk?
17. Are responsibilities clear across product, engineering, operations and security?
18. Are applicable policies, standards, legal and contractual obligations identified?
19. Is there an approved process for security exceptions and compensating controls?
20. Do exceptions include owner, residual risk, approval and expiry date?
21. Are material risks entered in a risk register?
22. Are material risks reported to appropriate management?
23. Is a new security review triggered by material architecture, data, identity, hosting or AI changes?
24. Is audit evidence retained so the review can be reproduced?

## 3. Architecture and threat modelling

25. Is a current architecture diagram maintained?
26. Are trust boundaries shown?
27. Has a threat model been completed?
28. Does the threat model cover authentication bypass, privilege escalation, injection, IDOR, data exposure, dependency compromise and denial of service?
29. Are internet-facing components minimized?
30. Are administrative interfaces separated or additionally protected?
31. Are internal services prevented from unnecessary public exposure?
32. Is segmentation/workload isolation appropriate to risk?
33. Are secure baseline configurations defined?
34. Are default credentials, sample applications and unnecessary services removed?
35. Is infrastructure managed as code where practical?
36. Are infrastructure changes reviewed?
37. Are cloud permissions reviewed for least privilege?
38. Are single points of failure identified and mitigated or accepted?

## 4. Identity, authentication and access control

39. Does each human user have a unique identity?
40. Is enterprise SSO used where available?
41. Is MFA required for privileged access?
42. Is MFA required for remote administrative access?
43. Are privileged roles explicitly defined and limited?
44. Is least privilege enforced for users, service accounts, workloads and APIs?
45. Are authorization decisions enforced server-side?
46. Are object-level and function-level authorization checks tested?
47. Is segregation of duties used for sensitive actions where warranted?
48. Are access requests, approvals and revocations auditable?
49. Are access rights periodically reviewed?
50. Are inactive accounts disabled?
51. Is access promptly removed or changed on termination or role change?
52. Are service accounts non-interactive unless required?
53. Are service-account credentials securely managed and rotated?
54. Are emergency/break-glass accounts controlled and tested?
55. Is just-in-time or time-bound production privilege used where practical?
56. Are authentication failures and suspicious logins monitored?
57. Are cookies Secure and HttpOnly with appropriate SameSite settings?
58. Are session lifetimes and re-authentication appropriate to risk?

## 5. Secrets, keys and cryptography

59. Are passwords, API keys, private keys and tokens prohibited from source code/plaintext config?
60. Is an approved secrets manager used in production?
61. Is secret scanning enabled?
62. Are exposed secrets rotated immediately?
63. Is TLS required across untrusted networks?
64. Are TLS 1.2+ protocols required?
65. Are obsolete protocols and weak cipher suites disabled?
66. Are certificates valid, correctly named and renewed before expiry?
67. Is HTTPS enforced?
68. Is HSTS enabled where appropriate?
69. Is sensitive data encrypted at rest?
70. Are encryption keys managed with an approved KMS/HSM or equivalent?
71. Is key access separated from normal application access where warranted?
72. Are key rotation, revocation and destruction processes defined?

## 6. Data protection, privacy and retention

73. Is data collected only for documented purposes?
74. Are privacy/legal processing requirements addressed?
75. Is production data prohibited from lower environments unless approved?
76. If production data is used outside production, is it masked/tokenised/anonymised?
77. Is lower-environment data access restricted?
78. Are retention periods defined for production data, logs, backups, exports and AI data?
79. Is secure deletion performed when retention expires?
80. Are backups included in retention/deletion design?
81. Are bulk export/download functions protected and logged?
82. Are uploads validated for type, size and malicious content?
83. Are secrets and sensitive values redacted from logs/errors?
84. Is DLP or equivalent detection used where justified?
85. Are approved mechanisms used for external data sharing?
86. Are cross-border transfers protected by appropriate legal and technical safeguards?
87. Are subprocessors required to protect data to an equivalent standard?
88. Can the organisation identify where client/customer data resides and who can access it?

## 7. Secure software development lifecycle

89. Is a secure development standard applied?
90. Are development, test/staging and production environments separated?
91. Are developers periodically trained in secure coding?
92. Is peer review required before merge?
93. Are production-bound branches protected?
94. Are CI/CD changes protected through review and access control?
95. Is SAST run automatically?
96. Is dependency/software-composition analysis run automatically?
97. Are vulnerable dependencies blocked or escalated by severity?
98. Is secret scanning enabled?
99. Is IaC security scanning enabled where relevant?
100. Are container images scanned where used?
101. Are dependencies obtained from trusted registries/sources?
102. Are lock files or equivalent reproducible version controls used?
103. Are build artifacts traceable to source commits and pipelines?
104. Are production deployments performed through controlled pipelines?
105. Are artifact signing/provenance controls used for higher-risk software where practical?
106. Can deployments be safely rolled back?
107. Are emergency changes documented and retrospectively reviewed?

## 8. Web, API and application controls

108. Is server-side input validation used?
109. Is output encoding used to prevent XSS?
110. Are SQL/NoSQL/command queries parameterized or safely constructed?
111. Are deserialization/template-injection risks addressed?
112. Is CSRF protection implemented where relevant?
113. Is Content Security Policy configured where practical?
114. Is clickjacking protection enabled?
115. Is X-Content-Type-Options set to nosniff?
116. Are server/version headers removed or minimized?
117. Do error responses avoid stack traces, secrets and excessive internals?
118. Are API endpoints authenticated and authorised appropriately?
119. Are API tokens minimally scoped?
120. Are rate limits and abuse controls implemented?
121. Are replay attacks considered for sensitive APIs/webhooks?
122. Are webhooks signed/authenticated and replay-protected?
123. Is CORS limited to required origins/methods/headers?
124. Are GraphQL/query interfaces protected from excessive complexity where used?
125. Are object/file references protected against IDOR?
126. Are administrative actions and configuration changes logged?

## 9. AI, generative AI, agents and MCP

127. Is each AI-enabled feature documented with purpose and risk classification?
128. Is model hosting/provider ownership documented?
129. Is it documented whether customer/user data is sent to an AI provider?
130. Is provider retention/training use of prompts, outputs and customer data documented?
131. Where applicable, can users opt out or request data removal from AI-related stores/processes?
132. Are system prompts treated as control logic rather than secure secret storage?
133. Is prompt injection included in the threat model?
134. Is indirect prompt injection from retrieved documents, web content, email, files and tool responses considered?
135. Are model outputs treated as untrusted input before reaching shells, SQL, templates or interpreters?
136. Are agent/tool permissions minimized?
137. Do high-impact actions require deterministic policy checks outside the model?
138. Do destructive, financial, permission, publication or external-communication actions require human approval where appropriate?
139. Are MCP servers/tools independently authenticated and authorised?
140. Are tool calls logged, subject to privacy requirements?
141. Are tool outputs validated before being trusted?
142. Are allow-lists used for permitted tools/domains/paths/commands where practical?
143. Are model/API rate, quota and spend limits configured?
144. Is sensitive information filtered from prompts unless required?
145. Are responses checked for sensitive-data disclosure where warranted?
146. Are retrieval/vector-store permissions aligned with the requesting user?
147. Is tenant isolation enforced for embeddings, vector stores, memory and files?
148. Are dataset poisoning risks considered?
149. Are uploaded/retrieved files scanned and validated before AI context use where appropriate?
150. Are model, prompt and policy changes versioned and evaluated before release?
151. Are jailbreak, prompt-injection, tool-abuse and data-leakage tests performed?
152. Are model boundaries, prohibited uses and failure modes documented?
153. Is there a safe fallback for critical processes when AI is unavailable or unsafe?
154. Can an AI feature be rapidly disabled without taking down the whole application?
155. Are model/provider changes subject to supplier security/privacy review?
156. Are AI incidents, harmful outputs and materially biased/degraded outputs covered by incident management?

## 10. Vulnerability and patch management

157. Is vulnerability management ownership defined?
158. Are OSs, runtimes, frameworks, packages and images inventoried?
159. Are CVEs/security advisories monitored?
160. Are remediation SLAs defined by severity/exploitability?
161. Are internet-facing Critical vulnerabilities remediated or isolated immediately?
162. Is end-of-life software prohibited without an approved exception?
163. Are patches tested and deployed through controlled processes?
164. Are authenticated vulnerability scans used where feasible?
165. Is DAST used for applicable web/API services?
166. Are independent penetration tests performed for high-risk or internet-facing systems?
167. Are penetration-test findings tracked and retested?
168. Are false positives and accepted risks documented?

## 11. Logging, monitoring and detection

169. Are security-relevant events defined?
170. Are successful and failed authentication events recorded?
171. Are privilege and access-control changes recorded?
172. Are critical data exports and destructive actions recorded?
173. Are logs protected from unauthorized alteration?
174. Are system clocks synchronized?
175. Are log retention periods defined?
176. Are alerts configured for suspicious authentication, malware, privilege misuse and unusual API activity?
177. Are production logs reviewed using a structured process?
178. Are alerts routed to accountable responders?
179. Are alert rules periodically tuned and tested?
180. Can activity be traced to a user/service/workload identity?

## 12. Network, DNS, email and external attack surface

181. Are public DNS records inventoried?
182. Is DNSSEC enabled where supported and appropriate?
183. Are CAA records used where practical?
184. Are dangling DNS records and abandoned subdomains detected?
185. Are public ports/services limited to explicit requirements?
186. Are management/database/file-sharing services blocked from unnecessary internet exposure?
187. Are exposed services continuously inventoried?
188. Are domains/IPs monitored for phishing, malware and reputation problems?
189. If the service sends email, is SPF correctly configured?
190. Is DKIM configured?
191. Is DMARC deployed and moving toward quarantine/reject enforcement?
192. Are unused domains and websites safely decommissioned?

## 13. Third-party and supply-chain security

193. Are third parties classified by data and privilege received?
194. Are high-risk suppliers assessed before production use?
195. Do contracts address security, privacy, breach notification, return/deletion and permitted use where appropriate?
196. Are fourth-party/subprocessor dependencies considered?
197. Are supplier credentials unique, least-privileged and revocable?
198. Is supplier remote access logged/time-limited where feasible?
199. Is there a process for critical supplier/dependency vulnerabilities or breaches?
200. Are open-source dependencies reviewed for maintenance status, provenance and licensing as well as vulnerabilities?

## 14. Backup, resilience and continuity

201. Is data backed up according to RPO?
202. Are backups protected from production credential compromise/ransomware where practical?
203. Are restores tested at least annually, and more frequently for critical systems?
204. Are recovery procedures documented and executable by more than one person?
205. Are recovery dependencies documented, including identity, DNS, secrets and certificates?
206. Is redundancy/failover implemented according to availability objectives?
207. Is failover tested?
208. Is capacity monitored?
209. Are denial-of-service and AI denial-of-wallet scenarios considered?
210. Are manual fallback procedures defined for critical business processes?

## 15. Incident response

211. Is the application covered by an incident-response plan?
212. Is there a clear escalation path?
213. Are customer, regulator, insurer and law-enforcement notification obligations known?
214. Can credentials, API keys, certificates and sessions be rapidly revoked?
215. Can affected services/features be isolated while preserving evidence?
216. Are evidence preservation, impact assessment, containment, eradication and recovery procedures defined?
217. Must exploited vulnerabilities and persistence mechanisms be remediated before closure?
218. Are lessons learned fed back into architecture, controls and testing?
219. Are tabletop/incident exercises performed for higher-risk applications?
220. Have incidents in the review period been recorded and corrective actions completed?

---

# Evidence expectations

Acceptable evidence includes architecture/data-flow diagrams, threat models, policies, IAM exports, access reviews, CI scan outputs, SBOMs, penetration-test reports, vulnerability tickets, TLS/DNS/header scans, backup-restore tests, incident/tabletop records, AI evaluation/red-team results and provider data-processing terms.

# Risk treatment record

For each failed/partial control, record:

| Field | Required content |
|---|---|
| Finding ID | Stable identifier |
| Control | Questionnaire control number |
| Finding | What is missing or unsafe |
| Asset(s) | Affected system/component/domain |
| Severity | Critical / High / Medium / Low |
| Likelihood | Rare / Unlikely / Possible / Likely / Almost Certain |
| Impact | Insignificant / Minor / Moderate / Major / Severe |
| Evidence | Links, screenshots, logs |
| Recommended action | Specific remediation |
| Compensating control | Existing mitigation |
| Owner | Accountable person/team |
| Due date | Remediation date |
| Status | Open / In Progress / Accepted / Resolved |
| Residual risk | Risk after planned controls |
| Exception expiry | Mandatory for accepted risk |

# Minimum release criteria

A production release should normally require:

- no unresolved Critical findings;
- no exposed secrets;
- no known Critical remotely exploitable vulnerability in the production path;
- MFA for privileged production access;
- controlled, auditable production deployment;
- encryption in transit for authenticated/sensitive traffic;
- authorization testing for privileged and tenant-sensitive functions;
- backup/recovery appropriate to service tier;
- security monitoring for material events;
- threat modelling for internet-facing or sensitive services;
- AI threat modelling and tool-permission review for agentic/AI systems;
- explicit risk acceptance for deferred High findings.

## Future implementation

Store this questionnaire as YAML/JSON so Jungle Computing can render it in an internal audit UI, attach evidence, calculate risk, generate reports and automatically populate controls from CI/CD and external scanning.

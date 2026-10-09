"""Deterministic domain/security checks. No SDK or running backend needed."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Backend, BridgeError, Engine, TRANSITIONS, identifier, safe_node, utc
from server import LocalBearerGate


class FakeBackend:
    def __init__(self):
        self.cases, self.requests = {}, {}
        self.posts, self.jobs, self.events = [], [], []
        self.node = {"id": str(uuid.uuid4()), "name": "Repair Network", "status": "online", "last_seen_at": utc(), "metadata": {"runtime": "rust", "simulated": False, "secret": "never-return-this"}, "cpu_percent": None}

    def __call__(self, method, path, payload=None):
        payload = copy.deepcopy(payload)
        if method == "GET":
            if path == "/healthz": return {"status": "ok"}
            if path == "/api/nodes": return [self.node]
            if path.startswith("/api/nodes/"): return self.node
            if path == "/api/repair/cases": return {"cases": list(self.cases.values())[-100:], "limit": 100}
            if path == "/api/repair/summary": return {"total_cases": len(self.cases), "active_cases": len(self.cases)}
            if path == "/api/application-events/recent": return {"events": self.events}
            if path.startswith("/api/observation/snapshots"): return {"snapshots": [{"id": 1, "observed_at": utc(), "nodes": [self.node]}]}
            if path == "/api/operations/probes": return {"jobs": self.jobs}
            if path.startswith("/api/repair/cases/"):
                try: return copy.deepcopy(self.cases[path.rsplit("/", 1)[1]])
                except KeyError: raise BridgeError("not_found")
        if method == "POST":
            self.posts.append((path, payload))
            if path == "/api/repair/cases":
                if payload["request_id"] in self.requests: return copy.deepcopy(self.requests[payload["request_id"]])
                case = {**payload, "id": str(uuid.uuid4()), "status": "new", "version": 1, "created_at": utc(), "updated_at": utc()}
                self.cases[case["id"]] = case
                self.requests[payload["request_id"]] = case
                return copy.deepcopy(case)
            if path.endswith("/status"):
                case = self.cases[path.split("/")[-2]]
                if case["version"] != payload["expected_version"]: raise BridgeError("conflict_refresh_required")
                if payload["status"] not in TRANSITIONS[case["status"]]: raise BridgeError("invalid_status_transition")
                case.update(status=payload["status"], version=case["version"] + 1)
                return copy.deepcopy(case)
            if path == "/api/operations/probes":
                job = {"id": str(uuid.uuid4()), "target": payload["target"], "status": "queued"}
                self.jobs.append(job)
                return job
            if path.endswith("/cancel"):
                job = next(j for j in self.jobs if j["id"] == path.split("/")[-2])
                job["status"] = "cancelled"
                return job
            if "/api/nodes" in path: return {"ok": True}
        raise BridgeError("not_found")


class DomainTests(unittest.TestCase):
    def setUp(self):
        self.backend = FakeBackend()
        self.now = 10.0
        self.repair = Engine("repair-network", writes=True, backend=self.backend, clock=lambda: self.now)
        self.platform = Engine("platform", writes=True, backend=self.backend, clock=lambda: self.now)

    def prepare(self, **changes):
        return self.repair.call("repair_prepare_create_case", {"vehicle": "Fictional Corolla", "repairer": "Demo Workshop", "description": "Fictional bumper damage", **changes})

    def create(self):
        p = self.prepare()
        return self.repair.call("repair_commit_change", {"confirmation_id": p["confirmation_id"], "confirmed": True})["result"]

    def test_read_only_default(self):
        engine = Engine("repair-network", backend=self.backend)
        with self.assertRaises(BridgeError): engine.call("repair_prepare_create_case", {"vehicle": "x", "repairer": "x", "description": "x"})
        self.assertEqual(self.backend.posts, [])

    def test_layer_separation(self):
        for engine, tool in [(self.repair, "jungle_list_nodes"), (self.platform, "repair_summary")]:
            with self.assertRaisesRegex(BridgeError, "wrong_layer"): engine.call(tool, {})

    def test_prepare_does_not_write(self):
        self.assertTrue(self.prepare()["requires_human_confirmation"])
        self.assertEqual(self.backend.posts, [])

    def test_false_confirmation_blocked(self):
        p = self.prepare()
        with self.assertRaisesRegex(BridgeError, "confirmation_required"): self.repair.commit(p["confirmation_id"], False)
        self.assertEqual(self.backend.posts, [])

    def test_string_true_is_not_confirmation(self):
        with self.assertRaises(BridgeError): self.repair.commit(self.prepare()["confirmation_id"], "true")

    def test_confirmation_expiry(self):
        p = self.prepare()
        self.now = 310
        with self.assertRaises(BridgeError): self.repair.commit(p["confirmation_id"], True)

    def test_confirmation_layer_binding(self):
        with self.assertRaises(BridgeError): self.platform.commit(self.prepare()["confirmation_id"], True)

    def test_duplicate_commit_cached(self):
        p = self.prepare()
        first = self.repair.commit(p["confirmation_id"], True)
        second = self.repair.commit(p["confirmation_id"], True)
        self.assertEqual(first["result"]["id"], second["result"]["id"])
        self.assertTrue(second["duplicate_confirmation"])
        self.assertEqual(len(self.backend.posts), 1)

    def test_preview_cannot_mutate_plan(self):
        p = self.prepare()
        p["preview"]["vehicle"] = "Tampered preview"
        self.assertEqual(self.repair.commit(p["confirmation_id"], True)["result"]["vehicle"], "Fictional Corolla")

    def test_uncertain_commit_retry_reuses_id(self):
        p = self.prepare()
        real = self.backend
        def flaky(method, path, payload=None):
            result = real(method, path, payload)
            if len(real.posts) == 1: raise BridgeError("backend_unavailable")
            return result
        self.repair.backend = flaky
        with self.assertRaises(BridgeError): self.repair.commit(p["confirmation_id"], True)
        self.repair.commit(p["confirmation_id"], True)
        self.assertEqual(len(self.backend.cases), 1)

    def test_valid_transition(self):
        c = self.create()
        p = self.repair.call("repair_prepare_status_change", {"case_id": c["id"], "status": "assessing", "expected_version": 1})
        self.assertEqual(self.repair.commit(p["confirmation_id"], True)["result"]["version"], 2)

    def test_invalid_transition(self):
        c = self.create()
        with self.assertRaisesRegex(BridgeError, "invalid_status_transition"):
            self.repair.call("repair_prepare_status_change", {"case_id": c["id"], "status": "completed", "expected_version": 1})

    def test_conflict_at_preparation(self):
        c = self.create()
        with self.assertRaisesRegex(BridgeError, "conflict_refresh_required"):
            self.repair.call("repair_prepare_status_change", {"case_id": c["id"], "status": "assessing", "expected_version": 2})

    def test_conflict_after_preparation(self):
        c = self.create()
        p = self.repair.call("repair_prepare_status_change", {"case_id": c["id"], "status": "assessing", "expected_version": 1})
        self.backend.cases[c["id"]]["version"] = 2
        with self.assertRaises(BridgeError): self.repair.commit(p["confirmation_id"], True)

    def test_search_scope_and_minimisation(self):
        self.create()
        r = self.repair.call("repair_list_cases", {"query": "corolla", "limit": 1})
        self.assertEqual(len(r["cases"]), 1)
        self.assertNotIn("description", r["cases"][0])
        self.assertIn("latest 100", r["scope"])

    def test_malformed_fields(self):
        for fields in ({"vehicle": " "}, {"description": "x" * 2001}, {"repairer": "x\x00y"}):
            with self.subTest(fields=fields):
                with self.assertRaises(BridgeError): self.prepare(**fields)

    def test_uuid_path_injection(self):
        for value in ("../../.env", "x?url=http://example.com", str(uuid.UUID(int=0))):
            with self.assertRaises(BridgeError): identifier(value)

    def test_backend_allowlist(self):
        for value in ("https://example.com", "http://localhost:8080/path", "http://127.0.0.1:8080#x", "http://secret@localhost:8080", "http://127.0.0.1.evil:8080", "http://127.0.0.1:80?x=1", "file:///tmp/x"):
            with self.subTest(value=value):
                with self.assertRaises(BridgeError): Backend(value)
        self.assertEqual(Backend("http://127.0.0.1:8080").base, "http://127.0.0.1:8080")

    def test_metadata_redaction(self):
        r = self.platform.call("jungle_list_nodes", {})
        self.assertNotIn("never-return-this", json.dumps(r))
        self.assertIsNone(r["nodes"][0]["cpu_percent"])

    def test_unknown_heartbeat(self):
        self.backend.node["last_seen_at"] = "invalid"
        self.assertEqual(safe_node(self.backend.node)["effective_status"], "unknown")

    def test_snapshot_metadata_excluded(self):
        self.assertNotIn("secret", json.dumps(self.platform.call("jungle_topology_history", {})))

    def test_bounded_queries(self):
        for limit in (0, 201, True):
            with self.assertRaises(BridgeError): self.platform.call("jungle_list_nodes", {"limit": limit})

    def test_allowlisted_probe(self):
        with self.assertRaises(BridgeError): self.platform.call("jungle_prepare_health_check", {"target": "http://169.254.169.254"})
        p = self.platform.call("jungle_prepare_health_check", {"target": "registry-database"})
        self.assertEqual(len(self.backend.posts), 0)
        self.assertEqual(self.platform.commit(p["confirmation_id"], True)["result"]["status"], "queued")

    def test_cancel_queued_probe(self):
        p = self.platform.call("jungle_prepare_health_check", {"target": "repair-network"})
        job = self.platform.commit(p["confirmation_id"], True)["result"]
        p = self.platform.call("jungle_prepare_cancel_health_check", {"job_id": job["id"]})
        self.assertEqual(self.platform.commit(p["confirmation_id"], True)["result"]["status"], "cancelled")

    def test_document_paths(self):
        with self.assertRaises(BridgeError): self.platform.manual("../../.env")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "USER_MANUAL.md").write_text("Test manual")
            engine = Engine("platform", backend=self.backend, manual_root=root)
            self.assertEqual(engine.manual()["text"], "Test manual")

    def test_no_record_data_in_audit(self):
        with self.assertLogs("jungle.mcp", level="INFO") as logs: self.create()
        output = "\n".join(logs.output)
        self.assertNotIn("Corolla", output)
        self.assertNotIn("bumper", output)
        self.assertIn("mcp.tool.completed", output)

    def test_presence_no_fake_cpu(self):
        self.platform.heartbeat()
        payload = self.backend.posts[-1][1]
        self.assertFalse(payload["metadata"]["simulated"])
        self.assertIsNone(payload["cpu_percent"])

    def test_no_shell_tool(self):
        with self.assertRaises(BridgeError): self.platform.call("jungle_shell", {"command": "whoami"})


class GateTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, headers, body=b"{}", path="/mcp"):
        async def app(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})
        gate = LocalBearerGate(app, 8787, "A" * 48)
        output = []
        async def send(msg): output.append(msg)
        async def receive(): return {"type": "http.request", "body": body, "more_body": False}
        await gate({"type": "http", "method": "POST", "path": path, "headers": headers}, receive, send)
        return output[0]["status"]

    def good(self): return [(b"host", b"127.0.0.1:8787"), (b"authorization", b"Bearer " + b"A" * 48)]
    async def test_valid(self): self.assertEqual(await self.request(self.good()), 200)
    async def test_missing_token(self): self.assertEqual(await self.request(self.good()[:1]), 401)
    async def test_wrong_host(self): self.assertEqual(await self.request([(b"host", b"attacker.example"), self.good()[1]]), 403)
    async def test_wrong_origin(self): self.assertEqual(await self.request(self.good() + [(b"origin", b"https://attacker.example")]), 403)
    async def test_duplicate_auth(self): self.assertEqual(await self.request(self.good() + [self.good()[1]]), 401)
    async def test_body_bound(self): self.assertEqual(await self.request(self.good(), b"x" * 65537), 413)
    async def test_wrong_path(self): self.assertEqual(await self.request(self.good(), path="/private"), 404)


if __name__ == "__main__": unittest.main()

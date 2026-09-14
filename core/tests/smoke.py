"""Integration checks against the real Rust/PostgreSQL development stack.
Creates fictional test cases and recorded read-only diagnostics.
"""
import json
import os
import time
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get("JUNGLE_TEST_URL", "http://127.0.0.1:8080")

def call(path, data=None, headers=None):
    request = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json", **(headers or {})})
    try:
        response = urllib.request.urlopen(request, timeout=8)
    except urllib.error.HTTPError as response:
        return response.code, json.load(response)
    with response:
        return response.status, json.load(response)

def eventually(check, seconds=45):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        try:
            value = check()
            if value:
                return value
        except (OSError, ValueError, KeyError):
            pass
        time.sleep(1)
    raise AssertionError("Timed out waiting for expected live state")

def main():
    assert eventually(lambda: call("/healthz")[0] == 200)
    nodes = eventually(lambda: [n for n in call("/api/nodes")[1] if n["name"] == "Repair Network"])
    assert nodes[0]["id"] == str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-api-01"))
    assert nodes[0]["metadata"]["simulated"] is False
    assert not any(n["name"] == "API-01" for n in call("/api/nodes")[1])
    for path, text in [("/", "Living network"), ("/network", "Network observatory"), ("/overview", "Platform overview"), ("/repair", "New repair case"), ("/ui.css", "color-scheme"), ("/ui.js", "window.Jungle"), ("/network-app.mjs", "NetworkScene"), ("/network-model.mjs", "SCENE_LIMIT")]:
        with urllib.request.urlopen(BASE + path, timeout=8) as response:
            assert response.status == 200 and text in response.read().decode(), path
    payload = {"request_id": str(uuid.uuid4()), "vehicle": "Fictional Smoke Test Vehicle", "repairer": "Fictional Test Workshop", "description": "Automated integration test. No customer information."}
    status, created = call("/api/repair/cases", payload)
    assert status == 201, (status, created)
    case_id = created["id"]
    status, duplicate = call("/api/repair/cases", payload)
    assert status == 200 and duplicate["id"] == case_id
    assert call("/api/repair/cases", {**payload, "vehicle": "Different"})[0] == 409
    assert call("/api/repair/cases", {**payload, "request_id": str(uuid.uuid4()), "vehicle": " "})[0] == 400
    path = f"/api/repair/cases/{case_id}/status"
    assert call(path, {"status": "completed", "expected_version": 1})[0] == 409
    status, changed = call(path, {"status": "assessing", "expected_version": 1})
    assert status == 200 and changed["version"] == 2
    assert call(path, {"status": "assessing", "expected_version": 1})[0] == 409
    assert call(f"/api/repair/cases/{case_id}")[1]["status"] == "assessing"
    assert call("/api/repair/cases", payload, {"Origin": "https://untrusted.example"})[0] == 403
    assert call("/api/application-events", {})[0] in (400, 401, 422)
    events = eventually(lambda: [e for e in call("/api/application-events/recent")[1]["events"] if e["subject"] == case_id and e["event_type"] == "repair_case.status_changed"])
    assert len(events) == 1
    assert "vehicle" not in events[0]["data"] and "description" not in events[0]["data"]
    summary = call("/api/repair/summary")[1]
    assert summary["total_cases"] == sum(summary["by_status"].values())
    assert summary["active_cases"] == summary["total_cases"] - summary["by_status"]["completed"] - summary["by_status"]["cancelled"]
    snapshots = eventually(lambda: call("/api/observation/snapshots?minutes=1")[1]["snapshots"])
    assert snapshots and "nodes" in snapshots[-1]
    request = {"request_id": str(uuid.uuid4()), "target": "registry-database"}
    status, probe = call("/api/operations/probes", request)
    assert status == 202, (status, probe)
    duplicate = call("/api/operations/probes", request)[1]
    assert duplicate["id"] == probe["id"]
    completed = eventually(lambda: [j for j in call("/api/operations/probes")[1]["jobs"] if j["id"] == probe["id"] and j["status"] in ("succeeded", "failed")])
    assert completed[0]["status"] == "succeeded", completed
    assert call("/api/operations/probes", {"request_id": str(uuid.uuid4()), "target": "http://169.254.169.254"})[0] == 400
    print(json.dumps({"result": "PASS", "case_id": case_id, "checks": ["real service registered", "API-01 replaced", "UI/3D asset routes", "persistent case create/read", "idempotency", "validation", "lifecycle/version conflicts", "cross-origin write blocked", "durable application events", "summary reconciliation", "saved topology", "fixed diagnostic execution"]}, indent=2))

if __name__ == "__main__":
    main()

"""Integration smoke checks against the actual running Rust + PostgreSQL stack.
Run: python3 core/tests/smoke.py
Creates fictional cases. No third-party dependencies.
"""
import json
import os
import time
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get("JUNGLE_TEST_URL", "http://127.0.0.1:8080")


def call(path, data=None, headers=None):
    req = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json", **(headers or {})})
    try:
        response = urllib.request.urlopen(req, timeout=8)
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
    raise AssertionError("Timed out waiting for the expected live state")


def main():
    assert eventually(lambda: call("/healthz")[0] == 200)
    nodes = eventually(lambda: [n for n in call("/api/nodes")[1] if n["name"] == "Repair Network"])
    assert nodes[0]["id"] == str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-api-01"))
    assert nodes[0]["metadata"]["simulated"] is False
    assert not any(n["name"] == "API-01" for n in call("/api/nodes")[1])
    for path, text in [("/", "Platform overview"), ("/repair", "New repair case"), ("/ui.css", "color-scheme"), ("/ui.js", "window.Jungle")]:
        with urllib.request.urlopen(BASE + path, timeout=8) as r:
            assert r.status == 200 and text in r.read().decode()
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
    assert call("/api/repair/cases", payload, {"Origin": "https://not-your-workspace.example"})[0] == 403
    assert call("/api/application-events", {})[0] in (400, 401, 422)
    events = eventually(lambda: [e for e in call("/api/application-events/recent")[1]["events"] if e["subject"] == case_id and e["event_type"] == "repair_case.status_changed"])
    assert len(events) == 1
    assert "vehicle" not in events[0]["data"] and "description" not in events[0]["data"]
    summary = call("/api/repair/summary")[1]
    assert summary["total_cases"] == sum(summary["by_status"].values())
    assert summary["active_cases"] == summary["total_cases"] - summary["by_status"]["completed"] - summary["by_status"]["cancelled"]
    print(json.dumps({"result": "PASS", "case_id": case_id, "checks": ["real service registered", "API-01 replaced", "UI routes and assets", "persistent case create/read", "idempotent creation", "validation", "lifecycle validation", "optimistic concurrency", "cross-origin write blocked", "durable application event delivery", "summary reconciliation"]}, indent=2))


if __name__ == "__main__":
    main()

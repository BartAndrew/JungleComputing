import json
import os
import random
import time
import urllib.error
import urllib.request
import uuid

REGISTRY = os.getenv("JUNGLE_REGISTRY", "http://registry:8080")

NODES = [
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-authority-01")),
        "name": "Authority-01",
        "node_type": "authority",
        "environment": "development",
        "city": "Core City",
        "island": "Local Jungle",
        "version": "0.1.0",
        "capabilities": ["registry", "discovery", "policy"],
        "metadata": {"runtime": "simulated"},
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-api-01")),
        "name": "API-01",
        "node_type": "application",
        "environment": "development",
        "city": "Core City",
        "island": "Local Jungle",
        "version": "0.1.0",
        "capabilities": ["http", "events", "repair-network-ready"],
        "metadata": {"runtime": "simulated"},
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-worker-01")),
        "name": "Worker-01",
        "node_type": "worker",
        "environment": "development",
        "city": "Compute Grove",
        "island": "Local Jungle",
        "version": "0.1.0",
        "capabilities": ["jobs", "wasm", "ai-ready"],
        "metadata": {"runtime": "simulated", "gpu": False},
    },
]


def request(method, path, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        REGISTRY + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_registry():
    while True:
        try:
            request("GET", "/healthz")
            return
        except Exception as exc:
            print(f"registry unavailable: {exc}; retrying", flush=True)
            time.sleep(2)


def main():
    wait_for_registry()
    for node in NODES:
        result = request("POST", "/api/nodes", node)
        print(f"registered {result['name']} ({result['id']})", flush=True)

    while True:
        for node in NODES:
            cpu_base = 18 if node["node_type"] == "authority" else 34 if node["node_type"] == "application" else 52
            memory_base = 26 if node["node_type"] == "authority" else 42 if node["node_type"] == "application" else 61
            payload = {
                "status": "online",
                "cpu_percent": round(max(1, min(99, random.gauss(cpu_base, 8))), 1),
                "memory_percent": round(max(1, min(99, random.gauss(memory_base, 6))), 1),
            }
            try:
                request("POST", f"/api/nodes/{node['id']}/heartbeat", payload)
            except urllib.error.URLError as exc:
                print(f"heartbeat failed for {node['name']}: {exc}", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()

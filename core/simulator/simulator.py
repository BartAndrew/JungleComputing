"""Two explicitly simulated infrastructure nodes. Repair Network runs separately."""
import json
import os
import random
import time
import urllib.request
import uuid

REGISTRY = os.getenv("JUNGLE_REGISTRY", "http://registry:8080")
NODES = [
    {"id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-authority-01")), "name": "Authority-01", "node_type": "authority", "city": "Core City", "capabilities": ["registry", "discovery", "policy"]},
    {"id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "jungle-worker-01")), "name": "Worker-01", "node_type": "worker", "city": "Compute Grove", "capabilities": ["jobs", "wasm", "ai-ready"]},
]


def request(path, payload):
    req = urllib.request.Request(REGISTRY + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as response:
        return json.load(response)


def main():
    registered = set()
    while True:
        for node in NODES:
            try:
                if node["id"] not in registered:
                    request("/api/nodes", {**node, "environment": "development", "island": "Local Jungle", "version": "0.1.0", "metadata": {"runtime": "simulated", "simulated": True}})
                    registered.add(node["id"])
                request(f"/api/nodes/{node['id']}/heartbeat", {"status": "online", "cpu_percent": round(random.uniform(10, 60), 1), "memory_percent": round(random.uniform(20, 65), 1)})
            except Exception as exc:
                registered.discard(node["id"])
                print(f"simulator retry: {node['name']}: {exc}", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()

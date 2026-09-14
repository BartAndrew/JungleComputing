"""Actual SDK MCP protocol checks. Default backend is FICTIONAL; --live uses local Jungle."""
import argparse
import asyncio
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

HERE = Path(__file__).resolve()
sys.path.insert(0, str(HERE.parent))
from test_engine import FakeBackend
from engine import BridgeError
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import AnyUrl


class Handler(BaseHTTPRequestHandler):
    backend = FakeBackend()
    def log_message(self, *args): pass
    def do_GET(self): self.respond("GET")
    def do_POST(self): self.respond("POST")
    def respond(self, method):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        try:
            result = self.backend(method, self.path, json.loads(body) if body else None)
            status = 200
        except BridgeError as error:
            result = {"error": error.code}
            status = 409 if "conflict" in error.code else 404
        content = json.dumps(result).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


async def session_check(layer, base, writes):
    args = [str(HERE.parents[1] / "server.py"), layer]
    if writes: args.append("--allow-writes")
    params = StdioServerParameters(command=sys.executable, args=args, env={**os.environ, "JUNGLE_BASE_URL": base, "JUNGLE_MCP_REGISTER": "false"})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            initial = await session.initialize()
            assert initial.serverInfo.name
            tools = (await session.list_tools()).tools
            names = {t.name for t in tools}
            prefix = "jungle_" if layer == "platform" else "repair_"
            assert all(n.startswith(prefix) for n in names), names
            assert (prefix + "commit_change" in names) == writes
            expected = (11 if writes else 8) if layer == "platform" else (9 if writes else 6)
            assert len(tools) == expected, names
            caps = await session.call_tool(prefix + "capabilities", {})
            assert not caps.isError and caps.structuredContent["writes_enabled"] == writes
            assert len((await session.list_resources()).resources) == 2
            uri = AnyUrl("jungle://guide" if layer == "platform" else "repair://guide")
            assert (await session.read_resource(uri)).contents
            prompts = (await session.list_prompts()).prompts
            assert len(prompts) == 1 and (await session.get_prompt(prompts[0].name)).messages
            if layer == "platform":
                for name, arguments in [("health", {}), ("list_nodes", {}), ("recent_events", {}), ("topology_history", {"minutes": 1}), ("list_health_checks", {})]:
                    result = await session.call_tool(prefix + name, arguments)
                    assert not result.isError, (name, result)
            else:
                assert not (await session.call_tool("repair_summary", {})).isError
                if writes:
                    draft = await session.call_tool("repair_prepare_create_case", {"vehicle": "Fictional MCP Test Vehicle", "repairer": "Fictional MCP Workshop", "description": "MCP protocol verification; not a customer record."})
                    assert not draft.isError, draft
                    token = draft.structuredContent["confirmation_id"]
                    denied = await session.call_tool("repair_commit_change", {"confirmation_id": token, "confirmed": False})
                    assert denied.isError
                    saved = await session.call_tool("repair_commit_change", {"confirmation_id": token, "confirmed": True})
                    assert not saved.isError, saved
                    duplicate = await session.call_tool("repair_commit_change", {"confirmation_id": token, "confirmed": True})
                    assert duplicate.structuredContent["duplicate_confirmation"]
                    case = saved.structuredContent["result"]
                    plan = await session.call_tool("repair_prepare_status_change", {"case_id": case["id"], "status": "assessing", "expected_version": case["version"]})
                    assert not plan.isError, plan
                    result = await session.call_tool("repair_commit_change", {"confirmation_id": plan.structuredContent["confirmation_id"], "confirmed": True})
                    assert not result.isError and result.structuredContent["result"]["version"] == 2
            print(json.dumps({"result": "PASS", "transport": "stdio", "layer": layer, "write_mode": writes, "tools": len(tools)}))


def http_check(base):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    token = "local-protocol-test-" + "x" * 48
    env = {**os.environ, "JUNGLE_BASE_URL": base, "JUNGLE_MCP_REGISTER": "false", "JUNGLE_PLATFORM_MCP_TOKEN": token}
    proc = subprocess.Popen([sys.executable, str(HERE.parents[1] / "server.py"), "platform", "--transport", "http", "--port", str(port)], env=env, stdout=subprocess.DEVNULL)
    def request(payload, authorised=True, origin=None):
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25"}
        if authorised: headers["Authorization"] = "Bearer " + token
        if origin: headers["Origin"] = origin
        req = urllib.request.Request(f"http://127.0.0.1:{port}/mcp", data=json.dumps(payload).encode(), headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read()
                return response.status, json.loads(body) if body else None
        except urllib.error.HTTPError as error:
            return error.code, None
    try:
        ready = False
        for _ in range(60):
            if proc.poll() is not None: raise AssertionError("HTTP MCP exited before readiness")
            try:
                if request({"jsonrpc": "2.0", "id": 1, "method": "ping"}, authorised=False)[0] == 401:
                    ready = True
                    break
            except urllib.error.URLError: time.sleep(0.1)
        assert ready, "HTTP MCP not ready"
        status, initial = request({"jsonrpc": "2.0", "id": 2, "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "jungle-smoke", "version": "1"}}})
        assert status == 200 and initial["result"]["serverInfo"]["name"] == "Jungle Platform", initial
        assert request({"jsonrpc": "2.0", "method": "notifications/initialized"})[0] == 202
        status, result = request({"jsonrpc": "2.0", "id": 3, "method": "tools/list"})
        assert status == 200 and len(result["result"]["tools"]) == 8, result
        status, result = request({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "jungle_health", "arguments": {}}})
        assert status == 200 and not result["result"].get("isError"), result
        assert request({"jsonrpc": "2.0", "id": 5, "method": "ping"}, origin="https://untrusted.example")[0] == 403
        print(json.dumps({"result": "PASS", "transport": "Streamable HTTP", "checks": ["bearer required", "initialize", "notification", "discovery", "tool call", "origin blocked"]}))
    finally:
        proc.terminate()
        try: proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    fixture = None
    if args.live:
        base = os.environ.get("JUNGLE_TEST_URL", "http://127.0.0.1:8080")
    else:
        fixture = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=fixture.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{fixture.server_port}"
    print("Backend:", "actual local Jungle" if args.live else "FICTIONAL HTTP fixture")
    try:
        for layer in ("platform", "repair-network"):
            for writes in (False, True):
                await session_check(layer, base, writes)
        await asyncio.to_thread(http_check, base)
    finally:
        if fixture:
            fixture.shutdown()
            fixture.server_close()

if __name__ == "__main__": asyncio.run(main())

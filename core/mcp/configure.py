"""Print client configuration; never edit the user's client or store credentials."""
import argparse
import json
from pathlib import Path
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--format', choices=['codex', 'json'], default='codex')
parser.add_argument('--allow-writes', action='store_true')
args = parser.parse_args()
script = str(Path(__file__).with_name('server.py').resolve())
python = str(Path(sys.executable).absolute())
servers = {}
for name, layer in [('jungle-platform', 'platform'), ('jungle-repair', 'repair-network')]:
    servers[name] = {'command': python, 'args': [script, layer] + (['--allow-writes'] if args.allow_writes else []),
                     'env': {'JUNGLE_BASE_URL': 'http://127.0.0.1:8080'}}
if args.format == 'json':
    print(json.dumps({'mcpServers': servers}, indent=2))
else:
    for name, server in servers.items():
        print(f'[mcp_servers.{name}]')
        print('command = ' + json.dumps(server['command']))
        print('args = ' + json.dumps(server['args']))
        print('startup_timeout_sec = 20\ntool_timeout_sec = 30')
        print('default_tools_approval_mode = "prompt"')
        print(f'[mcp_servers.{name}.env]')
        print('JUNGLE_BASE_URL = "http://127.0.0.1:8080"\n')

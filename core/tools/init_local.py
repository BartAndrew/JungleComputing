"""Create core/.env once without overwriting an existing configuration."""
import os
from pathlib import Path
import secrets

path = Path(__file__).resolve().parents[1] / '.env'
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('Existing core/.env preserved. No secret was displayed or changed.')
else:
    with os.fdopen(fd, 'w', encoding='utf-8') as file:
        file.write('JUNGLE_SERVICE_TOKEN=' + secrets.token_hex(32) + '\n')
    print('Created core/.env with a new local service token. Keep it private.')

#!/usr/bin/env python3
import json
from pathlib import Path

root = Path('.')
out = []
for p in sorted((root / 'out' / 'summary').glob('*.json')):
    out.append(json.loads(p.read_text()))
print(json.dumps(out, indent=2))

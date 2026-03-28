#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
import yaml

def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    catalog_path = root / 'docs' / 'source_set' / 'source_catalog.yaml'
    data = yaml.safe_load(catalog_path.read_text(encoding='utf-8')) or {}
    errors = []
    seen = set()
    for entry in data.get('entries', []):
        key = entry.get('canonical_key')
        if not key:
            errors.append('entry missing canonical_key')
            continue
        if key in seen:
            errors.append(f'duplicate canonical_key {key}')
        seen.add(key)
        rel = entry.get('actual_relative_path')
        if not rel:
            errors.append(f'{key}: missing actual_relative_path')
        elif not (root / rel).exists():
            errors.append(f'{key}: missing actual file {rel}')
    if errors:
        print('\n'.join(errors))
        return 1
    print('Catalog valid.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

"""Dump the FastAPI OpenAPI schema to JSON.

Imports the app and reads its schema directly — no server, no port, no race.
Output is key-sorted so regenerating produces a stable diff, which matters
because it feeds a committed generated artifact (libs/shared-types/src/api.d.ts).
"""

import json
import sys
from pathlib import Path

from graphicle_api.main import create_app


def main(argv: list[str]) -> int:
    destination = Path(argv[1]) if len(argv) > 1 else Path("openapi.json")
    schema = create_app().openapi()
    destination.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    print(f"wrote {destination} ({len(schema.get('paths', {}))} paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

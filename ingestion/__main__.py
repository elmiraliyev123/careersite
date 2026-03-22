from __future__ import annotations

import asyncio
import json

from .engine import run_default_ingestion


async def main() -> None:
    result = await run_default_ingestion()
    print(json.dumps(result.to_record(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

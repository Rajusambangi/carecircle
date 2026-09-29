"""Load the synthetic care history into Hindsight.

python scripts/seed.py --reset                      # full 90-day history
python scripts/seed.py --reset --until 2026-07-08   # "week 1" bank for the learning-curve demo
"""

import argparse
import asyncio
from datetime import date

# Import through carecircle (not hindsight_client directly) so its TLS setup runs first.
from carecircle.circle import load_circle, load_history
from carecircle.config import get_settings
from carecircle.memory import HindsightMemory

BATCH = 8


async def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--reset", action="store_true", help="delete and recreate the bank first")
    parser.add_argument("--until", type=date.fromisoformat, help="only load events up to this date")
    parser.add_argument("--bank", help="override HINDSIGHT_BANK_ID")
    parser.add_argument(
        "--refresh-profile", action="store_true", help="refresh the care profile at the end"
    )
    args = parser.parse_args()

    settings = get_settings()
    circle = load_circle(settings.circle_data)
    events = load_history(settings.circle_data)
    if args.until:
        events = [e for e in events if e.occurred_at.date() <= args.until]

    bank_id = args.bank or settings.bank_id
    memory = HindsightMemory.connect(
        settings.hindsight_base_url, settings.hindsight_api_key, bank_id
    )
    try:
        print(f"Setting up bank '{bank_id}' at {settings.hindsight_base_url} (reset={args.reset})")
        await memory.setup(circle, reset=args.reset)
        for i in range(0, len(events), BATCH):
            chunk = events[i : i + BATCH]
            await memory.retain_events(chunk, circle)
            upto = chunk[-1].occurred_at
            print(f"  retained {i + len(chunk)}/{len(events)}  (up to {upto:%d %b %Y})")
        if args.refresh_profile:
            await memory.refresh_profile(circle.patient.id)
            print("Care profile refresh requested")
        print("Done.")
    finally:
        await memory.aclose()


if __name__ == "__main__":
    asyncio.run(main())

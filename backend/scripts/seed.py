"""Load the synthetic care history into Hindsight.

python scripts/seed.py --reset                      # full 90-day history (live bank)
python scripts/seed.py --reset --checkpoints        # also the Week 1 / Day 45 banks
python scripts/seed.py --reset --checkpoints-only   # only checkpoint banks, keeps the live bank
python scripts/seed.py --reset --until 2026-07-08   # one bank up to a date
"""

import argparse
import asyncio
from datetime import date

# Import through carecircle (not hindsight_client directly) so its TLS setup runs first.
from carecircle import checkpoints
from carecircle.circle import load_circle, load_history
from carecircle.config import get_settings
from carecircle.memory import HindsightMemory
from carecircle.schemas import CareEvent, Circle

BATCH = 8


async def seed_bank(
    memory: HindsightMemory,
    circle: Circle,
    events: list[CareEvent],
    *,
    reset: bool,
    refresh_profile: bool,
) -> None:
    print(f"\n▸ bank '{memory.bank_id}': {len(events)} entries (reset={reset})")
    await memory.setup(circle, reset=reset)
    for i in range(0, len(events), BATCH):
        chunk = events[i : i + BATCH]
        await memory.retain_events(chunk, circle)
        upto = chunk[-1].occurred_at
        print(f"  retained {i + len(chunk)}/{len(events)}  (up to {upto:%d %b %Y})")
    if refresh_profile:
        await memory.refresh_profile(circle.patient.id)
        print("  care profile refresh requested")


async def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--reset", action="store_true", help="delete and recreate banks first")
    parser.add_argument("--until", type=date.fromisoformat, help="only load events up to this date")
    parser.add_argument("--bank", help="override HINDSIGHT_BANK_ID")
    parser.add_argument(
        "--checkpoints", action="store_true", help="also seed the learning-curve checkpoint banks"
    )
    parser.add_argument(
        "--checkpoints-only",
        action="store_true",
        help="seed only the checkpoint banks and leave the live bank untouched",
    )
    parser.add_argument(
        "--refresh-profile", action="store_true", help="refresh the care profile at the end"
    )
    args = parser.parse_args()

    settings = get_settings()
    circle = load_circle(settings.circle_data)
    history = load_history(settings.circle_data)
    base = args.bank or settings.bank_id

    plan: list[tuple[str, date | None]] = [] if args.checkpoints_only else [(base, args.until)]
    if args.checkpoints or args.checkpoints_only:
        plan += [
            (checkpoints.bank_for(base, c.id), c.until)
            for c in checkpoints.CHECKPOINTS
            if c.id != checkpoints.LIVE
        ]

    memory = HindsightMemory.connect(settings.hindsight_base_url, settings.hindsight_api_key, base)
    print(f"Seeding {len(plan)} bank(s) at {settings.hindsight_base_url}")
    try:
        for bank_id, until in plan:
            events = [e for e in history if until is None or e.occurred_at.date() <= until]
            await seed_bank(
                memory.with_bank(bank_id),
                circle,
                events,
                reset=args.reset,
                refresh_profile=args.refresh_profile,
            )
        print("\nDone.")
    finally:
        await memory.aclose()


if __name__ == "__main__":
    asyncio.run(main())

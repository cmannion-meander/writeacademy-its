#!/usr/bin/env python3
"""
Prewarm Demo — generate all 12 illustrations for the Luna demo story.

Usage:
    python scripts/prewarm-demo.py [--backend http://localhost:8123]

Prerequisites:
    - Backend must be running with GEMINI_API_KEY set
    - Luna story data must exist in backend/story_data/luna-demo/luna-garden/

How it works:
    1. Hits POST /story/page/illustrate for each page (1–12) sequentially.
    2. Page 1 is generated first — it sets the style_anchor used by all subsequent pages.
    3. Each page uses page 1 + the previous page as reference images for consistency.
    4. Illustrations are saved to disk by the backend (~2MB each as base64 PNG).
    5. Skips pages that already have illustrations (safe to re-run).

Expected runtime: ~2–3 minutes (12 pages × 10–15s each).
"""

import argparse
import sys
import time

import requests


def main():
    parser = argparse.ArgumentParser(description="Generate demo illustrations")
    parser.add_argument("--backend", default="http://localhost:8123", help="Backend URL")
    parser.add_argument("--uid", default="luna-demo", help="Demo UID")
    parser.add_argument("--story-id", default="luna-garden", help="Demo story ID")
    parser.add_argument("--force", action="store_true", help="Regenerate even if illustration exists")
    args = parser.parse_args()

    base = args.backend.rstrip("/")

    # Verify backend is reachable
    try:
        health = requests.get(f"{base}/health", timeout=5)
        health.raise_for_status()
    except Exception as e:
        print(f"ERROR: Backend not reachable at {base} — {e}")
        print("Start the backend first: cd backend && source venv/bin/activate && uvicorn main:app --port 8123")
        sys.exit(1)

    print(f"Backend OK at {base}")
    print(f"Generating illustrations for {args.uid}/{args.story_id}")
    print(f"{'Force mode — regenerating all' if args.force else 'Skipping pages with existing illustrations'}")
    print("-" * 60)

    total_time = 0
    generated = 0
    skipped = 0

    for page_num in range(1, 13):
        # Check if illustration already exists (unless --force)
        if not args.force:
            check = requests.get(
                f"{base}/story/{args.uid}/{args.story_id}/page/{page_num}",
                timeout=10,
            )
            if check.ok:
                data = check.json()
                if data.get("illustration_b64"):
                    print(f"  Page {page_num:2d}/12 — already illustrated, skipping")
                    skipped += 1
                    continue

        print(f"  Page {page_num:2d}/12 — generating illustration...", end="", flush=True)
        start = time.time()

        try:
            resp = requests.post(
                f"{base}/story/page/illustrate",
                json={
                    "uid": args.uid,
                    "story_id": args.story_id,
                    "page_number": page_num,
                    "adjustment_notes": "force regenerate" if args.force else None,
                },
                timeout=120,
            )
            resp.raise_for_status()
            elapsed = time.time() - start
            total_time += elapsed
            generated += 1
            print(f" done ({elapsed:.1f}s)")
        except requests.HTTPError as e:
            elapsed = time.time() - start
            print(f" FAILED ({elapsed:.1f}s)")
            print(f"    Error: {e.response.status_code} — {e.response.text[:200]}")
            # Continue to next page rather than aborting
        except Exception as e:
            print(f" FAILED — {e}")

    print("-" * 60)
    print(f"Done! Generated: {generated}, Skipped: {skipped}, Total time: {total_time:.0f}s")

    if generated > 0:
        print(f"\nIllustrations saved to: backend/story_data/{args.uid}/{args.story_id}/pages/")
        print("Deploy the backend to make them available on Cloud Run.")


if __name__ == "__main__":
    main()

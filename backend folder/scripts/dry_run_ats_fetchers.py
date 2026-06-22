"""Dry-run ATS fetcher verifier. Fetches jobs without writing to the database."""

import argparse
import asyncio
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from job_discovery.ats_api_scraper import (  # noqa: E402
    fetch_ashby_jobs_result,
    fetch_greenhouse_jobs_result,
    fetch_lever_jobs_result,
    fetch_workable_jobs_result,
)


PROVIDER_FETCHERS = {
    "ashby": fetch_ashby_jobs_result,
    "greenhouse": fetch_greenhouse_jobs_result,
    "lever": fetch_lever_jobs_result,
    "workable": fetch_workable_jobs_result,
}


DEFAULT_SLUGS = {
    "ashby": "notion",
    "greenhouse": "stripe",
    "lever": "palantir",
    "workable": "personio",
}


async def run_provider(provider: str, slug: str) -> dict:
    result = await PROVIDER_FETCHERS[provider](slug)
    jobs = result.jobs
    company = ""
    if jobs:
        first_url = jobs[0].get("apply_url") or jobs[0].get("ats_url") or ""
        company = first_url.split("/")[2] if first_url.startswith("http") else ""
    return {
        "provider": provider,
        "slug": slug,
        "success": result.success,
        "status_code": result.status_code,
        "error": result.error,
        "jobs_fetched": len(jobs),
        "sample_jobs": [
            {
                "title": job.get("title"),
                "company": company or slug,
                "location": job.get("location"),
                "external_id": job.get("external_id"),
                "apply_url": job.get("apply_url"),
                "ats_url": job.get("ats_url"),
                "description_present": bool(job.get("description_text") or job.get("description_html")),
            }
            for job in jobs[:5]
        ],
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Dry-run ATS fetcher verification")
    parser.add_argument("--provider", choices=sorted(PROVIDER_FETCHERS.keys()))
    parser.add_argument("--slug", help="ATS slug for the selected provider")
    parser.add_argument("--all", action="store_true", help="Run one verification for each provider using default slugs")
    args = parser.parse_args()

    runs: list[tuple[str, str]] = []
    if args.all:
        runs = [(provider, DEFAULT_SLUGS[provider]) for provider in PROVIDER_FETCHERS]
    elif args.provider:
        runs = [(args.provider, args.slug or DEFAULT_SLUGS[args.provider])]
    else:
        parser.error("Provide --provider or use --all")

    results = []
    for provider, slug in runs:
        results.append(await run_provider(provider, slug))

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

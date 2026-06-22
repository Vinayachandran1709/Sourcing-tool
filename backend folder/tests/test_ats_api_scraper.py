import unittest

from job_discovery.ats_api_scraper import (
    parse_ashby_jobs,
    parse_greenhouse_jobs,
    parse_lever_jobs,
    parse_workable_jobs,
)


class AtsParserTests(unittest.TestCase):
    def test_greenhouse_parser_preserves_external_id_and_descriptions(self):
        data = {
            "jobs": [
                {
                    "id": 123,
                    "title": "Senior Backend Engineer",
                    "location": {"name": "Remote"},
                    "departments": [{"name": "Engineering"}],
                    "absolute_url": "https://boards.greenhouse.io/acme/jobs/123",
                    "content": "<p>Build APIs</p>",
                }
            ]
        }
        jobs = parse_greenhouse_jobs(data, "acme")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["external_id"], "123")
        self.assertEqual(jobs[0]["apply_url"], "https://boards.greenhouse.io/acme/jobs/123")
        self.assertEqual(jobs[0]["description_text"], "Build APIs")
        self.assertEqual(jobs[0]["description_html"], "<p>Build APIs</p>")

    def test_lever_parser_uses_hosted_url_and_plain_description(self):
        data = [
            {
                "id": "lever-1",
                "text": "Frontend Engineer",
                "categories": {"team": "Engineering", "location": "Bengaluru"},
                "hostedUrl": "https://jobs.lever.co/acme/lever-1",
                "description": "<p>Ship UI</p>",
                "descriptionPlain": "Ship UI",
            }
        ]
        jobs = parse_lever_jobs(data, "acme")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["external_id"], "lever-1")
        self.assertEqual(jobs[0]["ats_url"], "https://jobs.lever.co/acme/lever-1")
        self.assertEqual(jobs[0]["description_text"], "Ship UI")

    def test_ashby_parser_keeps_html_and_detects_engineering_roles(self):
        data = {
            "jobs": [
                {
                    "id": "ashby-42",
                    "title": "Platform Engineer",
                    "department": "Engineering",
                    "location": "India",
                    "jobUrl": "https://jobs.ashbyhq.com/acme/ashby-42",
                    "descriptionPlain": "Own platform systems",
                    "descriptionHtml": "<div>Own platform systems</div>",
                }
            ]
        }
        jobs = parse_ashby_jobs(data, "acme")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["external_id"], "ashby-42")
        self.assertTrue(jobs[0]["description_present"])
        self.assertEqual(jobs[0]["description_html"], "<div>Own platform systems</div>")

    def test_workable_parser_prefers_shortcode_for_external_id(self):
        data = {
            "jobs": [
                {
                    "shortcode": "wk-99",
                    "title": "Data Engineer",
                    "department": "Data",
                    "city": "Pune",
                    "country": "India",
                    "url": "https://apply.workable.com/acme/j/WK99/",
                    "description": "<p>Build pipelines</p>",
                }
            ]
        }
        jobs = parse_workable_jobs(data, "acme")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["external_id"], "wk-99")
        self.assertEqual(jobs[0]["location"], "Pune, India")
        self.assertEqual(jobs[0]["description_text"], "Build pipelines")


if __name__ == "__main__":
    unittest.main()

"""Web release metadata regressions without Node dependencies or network."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOL = ROOT / "tools/ops/prepare_release.py"


class PrepareReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "package.json").write_text(
            json.dumps({"name": "hohu-admin", "version": "0.1.5"}), encoding="utf-8"
        )
        self.changelog = self.root / "CHANGELOG.md"
        self.changelog.write_text(
            "# Changelog\n\n## [v0.1.5]\n\n### Features\n\n- 新功能。\n"
            "\n## [v0.1.4] (2026-07-03)\n\n- Old.\n",
            encoding="utf-8",
        )
        self.notes = self.root / "output/notes.md"

    def run_tool(self, tag="v0.1.5", *extra):
        return subprocess.run(
            [
                sys.executable,
                "-B",
                str(TOOL),
                "--root",
                str(self.root),
                "--tag",
                tag,
                "--notes-file",
                str(self.notes),
                *extra,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            env={**os.environ, "PYTHONUTF8": "1"},
            check=False,
        )

    def test_web_release_emits_validated_outputs_and_reviewed_notes(self):
        output = self.root / "github-output"
        result = self.run_tool(
            "v0.1.5", "--mode", "release", "--github-output", str(output)
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output.read_text(), "mode=release\ntag=v0.1.5\n")
        self.assertEqual(
            self.notes.read_text(encoding="utf-8"), "### Features\n\n- 新功能。\n"
        )

    def test_test_mode_needs_no_version_and_never_writes_notes(self):
        output = self.root / "github-output"
        result = self.run_tool("", "--mode", "test", "--github-output", str(output))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output.read_text(), "mode=test\ntag=\n")
        self.assertFalse(self.notes.exists())
        self.assertEqual(self.run_tool("v0.1.5", "--mode", "test").returncode, 1)

    def test_rejects_invalid_tags_and_package_version_mismatch(self):
        for tag in (
            "",
            "v0.1.6",
            "0.1.5",
            "v01.1.5",
            "v0.1",
            "v0.1.5-beta.1",
            "v0.1.5+build",
            "v0.1.5\ntag=other",
        ):
            with self.subTest(tag=tag):
                self.assertEqual(self.run_tool(tag).returncode, 1)
                self.assertFalse(self.notes.exists())

    def test_rejects_missing_duplicate_empty_unreleased_or_old_notes(self):
        for content in (
            "## [v0.1.4]\n\nOld\n",
            "## [v0.1.5]\n\nOne\n\n## [v0.1.5]\n\nTwo\n",
            "## [v0.1.5]\n\n## [v0.1.4]\nOld\n",
            "## [v0.1.5] (Unreleased)\n\nPending\n",
            "## [v0.1.6]\n\nNew\n\n## [v0.1.5]\n\nOld\n",
        ):
            with self.subTest(content=content):
                self.changelog.write_text(content, encoding="utf-8")
                self.assertEqual(self.run_tool().returncode, 1)
                self.assertFalse(self.notes.exists())

    def test_heading_inside_fenced_example_is_not_a_release(self):
        content = "## [v0.1.5]\n\nExample:\n```md\n## [v0.1.4]\n```\n\nEnd.\n"
        self.changelog.write_text(content, encoding="utf-8")
        result = self.run_tool()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("End.", self.notes.read_text(encoding="utf-8"))

    def test_accepts_finalized_dates(self):
        for suffix in (" (2026-10-15)", " - 2026-10-15"):
            self.changelog.write_text(
                f"## [v0.1.5]{suffix}\n\nReviewed.\n", encoding="utf-8"
            )
            result = self.run_tool()
            self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()

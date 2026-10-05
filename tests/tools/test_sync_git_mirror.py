"""Exercise the standalone mirror tooling without network or app services."""

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from tools.ops import sync_git_mirror as mirror


class MirrorTests(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(
            os.environ,
            {
                "GIT_CONFIG_GLOBAL": os.devnull,
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_ALLOW_PROTOCOL": "file",
                "GIT_TERMINAL_PROMPT": "0",
            },
        )
        environment.start()
        self.addCleanup(environment.stop)
        parent = Path(__file__).resolve().parents[2] / ".local/tests/gitee-mirror"
        parent.mkdir(parents=True, exist_ok=True)
        temporary = TemporaryDirectory(dir=parent)
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        self.source = root / "source.git"
        self.target = root / "target.git"
        self.checkout = root / "checkout"
        self.scratch = root / "scratch"
        self.git("init", "--bare", str(self.source))
        self.git("init", "--bare", str(self.target))
        self.git("init", "--initial-branch=main", str(self.checkout))
        self.git("config", "user.name", "Mirror Test", cwd=self.checkout)
        self.git("config", "user.email", "mirror@example.invalid", cwd=self.checkout)
        (self.checkout / "README.md").write_text("initial\n", encoding="utf-8")
        self.git("add", "README.md", cwd=self.checkout)
        self.git("commit", "-m", "Initial", cwd=self.checkout)
        self.git("remote", "add", "origin", str(self.source), cwd=self.checkout)
        self.git("push", "origin", "main", cwd=self.checkout)

    def git(self, *arguments, cwd=None):
        result = subprocess.run(
            ["git", *arguments],
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout.strip()

    def refs(self, repository):
        output = self.git("ls-remote", "--refs", "--heads", "--tags", str(repository))
        return {ref: sha for sha, ref in (line.split() for line in output.splitlines())}

    def sync(self, **options):
        return mirror.sync_mirror(
            str(self.source),
            str(self.target),
            self.scratch,
            attempts=1,
            retry_delay=0,
            **options,
        )

    def test_initial_sync_preserves_history_branches_and_annotated_tags(self):
        (self.checkout / "README.md").write_text("second\n", encoding="utf-8")
        self.git("commit", "-am", "Second", cwd=self.checkout)
        self.git("branch", "feature/example", cwd=self.checkout)
        self.git("tag", "-a", "v1.0", "-m", "Release", cwd=self.checkout)
        self.git("push", "origin", "--all", cwd=self.checkout)
        self.git("push", "origin", "--tags", cwd=self.checkout)
        snapshot = self.sync()
        self.assertEqual(snapshot, self.refs(self.source))
        self.assertEqual(snapshot, self.refs(self.target))
        self.assertEqual(
            self.git("--git-dir", str(self.target), "rev-list", "--count", "main"),
            "2",
        )
        self.assertEqual(
            self.git("--git-dir", str(self.target), "cat-file", "-t", "refs/tags/v1.0"),
            "tag",
        )
        self.assertEqual(list(self.scratch.iterdir()), [])

    def test_force_updates_branch_and_replaced_tag(self):
        self.git("tag", "v1.0", cwd=self.checkout)
        self.git("push", "origin", "--tags", cwd=self.checkout)
        self.sync()
        original = self.refs(self.target)["refs/heads/main"]
        (self.checkout / "README.md").write_text("rewritten\n", encoding="utf-8")
        self.git("commit", "--amend", "-am", "Rewritten", cwd=self.checkout)
        self.git("tag", "--force", "v1.0", cwd=self.checkout)
        self.git(
            "push", "--force", "origin", "main", "refs/tags/v1.0", cwd=self.checkout
        )
        self.sync()
        self.assertEqual(self.refs(self.target), self.refs(self.source))
        self.assertNotEqual(self.refs(self.target)["refs/heads/main"], original)

    def test_prunes_deleted_refs_and_target_only_branch(self):
        self.git("branch", "obsolete", cwd=self.checkout)
        self.git("tag", "obsolete", cwd=self.checkout)
        self.git("push", "origin", "--all", cwd=self.checkout)
        self.git("push", "origin", "--tags", cwd=self.checkout)
        self.sync()
        self.git("--git-dir", str(self.target), "branch", "target-only", "main")
        self.git(
            "push",
            "origin",
            "--delete",
            "refs/heads/obsolete",
            "refs/tags/obsolete",
            cwd=self.checkout,
        )
        self.sync()
        self.assertEqual(self.refs(self.target), self.refs(self.source))
        self.assertEqual(set(self.refs(self.target)), {"refs/heads/main"})

    def test_does_not_copy_platform_private_refs(self):
        sha = self.git("rev-parse", "HEAD", cwd=self.checkout)
        for ref in (
            "refs/pull/1/head",
            "refs/remotes/legacy/main",
            "refs/notes/example",
        ):
            self.git("--git-dir", str(self.source), "update-ref", ref, sha)
        self.sync()
        self.assertEqual(
            self.git(
                "--git-dir", str(self.target), "for-each-ref", "--format=%(refname)"
            ),
            "refs/heads/main",
        )

    def test_source_fetch_failure_preserves_target_and_cleans_scratch(self):
        self.sync()
        before = self.refs(self.target)
        with self.assertRaisesRegex(mirror.MirrorError, "failed after 1 attempt"):
            mirror.sync_mirror(
                str(self.scratch / "missing.git"),
                str(self.target),
                self.scratch,
                attempts=1,
            )
        self.assertEqual(self.refs(self.target), before)
        self.assertEqual(list(self.scratch.iterdir()), [])

    def test_empty_source_is_rejected_without_deleting_target(self):
        self.sync()
        before = self.refs(self.target)
        self.git("--git-dir", str(self.source), "update-ref", "-d", "refs/heads/main")
        with self.assertRaisesRegex(mirror.MirrorError, "no branches"):
            self.sync()
        self.assertEqual(self.refs(self.target), before)
        self.assertEqual(list(self.scratch.iterdir()), [])

    def test_retry_fetches_latest_source_instead_of_stale_snapshot(self):
        original_git = mirror._git
        pushes = []

        def interrupted_push(arguments, **options):
            if arguments[0] == "push":
                pushes.append(arguments)
                if len(pushes) == 1:
                    (self.checkout / "README.md").write_text(
                        "updated\n", encoding="utf-8"
                    )
                    self.git("commit", "-am", "New source state", cwd=self.checkout)
                    self.git("push", "origin", "main", cwd=self.checkout)
                    raise subprocess.CalledProcessError(128, arguments)
            return original_git(arguments, **options)

        with patch.object(mirror, "_git", interrupted_push):
            snapshot = mirror.sync_mirror(
                str(self.source),
                str(self.target),
                self.scratch,
                attempts=2,
                retry_delay=0,
            )
        self.assertEqual(len(pushes), 2)
        self.assertEqual(snapshot, self.refs(self.source))
        self.assertEqual(snapshot, self.refs(self.target))

    def test_verification_failure_is_not_reported_as_success(self):
        original_git = mirror._git

        def mismatched_target(arguments, **options):
            if arguments[0] == "ls-remote":
                return ""
            return original_git(arguments, **options)

        with patch.object(mirror, "_git", mismatched_target):
            with self.assertRaisesRegex(mirror.MirrorError, "do not match"):
                self.sync()

    def test_push_failures_stop_after_configured_attempts(self):
        original_git = mirror._git
        pushes = []

        def failed_push(arguments, **options):
            if arguments[0] == "push":
                pushes.append(arguments)
                raise subprocess.CalledProcessError(128, arguments)
            return original_git(arguments, **options)

        with patch.object(mirror, "_git", failed_push):
            with self.assertRaisesRegex(mirror.MirrorError, "failed after 2 attempts"):
                mirror.sync_mirror(
                    str(self.source),
                    str(self.target),
                    self.scratch,
                    attempts=2,
                    retry_delay=0,
                )
        self.assertEqual(len(pushes), 2)
        self.assertEqual(self.refs(self.target), {})
        self.assertEqual(list(self.scratch.iterdir()), [])

    def test_target_probe_failure_does_not_fetch_or_push(self):
        original_git = mirror._git
        operations = []

        def unreachable_target(arguments, **options):
            operations.append(arguments[0])
            if arguments[0] == "ls-remote":
                raise subprocess.TimeoutExpired(arguments, options["timeout"])
            return original_git(arguments, **options)

        with patch.object(mirror, "_git", unreachable_target):
            with self.assertRaisesRegex(mirror.MirrorError, "target connection check"):
                mirror.sync_mirror(
                    str(self.source),
                    str(self.target),
                    self.scratch,
                    attempts=2,
                    retry_delay=0,
                )
        self.assertEqual(operations, ["init", "ls-remote", "ls-remote"])
        self.assertEqual(list(self.scratch.iterdir()), [])

    def test_push_has_separate_deadline_and_probe_precedes_transfer(self):
        original_git = mirror._git
        operations = []

        def observed_git(arguments, **options):
            operations.append((arguments[0], options["timeout"]))
            return original_git(arguments, **options)

        with patch.object(mirror, "_git", observed_git):
            snapshot = self.sync(command_timeout=30, push_timeout=600)
        self.assertEqual(
            operations,
            [
                ("init", 30),
                ("ls-remote", 30),
                ("fetch", 30),
                ("for-each-ref", 30),
                ("push", 600),
                ("ls-remote", 30),
            ],
        )
        self.assertEqual(snapshot, self.refs(self.target))

    def test_git_timeout_preserves_transport_diagnostic(self):
        for stderr in (b"SSH connection stalled", "SSH connection stalled"):
            with self.subTest(stderr=stderr):
                error = subprocess.TimeoutExpired(["git", "push"], 12, stderr=stderr)
                with patch.object(mirror.subprocess, "run", side_effect=error):
                    with self.assertLogs(mirror.logger, level="ERROR") as logs:
                        with self.assertRaises(subprocess.TimeoutExpired):
                            mirror._git(["push", "unused"], timeout=12)
                self.assertIn(
                    "Git push timed out after 12 seconds", "\n".join(logs.output)
                )
                self.assertIn("SSH connection stalled", "\n".join(logs.output))

    def test_invalid_limits_are_rejected_before_git_runs(self):
        for options in (
            {"attempts": 0},
            {"retry_delay": -1},
            {"command_timeout": 0},
            {"push_timeout": 0},
        ):
            with self.subTest(options=options):
                with self.assertRaises(ValueError):
                    mirror.sync_mirror(
                        str(self.source),
                        str(self.target),
                        self.scratch,
                        **options,
                    )
                self.assertFalse(self.scratch.exists())

    def test_cli_exit_status_reflects_verified_result(self):
        for source_exists in (True, False):
            with self.subTest(source_exists=source_exists):
                source = self.source if source_exists else self.scratch / "missing.git"
                result = subprocess.run(
                    [
                        sys.executable,
                        str(Path(mirror.__file__)),
                        "--source",
                        str(source),
                        "--target",
                        str(self.target),
                        "--work-dir",
                        str(self.scratch),
                        "--attempts",
                        "1",
                        "--retry-delay",
                        "0",
                        "--command-timeout",
                        "30",
                        "--push-timeout",
                        "60",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(
                    result.returncode, 0 if source_exists else 1, result.stderr
                )
                if source_exists:
                    self.assertIn("Mirror verified", result.stderr)
                    self.assertEqual(self.refs(self.target), self.refs(self.source))
                else:
                    self.assertIn("Mirror failed", result.stderr)
                self.assertEqual(list(self.scratch.iterdir()), [])


if __name__ == "__main__":
    unittest.main()

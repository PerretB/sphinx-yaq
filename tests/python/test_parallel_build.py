"""Verify actual worker processes and identical serial/parallel HTML output."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

import pytest


@pytest.mark.skipif(os.name != "posix", reason="Sphinx parallel builds require fork support")
def test_parallel_build_matches_serial_output(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    (source / "conf.py").write_text(
        """from pathlib import Path
import os

extensions = ["sphinx_yaq"]
project = "Parallel quizzes"
html_theme = "alabaster"

def record_read(app, docname, content):
    path = Path(app.outdir) / (docname + ".read-pid")
    path.write_text(str(os.getpid()))

def record_write(app, pagename, templatename, context, doctree):
    path = Path(app.outdir) / (pagename + ".write-pid")
    path.write_text(str(os.getpid()))

def setup(app):
    app.connect("source-read", record_read)
    app.connect("html-page-context", record_write)
""",
        encoding="utf-8",
    )
    # Enough documents to activate reading workers on every supported Sphinx version.
    pages = [f"quiz-{index}" for index in range(8)]
    (source / "index.rst").write_text(
        "Parallel quizzes\n================\n\n.. toctree::\n\n"
        + "".join(f"   {page}\n" for page in pages),
        encoding="utf-8",
    )
    for index, page in enumerate(pages):
        (source / f"{page}.rst").write_text(
            f'''Quiz {index}
======

.. quiz:: shared-id
   :title: Exercise {index}

   Number: :quiz:`{{"type":"FB","answer":"{index}"}}`.

   True: :quiz:`{{"type":"TF","answer":"T"}}`.

   Choice: :quiz:`{{"type":"SC","values":"A,B,C","answer":"B"}}`.

   .. spoiler:: Hint

      Hint for **quiz {index}**.

Outside the quiz: :spoiler:`Answer {index}`.
''',
            encoding="utf-8",
        )

    def build(jobs, fresh):
        output = tmp_path / f"html-{jobs}"
        command = [sys.executable, "-m", "sphinx", "-W", "--keep-going", "-b", "html"]
        if fresh:
            command.append("-E")
        command.extend(["-j", str(jobs), str(source), str(output)])
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        assert result.returncode == 0, result.stdout + result.stderr
        assert "WARNING" not in result.stderr, result.stderr
        return output

    serial = build(1, fresh=True)
    parallel = build(2, fresh=True)
    for phase in ("read", "write"):
        # Sphinx writes the first page in the parent, then delegates the rest.
        documents = ["index", *pages]
        serial_workers = {(serial / f"{page}.{phase}-pid").read_text() for page in documents}
        parallel_workers = {(parallel / f"{page}.{phase}-pid").read_text() for page in documents}
        assert len(serial_workers) == 1
        assert len(parallel_workers) > 1, f"{phase} did not execute in multiple processes"

    def compare_outputs():
        for page in ["index", *pages]:
            actual = (parallel / f"{page}.html").read_text(encoding="utf-8")
            assert actual == (serial / f"{page}.html").read_text(encoding="utf-8")
            if page != "index":
                assert actual.count('class="yaq-q"') == 3
                assert '<details class="yaq-spoiler-block">' in actual
                assert 'aria-label="Show hidden text"' in actual
        for asset in ("yaq.js", "math.js", "css/yaq.css"):
            path = Path("_static/sphinx_yaq") / asset
            assert (parallel / path).read_bytes() == (serial / path).read_bytes()

    compare_outputs()

    # Cached environments must also allow a changed document to reuse its quiz ID.
    changed = source / "quiz-0.rst"
    changed.write_text(changed.read_text(encoding="utf-8").replace("Exercise 0", "Revised quiz"))
    previous_mtime = (parallel / ".doctrees/quiz-0.doctree").stat().st_mtime
    os.utime(changed, (previous_mtime + 2, previous_mtime + 2))
    build(1, fresh=False)
    build(2, fresh=False)
    compare_outputs()
    assert "Revised quiz" in (parallel / "quiz-0.html").read_text(encoding="utf-8")

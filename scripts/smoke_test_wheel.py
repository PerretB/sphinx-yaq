"""Install the built wheel in a clean environment and build a Sphinx fixture."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import venv


ROOT = Path(__file__).resolve().parents[1]


def run(*args: str, cwd: Path, env: dict[str, str] | None = None) -> None:
    subprocess.run(args, cwd=cwd, env=env, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sphinx",
        help="Install this exact Sphinx version alongside the wheel",
    )
    args = parser.parse_args()

    wheels = sorted((ROOT / "dist").glob("sphinx_yaq-*.whl"))
    if len(wheels) != 1:
        raise SystemExit("Expected exactly one dist/sphinx_yaq-*.whl; run python -m build first")

    with tempfile.TemporaryDirectory(prefix="sphinx-yaq-wheel-smoke-") as temp:
        temp_path = Path(temp)
        environment = temp_path / "venv"
        project = temp_path / "fixture"
        output = temp_path / "html"
        project.mkdir()
        venv.EnvBuilder(with_pip=True).create(environment)

        if os.name == "nt":
            python = environment / "Scripts" / "python.exe"
        else:
            python = environment / "bin" / "python"

        install_targets = [str(wheels[0])]
        if args.sphinx:
            install_targets.insert(0, f"Sphinx=={args.sphinx}")
        run(
            str(python),
            "-m",
            "pip",
            "install",
            *install_targets,
            cwd=temp_path,
        )
        (project / "conf.py").write_text(
            'extensions = ["sphinx_yaq"]\n'
            'project = "installed wheel smoke test"\n'
            'html_theme = "basic"\n',
            encoding="utf-8",
        )
        (project / "index.rst").write_text(
            "Installed wheel\n===============\n\n"
            ".. quiz:: smoke\n"
            "   :title: Smoke test\n\n"
            "   Question: :quiz:`{\"type\":\"TF\",\"answer\":\"T\"}`\n",
            encoding="utf-8",
        )

        clean_env = os.environ.copy()
        clean_env.pop("PYTHONPATH", None)
        run(
            str(python),
            "-m",
            "sphinx",
            "-W",
            "-b",
            "html",
            str(project),
            str(output),
            cwd=temp_path,
            env=clean_env,
        )
        installed_module = subprocess.check_output(
            [str(python), "-c", "import sphinx_yaq; print(sphinx_yaq.__file__)"],
            cwd=temp_path,
            env=clean_env,
            text=True,
        ).strip()
        if str(ROOT).casefold() in installed_module.casefold():
            raise SystemExit(f"Smoke test imported repository source: {installed_module}")

        html = (output / "index.html").read_text(encoding="utf-8")
        required = (
            "_static/sphinx_yaq/yaq.js",
            "_static/sphinx_yaq/math.js",
            "_static/sphinx_yaq/css/yaq.css",
        )
        missing = [asset for asset in required if asset not in html]
        if missing:
            raise SystemExit(f"Built HTML does not reference assets: {missing}")
        for asset in required:
            if not (output / asset).is_file():
                raise SystemExit(f"Installed package did not copy asset: {asset}")

        sphinx_version = subprocess.check_output(
            [str(python), "-c", "import sphinx; print(sphinx.__version__)"],
            cwd=temp_path,
            env=clean_env,
            text=True,
        ).strip()
        print(
            f"Installed-wheel smoke test passed: {wheels[0].name} "
            f"with Sphinx {sphinx_version}"
        )


if __name__ == "__main__":
    main()

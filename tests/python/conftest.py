from pathlib import Path
import sys

import pytest


pytest_plugins = ("sphinx.testing.fixtures",)

# The current extension is embedded in the demo's ``source`` directory rather
# than installed as a package. Add it once for characterization tests; remove
# this shim when the extension moves to an installable ``src`` layout.
PROJECT_ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "source"))


@pytest.fixture(scope="session")
def rootdir() -> Path:
    return Path(__file__).parents[1] / "roots"

"""代碼規則：函數入面唔准有 inline magic number（參數放 constants.py / 模組頂嘅具名常數）。"""

import ast
import unittest
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parents[1]
# 0 / 1 / 2 / 0.5（一半、置中）同 255（uint8 最大）係算術本身，唔係可以調嘅參數
ALLOWED = {0, 1, 2, 0.5, 255}
CHECKED = (
    "analysis.py",
    "compose.py",
    "geometry.py",
    "preview.py",
    "generate.py",
    "review/build.py",
    "review/fetch_sources.py",
    "review/publish.py",
    "review/serve.py",
)


class MagicNumberTest(unittest.TestCase):
    maxDiff = None

    def test_functions_should_not_use_inline_magic_numbers(self) -> None:
        found = []
        for name in CHECKED:
            tree = ast.parse((TOOL_DIR / name).read_text(encoding="utf-8"))
            for function in ast.walk(tree):
                if not isinstance(function, ast.FunctionDef):
                    continue
                for node in ast.walk(function):
                    value = getattr(node, "value", None) if isinstance(node, ast.Constant) else None
                    if (
                        isinstance(value, int | float)
                        and not isinstance(value, bool)
                        and value not in ALLOWED
                    ):
                        found.append(f"{name}:{node.lineno} {function.name} {value}")
        self.assertEqual(sorted(set(found)), [])


if __name__ == "__main__":
    unittest.main()

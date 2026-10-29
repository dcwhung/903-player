"""本機睇 review 頁（冇 claude.ai db，所以儲存唔到；淨係睇圖 / 跑 verify.cjs）。

python serve.py <work>/review/site [--port 8765]
"""

from __future__ import annotations

import argparse
import functools
import http.server
import sys

DEFAULT_PORT = 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def log_message(self, *args: object) -> None:
        pass


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("site")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args(argv)
    handler = functools.partial(Handler, directory=args.site)
    print(f"http://127.0.0.1:{args.port}/index.html")
    http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

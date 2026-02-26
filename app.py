#!/usr/bin/env python3
"""
bloombot local server
---------------------
Serves the bloombot website over HTTP so the STL viewer and
other tools that use ES modules or XHR file loading work correctly.

Usage:
    python app.py

Then open:  http://localhost:8000/bloombot-modern.html
Press Ctrl+C to stop.
"""

import http.server
import socketserver
import os
import webbrowser

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Quiet mode — only print errors
        if int(args[1]) >= 400:
            super().log_message(format, *args)


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/bloombot-modern.html"
        print(f"\n  bloombot is running at {url}")
        print("  Press Ctrl+C to stop.\n")
        webbrowser.open(url)
        httpd.serve_forever()

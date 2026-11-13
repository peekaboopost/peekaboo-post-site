#!/usr/bin/env python3
"""Create a customer's personal invite page from one of the gallery invites.

Usage:
  python3 tools/make_invite.py order.json

order.json example:
{
  "invite": "friendsgiving-potluck",          # a file name in invites/ (without .html)
  "event_date": "2026-11-21T18:00",            # local party start time
  "title": "Jamie & Alex's Friendsgiving",     # browser tab / link preview title
  "replace": {                                 # bracket placeholders on the card -> real text
    "[Address]": "123 Maple Lane, Pasadena",
    "[Your Name]": "Jamie & Alex",
    "[RSVP date]": "Nov 18"
  },
  "hide_footer": true                          # Party and VIP packages: remove "Made with Peekaboo Post"
}

Writes p/<event-id>.html (served at peekaboopost.com/p/<event-id>) and prints the link.
RSVPs from that page are saved to Supabase table `rsvps` under the same event id.
"""
import html
import json
import re
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(order_path):
    order = json.loads(Path(order_path).read_text())
    slug = order["invite"]
    source = (ROOT / "invites" / f"{slug}.html").read_text()

    event_id = order.get("event_id") or f"{slug.split('-')[0]}-{secrets.token_hex(4)}"
    title = html.escape(order.get("title") or "You're invited!")

    page = source
    # Personal page: no site menu or demo description, not indexed by search engines.
    page = re.sub(r'<header class="pp-bar">.*?</header>\n', "", page, flags=re.S)
    page = re.sub(r'<section class="invite-info".*?</section>\n', "", page, flags=re.S)
    page = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", page, count=1, flags=re.S)
    page = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{title}">', page, count=1)
    page = page.replace("<head>", f'<head>\n<meta name="pp-event" content="{event_id}">\n<meta name="robots" content="noindex">', 1)
    page = page.replace('<body class="pp-page invite-page">', f'<body class="pp-page invite-page" data-invite="{slug}">', 1)

    # Real party details in place of the [bracket] placeholders.
    for placeholder, value in (order.get("replace") or {}).items():
        page = page.replace(placeholder, html.escape(value))

    if order.get("hide_footer"):
        page = re.sub(r'<p style="margin: 0 0 40px;[^"]*">Made with .*?</p>\n', "", page, flags=re.S)

    # Party date drives the date label, countdown and calendar buttons.
    if order.get("event_date"):
        props_match = re.search(r'(<script type="application/json" id="card-props">)(.*?)(</script>)', page, re.S)
        props = json.loads(props_match.group(2))
        if "eventDate" in props:
            props["eventDate"]["default"] = order["event_date"]
        page = page[: props_match.start(2)] + json.dumps(props) + page[props_match.end(2):]

    template = re.search(r'<template id="card-template">(.*?)</template>', page, re.S).group(1)
    left = re.findall(r"\[[A-Z][^\]\n]{1,30}\]", template)
    out = ROOT / "p" / f"{event_id}.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print(f"Created {out.relative_to(ROOT)}")
    print(f"Link: https://peekaboopost.com/p/{event_id}")
    if left:
        print("Still has placeholders:", sorted(set(left)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

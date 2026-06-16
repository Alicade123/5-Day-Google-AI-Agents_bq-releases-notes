import re
from html import unescape
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

import requests
from flask import Flask, jsonify, render_template

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
SECTION_PATTERN = re.compile(r"<h3>(.*?)</h3>\s*(.*?)(?=<h3>|$)", re.DOTALL | re.IGNORECASE)
TAG_PATTERN = re.compile(r"<[^>]+>")


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self._parts.append(text)

    def get_text(self) -> str:
        return " ".join(self._parts)


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    return unescape(parser.get_text())


def parse_sections(html: str) -> list[dict]:
    sections = []
    for index, (category, body) in enumerate(SECTION_PATTERN.findall(html or "")):
        body = body.strip()
        sections.append(
            {
                "id": index,
                "category": unescape(category.strip()),
                "html": body,
                "text": html_to_text(body),
            }
        )
    return sections


def fetch_release_notes() -> dict:
    response = requests.get(FEED_URL, timeout=30)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    feed_updated = root.findtext("atom:updated", default="", namespaces=ATOM_NS)
    entries = []

    for entry in root.findall("atom:entry", ATOM_NS):
        entry_id = entry.findtext("atom:id", default="", namespaces=ATOM_NS)
        title = entry.findtext("atom:title", default="", namespaces=ATOM_NS)
        updated = entry.findtext("atom:updated", default="", namespaces=ATOM_NS)
        link = ""
        for link_el in entry.findall("atom:link", ATOM_NS):
            rel = link_el.get("rel")
            if rel in (None, "alternate"):
                link = link_el.get("href", "")
                break
        content = entry.findtext("atom:content", default="", namespaces=ATOM_NS)
        updates = parse_sections(content)

        entries.append(
            {
                "id": entry_id,
                "date": title,
                "updated": updated,
                "link": link,
                "updates": updates,
            }
        )

    return {
        "feed_updated": feed_updated,
        "feed_url": FEED_URL,
        "entries": entries,
    }


def create_app() -> Flask:
    app = Flask(__name__)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/release-notes")
    def release_notes():
        try:
            data = fetch_release_notes()
            return jsonify(data)
        except requests.RequestException as error:
            return jsonify({"error": f"Failed to fetch release notes: {error}"}), 502
        except ET.ParseError as error:
            return jsonify({"error": f"Failed to parse release notes feed: {error}"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

# BigQuery Release Notes App

A Flask web app that fetches [BigQuery release notes](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml), displays them by date, and helps you browse, copy, export, and share individual updates.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## Features

- **Live feed** — Fetches the official BigQuery release notes Atom feed
- **Refresh** — Reload the feed on demand with a loading spinner
- **Browse by date** — Each day’s entry is split into individual updates (Feature, Issue, etc.)
- **Copy to clipboard** — Copy any update’s date, category, summary, and docs link
- **Export to CSV** — Download all loaded updates as a CSV file
- **Dark / light mode** — Toggle the color scheme; preference is saved in the browser
- **Share on X** — Select an update and compose a pre-filled tweet via X intent URL

## Project structure

```
bigquery-release-notes/
├── app.py              # Flask server, feed parser, JSON API
├── requirements.txt
├── templates/index.html
├── static/
│   ├── app.js          # UI logic
│   └── style.css       # Styles and theme variables
└── docs/PROJECT_GUIDE.md  # Architecture and request-flow guide
```

## API

| Route | Description |
|-------|-------------|
| `GET /` | Serves the web UI |
| `GET /api/release-notes` | Returns parsed release notes as JSON |

For a detailed breakdown of the server/client flow and `app.py`, see [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md).

# BigQuery Release Notes App

A Flask web app that fetches [BigQuery release notes](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml), displays them by date, and lets you share individual updates on X.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## Features

- Live feed from the official BigQuery release notes Atom feed
- Refresh button with loading spinner
- Select any update and compose a tweet via X intent URL

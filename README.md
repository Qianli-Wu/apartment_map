# South Bay Apartment Map

This repo now uses one canonical CSV as the source of truth for the hosted apartment map:

- [apartment_research_latest.csv](/Users/qianli/Documents/New%20project/output/spreadsheet/apartment_research_latest.csv)

That CSV is converted into the JSON files used by the site:

- [apartments-data.json](/Users/qianli/Documents/New%20project/docs/apartments-data.json)
- [apartments-data.json](/Users/qianli/Documents/New%20project/map/apartments-data.json)

## Sync flow

1. Edit [apartment_research_latest.csv](/Users/qianli/Documents/New%20project/output/spreadsheet/apartment_research_latest.csv)
2. Run:

```bash
python3 "/Users/qianli/Documents/New project/tools/sync_apartment_data.py"
```

3. Commit and push

The GitHub Pages site under `docs/` reads `apartments-data.json`, so the CSV is the only file you need to maintain manually.

## Main files

- [sync_apartment_data.py](/Users/qianli/Documents/New%20project/tools/sync_apartment_data.py): syncs the latest CSV into JSON for `docs/` and `map/`
- [index.html](/Users/qianli/Documents/New%20project/docs/index.html): hosted page shell
- [app.js](/Users/qianli/Documents/New%20project/docs/app.js): map UI logic
- [styles.css](/Users/qianli/Documents/New%20project/docs/styles.css): styling

## Local preview

```bash
cd "/Users/qianli/Documents/New project/map"
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

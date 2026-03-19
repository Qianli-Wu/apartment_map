# South Bay Apartment Map

The hosted map reads its data from:

- [apartments-data.json](/Users/qianli/Documents/New%20project/docs/apartments-data.json)

That JSON is generated from the single canonical CSV:

- [apartment_research_latest.csv](/Users/qianli/Documents/New%20project/output/spreadsheet/apartment_research_latest.csv)

Run this after editing the CSV:

```bash
python3 "/Users/qianli/Documents/New project/tools/sync_apartment_data.py"
```

Useful CSV columns:

- `starred`: mark favorites with `TRUE`, `Yes`, or `1`
- `tourDateTime`: scheduled tour time, preferably `YYYY-MM-DD HH:MM`

Then push `main`. The `docs/` version is the GitHub Pages copy.

## Files

- `index.html`: page shell
- `styles.css`: layout and marker styling
- `apartments-data.json`: generated apartment dataset with embedded coordinates
- `app.js`: map logic, filters, hover tooltip behavior, and side-panel rendering

# South Bay Apartment Map

The local `map/` copy reads:

- [apartments-data.json](/Users/qianli/Documents/New%20project/map/apartments-data.json)

That JSON is generated from:

- [apartment_research_latest.csv](/Users/qianli/Documents/New%20project/output/spreadsheet/apartment_research_latest.csv)

Run this after editing the CSV:

```bash
python3 "/Users/qianli/Documents/New project/tools/sync_apartment_data.py"
```

## Files

- `index.html`: page shell
- `styles.css`: layout and marker styling
- `apartments-data.json`: generated apartment dataset with embedded coordinates
- `app.js`: map logic, filters, hover card behavior, and side-panel rendering

# South Bay 2B2B Apartment Tracker

This workspace contains a Google-Sheets-ready apartment search tracker and a bound Apps Script implementation for the South Bay 2B2B rental search.

Files:

- `output/spreadsheet/South_Bay_2B2B_Apartment_Search.xlsx`: workbook with `Controls`, `Seed Sources`, `Search Queue`, `Intake`, `Candidates`, `Audit Log`, and `Workbook Info`.
- `google_apps_script/ApartmentTracker.gs`: bound Apps Script logic for queue sync, intake upsert, stale marking, and sorting.
- `google_apps_script/SeedSouthBayTracker.gs`: one-run seeder for a live Google Sheet.
- `google_apps_script/appsscript.json`: Apps Script manifest.
- `data/initial_tracker_data.json`: seeded PDF and web verification data used to generate the workbook.
- `tools/build_tracker_workbook.py`: workbook builder script.

How to use:

1. Import `output/spreadsheet/South_Bay_2B2B_Apartment_Search.xlsx` into Google Sheets.
2. Open Extensions > Apps Script in the Google Sheet.
3. Paste in `google_apps_script/ApartmentTracker.gs`, `google_apps_script/SeedSouthBayTracker.gs`, and `google_apps_script/appsscript.json`.
4. Reload the spreadsheet and use the `Apartment Tracker` menu.
5. Run `seedSouthBayTracker()` once if you want this repository's seeded data written into the active Google Sheet.
6. After that, update `Controls`, add new rows to `Seed Sources` or `Intake`, then run `Sync Seed Queue` or `Upsert Intake Rows`.

Current seeded properties:

- Palo Alto Place
- Sevens
- Landsby
- Sofi Sunnyvale

Notes:

- The workbook keeps the PDF seed claims and the re-verified web data separate.
- `Palo Alto Place` is intentionally retained even though it currently misses the Caltrain walk threshold.
- `Sofi Sunnyvale` is seeded as a watchlist row because the crawled official site confirmed 2-bedroom inventory but did not expose the live 2B price directly.

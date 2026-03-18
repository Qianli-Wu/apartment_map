# South Bay Apartment Map

This is a small standalone Leaflet map for the apartment search list.

## Why no React

React is not required for this version because:

- the data set is small
- the interactions are simple
- there is no existing React app in this workspace to plug into

If you later want richer filtering, saved favorites, synced list and map state, or a hosted app, React becomes more compelling.

## Files

- `index.html`: page shell
- `styles.css`: layout and marker styling
- `apartments-data.js`: researched apartment dataset with embedded coordinates
- `app.js`: map logic, filters, hover tooltip behavior, and side-panel rendering

## Run locally

Use a local static server:

```bash
cd "/Users/qianli/Documents/New project/map"
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Behavior

- the page shows only apartments with live `2 bed / 2 bath` availability from `March 17, 2026` through `April 10, 2026`
- all apartment rows include embedded `latitude` and `longitude`
- markers render immediately instead of appearing one by one
- hover shows a compact tooltip and updates the info card
- click pins the selection
- city filters update the visible marker set

The app still includes a fallback geocoder for future rows that might not have coordinates yet, but the current `18`-apartment dataset does not depend on it.

## GitHub Pages

Yes. This app can be hosted as a static site on GitHub Pages.

Recommended setup:

1. Push this project to a GitHub repository.
2. Publish from the `docs/` folder on the default branch.
3. Open the Pages URL after deployment.

This workspace includes a Pages-ready copy of the map under `docs/`.

Basic flow:

```bash
cd "/Users/qianli/Documents/New project"
git init
git add .
git commit -m "Add apartment map"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Then in GitHub:

- go to `Settings`
- open `Pages`
- set source to `Deploy from a branch`
- choose `main` and folder `/docs`

Important:

- hosting on GitHub Pages is fine for the static map
- this dataset already includes embedded coordinates, so GitHub Pages is now a good fit

## Next upgrades

- replace listing links with official leasing-site links
- add latitude/longitude columns to the source spreadsheet so future imports stay instant
- add filters for max rent and max Caltrain distance
- add a side list that syncs with the map

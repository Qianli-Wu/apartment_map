const MAP_CACHE_KEY = "south-bay-apartment-map-v5";
const GEOCODE_DELAY_MS = 1100;
const DEFAULT_CENTER = [37.3947, -122.0862];
const DEFAULT_ZOOM = 11;

const state = {
  apartments: [],
  selectedCity: "All",
  selectedApartmentId: null,
  markers: new Map(),
  geocodeCache: loadCache()
};

const map = L.map("map", {
  zoomControl: true,
  minZoom: 10
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

const candidateCountEl = document.getElementById("candidate-count");
const visibleCountEl = document.getElementById("visible-count");
const tourCountEl = document.getElementById("tour-count");
const researchDateEl = document.getElementById("research-date");
const cityFiltersEl = document.getElementById("city-filters");
const clearSelectionButton = document.getElementById("clear-selection-button");
const panelEmptyEl = document.getElementById("panel-empty");
const panelCardEl = document.getElementById("panel-card");
const tourListEl = document.getElementById("tour-list");
const tourListEmptyEl = document.getElementById("tour-list-empty");

void initialize();

async function initialize() {
  clearSelectionButton.addEventListener("click", () => {
    state.selectedApartmentId = null;
    refreshMarkerStyles();
    renderPanel();
    renderScheduledTours();
  });

  try {
    state.apartments = await loadApartments();
    injectIds();
    candidateCountEl.textContent = String(state.apartments.length);
    researchDateEl.textContent = getLatestResearchDate();
    renderCityFilters();
    renderMarkersFromCache();
    updateCounters();
    renderScheduledTours();
    void geocodeMissingApartments();
  } catch (error) {
    console.error("Failed to initialize apartment map", error);
    candidateCountEl.textContent = "0";
    visibleCountEl.textContent = "0";
    tourCountEl.textContent = "0";
    researchDateEl.textContent = "Unavailable";
    renderLoadError();
  }
}

async function loadApartments() {
  const response = await fetch("./apartments-data.json", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load apartment data: ${response.status}`);
  }

  const apartments = await response.json();
  if (!Array.isArray(apartments)) {
    throw new Error("Apartment dataset is not an array");
  }

  apartments.forEach(normalizeApartmentFlags);
  return apartments;
}

function injectIds() {
  state.apartments.forEach((apartment, index) => {
    apartment.id = `${apartment.city.toLowerCase().replace(/\s+/g, "-")}-${index}`;
    if (
      typeof apartment.latitude === "number" &&
      typeof apartment.longitude === "number"
    ) {
      state.geocodeCache[apartment.address] = {
        lat: apartment.latitude,
        lon: apartment.longitude,
        source: "embedded"
      };
    }
  });

  saveCache(state.geocodeCache);
}

function renderCityFilters() {
  const cities = ["All", ...new Set(state.apartments.map((item) => item.city))];
  cityFiltersEl.innerHTML = "";

  cities.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${state.selectedCity === city ? " active" : ""}`;
    button.textContent = city;
    button.addEventListener("click", () => {
      state.selectedCity = city;
      clearSelectionIfHidden();
      renderCityFilters();
      renderMarkersFromCache();
      renderPanel(getSelectedApartment());
      fitVisibleBounds();
      updateCounters();
      renderScheduledTours();
    });
    cityFiltersEl.appendChild(button);
  });
}

function renderMarkersFromCache() {
  markerLayer.clearLayers();
  state.markers.clear();

  getVisibleApartments().forEach((apartment) => {
    const coords = state.geocodeCache[apartment.address];
    if (!coords) {
      return;
    }

    const marker = buildMarker(apartment, coords);
    marker.addTo(markerLayer);
    state.markers.set(apartment.id, marker);
  });

  refreshMarkerStyles();
  fitVisibleBounds();
}

function buildMarker(apartment, coords) {
  const marker = L.marker([coords.lat, coords.lon], {
    icon: buildIcon(apartment)
  });

  marker.bindTooltip(buildTooltipMarkup(apartment), {
    direction: "top",
    offset: [0, -28],
    opacity: 1,
    className: "apt-tooltip"
  });

  marker.on("mouseover", () => {
    marker.openTooltip();
    renderPanel(apartment);
  });

  marker.on("mouseout", () => {
    marker.closeTooltip();

    if (state.selectedApartmentId) {
      renderPanel(getSelectedApartment());
      return;
    }

    renderPanel(null);
  });

  marker.on("click", () => {
    state.selectedApartmentId = apartment.id;
    refreshMarkerStyles();
    renderPanel(apartment);
    renderScheduledTours();
  });

  return marker;
}

function buildTooltipMarkup(apartment) {
  const transit = apartment.closestCaltrain && apartment.walkTime
    ? `${apartment.closestCaltrain} • ${apartment.walkTime}`
    : apartment.closestCaltrain || apartment.walkTime || "Transit not yet verified";
  const flags = [];

  if (apartment.starred) {
    flags.push('<span class="tooltip-flag">Starred</span>');
  }

  if (apartment.tourDateTime) {
    flags.push(
      `<span class="tooltip-flag">Tour ${escapeHtml(formatDateTime(apartment.tourDateTime))}</span>`
    );
  }

  return `
    <div class="tooltip-card">
      <strong>${escapeHtml(apartment.apartment)}</strong>
      <span>${escapeHtml(apartment.city)}</span>
      <span>${escapeHtml(formatRent(apartment.listedRent))}</span>
      <span>${escapeHtml(buildAvailabilityLabel(apartment.earliestAvailability))}</span>
      <span>${escapeHtml(transit)}</span>
      ${flags.join("")}
    </div>
  `;
}

function buildIcon(apartment) {
  const cityClass = apartment.city.toLowerCase().replace(/\s+/g, "-");
  const classes = ["apt-marker", cityClass];
  const badges = [];

  if (apartment.starred) {
    classes.push("starred");
    badges.push('<span class="apt-marker-badge starred" aria-hidden="true">★</span>');
  }

  if (apartment.tourDateTime) {
    classes.push("has-tour");
    badges.push('<span class="apt-marker-badge tour" aria-hidden="true">T</span>');
  }

  return L.divIcon({
    className: "",
    html: `<div class="${classes.join(" ")}"><span>🏢</span>${badges.join("")}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36]
  });
}

async function geocodeMissingApartments() {
  const missing = state.apartments.filter((apartment) => {
    if (
      typeof apartment.latitude === "number" &&
      typeof apartment.longitude === "number"
    ) {
      return false;
    }

    return !state.geocodeCache[apartment.address];
  });

  for (const apartment of missing) {
    try {
      const result = await geocodeAddress(apartment.address);
      if (result) {
        state.geocodeCache[apartment.address] = result;
        saveCache(state.geocodeCache);

        if (matchesCityFilter(apartment)) {
          const marker = buildMarker(apartment, result);
          marker.addTo(markerLayer);
          state.markers.set(apartment.id, marker);
          refreshMarkerStyles();
          fitVisibleBounds();
        }
      }
    } catch (error) {
      console.error(`Failed to geocode ${apartment.address}`, error);
    }

    await delay(GEOCODE_DELAY_MS);
  }
}

async function geocodeAddress(address) {
  for (const candidate of buildAddressCandidates(address)) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("q", candidate);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoder returned ${response.status}`);
    }

    const results = await response.json();
    if (!results.length) {
      continue;
    }

    return {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon),
      displayName: results[0].display_name,
      query: candidate
    };
  }

  return null;
}

function renderPanel(apartment) {
  if (!apartment) {
    panelEmptyEl.classList.remove("hidden");
    panelCardEl.classList.add("hidden");
    return;
  }

  panelEmptyEl.classList.add("hidden");
  panelCardEl.classList.remove("hidden");

  setText("panel-city", apartment.city);
  setText("panel-name", apartment.apartment);
  setText("panel-price", formatRent(apartment.listedRent));
  setText("panel-availability", buildAvailabilityLabel(apartment.earliestAvailability));
  setText("panel-research-badge", `Verified ${formatDate(apartment.researchDate)}`);
  setText("panel-address", apartment.address);

  setText("panel-sqft", apartment.sqFt || "not listed");
  setText("panel-beds-baths", `${apartment.beds || "?"} bed / ${apartment.baths || "?"} bath`);
  setText("panel-caltrain", apartment.closestCaltrain || "not yet verified");
  setText("panel-distance", apartment.distance || "not yet verified");
  setText("panel-walk", apartment.walkTime || "not yet verified");
  setText("panel-washer", apartment.washer || "not yet verified");
  setText("panel-starred", apartment.starred ? "Yes" : "No");
  setText(
    "panel-tour",
    apartment.tourDateTime ? formatDateTime(apartment.tourDateTime) : "Not scheduled"
  );
  setText("panel-review", apartment.review || "not yet verified");

  setText("panel-price-basis", apartment.priceBasis || "not listed");
  setText("panel-deposit", apartment.deposit || "not listed");
  setText("panel-lease-terms", apartment.leaseTerms || "not listed");
  setText("panel-primary-source", apartment.primarySource || "not listed");

  toggleSection("panel-floorplan-section", "panel-floorplan", apartment.floorplanUnit);
  toggleSection("panel-walk-basis-section", "panel-walk-basis", apartment.walkTimeBasis);
  toggleSection("panel-washer-notes-section", "panel-washer-notes", apartment.washerNotes);
  toggleSection("panel-specials-section", "panel-specials", apartment.specials);
  toggleSection("panel-notes-section", "panel-notes", apartment.notes);

  configureLinks(apartment);
}

function configureLinks(apartment) {
  const primaryLinkEl = document.getElementById("panel-primary-link");
  const secondaryLinkEl = document.getElementById("panel-secondary-link");

  const primaryHref = apartment.officialWebsite || apartment.listingSource || "#";
  primaryLinkEl.href = primaryHref;
  primaryLinkEl.textContent = apartment.officialWebsite ? "Open Official Site" : "Open Listing Source";

  const shouldShowSecondary =
    Boolean(apartment.officialWebsite) &&
    Boolean(apartment.listingSource) &&
    apartment.officialWebsite !== apartment.listingSource;

  if (shouldShowSecondary) {
    secondaryLinkEl.href = apartment.listingSource;
    secondaryLinkEl.classList.remove("hidden");
  } else {
    secondaryLinkEl.href = "#";
    secondaryLinkEl.classList.add("hidden");
  }
}

function refreshMarkerStyles() {
  state.markers.forEach((marker, apartmentId) => {
    const element = marker.getElement();
    if (!element) {
      return;
    }

    const iconEl = element.querySelector(".apt-marker");
    if (!iconEl) {
      return;
    }

    iconEl.classList.toggle("selected", apartmentId === state.selectedApartmentId);
  });
}

function fitVisibleBounds() {
  const visibleMarkers = [...state.markers.values()];
  if (!visibleMarkers.length) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  const bounds = L.latLngBounds(visibleMarkers.map((marker) => marker.getLatLng()));
  map.fitBounds(bounds.pad(0.18), {
    maxZoom: 13
  });
}

function updateCounters() {
  visibleCountEl.textContent = String(getVisibleApartments().length);
  tourCountEl.textContent = String(getScheduledTours().length);
}

function getVisibleApartments() {
  return state.apartments.filter(matchesCityFilter);
}

function matchesCityFilter(apartment) {
  return state.selectedCity === "All" || apartment.city === state.selectedCity;
}

function clearSelectionIfHidden() {
  const selected = getSelectedApartment();
  if (!selected || !matchesCityFilter(selected)) {
    state.selectedApartmentId = null;
  }
}

function getScheduledTours() {
  return getVisibleApartments()
    .filter((apartment) => apartment.tourDateTime)
    .map((apartment) => ({
      apartment,
      sortValue: getTourSortValue(apartment.tourDateTime)
    }))
    .sort((left, right) => {
      if (left.sortValue === null && right.sortValue === null) {
        return left.apartment.apartment.localeCompare(right.apartment.apartment);
      }

      if (left.sortValue === null) {
        return 1;
      }

      if (right.sortValue === null) {
        return -1;
      }

      return left.sortValue - right.sortValue;
    })
    .map((item) => item.apartment);
}

function renderScheduledTours() {
  const tours = getScheduledTours();
  tourListEl.innerHTML = "";

  if (!tours.length) {
    tourListEmptyEl.classList.remove("hidden");
    return;
  }

  tourListEmptyEl.classList.add("hidden");

  tours.forEach((apartment) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tour-card${
      apartment.id === state.selectedApartmentId ? " active" : ""
    }`;
    button.innerHTML = buildTourCardMarkup(apartment);
    button.addEventListener("click", () => {
      state.selectedApartmentId = apartment.id;
      refreshMarkerStyles();
      renderPanel(apartment);
      renderScheduledTours();
      focusApartment(apartment);
    });
    tourListEl.appendChild(button);
  });
}

function getSelectedApartment() {
  return (
    state.apartments.find((item) => item.id === state.selectedApartmentId) || null
  );
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  el.textContent = value || "not listed";
}

function toggleSection(sectionId, valueId, value) {
  const sectionEl = document.getElementById(sectionId);
  const valueEl = document.getElementById(valueId);
  if (!sectionEl || !valueEl) {
    return;
  }

  if (value) {
    valueEl.textContent = value;
    sectionEl.classList.remove("hidden");
    return;
  }

  valueEl.textContent = "";
  sectionEl.classList.add("hidden");
}

function buildAvailabilityLabel(value) {
  if (!value || value === "Now") {
    return "Available now";
  }

  return `Available ${formatDate(value)}`;
}

function formatRent(value) {
  if (!value) {
    return "not yet verified";
  }

  if (String(value).includes("$") || /call for rent/i.test(String(value))) {
    return String(value);
  }

  return `$${value}`;
}

function formatDate(value) {
  if (!value || value === "Now") {
    return value || "not listed";
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return String(value);
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "Not scheduled";
  }

  const normalized = raw.includes("T")
    ? raw
    : raw.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)
      ? raw.replace(" ", "T")
      : raw;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getTourSortValue(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.includes("T")
    ? raw
    : raw.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)
      ? raw.replace(" ", "T")
      : raw;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function getLatestResearchDate() {
  const dates = state.apartments
    .map((item) => item.researchDate)
    .filter(Boolean)
    .sort();
  return dates.length ? formatDate(dates[dates.length - 1]) : "not listed";
}

function loadCache() {
  try {
    const raw = localStorage.getItem(MAP_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to load geocode cache", error);
    return {};
  }
}

function saveCache(cache) {
  localStorage.setItem(MAP_CACHE_KEY, JSON.stringify(cache));
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildAddressCandidates(address) {
  const candidates = new Set([address]);

  const normalizedRange = address.replace(/\b(\d+)-(\d+)\b/, "$1");
  candidates.add(normalizedRange);

  const normalizedRepeatedRange = address.replace(/\b(\d+)-\1\b/, "$1");
  candidates.add(normalizedRepeatedRange);

  const noZip = normalizedRange.replace(/,?\s+CA\s+\d{5}\b/, ", CA");
  candidates.add(noZip);

  return [...candidates].filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLoadError() {
  panelCardEl.classList.add("hidden");
  panelEmptyEl.classList.remove("hidden");
  panelEmptyEl.innerHTML = `
    <p class="panel-kicker">Data Unavailable</p>
    <h2>Could not load apartments</h2>
    <p>
      The site expects <code>apartments-data.json</code> generated from the latest CSV.
      Run <code>python3 tools/sync_apartment_data.py</code> and reload the page.
    </p>
  `;
  tourListEl.innerHTML = "";
  tourListEmptyEl.classList.remove("hidden");
  tourListEmptyEl.textContent = "Apartment data could not be loaded.";
}

function normalizeApartmentFlags(apartment) {
  apartment.starred = parseBoolean(apartment.starred);
  apartment.tourDateTime = normalizeOptionalString(apartment.tourDateTime);
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "starred"].includes(normalized);
}

function normalizeOptionalString(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function buildTourCardMarkup(apartment) {
  const flags = [
    `<span class="tour-flag city">${escapeHtml(apartment.city)}</span>`
  ];

  if (apartment.starred) {
    flags.push('<span class="tour-flag starred">Starred</span>');
  }

  return `
    <div class="tour-card-head">
      <div>
        <p class="panel-kicker">Scheduled Tour</p>
        <p class="tour-card-name">${escapeHtml(apartment.apartment)}</p>
      </div>
      <span class="tour-time-pill">${escapeHtml(formatDateTime(apartment.tourDateTime))}</span>
    </div>
    <div class="tour-card-meta">
      <span><strong>${escapeHtml(formatRent(apartment.listedRent))}</strong></span>
      <span class="tour-meta">${escapeHtml(apartment.closestCaltrain || "Transit pending")} • ${escapeHtml(apartment.walkTime || "walk pending")}</span>
      <span class="tour-meta">${escapeHtml(apartment.address || "")}</span>
    </div>
    <div class="tour-card-flags">${flags.join("")}</div>
  `;
}

function focusApartment(apartment) {
  const marker = state.markers.get(apartment.id);
  if (!marker) {
    return;
  }

  map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), {
    duration: 0.6
  });
  marker.openTooltip();
}

const GOOGLE_SHEET_ID = "1a0dw7qvvD_zHblQsJPyMwYfTY-Oc5mVYIoUw5MPB_jI";
const SHEET_QUERY_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:__FILM_SHEET_CALLBACK__`;

const state = {
  films: [],
  brandColors: {},
  lastLoadedAt: null,
  filters: {
    search: "",
    brand: "",
    minVlt: null,
    maxVlt: null,
    minTser: null,
    minIr: null,
    targetVlt: null,
    targetTser: null,
    priority: "balanced",
    sort: "match"
  },
  compareCodes: new Set()
};

const elements = {
  heroStats: document.getElementById("heroStats"),
  dataStatus: document.getElementById("dataStatus"),
  reloadData: document.getElementById("reloadData"),
  brandFilter: document.getElementById("brandFilter"),
  searchInput: document.getElementById("searchInput"),
  minVlt: document.getElementById("minVlt"),
  maxVlt: document.getElementById("maxVlt"),
  minTser: document.getElementById("minTser"),
  minIr: document.getElementById("minIr"),
  targetVlt: document.getElementById("targetVlt"),
  targetTser: document.getElementById("targetTser"),
  priorityMode: document.getElementById("priorityMode"),
  sortMode: document.getElementById("sortMode"),
  resultCount: document.getElementById("resultCount"),
  table: document.getElementById("specTable"),
  chart: document.getElementById("chart"),
  comparePanel: document.getElementById("comparePanel"),
  matchSummary: document.getElementById("matchSummary"),
  resetFilters: document.getElementById("resetFilters")
};

initialize();

function initialize() {
  bindEvents();
  renderLoadingShell();
  loadSheetData();
}

function bindEvents() {
  const numberFields = [
    elements.minVlt,
    elements.maxVlt,
    elements.minTser,
    elements.minIr,
    elements.targetVlt,
    elements.targetTser
  ];

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.brandFilter.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    render();
  });

  elements.priorityMode.addEventListener("change", (event) => {
    state.filters.priority = event.target.value;
    render();
  });

  elements.sortMode.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });

  numberFields.forEach((field) => {
    field.addEventListener("input", (event) => {
      state.filters[event.target.id] = parseOptionalNumber(event.target.value);
      render();
    });
  });

  elements.resetFilters.addEventListener("click", () => {
    state.filters = {
      search: "",
      brand: "",
      minVlt: null,
      maxVlt: null,
      minTser: null,
      minIr: null,
      targetVlt: null,
      targetTser: null,
      priority: "balanced",
      sort: "match"
    };
    state.compareCodes.clear();
    syncInputs();
    render();
  });

  elements.reloadData.addEventListener("click", () => {
    loadSheetData();
  });
}

function syncInputs() {
  elements.searchInput.value = "";
  elements.brandFilter.value = "";
  elements.minVlt.value = "";
  elements.maxVlt.value = "";
  elements.minTser.value = "";
  elements.minIr.value = "";
  elements.targetVlt.value = "";
  elements.targetTser.value = "";
  elements.priorityMode.value = "balanced";
  elements.sortMode.value = "match";
}

function renderLoadingShell() {
  updateDataStatus("loading", "Connecting to Google Sheets...");
  elements.heroStats.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">Films loaded</span>
      <span class="stat-value">--</span>
      <span class="stat-caption">Waiting for live sheet data</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Average spec</span>
      <span class="stat-value">--</span>
      <span class="stat-caption">TSER and VLT summary will appear after load</span>
    </article>
  `;
  elements.resultCount.textContent = "Loading film specs...";
  elements.matchSummary.textContent = "Fetching live data from the linked Google Sheet.";
  elements.table.innerHTML = `<tr><td colspan="9">Loading film specs from Google Sheets...</td></tr>`;
  elements.chart.innerHTML = "<p>Loading chart...</p>";
  elements.comparePanel.className = "compare-panel empty";
  elements.comparePanel.textContent = "Select films after the sheet finishes loading.";
}

async function loadSheetData() {
  updateDataStatus("loading", "Refreshing from Google Sheets...");
  elements.reloadData.disabled = true;

  try {
    const response = await loadGoogleSheetTable();
    const films = parseGoogleSheetResponse(response);
    state.films = films;
    state.brandColors = createBrandColors(films);
    state.lastLoadedAt = new Date();
    trimCompareSelection();

    if (state.filters.brand && !films.some((film) => film.brand === state.filters.brand)) {
      state.filters.brand = "";
      elements.brandFilter.value = "";
    }

    renderBrandOptions();
    renderHeroStats(films);
    updateDataStatus("ready", `Live Google Sheet connected. Last refresh ${formatTimestamp(state.lastLoadedAt)}.`);
    render();
  } catch (error) {
    state.films = [];
    state.brandColors = {};
    renderBrandOptions();
    renderHeroStats([]);
    updateDataStatus("error", `Could not load the Google Sheet. ${error.message}`);
    elements.resultCount.textContent = "Sheet load failed.";
    elements.matchSummary.textContent = "Check that the sheet is public, then click Reload sheet.";
    elements.table.innerHTML = `<tr><td colspan="9">Unable to load live data from Google Sheets.</td></tr>`;
    elements.chart.innerHTML = "<p>Chart unavailable until the sheet loads.</p>";
    elements.comparePanel.className = "compare-panel empty";
    elements.comparePanel.textContent = "Compare data will appear after the sheet loads.";
  } finally {
    elements.reloadData.disabled = false;
  }
}

function render() {
  const prepared = applyFiltersAndScores(state.films, state.filters);
  renderSummary(prepared);
  renderTable(prepared);
  renderChart(prepared);
  renderComparePanel();
}

function renderBrandOptions() {
  const brands = [...new Set(state.films.map((film) => film.brand))].sort((a, b) => a.localeCompare(b));
  elements.brandFilter.innerHTML = '<option value="">All brands</option>';

  brands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    elements.brandFilter.appendChild(option);
  });

  elements.brandFilter.value = state.filters.brand;
}

function renderHeroStats(rows) {
  if (!rows.length) {
    elements.heroStats.innerHTML = `
      <article class="stat-card">
        <span class="stat-label">Films loaded</span>
        <span class="stat-value">0</span>
        <span class="stat-caption">No live rows are available right now</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Average spec</span>
        <span class="stat-value">--</span>
        <span class="stat-caption">Available after a successful sheet load</span>
      </article>
    `;
    return;
  }

  const avgTser = average(rows.map((row) => row.tser));
  const avgVlt = average(rows.map((row) => row.vlt));
  const highestTser = rows.reduce((best, row) => (row.tser > best.tser ? row : best), rows[0]);
  const highestVlt = rows.reduce((best, row) => (row.vlt > best.vlt ? row : best), rows[0]);

  elements.heroStats.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">Films loaded</span>
      <span class="stat-value">${rows.length}</span>
      <span class="stat-caption">From the live Google Sheet</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Average spec</span>
      <span class="stat-value">${avgTser.toFixed(1)} TSER / ${avgVlt.toFixed(1)} VLT</span>
      <span class="stat-caption">Quick baseline across all products</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Top TSER</span>
      <span class="stat-value">${highestTser.tser}%</span>
      <span class="stat-caption">${highestTser.brand} ${highestTser.code}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Brightest film</span>
      <span class="stat-value">${highestVlt.vlt}% VLT</span>
      <span class="stat-caption">${highestVlt.brand} ${highestVlt.code}</span>
    </article>
  `;
}

function renderSummary(rows) {
  const bestMatch = rows[0];
  elements.resultCount.textContent = `${rows.length} matching films`;

  if (!bestMatch) {
    elements.matchSummary.textContent = state.films.length
      ? "No films match the current filters."
      : "No film data is loaded yet.";
    return;
  }

  const hasTargets = state.filters.targetVlt !== null || state.filters.targetTser !== null;
  if (!hasTargets) {
    elements.matchSummary.textContent = `Current leader: ${bestMatch.brand} ${bestMatch.code} with ${bestMatch.tser}% TSER and ${bestMatch.vlt}% VLT.`;
    return;
  }

  const tserDelta = bestMatch.deltaTser === null ? "n/a" : `${bestMatch.deltaTser.toFixed(1)} away from TSER target`;
  const vltDelta = bestMatch.deltaVlt === null ? "n/a" : `${bestMatch.deltaVlt.toFixed(1)} away from VLT target`;
  elements.matchSummary.textContent = `Best match: ${bestMatch.brand} ${bestMatch.code} - ${bestMatch.tser}% TSER, ${bestMatch.vlt}% VLT (${tserDelta}, ${vltDelta}).`;
}

function renderTable(rows) {
  elements.table.innerHTML = "";

  if (!rows.length) {
    elements.table.innerHTML = `<tr><td colspan="9">No results.</td></tr>`;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const checked = state.compareCodes.has(row.code) ? "checked" : "";

    tr.innerHTML = `
      <td><input type="checkbox" data-code="${row.code}" ${checked}></td>
      <td>${row.brand}</td>
      <td>${row.series || "-"}</td>
      <td>${row.code}</td>
      <td>${formatNumber(row.ir)}</td>
      <td>${formatNumber(row.uv)}</td>
      <td>${formatNumber(row.vlt)}</td>
      <td>${formatNumber(row.tser)}</td>
      <td>${renderMatchBadge(row.score)}</td>
    `;

    tr.querySelector("input").addEventListener("change", (event) => toggleCompare(event.target.dataset.code));
    elements.table.appendChild(tr);
  });
}

function renderChart(rows) {
  if (!rows.length) {
    elements.chart.innerHTML = "<p>No data to plot.</p>";
    return;
  }

  const width = 700;
  const height = 360;
  const padding = 42;
  const xMin = 0;
  const xMax = 60;
  const yMin = 50;
  const yMax = 90;
  const x = (value) => padding + (value - xMin) / (xMax - xMin) * (width - padding * 2);
  const y = (value) => height - padding - (value - yMin) / (yMax - yMin) * (height - padding * 2);

  const gridLines = [0, 10, 20, 30, 40, 50, 60].map((tick) => `
    <line class="grid-line" x1="${x(tick)}" y1="${padding}" x2="${x(tick)}" y2="${height - padding}"></line>
    <text class="tick-label" x="${x(tick)}" y="${height - 12}" text-anchor="middle">${tick}</text>
  `).join("") + [50, 60, 70, 80, 90].map((tick) => `
    <line class="grid-line" x1="${padding}" y1="${y(tick)}" x2="${width - padding}" y2="${y(tick)}"></line>
    <text class="tick-label" x="${padding - 10}" y="${y(tick) + 4}" text-anchor="end">${tick}</text>
  `).join("");

  const dots = rows.map((row) => {
    const isSelected = state.compareCodes.has(row.code);
    const radius = isSelected ? 8 : 5;
    const stroke = isSelected ? "#ffffff" : "rgba(255,255,255,0.4)";
    return `
      <g>
        <circle cx="${x(row.vlt)}" cy="${y(row.tser)}" r="${radius}" fill="${state.brandColors[row.brand]}" stroke="${stroke}" stroke-width="1.5"></circle>
        ${isSelected ? `<text class="dot-label" x="${x(row.vlt) + 10}" y="${y(row.tser) - 10}">${row.code}</text>` : ""}
      </g>
    `;
  }).join("");

  elements.chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Scatter chart showing VLT on the horizontal axis and TSER on the vertical axis">
      ${gridLines}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.3)"></line>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.3)"></line>
      <text class="axis-label" x="${width / 2}" y="${height - 2}" text-anchor="middle">VLT (%)</text>
      <text class="axis-label" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">TSER (%)</text>
      ${dots}
    </svg>
  `;
}

function renderComparePanel() {
  const selected = state.films.filter((film) => state.compareCodes.has(film.code));

  if (!selected.length) {
    elements.comparePanel.className = "compare-panel empty";
    elements.comparePanel.textContent = "No films selected yet.";
    return;
  }

  elements.comparePanel.className = "compare-panel";
  elements.comparePanel.innerHTML = selected.map((film) => `
    <article class="compare-card">
      <h3>${film.brand} ${film.code}</h3>
      <div class="compare-meta">${film.series || "No series label"}</div>
      <div class="spec-grid">
        <div class="spec-pill">IR: ${formatNumber(film.ir)}%</div>
        <div class="spec-pill">UV: ${formatNumber(film.uv)}%</div>
        <div class="spec-pill">VLT: ${formatNumber(film.vlt)}%</div>
        <div class="spec-pill">TSER: ${formatNumber(film.tser)}%</div>
      </div>
    </article>
  `).join("");
}

function toggleCompare(code) {
  if (state.compareCodes.has(code)) {
    state.compareCodes.delete(code);
  } else {
    if (state.compareCodes.size >= 3) {
      const firstCode = state.compareCodes.values().next().value;
      state.compareCodes.delete(firstCode);
    }
    state.compareCodes.add(code);
  }

  render();
}

function trimCompareSelection() {
  const validCodes = new Set(state.films.map((film) => film.code));
  for (const code of [...state.compareCodes]) {
    if (!validCodes.has(code)) {
      state.compareCodes.delete(code);
    }
  }
}

function applyFiltersAndScores(rows, filters) {
  const filtered = rows
    .filter((row) => !filters.brand || row.brand === filters.brand)
    .filter((row) => !filters.search || `${row.brand} ${row.series} ${row.code}`.toLowerCase().includes(filters.search))
    .filter((row) => filters.minVlt === null || row.vlt >= filters.minVlt)
    .filter((row) => filters.maxVlt === null || row.vlt <= filters.maxVlt)
    .filter((row) => filters.minTser === null || row.tser >= filters.minTser)
    .filter((row) => filters.minIr === null || (row.ir !== null && row.ir >= filters.minIr))
    .map((row) => scoreFilm(row, filters));

  const sorter = createSorter(filters.sort);
  return filtered.sort(sorter);
}

function scoreFilm(row, filters) {
  const deltaVlt = filters.targetVlt === null ? null : Math.abs(row.vlt - filters.targetVlt);
  const deltaTser = filters.targetTser === null ? null : Math.abs(row.tser - filters.targetTser);
  let score;

  if (deltaVlt === null && deltaTser === null) {
    score = row.tser * 1.5 - row.vlt * 0.2;
  } else {
    const weights = filters.priority === "tser"
      ? { vlt: 1, tser: 2.2 }
      : filters.priority === "vlt"
        ? { vlt: 2.2, tser: 1 }
        : { vlt: 1.5, tser: 1.5 };
    score = 100 - ((deltaVlt ?? 0) * weights.vlt + (deltaTser ?? 0) * weights.tser);
  }

  return { ...row, deltaVlt, deltaTser, score };
}

function createSorter(mode) {
  switch (mode) {
    case "tser-desc":
      return (a, b) => b.tser - a.tser || a.vlt - b.vlt;
    case "vlt-asc":
      return (a, b) => a.vlt - b.vlt || b.tser - a.tser;
    case "vlt-desc":
      return (a, b) => b.vlt - a.vlt || b.tser - a.tser;
    case "match":
    default:
      return (a, b) => b.score - a.score || b.tser - a.tser;
  }
}

function renderMatchBadge(score) {
  if (score >= 88) {
    return `<span class="match-badge match-excellent">Excellent</span>`;
  }
  if (score >= 72) {
    return `<span class="match-badge match-good">Good</span>`;
  }
  return `<span class="match-badge match-fair">Fair</span>`;
}

function parseGoogleSheetResponse(response) {
  if (!response || response.status !== "ok" || !response.table || !Array.isArray(response.table.rows)) {
    throw new Error("The Google Sheets response was not valid.");
  }

  let lastBrand = "";
  let lastSeries = "";

  return response.table.rows
    .map((row) => row.c || [])
    .filter((cells) => getCellValue(cells[2]))
    .map((cells) => {
      const rawBrand = getCellValue(cells[0]) || "";
      const rawSeries = getCellValue(cells[1]) || "";
      const code = getCellValue(cells[2]) || "";
      const ir = getCellValue(cells[3]);
      const uv = getCellValue(cells[4]);
      const vlt = getCellValue(cells[5]);
      const tser = getCellValue(cells[6]);

      if (rawBrand) {
        lastBrand = rawBrand;
        lastSeries = rawSeries || "";
      } else if (rawSeries) {
        lastSeries = rawSeries;
      }

      return {
        brand: rawBrand || lastBrand,
        series: rawSeries || lastSeries,
        code,
        ir: parseOptionalNumber(ir),
        uv: parseOptionalNumber(uv),
        vlt: Number(vlt),
        tser: Number(tser)
      };
    });
}

function getCellValue(cell) {
  return cell && Object.prototype.hasOwnProperty.call(cell, "v") ? cell.v : null;
}

function loadGoogleSheetTable() {
  return new Promise((resolve, reject) => {
    const callbackName = `filmSheetCallback_${Date.now()}`;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("The request timed out."));
    }, 12000);
    const script = document.createElement("script");

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("The sheet script could not be loaded."));
    };

    script.src = SHEET_QUERY_URL.replace("__FILM_SHEET_CALLBACK__", callbackName);
    document.head.appendChild(script);
  });
}

function updateDataStatus(mode, message) {
  elements.dataStatus.className = `data-status ${mode}`;
  elements.dataStatus.textContent = message;
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  if (value === null) {
    return "-";
  }

  return Number(value).toFixed(value % 1 === 0 ? 0 : 1);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createBrandColors(rows) {
  const palette = ["#78a6ff", "#4ed0a8", "#ffd166", "#f78c6b", "#c792ea", "#7bdff2", "#f07178", "#95e06c"];
  return [...new Set(rows.map((row) => row.brand))].reduce((map, brand, index) => {
    map[brand] = palette[index % palette.length];
    return map;
  }, {});
}

function formatTimestamp(date) {
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

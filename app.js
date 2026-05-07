const GOOGLE_SHEET_ID = "1a0dw7qvvD_zHblQsJPyMwYfTY-Oc5mVYIoUw5MPB_jI";
const SHEET_QUERY_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:__FILM_SHEET_CALLBACK__`;
const FILM_API_BASE_URL = getFilmApiBaseUrl();
const FILM_API_LIMIT = 500;
const LOCALE_STORAGE_KEY = "carfilmcheck-locale";
const SHEET_CACHE_STORAGE_KEY = "carfilmcheck-sheet-cache-v1";
const SHEET_CACHE_TTL_MS = 60 * 60 * 1000;

const USE_CASES = [
  { key: "night", minVlt: 35 },
  { key: "balanced", minVlt: 20 },
  { key: "dark", minVlt: 10 },
  { key: "privacy", minVlt: 0 }
];

const MESSAGES = {
  th: {
    pageTitle: "เช็กสเปกฟิล์มรถยนต์",
    hero: {
      eyebrow: "ตัวช่วยเลือกฟิล์มรถยนต์",
      title: "เริ่มเลือกจากความรู้สึกตอนใช้งานจริงก่อน",
      intro: "เริ่มจากกลุ่มที่เข้าใจง่าย เช่น ขับกลางคืนสบาย สมดุลใช้งานทุกวัน หรือฟิล์มลุคเข้ม แล้วค่อยลงไปดู TSER และ VLT เมื่ออยากเทียบสเปกละเอียด"
    },
    actions: {
      reloadSheet: "โหลดข้อมูลใหม่",
      showAllFilms: "แสดงทุกฟิล์ม",
      reset: "ล้างค่า"
    },
    useCases: {
      heading: "เลือกตามลักษณะการขับ",
      intro: "ถ้ายังงงกับ TSER และ VLT ให้เริ่มจากกลุ่มใช้งานเหล่านี้ก่อน",
      empty: "กลุ่มการใช้งานจะแสดงหลังจากโหลดข้อมูลสำเร็จ",
      noMatches: "ไม่มีฟิล์มในเงื่อนไขที่เลือก",
      count: "{count} รายการ",
      night: {
        label: "เหมาะขับกลางคืน",
        range: "VLT 35% ขึ้นไป",
        summary: "ห้องโดยสารดูโปร่งกว่า มองออกง่ายกว่าเมื่อขับตอนกลางคืน",
        hint: "เหมาะกับคนที่อยากได้มุมมองสว่างและสบายตาในตอนกลางคืน"
      },
      balanced: {
        label: "สมดุลใช้งานทุกวัน",
        range: "VLT 20-34%",
        summary: "สมดุลระหว่างความสบาย ความเข้ม และการมองเห็น",
        hint: "เป็นช่วงที่ใช้งานได้รอบด้านที่สุดสำหรับรถใช้งานประจำวัน"
      },
      dark: {
        label: "ลุคเข้ม",
        range: "VLT 10-19%",
        summary: "มองจากด้านนอกจะเข้มชัดขึ้นและให้ความเป็นส่วนตัวมากขึ้น",
        hint: "เริ่มให้ภาพลักษณ์เข้มจากด้านนอกชัดเจน และตอนกลางคืนอาจรู้สึกทึบขึ้น"
      },
      privacy: {
        label: "เน้นความเป็นส่วนตัว",
        range: "VLT ต่ำกว่า 10%",
        summary: "ลุคเข้มมาก เน้นความเป็นส่วนตัวเป็นหลัก",
        hint: "ดูเข้มมากจากด้านนอก ควรเช็กให้ตรงกับการใช้งานจริงก่อนตัดสินใจ"
      }
    },
    preview: {
      heading: "ตัวอย่างความเข้มจากด้านนอก",
      intro: "ลากแถบเพื่อดูคร่าวๆ ว่ากระจกจะดูเข้มจากด้านนอกประมาณไหน ก่อนจะไปดูรายการฟิล์มจริงในตาราง",
      label: "ดูตัวอย่าง VLT",
      current: "{label} ที่ VLT {vlt}%"
    },
    filters: {
      heading: "ตัวกรอง",
      search: "ค้นหา",
      searchPlaceholder: "ยี่ห้อ ซีรีส์ หรือรหัส",
      brand: "ยี่ห้อ",
      allBrands: "ทุกยี่ห้อ",
      signalProfile: "สัญญาณ / วัสดุ",
      allSignalProfiles: "ทุกโปรไฟล์",
      signalFriendly: "เป็นมิตรกับสัญญาณ GPS / Easy Pass",
      ceramic: "Ceramic",
      ceramic100: "Ceramic 100%",
      metalized: "Metalized",
      minVlt: "VLT ต่ำสุด",
      maxVlt: "VLT สูงสุด",
      minTser: "TSER ต่ำสุด",
      minIr: "IR ต่ำสุด"
    },
    matcher: {
      heading: "จำลองการหาใกล้เคียงเป้าหมาย",
      intro: "ตั้งสเปกที่ต้องการ แล้วตารางจะเรียงรุ่นที่ใกล้เคียงที่สุดให้",
      targetVlt: "VLT เป้าหมาย",
      targetVltPlaceholder: "เช่น 20",
      targetTser: "TSER เป้าหมาย",
      targetTserPlaceholder: "เช่น 70",
      priority: "ให้น้ำหนัก",
      priorityBalanced: "สมดุล",
      priorityTser: "เน้น TSER",
      priorityVlt: "เน้น VLT",
      show: "การเรียง",
      sortMatch: "ใกล้เคียงที่สุดก่อน",
      sortTserDesc: "TSER สูงสุดก่อน",
      sortVltAsc: "VLT ต่ำสุดก่อน",
      sortVltDesc: "VLT สูงสุดก่อน"
    },
    chart: {
      heading: "แผนที่ TSER vs VLT",
      intro: "VLT ต่ำมักหมายถึงฟิล์มเข้มกว่า ส่วน TSER สูงมักหมายถึงกันความร้อนได้รวมมากกว่า",
      empty: "ยังไม่มีข้อมูลให้พล็อต",
      ariaLabel: "กราฟกระจายแสดงค่า VLT บนแกนนอนและ TSER บนแกนตั้ง",
      xAxis: "VLT (%)",
      yAxis: "TSER (%)",
      unavailable: "กราฟจะใช้งานได้หลังจากโหลดข้อมูลสำเร็จ",
      loading: "กำลังโหลดกราฟ...",
      tapHint: "แตะหรือคลิกจุดบนกราฟเพื่อดูรายละเอียดและเลือกเทียบ",
      addCompare: "เพิ่มเข้าเทียบ",
      removeCompare: "เอาออกจากการเทียบ"
    },
    compare: {
      heading: "เทียบเร็ว",
      intro: "เลือกได้สูงสุด 3 ฟิล์มจากตาราง",
      empty: "ยังไม่ได้เลือกฟิล์ม",
      emptyAfterLoad: "เลือกฟิล์มหลังจากโหลดข้อมูลเสร็จ",
      noSeriesLabel: "ไม่มีชื่อซีรีส์"
    },
    table: {
      heading: "สเปกฟิล์ม",
      compare: "เทียบ",
      use: "การใช้งาน",
      tech: "Tech",
      brand: "ยี่ห้อ",
      series: "ซีรีส์",
      code: "รหัส",
      match: "ความใกล้เคียง",
      noResults: "ไม่พบผลลัพธ์",
      loading: "กำลังโหลดสเปกฟิล์มจาก backend API...",
      loadFailed: "ไม่สามารถโหลดข้อมูลจาก backend API ได้"
    },
    heroStats: {
      filmsLoaded: "จำนวนฟิล์ม",
      averageSpec: "ค่าเฉลี่ยสเปก",
      topTser: "TSER สูงสุด",
      brightestFilm: "ฟิล์มสว่างสุด",
      waiting: "กำลังรอข้อมูลสดจาก API",
      summaryAfterLoad: "สรุป TSER และ VLT จะแสดงหลังโหลดเสร็จ",
      noRows: "ยังไม่มีข้อมูลจากชีตในตอนนี้",
      availableAfterLoad: "จะแสดงหลังโหลดข้อมูลสำเร็จ",
      fromLiveSheet: "จากข้อมูลสดใน API",
      quickBaseline: "ภาพรวมค่าเฉลี่ยของสินค้าทั้งหมด"
    },
    status: {
      connecting: "กำลังเชื่อมต่อ backend API...",
      refreshing: "กำลังรีเฟรชข้อมูลจาก backend API...",
      cachedRefreshing: "กำลังแสดงข้อมูลที่แคชไว้จาก {timestamp} พร้อมรีเฟรชข้อมูลจาก API...",
      ready: "เชื่อมต่อ backend API สำเร็จ อัปเดตล่าสุด {timestamp}",
      loadFailed: "โหลดข้อมูลจาก backend API ไม่สำเร็จ {reason}",
      refreshFailedUsingLastData: "รีเฟรชข้อมูลสดไม่สำเร็จ กำลังแสดงข้อมูลล่าสุดจาก {timestamp} {reason}"
    },
    summary: {
      loadingResults: "กำลังโหลดสเปกฟิล์ม...",
      loadingMatch: "กำลังดึงข้อมูลสดจาก backend API",
      sheetLoadFailed: "โหลดข้อมูลไม่สำเร็จ",
      checkSheet: "ตรวจสอบว่า backend ยังทำงานอยู่ จากนั้นกดโหลดข้อมูลใหม่",
      resultsCount: "พบ {count} รายการ",
      noFilterMatch: "ไม่มีฟิล์มที่ตรงกับเงื่อนไขปัจจุบัน",
      noFilmData: "ยังไม่มีข้อมูลฟิล์ม",
      currentLeader: "ตัวเด่นตอนนี้: {brand} {code} อยู่ในกลุ่ม {useCase} มี TSER {tser}% และ VLT {vlt}%",
      bestMatch: "ใกล้เคียงที่สุด: {brand} {code} อยู่ในกลุ่ม {useCase} มี TSER {tser}% และ VLT {vlt}% ({tserDelta}, {vltDelta})",
      tserDelta: "ห่างจาก TSER เป้าหมาย {delta}",
      vltDelta: "ห่างจาก VLT เป้าหมาย {delta}",
      notAvailable: "ไม่มีข้อมูล"
    },
    match: {
      excellent: "ดีมาก",
      good: "ดี",
      fair: "พอใช้"
    },
    tech: {
      ceramic: "Ceramic",
      ceramic100: "Ceramic 100%",
      signalFriendly: "Signal / GPS Friendly",
      metalized: "Metalized",
      none: "ไม่มีข้อมูลสัญญาณ"
    },
    errors: {
      invalidSheetResponse: "ข้อมูลตอบกลับจาก backend API ไม่ถูกต้อง",
      requestTimedOut: "การขอข้อมูลหมดเวลา",
      scriptLoadFailed: "โหลดสคริปต์ของชีตไม่สำเร็จ"
    }
  },
  en: {
    pageTitle: "Car Film Spec Checker",
    hero: {
      eyebrow: "Car film spec simulator",
      title: "Pick film by driving feel first",
      intro: "Start with simple groups like night-friendly, balanced, or dark privacy film. Then drill into TSER and VLT only when you need exact specs."
    },
    actions: {
      reloadSheet: "Reload data",
      showAllFilms: "Show all films",
      reset: "Reset"
    },
    useCases: {
      heading: "Pick by driving use",
      intro: "Use these quick groups if TSER and VLT numbers still feel abstract.",
      empty: "Use-case groups will appear after the data loads.",
      noMatches: "No films in the current filters",
      count: "{count} films",
      night: {
        label: "Night driving friendly",
        range: "35%+ VLT",
        summary: "Lighter cabin feel with better outward visibility after dark.",
        hint: "This range usually feels safest for drivers who want a brighter view at night."
      },
      balanced: {
        label: "Balanced everyday",
        range: "20-34% VLT",
        summary: "A middle ground between comfort, shade, and visibility.",
        hint: "This is the most all-around range for daily driving and a cleaner exterior look."
      },
      dark: {
        label: "Dark look",
        range: "10-19% VLT",
        summary: "Noticeably darker from outside with a stronger privacy feel.",
        hint: "This range starts to look dark from outside and can feel more closed in at night."
      },
      privacy: {
        label: "Privacy look",
        range: "Below 10% VLT",
        summary: "Very dark appearance aimed at privacy-first builds.",
        hint: "This range looks very dark from outside and should be checked carefully against real driving needs."
      }
    },
    preview: {
      heading: "VLT outside preview",
      intro: "Drag the slider to estimate how dark the glass looks from outside before you compare the film rows.",
      label: "Preview VLT",
      current: "{label} at {vlt}% VLT"
    },
    filters: {
      heading: "Filters",
      search: "Search",
      searchPlaceholder: "Brand, series, or code",
      brand: "Brand",
      allBrands: "All brands",
      signalProfile: "Signal / Material",
      allSignalProfiles: "All signal profiles",
      signalFriendly: "Signal / GPS friendly",
      ceramic: "Ceramic",
      ceramic100: "Ceramic 100%",
      metalized: "Metalized",
      minVlt: "Min VLT",
      maxVlt: "Max VLT",
      minTser: "Min TSER",
      minIr: "Min IR"
    },
    matcher: {
      heading: "Target match simulator",
      intro: "Set your desired spec and the table will rank the closest matches.",
      targetVlt: "Target VLT",
      targetVltPlaceholder: "e.g. 20",
      targetTser: "Target TSER",
      targetTserPlaceholder: "e.g. 70",
      priority: "Priority",
      priorityBalanced: "Balanced",
      priorityTser: "Prefer TSER",
      priorityVlt: "Prefer VLT",
      show: "Show",
      sortMatch: "Best match first",
      sortTserDesc: "Highest TSER first",
      sortVltAsc: "Lowest VLT first",
      sortVltDesc: "Highest VLT first"
    },
    chart: {
      heading: "TSER vs VLT map",
      intro: "Lower VLT usually means darker film. Higher TSER usually means stronger total heat rejection.",
      empty: "No data to plot.",
      ariaLabel: "Scatter chart showing VLT on the horizontal axis and TSER on the vertical axis",
      xAxis: "VLT (%)",
      yAxis: "TSER (%)",
      unavailable: "Chart unavailable until the data loads.",
      loading: "Loading chart...",
      tapHint: "Tap or click a point to inspect the film and add it to compare.",
      addCompare: "Add to compare",
      removeCompare: "Remove from compare"
    },
    compare: {
      heading: "Quick compare",
      intro: "Select up to 3 films from the table.",
      empty: "No films selected yet.",
      emptyAfterLoad: "Select films after the data finishes loading.",
      noSeriesLabel: "No series label"
    },
    table: {
      heading: "Film specs",
      compare: "Compare",
      use: "Use",
      tech: "Tech",
      brand: "Brand",
      series: "Series",
      code: "Code",
      match: "Match",
      noResults: "No results.",
      loading: "Loading film specs from backend API...",
      loadFailed: "Unable to load live data from backend API."
    },
    heroStats: {
      filmsLoaded: "Films loaded",
      averageSpec: "Average spec",
      topTser: "Top TSER",
      brightestFilm: "Brightest film",
      waiting: "Waiting for live API data",
      summaryAfterLoad: "TSER and VLT summary will appear after load",
      noRows: "No live rows are available right now",
      availableAfterLoad: "Available after a successful data load",
      fromLiveSheet: "From the live API",
      quickBaseline: "Quick baseline across all products"
    },
    status: {
      connecting: "Connecting to backend API...",
      refreshing: "Refreshing from backend API...",
      cachedRefreshing: "Showing cached data from {timestamp} while refreshing backend API...",
      ready: "Live backend API connected. Last refresh {timestamp}.",
      loadFailed: "Could not load the backend API. {reason}",
      refreshFailedUsingLastData: "Live refresh failed. Showing the last known data from {timestamp}. {reason}"
    },
    summary: {
      loadingResults: "Loading film specs...",
      loadingMatch: "Fetching live data from the backend API.",
      sheetLoadFailed: "Data load failed.",
      checkSheet: "Check that the backend is running, then click Reload data.",
      resultsCount: "{count} matching films",
      noFilterMatch: "No films match the current filters.",
      noFilmData: "No film data is loaded yet.",
      currentLeader: "Current leader: {brand} {code} in {useCase} with {tser}% TSER and {vlt}% VLT.",
      bestMatch: "Best match: {brand} {code} in {useCase} - {tser}% TSER, {vlt}% VLT ({tserDelta}, {vltDelta}).",
      tserDelta: "{delta} away from TSER target",
      vltDelta: "{delta} away from VLT target",
      notAvailable: "n/a"
    },
    match: {
      excellent: "Excellent",
      good: "Good",
      fair: "Fair"
    },
    tech: {
      ceramic: "Ceramic",
      ceramic100: "Ceramic 100%",
      signalFriendly: "Signal / GPS Friendly",
      metalized: "Metalized",
      none: "No signal metadata"
    },
    errors: {
      invalidSheetResponse: "The backend API response was not valid.",
      requestTimedOut: "The request timed out.",
      scriptLoadFailed: "The sheet script could not be loaded."
    }
  }
};

const state = {
  films: [],
  brandColors: {},
  lastLoadedAt: null,
  previewVlt: 35,
  locale: getInitialLocale(),
  chartFocusCode: "",
  sheetStatus: {
    mode: "loading",
    key: "status.connecting",
    params: {}
  },
  filters: {
    search: "",
    brand: "",
    signalProfile: "",
    minVlt: null,
    maxVlt: null,
    minTser: null,
    minIr: null,
    targetVlt: null,
    targetTser: null,
    useCase: "",
    priority: "balanced",
    sort: "match"
  },
  compareCodes: new Set()
};

const elements = {
  heroStats: document.getElementById("heroStats"),
  dataStatus: document.getElementById("dataStatus"),
  reloadData: document.getElementById("reloadData"),
  clearUseCase: document.getElementById("clearUseCase"),
  useCaseGroups: document.getElementById("useCaseGroups"),
  brandFilter: document.getElementById("brandFilter"),
  signalFilter: document.getElementById("signalFilter"),
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
  specCards: document.getElementById("specCards"),
  chart: document.getElementById("chart"),
  comparePanel: document.getElementById("comparePanel"),
  matchSummary: document.getElementById("matchSummary"),
  resetFilters: document.getElementById("resetFilters"),
  vltPreview: document.getElementById("vltPreview"),
  vltPreviewValue: document.getElementById("vltPreviewValue"),
  vltPreviewLabel: document.getElementById("vltPreviewLabel"),
  vltPreviewHint: document.getElementById("vltPreviewHint"),
  previewGlass: document.getElementById("previewGlass"),
  previewMeter: document.getElementById("previewMeter"),
  localeButtons: [...document.querySelectorAll("[data-locale]")],
  translatable: [...document.querySelectorAll("[data-i18n]")],
  translatablePlaceholders: [...document.querySelectorAll("[data-i18n-placeholder]")]
};

initialize();

function initialize() {
  bindEvents();
  renderStaticText();
  renderLoadingShell();
  renderVltPreview();
  const hasCachedData = hydrateCachedFilms();
  loadFilmData({ hasCachedData });
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

  elements.localeButtons.forEach((button) => {
    button.addEventListener("click", () => setLocale(button.dataset.locale));
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.brandFilter.addEventListener("change", (event) => {
    state.filters.brand = event.target.value;
    render();
  });

  elements.signalFilter.addEventListener("change", (event) => {
    state.filters.signalProfile = event.target.value;
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
      signalProfile: "",
      minVlt: null,
      maxVlt: null,
      minTser: null,
      minIr: null,
      targetVlt: null,
      targetTser: null,
      useCase: "",
      priority: "balanced",
      sort: "match"
    };
    state.compareCodes.clear();
    syncInputs();
    render();
  });

  elements.reloadData.addEventListener("click", () => {
    loadFilmData();
  });

  elements.clearUseCase.addEventListener("click", () => {
    state.filters.useCase = "";
    render();
  });

  elements.useCaseGroups.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-use-case]");
    if (!trigger) {
      return;
    }

    state.filters.useCase = state.filters.useCase === trigger.dataset.useCase ? "" : trigger.dataset.useCase;
    render();
  });

  elements.vltPreview.addEventListener("input", (event) => {
    state.previewVlt = parseOptionalNumber(event.target.value) ?? 35;
    renderVltPreview();
  });

  elements.table.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-code]");
    if (checkbox) {
      toggleCompare(checkbox.dataset.code);
    }
  });

  elements.specCards.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-code]");
    if (checkbox) {
      toggleCompare(checkbox.dataset.code);
    }
  });

  elements.chart.addEventListener("click", (event) => {
    const compareTrigger = event.target.closest("[data-chart-compare]");
    if (compareTrigger) {
      toggleCompare(compareTrigger.dataset.chartCompare);
      return;
    }

    const pointTrigger = event.target.closest("[data-chart-code]");
    if (!pointTrigger) {
      return;
    }

    const { chartCode } = pointTrigger.dataset;
    state.chartFocusCode = state.chartFocusCode === chartCode ? "" : chartCode;
    render();
  });
}

function setLocale(locale) {
  if (!MESSAGES[locale] || locale === state.locale) {
    return;
  }

  state.locale = locale;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  renderStaticText();
  syncInputs();
  renderVltPreview();
  renderBrandOptions();
  renderHeroStats(state.films);
  applyDataStatus();
  render();
}

function renderStaticText() {
  document.documentElement.lang = state.locale;
  document.title = t("pageTitle");

  elements.localeButtons.forEach((button) => {
    const isActive = button.dataset.locale === state.locale;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.translatable.forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  elements.translatablePlaceholders.forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
}

function syncInputs() {
  elements.searchInput.value = state.filters.search ? state.filters.search : "";
  elements.brandFilter.value = state.filters.brand;
  elements.signalFilter.value = state.filters.signalProfile;
  elements.minVlt.value = stringifyInputValue(state.filters.minVlt);
  elements.maxVlt.value = stringifyInputValue(state.filters.maxVlt);
  elements.minTser.value = stringifyInputValue(state.filters.minTser);
  elements.minIr.value = stringifyInputValue(state.filters.minIr);
  elements.targetVlt.value = stringifyInputValue(state.filters.targetVlt);
  elements.targetTser.value = stringifyInputValue(state.filters.targetTser);
  elements.vltPreview.value = String(state.previewVlt);
  elements.priorityMode.value = state.filters.priority;
  elements.sortMode.value = state.filters.sort;
}

function renderLoadingShell() {
  setDataStatus("loading", "status.connecting");
  elements.useCaseGroups.innerHTML = `
    <article class="use-case-card skeleton-card"></article>
    <article class="use-case-card skeleton-card"></article>
    <article class="use-case-card skeleton-card"></article>
    <article class="use-case-card skeleton-card"></article>
  `;
  elements.heroStats.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">${t("heroStats.filmsLoaded")}</span>
      <span class="stat-value">--</span>
      <span class="stat-caption">${t("heroStats.waiting")}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">${t("heroStats.averageSpec")}</span>
      <span class="stat-value">--</span>
      <span class="stat-caption">${t("heroStats.summaryAfterLoad")}</span>
    </article>
  `;
  elements.resultCount.textContent = t("summary.loadingResults");
  elements.matchSummary.textContent = t("summary.loadingMatch");
  elements.table.innerHTML = `
    <tr class="table-skeleton-row">
      <td colspan="11"><div class="table-skeleton-line"></div></td>
    </tr>
    <tr class="table-skeleton-row">
      <td colspan="11"><div class="table-skeleton-line"></div></td>
    </tr>
    <tr class="table-skeleton-row">
      <td colspan="11"><div class="table-skeleton-line"></div></td>
    </tr>
  `;
  elements.specCards.innerHTML = `
    <article class="spec-card skeleton-card"></article>
    <article class="spec-card skeleton-card"></article>
    <article class="spec-card skeleton-card"></article>
  `;
  elements.chart.innerHTML = `
    <div class="chart-skeleton"></div>
    <p class="chart-hint">${t("chart.loading")}</p>
  `;
  elements.comparePanel.className = "compare-panel empty";
  elements.comparePanel.textContent = t("compare.emptyAfterLoad");
}

async function loadFilmData({ hasCachedData = false } = {}) {
  if (hasCachedData && state.lastLoadedAt) {
    setDataStatus("loading", "status.cachedRefreshing", { timestamp: formatTimestamp(state.lastLoadedAt) });
  } else {
    setDataStatus("loading", "status.refreshing");
  }
  elements.reloadData.disabled = true;

  try {
    const films = await loadFilmsFromApi();
    const loadedAt = new Date();
    cacheFilms(films, loadedAt);
    applyFilms(films, loadedAt);
    setDataStatus("ready", "status.ready", { timestamp: formatTimestamp(loadedAt) });
  } catch (error) {
    if (state.films.length && state.lastLoadedAt) {
      setDataStatus("error", "status.refreshFailedUsingLastData", {
        timestamp: formatTimestamp(state.lastLoadedAt),
        reason: error.message
      });
      render();
    } else {
      state.films = [];
      state.brandColors = {};
      renderBrandOptions();
      renderHeroStats([]);
      setDataStatus("error", "status.loadFailed", { reason: error.message });
      elements.resultCount.textContent = t("summary.sheetLoadFailed");
      elements.matchSummary.textContent = t("summary.checkSheet");
      elements.table.innerHTML = `<tr><td colspan="11">${t("table.loadFailed")}</td></tr>`;
      elements.specCards.innerHTML = `<p class="empty-copy">${t("table.loadFailed")}</p>`;
      elements.chart.innerHTML = `<p class="chart-hint">${t("chart.unavailable")}</p>`;
      elements.comparePanel.className = "compare-panel empty";
      elements.comparePanel.textContent = t("compare.emptyAfterLoad");
    }
  } finally {
    elements.reloadData.disabled = false;
  }
}

async function loadFilmsFromApi() {
  const url = new URL('/api/films', FILM_API_BASE_URL);
  url.searchParams.set('limit', String(FILM_API_LIMIT));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(t("errors.invalidSheetResponse"));
  }

  return payload.map(normalizeApiFilm);
}

function hydrateCachedFilms() {
  const cached = readCachedFilms();
  if (!cached) {
    return false;
  }

  applyFilms(cached.films, new Date(cached.savedAt));
  return true;
}

function applyFilms(films, loadedAt) {
  state.films = films;
  state.brandColors = createBrandColors(films);
  state.lastLoadedAt = loadedAt;
  trimCompareSelection();

  if (state.filters.brand && !films.some((film) => film.brand === state.filters.brand)) {
    state.filters.brand = "";
  }

  renderBrandOptions();
  renderHeroStats(films);
  render();
}

function render() {
  const groupedRows = applyFiltersAndScores(state.films, { ...state.filters, useCase: "" });
  const prepared = applyFiltersAndScores(state.films, state.filters);
  renderUseCaseGroups(groupedRows);
  renderSummary(prepared);
  renderTable(prepared);
  renderSpecCards(prepared);
  renderChart(prepared);
  renderComparePanel();
}

function renderUseCaseGroups(rows) {
  if (!state.films.length) {
    elements.useCaseGroups.innerHTML = `<p class="empty-copy">${t("useCases.empty")}</p>`;
    elements.clearUseCase.disabled = true;
    return;
  }

  const cards = USE_CASES.map((useCase) => {
    const localized = getUseCaseCopy(useCase.key);
    const matches = rows.filter((row) => row.useCase.key === useCase.key);
    const sampleText = matches.length
      ? matches.slice(0, 3).map((row) => `${row.brand} ${row.code}`).join(" • ")
      : t("useCases.noMatches");
    const isActive = state.filters.useCase === useCase.key ? " active" : "";

    return `
      <button class="use-case-card${isActive}" type="button" data-use-case="${useCase.key}">
        <span class="use-case-range">${localized.range}</span>
        <strong>${localized.label}</strong>
        <span class="use-case-summary">${localized.summary}</span>
        <span class="use-case-count">${t("useCases.count", { count: matches.length })}</span>
        <span class="use-case-samples">${sampleText}</span>
      </button>
    `;
  }).join("");

  elements.useCaseGroups.innerHTML = cards;
  elements.clearUseCase.disabled = !state.filters.useCase;
}

function renderBrandOptions() {
  const brands = [...new Set(state.films.map((film) => film.brand))].sort((a, b) => a.localeCompare(b));
  elements.brandFilter.innerHTML = `<option value="">${t("filters.allBrands")}</option>`;

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
        <span class="stat-label">${t("heroStats.filmsLoaded")}</span>
        <span class="stat-value">0</span>
        <span class="stat-caption">${t("heroStats.noRows")}</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">${t("heroStats.averageSpec")}</span>
        <span class="stat-value">--</span>
        <span class="stat-caption">${t("heroStats.availableAfterLoad")}</span>
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
      <span class="stat-label">${t("heroStats.filmsLoaded")}</span>
      <span class="stat-value">${rows.length}</span>
      <span class="stat-caption">${t("heroStats.fromLiveSheet")}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">${t("heroStats.averageSpec")}</span>
      <span class="stat-value">${avgTser.toFixed(1)} TSER / ${avgVlt.toFixed(1)} VLT</span>
      <span class="stat-caption">${t("heroStats.quickBaseline")}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">${t("heroStats.topTser")}</span>
      <span class="stat-value">${highestTser.tser}%</span>
      <span class="stat-caption">${highestTser.brand} ${highestTser.code}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">${t("heroStats.brightestFilm")}</span>
      <span class="stat-value">${highestVlt.vlt}% VLT</span>
      <span class="stat-caption">${highestVlt.brand} ${highestVlt.code}</span>
    </article>
  `;
}

function renderSummary(rows) {
  const bestMatch = rows[0];
  elements.resultCount.textContent = t("summary.resultsCount", { count: rows.length });

  const collapsePanel = document.getElementById("resultCollapsePanel");
  const collapseContent = document.getElementById("collapseResultContent");
  if (!bestMatch) {
    elements.matchSummary.textContent = state.films.length
      ? t("summary.noFilterMatch")
      : t("summary.noFilmData");
    if (collapsePanel && collapseContent) {
      collapseContent.innerHTML = `<div class="collapse-result-lead">${elements.matchSummary.textContent}</div>`;
    }
    return;
  }

  const hasTargets = state.filters.targetVlt !== null || state.filters.targetTser !== null;
  const useCaseLabel = getUseCaseCopy(bestMatch.useCase.key).label;
  let summaryText = "";
  if (!hasTargets) {
    summaryText = t("summary.currentLeader", {
      brand: bestMatch.brand,
      code: bestMatch.code,
      useCase: useCaseLabel,
      tser: bestMatch.tser,
      vlt: bestMatch.vlt
    });
    elements.matchSummary.textContent = summaryText;
  } else {
    const tserDelta = bestMatch.deltaTser === null
      ? t("summary.notAvailable")
      : t("summary.tserDelta", { delta: bestMatch.deltaTser.toFixed(1) });
    const vltDelta = bestMatch.deltaVlt === null
      ? t("summary.notAvailable")
      : t("summary.vltDelta", { delta: bestMatch.deltaVlt.toFixed(1) });
    summaryText = t("summary.bestMatch", {
      brand: bestMatch.brand,
      code: bestMatch.code,
      useCase: useCaseLabel,
      tser: bestMatch.tser,
      vlt: bestMatch.vlt,
      tserDelta,
      vltDelta
    });
    elements.matchSummary.textContent = summaryText;
  }
  if (collapsePanel && collapseContent) {
    const resultItems = rows.slice(0, 3).map((row, index) => {
      return `
        <li>
          <strong>${index + 1}. ${row.brand} ${row.code}</strong> (${row.series || "-"})
          <div class="collapse-result-meta">${row.tser}% TSER, ${row.vlt}% VLT · ${getUseCaseCopy(row.useCase.key).label}</div>
        </li>
      `;
    }).join("");

    collapseContent.innerHTML = `
      <div class="collapse-result-lead">${summaryText}</div>
      <ol class="collapse-result-list">${resultItems}</ol>
    `;
  }
}

function renderTable(rows) {
  elements.table.innerHTML = "";

  if (!rows.length) {
    elements.table.innerHTML = `<tr><td colspan="11">${t("table.noResults")}</td></tr>`;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const checked = state.compareCodes.has(row.code) ? "checked" : "";

    tr.innerHTML = `
      <td><input type="checkbox" data-code="${row.code}" ${checked}></td>
      <td>${renderUseCaseBadge(row.useCase)}</td>
      <td>${renderTechBadges(row, { compact: true })}</td>
      <td>${row.brand}</td>
      <td>${row.series || "-"}</td>
      <td>${row.code}</td>
      <td>${formatNumber(row.ir)}</td>
      <td>${formatNumber(row.uv)}</td>
      <td>${formatNumber(row.vlt)}</td>
      <td>${formatNumber(row.tser)}</td>
      <td>${renderMatchBadge(row.score)}</td>
    `;

    elements.table.appendChild(tr);
  });
}

function renderSpecCards(rows) {
  if (!rows.length) {
    elements.specCards.innerHTML = `<p class="empty-copy">${t("table.noResults")}</p>`;
    return;
  }

  elements.specCards.innerHTML = rows.map((row) => {
    const checked = state.compareCodes.has(row.code) ? "checked" : "";
    return `
      <article class="spec-card">
        <div class="spec-card-header">
          <div>
            <div class="spec-card-title">${row.brand} ${row.code}</div>
            <div class="spec-card-subtitle">${row.series || "-"}</div>
          </div>
          <label class="spec-card-toggle">
            <span>${t("table.compare")}</span>
            <input type="checkbox" data-code="${row.code}" ${checked}>
          </label>
        </div>
        <div class="spec-card-tags">
          ${renderUseCaseBadge(row.useCase)}
          ${renderTechBadges(row)}
        </div>
        <div class="spec-grid spec-grid-mobile">
          <div class="spec-pill">IR: ${formatNumber(row.ir)}%</div>
          <div class="spec-pill">UV: ${formatNumber(row.uv)}%</div>
          <div class="spec-pill">VLT: ${formatNumber(row.vlt)}%</div>
          <div class="spec-pill">TSER: ${formatNumber(row.tser)}%</div>
        </div>
        <div class="spec-card-match">${renderMatchBadge(row.score)}</div>
      </article>
    `;
  }).join("");
}

function renderChart(rows) {
  if (!rows.length) {
    elements.chart.innerHTML = `<p class="chart-hint">${t("chart.empty")}</p>`;
    return;
  }

  if (state.chartFocusCode && !rows.some((row) => row.code === state.chartFocusCode)) {
    state.chartFocusCode = "";
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
    const isFocused = state.chartFocusCode === row.code;
    const radius = isSelected ? 8 : 5;
    const stroke = isFocused ? "#ff9900" : isSelected ? "#8e6238" : "rgba(142,98,56,0.45)";
    return `
      <g class="chart-point-group">
        <circle class="chart-hit-area" cx="${x(row.vlt)}" cy="${y(row.tser)}" r="14" fill="transparent" data-chart-code="${row.code}" tabindex="0"></circle>
        <circle cx="${x(row.vlt)}" cy="${y(row.tser)}" r="${radius}" fill="${state.brandColors[row.brand]}" stroke="${stroke}" stroke-width="1.5"></circle>
        ${isSelected ? `<text class="dot-label" x="${x(row.vlt) + 10}" y="${y(row.tser) - 10}">${row.code}</text>` : ""}
      </g>
    `;
  }).join("");

  const focusedRow = rows.find((row) => row.code === state.chartFocusCode);
  const compareActionLabel = focusedRow && state.compareCodes.has(focusedRow.code)
    ? t("chart.removeCompare")
    : t("chart.addCompare");

  elements.chart.innerHTML = `
    <div class="chart-shell">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("chart.ariaLabel")}">
        ${gridLines}
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(176,120,63,0.22)"></line>
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(176,120,63,0.22)"></line>
        <text class="axis-label" x="${width / 2}" y="${height - 2}" text-anchor="middle">${t("chart.xAxis")}</text>
        <text class="axis-label" x="18" y="${height / 2}" text-anchor="middle" transform="rotate(-90 18 ${height / 2})">${t("chart.yAxis")}</text>
        ${dots}
      </svg>
    </div>
    ${focusedRow ? `
      <article class="chart-meta-panel">
        <div>
          <strong>${focusedRow.brand} ${focusedRow.code}</strong>
          <div class="compare-meta">${focusedRow.series || "-"}</div>
        </div>
        <div class="spec-card-tags">
          ${renderUseCaseBadge(focusedRow.useCase)}
          ${renderTechBadges(focusedRow)}
        </div>
        <div class="spec-grid">
          <div class="spec-pill">IR: ${formatNumber(focusedRow.ir)}%</div>
          <div class="spec-pill">UV: ${formatNumber(focusedRow.uv)}%</div>
          <div class="spec-pill">VLT: ${formatNumber(focusedRow.vlt)}%</div>
          <div class="spec-pill">TSER: ${formatNumber(focusedRow.tser)}%</div>
        </div>
        <button class="ghost-button chart-compare-button" type="button" data-chart-compare="${focusedRow.code}">${compareActionLabel}</button>
      </article>
    ` : `<p class="chart-hint">${t("chart.tapHint")}</p>`}
  `;
}

function renderComparePanel() {
  const selected = state.films.filter((film) => state.compareCodes.has(film.code));

  if (!selected.length) {
    elements.comparePanel.className = "compare-panel empty";
    elements.comparePanel.textContent = t("compare.empty");
    return;
  }

  elements.comparePanel.className = "compare-panel";
  elements.comparePanel.innerHTML = selected.map((film) => `
    <article class="compare-card">
      <h3>${film.brand} ${film.code}</h3>
      <div class="compare-meta">${film.series || t("compare.noSeriesLabel")}</div>
      <div class="compare-tag-row">
        ${renderUseCaseBadge(getUseCaseForVlt(film.vlt))}
        ${renderTechBadges(film)}
      </div>
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
  const enriched = rows.map((row) => ({
    ...row,
    useCase: getUseCaseForVlt(row.vlt)
  }));

  const filtered = enriched
    .filter((row) => !filters.brand || row.brand === filters.brand)
    .filter((row) => !filters.signalProfile || matchesSignalProfile(row, filters.signalProfile))
    .filter((row) => !filters.search || `${row.brand} ${row.series} ${row.code} ${row.material || ""} ${row.signal || ""} ${row.notes || ""}`.toLowerCase().includes(filters.search))
    .filter((row) => filters.minVlt === null || row.vlt >= filters.minVlt)
    .filter((row) => filters.maxVlt === null || row.vlt <= filters.maxVlt)
    .filter((row) => filters.minTser === null || row.tser >= filters.minTser)
    .filter((row) => filters.minIr === null || (row.ir !== null && row.ir >= filters.minIr))
    .filter((row) => !filters.useCase || row.useCase.key === filters.useCase)
    .map((row) => scoreFilm(row, filters));

  const sorter = createSorter(filters.sort);
  return filtered.sort(sorter);
}

function renderVltPreview() {
  const vlt = state.previewVlt ?? 35;
  const localizedUseCase = getUseCaseCopy(getUseCaseForVlt(vlt).key);
  const darkness = Math.min(0.86, Math.max(0.18, (100 - vlt) / 100));

  elements.vltPreview.value = String(vlt);
  elements.vltPreviewValue.textContent = `${vlt}%`;
  elements.vltPreviewLabel.textContent = t("preview.current", {
    label: localizedUseCase.label,
    vlt
  });
  elements.vltPreviewHint.textContent = localizedUseCase.hint;
  elements.previewMeter.style.width = `${vlt}%`;
  elements.previewGlass.style.background = `linear-gradient(180deg, rgba(16, 22, 34, ${darkness}), rgba(4, 8, 16, ${Math.min(0.94, darkness + 0.18)}))`;
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
    return `<span class="match-badge match-excellent">${t("match.excellent")}</span>`;
  }
  if (score >= 72) {
    return `<span class="match-badge match-good">${t("match.good")}</span>`;
  }
  return `<span class="match-badge match-fair">${t("match.fair")}</span>`;
}

function renderUseCaseBadge(useCase) {
  return `<span class="use-case-badge use-case-${useCase.key}">${getUseCaseCopy(useCase.key).label}</span>`;
}

function getUseCaseForVlt(vlt) {
  if (vlt >= USE_CASES[0].minVlt) {
    return USE_CASES[0];
  }
  if (vlt >= USE_CASES[1].minVlt) {
    return USE_CASES[1];
  }
  if (vlt >= USE_CASES[2].minVlt) {
    return USE_CASES[2];
  }
  return USE_CASES[3];
}

function getUseCaseCopy(key) {
  return getMessageValue(`useCases.${key}`);
}

function getTechCopy(key) {
  return getMessageValue(`tech.${key}`);
}

function getFilmApiBaseUrl() {
  if (window.__CARFILMCHECK_API_BASE_URL__) {
    return String(window.__CARFILMCHECK_API_BASE_URL__).replace(/\/$/, "");
  }

  if (window.location.protocol === "file:") {
    return "http://localhost:3001";
  }

  return window.location.origin;
}

function normalizeApiFilm(row) {
  return {
    brand: String(row.brand || "").trim(),
    series: String(row.series || "").trim(),
    code: String(row.code || "").trim(),
    ir: parseOptionalNumber(row.ir),
    uv: parseOptionalNumber(row.uv),
    vlt: Number(row.vlt),
    tser: Number(row.tser),
    material: String(row.material || "").trim(),
    signal: String(row.signal || "").trim(),
    notes: String(row.notes || "").trim()
  };
}

function parseGoogleSheetResponse(response) {
  if (!response || response.status !== "ok" || !response.table || !Array.isArray(response.table.rows)) {
    throw new Error(t("errors.invalidSheetResponse"));
  }

  const columns = resolveSheetColumns(response.table);

  let lastBrand = "";
  let lastSeries = "";

  return response.table.rows
    .map((row) => row.c || [])
    .filter((cells) => getCellValue(cells[columns.code]))
    .map((cells) => {
      const rawBrand = getCellValue(cells[columns.brand]) || "";
      const rawSeries = getCellValue(cells[columns.series]) || "";
      const code = getCellValue(cells[columns.code]) || "";
      const ir = getCellValue(cells[columns.ir]);
      const uv = getCellValue(cells[columns.uv]);
      const vlt = getCellValue(cells[columns.vlt]);
      const tser = getCellValue(cells[columns.tser]);
      const material = getCellValue(cells[columns.material]) || "";
      const signal = getCellValue(cells[columns.signal]) || "";
      const notes = getCellValue(cells[columns.notes]) || "";

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
        tser: Number(tser),
        material: String(material).trim(),
        signal: String(signal).trim(),
        notes: String(notes).trim()
      };
    });
}

function resolveSheetColumns(table) {
  const fallback = {
    brand: 0,
    series: 1,
    code: 2,
    ir: 3,
    uv: 4,
    vlt: 5,
    tser: 6,
    material: 7,
    signal: 8,
    notes: 9
  };

  const aliases = {
    brand: ["brand", "ยี่ห้อ"],
    series: ["series", "ซีรีส์"],
    code: ["code", "model", "film code", "รหัส"],
    ir: ["ir"],
    uv: ["uv"],
    vlt: ["vlt"],
    tser: ["tser"],
    material: ["material", "tech", "ceramic", "film type", "วัสดุ", "ประเภท"],
    signal: ["signal", "gps", "easy pass", "easypass", "rfid"],
    notes: ["note", "remark", "tag", "feature", "หมายเหตุ"]
  };

  const labels = Array.isArray(table.cols)
    ? table.cols.map((column) => normalizeHeaderValue(column.label || column.id || ""))
    : [];

  return Object.keys(fallback).reduce((columns, key) => {
    const matchIndex = labels.findIndex((label) => aliases[key].some((alias) => label.includes(alias)));
    columns[key] = matchIndex >= 0 ? matchIndex : fallback[key];
    return columns;
  }, {});
}

function normalizeHeaderValue(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ก-๙]+/g, " ")
    .trim();
}

function getCellValue(cell) {
  return cell && Object.prototype.hasOwnProperty.call(cell, "v") ? cell.v : null;
}

function loadGoogleSheetTable() {
  return new Promise((resolve, reject) => {
    const callbackName = `filmSheetCallback_${Date.now()}`;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(t("errors.requestTimedOut")));
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
      reject(new Error(t("errors.scriptLoadFailed")));
    };

    script.src = SHEET_QUERY_URL.replace("__FILM_SHEET_CALLBACK__", callbackName);
    document.head.appendChild(script);
  });
}

function setDataStatus(mode, key, params = {}) {
  state.sheetStatus = { mode, key, params };
  applyDataStatus();
}

function applyDataStatus() {
  elements.dataStatus.className = `data-status ${state.sheetStatus.mode}`;
  elements.dataStatus.textContent = t(state.sheetStatus.key, state.sheetStatus.params);
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

function getFilmTechTagKeys(row) {
  const material = normalizeTechValue(row.material);
  const signal = normalizeTechValue(row.signal);
  const notes = normalizeTechValue(row.notes);
  const combined = `${material} ${signal} ${notes}`;
  const tags = [];
  const hasCeramic = /ceramic/.test(combined);
  const hasCeramic100 = hasCeramic && /(100|100%|full ceramic|ceramic 100)/.test(combined);
  const signalFriendly = /(signal friendly|gps friendly|easy pass friendly|easypass friendly|rfid friendly|rf friendly|gps ok|easy pass ok|rfid ok|compatible|pass through|pass-through|non metal|non-metal|metal free|metal-free)/.test(combined);
  const metalized = !/(non metal|non-metal|metal free|metal-free)/.test(combined)
    && /(metalized|metallized|metal layer|sputter|hybrid metal)/.test(combined);

  if (hasCeramic100) {
    tags.push("ceramic100");
  } else if (hasCeramic) {
    tags.push("ceramic");
  }

  if (signalFriendly) {
    tags.push("signalFriendly");
  }

  if (metalized) {
    tags.push("metalized");
  }

  return [...new Set(tags)];
}

function normalizeTechValue(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function renderTechBadges(row, { compact = false } = {}) {
  const tags = getFilmTechTagKeys(row);
  if (!tags.length) {
    return compact ? `<span class="cell-muted">${t("tech.none")}</span>` : `<span class="tech-empty">${t("tech.none")}</span>`;
  }

  return tags.map((tag) => `<span class="tech-badge tech-${tag}">${getTechCopy(tag)}</span>`).join("");
}

function matchesSignalProfile(row, profile) {
  const tags = getFilmTechTagKeys(row);

  switch (profile) {
    case "signal-friendly":
      return tags.includes("signalFriendly");
    case "ceramic":
      return tags.includes("ceramic") || tags.includes("ceramic100");
    case "ceramic100":
      return tags.includes("ceramic100");
    case "metalized":
      return tags.includes("metalized");
    default:
      return true;
  }
}

function cacheFilms(films, savedAt) {
  window.localStorage.setItem(SHEET_CACHE_STORAGE_KEY, JSON.stringify({
    savedAt: savedAt.toISOString(),
    films
  }));
}

function readCachedFilms() {
  const raw = window.localStorage.getItem(SHEET_CACHE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.savedAt || !Array.isArray(parsed.films)) {
      return null;
    }

    const savedAtMs = new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > SHEET_CACHE_TTL_MS) {
      window.localStorage.removeItem(SHEET_CACHE_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(SHEET_CACHE_STORAGE_KEY);
    return null;
  }
}

function formatTimestamp(date) {
  return date.toLocaleString(getLocaleTag(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getInitialLocale() {
  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return MESSAGES[savedLocale] ? savedLocale : "th";
}

function getLocaleTag() {
  return state.locale === "th" ? "th-TH" : "en-US";
}

function stringifyInputValue(value) {
  return value === null ? "" : String(value);
}

function t(key, params = {}) {
  const template = getMessageValue(key);
  if (typeof template !== "string") {
    return key;
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => (params[token] ?? `{${token}}`));
}

function getMessageValue(path) {
  return path.split(".").reduce((value, segment) => (value ? value[segment] : undefined), MESSAGES[state.locale]);
}

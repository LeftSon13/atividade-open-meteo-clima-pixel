(() => {
  "use strict";

  const elements = {};
  const WMO_CONDITIONS = {
    0: { label: "Céu limpo", category: "clear", intensity: "light" },
    1: { label: "Predominantemente limpo", category: "clear", intensity: "light" },
    2: { label: "Parcialmente nublado", category: "partly-cloudy", intensity: "moderate" },
    3: { label: "Nublado", category: "cloudy", intensity: "heavy" },
    45: { label: "Nevoeiro", category: "fog", intensity: "moderate" },
    48: { label: "Nevoeiro com geada", category: "fog", intensity: "heavy" },
    51: { label: "Garoa fraca", category: "drizzle", intensity: "light" },
    52: { label: "Garoa fraca", category: "drizzle", intensity: "light" },
    53: { label: "Garoa moderada", category: "drizzle", intensity: "moderate" },
    54: { label: "Garoa moderada", category: "drizzle", intensity: "moderate" },
    55: { label: "Garoa intensa", category: "drizzle", intensity: "heavy" },
    56: { label: "Garoa congelante", category: "drizzle", intensity: "light" },
    57: { label: "Garoa congelante intensa", category: "drizzle", intensity: "heavy" },
    61: { label: "Chuva fraca", category: "rain", intensity: "light" },
    62: { label: "Chuva fraca", category: "rain", intensity: "light" },
    63: { label: "Chuva moderada", category: "rain", intensity: "moderate" },
    64: { label: "Chuva moderada", category: "rain", intensity: "moderate" },
    65: { label: "Chuva forte", category: "rain", intensity: "heavy" },
    66: { label: "Chuva congelante", category: "rain", intensity: "light" },
    67: { label: "Chuva congelante intensa", category: "rain", intensity: "heavy" },
    71: { label: "Neve fraca", category: "snow", intensity: "light" },
    73: { label: "Neve moderada", category: "snow", intensity: "moderate" },
    75: { label: "Neve forte", category: "snow", intensity: "heavy" },
    77: { label: "Grãos de neve", category: "snow", intensity: "light" },
    80: { label: "Pancadas de chuva fracas", category: "rain", intensity: "light" },
    81: { label: "Pancadas de chuva moderadas", category: "rain", intensity: "moderate" },
    82: { label: "Pancadas de chuva fortes", category: "rain", intensity: "heavy" },
    85: { label: "Pancadas de neve", category: "snow", intensity: "light" },
    86: { label: "Pancadas intensas de neve", category: "snow", intensity: "heavy" },
    95: { label: "Trovoada", category: "storm", intensity: "moderate" },
    96: { label: "Trovoada com granizo", category: "storm", intensity: "heavy" },
    99: { label: "Trovoada forte com granizo", category: "storm", intensity: "heavy" },
  };

  let lastLocation = null;
  let searchSequence = 0;
  let weatherSequence = 0;
  let searchDebounceTimer = null;
  let activeSearchController = null;
  let activeSearchQuery = null;
  let renderedSearchQuery = null;
  let activeOptionIndex = -1;
  let searchOptionButtons = [];
  let submitRequestedQuery = null;

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function createSvg(className, viewBox = "0 0 48 48") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("shape-rendering", "crispEdges");
    return svg;
  }

  function pixel(svg, x, y, width, height, fill, className) {
    const rect = document.createElementNS(SVG_NS, "rect");
    for (const [name, value] of Object.entries({ x, y, width, height, fill })) {
      rect.setAttribute(name, String(value));
    }
    if (className) rect.setAttribute("class", className);
    svg.append(rect);
    return rect;
  }

  function pixelGroup(svg, className) {
    const group = document.createElementNS(SVG_NS, "g");
    if (className) group.setAttribute("class", className);
    svg.append(group);
    return group;
  }

  function drawPixelCloud(svg, tone = "day") {
    const palettes = {
      day: { outline: "#39385f", base: "#789bd1", light: "#b6cef3", shade: "#6079b5", deep: "#526ba3", shine: "#eef5ff" },
      storm: { outline: "#30334f", base: "#65759d", light: "#8da7d0", shade: "#4a5981", deep: "#3d4a70", shine: "#c4d9f1" },
      fog: { outline: "#4e5976", base: "#aabbd3", light: "#e4edf2", shade: "#879ebc", deep: "#738aa7", shine: "#fffefa" },
    };
    const colors = palettes[tone] || palettes.day;
    [
      [8, 21, 32, 12], [12, 16, 25, 18], [19, 11, 17, 23], [5, 24, 5, 8],
    ].forEach(([x, y, width, height]) => pixel(svg, x, y, width, height, colors.outline));
    [
      [10, 23, 28, 8], [14, 18, 21, 11], [21, 13, 13, 11], [7, 26, 4, 5],
    ].forEach(([x, y, width, height]) => pixel(svg, x, y, width, height, colors.base));
    pixel(svg, 21, 12, 9, 2, colors.deep);
    pixel(svg, 21, 14, 9, 3, colors.light);
    pixel(svg, 14, 17, 9, 2, colors.deep);
    pixel(svg, 14, 19, 9, 3, colors.light);
    pixel(svg, 10, 23, 6, 2, colors.shine);
    pixel(svg, 12, 28, 24, 3, colors.shade);
    pixel(svg, 17, 30, 13, 2, colors.deep);
    pixel(svg, 34, 24, 3, 3, colors.shade);
    pixel(svg, 11, 25, 3, 2, colors.shine);
  }

  function createWeatherIcon(category, { intensity = "moderate", isDay = true, className = "" } = {}) {
    const svg = createSvg(`pixel-icon pixel-weather-icon ${className}`.trim());
    svg.dataset.weatherIcon = category;
    svg.dataset.intensity = intensity;
    svg.dataset.daytime = isDay ? "day" : "night";

    const drawSun = (x = 14, y = 9) => {
      [
        [x + 9, y, 6, 4], [x + 9, y + 24, 6, 4],
        [x, y + 9, 5, 6], [x + 24, y + 9, 5, 6],
        [x + 3, y + 3, 5, 4], [x + 21, y + 3, 5, 4],
        [x + 3, y + 21, 5, 4], [x + 21, y + 21, 5, 4],
      ].forEach(([px, py, width, height]) => {
        pixel(svg, px + 1, py + 1, width, height, "#b94a2d");
        pixel(svg, px, py, width, height, "#f17c2e");
      });
      pixel(svg, x + 5, y + 4, 20, 21, "#c94d2e");
      pixel(svg, x + 7, y + 5, 17, 19, "#ffc247");
      pixel(svg, x + 9, y + 7, 11, 11, "#ffdf67");
      pixel(svg, x + 8, y + 20, 12, 3, "#ed9c36");
      pixel(svg, x + 19, y + 15, 4, 5, "#f17c2e");
      pixel(svg, x + 11, y + 10, 3, 2, "#fffef1");
      pixel(svg, x + 3, y + 11, 2, 2, "#fff18c");
      pixel(svg, x + 16, y + 20, 2, 2, "#fff18c");
    };

    const drawMoon = () => {
      const moonRows = [
        [23, 5, 10], [18, 10, 16], [14, 15, 19], [13, 20, 17], [15, 25, 14], [19, 30, 9],
      ];
      moonRows.forEach(([x, y, width]) => pixel(svg, x + 2, y + 2, width, 5, "#bb6237"));
      moonRows.forEach(([x, y, width]) => pixel(svg, x, y, width, 5, "#ffc94d"));
      pixel(svg, 21, 10, 7, 4, "#fff18c");
      pixel(svg, 16, 16, 4, 3, "#eda63d");
      pixel(svg, 23, 26, 4, 3, "#eda63d");
      pixel(svg, 18, 12, 3, 2, "#fffef1");
      [[7, 10], [36, 15], [9, 34], [35, 34]].forEach(([x, y], index) => {
        const star = pixelGroup(svg, `pixel-weather-star star-${index + 1}`);
        pixel(star, x + 2, y, 3, 7, index === 1 ? "#ffc94d" : "#8bcaf2");
        pixel(star, x, y + 2, 7, 3, index === 1 ? "#ffc94d" : "#8bcaf2");
        pixel(star, x + 2, y + 2, 3, 3, "#fffefa");
      });
    };

    const drawRain = () => {
      const count = intensity === "light" ? 2 : intensity === "heavy" ? 4 : 3;
      const drops = [[12, 34], [23, 35], [34, 34], [18, 40]];
      drops.slice(0, count).forEach(([x, y], index) => {
        const delayClass = `drop-${index + 1}`;
        const drop = pixelGroup(svg, `pixel-weather-drop ${delayClass}`);
        if (category === "drizzle") {
          pixel(drop, x + 1, y + 1, 2, 2, "#dff9ff");
          pixel(drop, x, y + 3, 3, 2, "#70cbed");
          pixel(drop, x - 1, y + 5, 2, 2, "#3f92ce");
          pixel(drop, x, y + 3, 1, 2, "#c7f0ff");
        } else {
          pixel(drop, x + 2, y, 2, 2, "#dff9ff");
          pixel(drop, x + 1, y + 2, 3, 2, "#70cbed");
          pixel(drop, x, y + 4, 3, 3, index % 2 ? "#3f92ce" : "#3478b8");
          pixel(drop, x - 1, y + 6, 2, 2, "#275b98");
          pixel(drop, x, y + 4, 1, 2, "#c7f0ff");
        }
      });
    };

    if (category === "clear") {
      if (isDay) drawSun(12, 10);
      else drawMoon();
    } else if (category === "partly-cloudy") {
      if (isDay) drawSun(8, 7);
      else drawMoon();
      drawPixelCloud(svg, "day");
    } else if (category === "cloudy") {
      drawPixelCloud(svg, "day");
      pixel(svg, 16, 22, 4, 3, "#fff8de");
    } else if (category === "fog") {
      drawPixelCloud(svg, "fog");
      [[4, 34, 37], [9, 39, 33], [2, 44, 27]].forEach(([x, y, width], index) => {
        const wisp = pixelGroup(svg, `pixel-fog-line fog-line-${index + 1}`);
        pixel(wisp, x, y, width, 3, index === 1 ? "#75a6ab" : "#9bc5c3");
        pixel(wisp, x + 4, y - 1, Math.max(5, width - 13), 1, "#eaf5e7");
        pixel(wisp, x + width - 7, y + 3, 4, 1, "#6d9ba5");
      });
    } else if (category === "snow") {
      drawPixelCloud(svg, "day");
      [[9, 34], [23, 36], [35, 33]].slice(0, intensity === "light" ? 2 : 3).forEach(([x, y], index) => {
        const snowflake = pixelGroup(svg, `pixel-snowflake snow-${index + 1}`);
        pixel(snowflake, x + 4, y, 3, 12, "#354f8b");
        pixel(snowflake, x, y + 4, 11, 3, "#354f8b");
        pixel(snowflake, x + 2, y + 2, 3, 3, "#354f8b");
        pixel(snowflake, x + 6, y + 7, 3, 3, "#354f8b");
        pixel(snowflake, x + 5, y + 1, 1, 8, "#dff8ff");
        pixel(snowflake, x + 1, y + 5, 8, 1, "#dff8ff");
        pixel(snowflake, x + 2, y + 2, 2, 2, "#dff8ff");
      });
    } else {
      drawPixelCloud(svg, category === "storm" ? "storm" : "day");
      if (category === "storm") {
        const bolt = pixelGroup(svg, "pixel-weather-lightning");
        pixel(bolt, 19, 29, 14, 5, "#493c65");
        pixel(bolt, 17, 33, 11, 5, "#493c65");
        pixel(bolt, 20, 37, 9, 5, "#493c65");
        pixel(bolt, 16, 41, 8, 5, "#493c65");
        pixel(bolt, 22, 29, 9, 4, "#ffba3d");
        pixel(bolt, 20, 33, 7, 4, "#ffba3d");
        pixel(bolt, 22, 37, 6, 4, "#ffba3d");
        pixel(bolt, 18, 41, 5, 4, "#ffba3d");
        pixel(bolt, 23, 30, 2, 2, "#fff18c");
        if (intensity === "heavy") drawRain();
      } else {
        drawRain();
      }
    }
    return svg;
  }

  function createUtilityIcon(kind, className = "") {
    const svg = createSvg(`pixel-icon pixel-utility-icon pixel-utility-${kind} ${className}`.trim(), "0 0 32 32");
    const add = (x, y, width, height, fill, cssClass) => pixel(svg, x, y, width, height, fill, cssClass);
    const teal = "#1b5965";
    const pale = "#cfe8dc";
    const yellow = "#f5d66b";
    const blue = "#55a9c6";

    if (kind === "location") {
      [[10, 3, 12, 4], [6, 7, 20, 4], [4, 11, 24, 9], [7, 20, 18, 4], [10, 24, 12, 3], [13, 27, 6, 3]].forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#b77a45"));
      [[10, 3, 12, 4], [6, 7, 20, 4], [4, 11, 24, 9], [7, 20, 18, 4], [10, 24, 12, 3], [13, 27, 6, 3]].forEach((shape) => add(...shape, teal));
      [[10, 9, 12, 4], [8, 13, 16, 6], [11, 19, 10, 3], [14, 22, 4, 3]].forEach((shape) => add(...shape, yellow));
      add(13, 12, 6, 6, teal); add(15, 14, 2, 2, pale); add(10, 10, 3, 2, "#fff1a8");
    } else if (kind === "humidity") {
      const dropOutline = [[13, 2, 6, 5], [10, 7, 12, 5], [7, 12, 18, 5], [5, 17, 22, 7], [8, 24, 16, 5], [12, 29, 8, 2]];
      dropOutline.forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#182f59"));
      dropOutline.forEach((shape) => add(...shape, "#293f73"));
      [[14, 4, 4, 4], [11, 9, 10, 3], [8, 14, 16, 5], [7, 18, 18, 5], [10, 23, 12, 4], [14, 27, 5, 2]].forEach((shape, index) => {
        add(...shape, index < 2 ? "#8be4f2" : index < 4 ? "#48bee3" : "#278ac7");
      });
      add(10, 14, 3, 6, "#c8f7ff"); add(13, 11, 3, 2, "#f3feff");
      add(22, 18, 2, 3, "#217db7"); add(15, 27, 5, 1, "#9deeff");
    } else if (kind === "thermometer") {
      add(12, 3, 9, 20, "#182f59"); add(9, 20, 15, 10, "#182f59");
      add(13, 4, 7, 18, "#31477b"); add(11, 22, 11, 7, "#31477b");
      add(15, 6, 3, 14, "#dff7f3"); add(15, 16, 3, 7, "#f26358");
      add(13, 23, 7, 5, "#f26358"); add(14, 24, 4, 3, "#ff9463");
      add(14, 5, 2, 5, "#ffffff"); add(20, 7, 4, 2, "#ffda61");
      add(20, 12, 3, 2, "#ffda61"); add(20, 17, 4, 2, "#ffda61");
      add(12, 27, 3, 1, "#293f73"); add(17, 25, 2, 2, "#ffd87a");
    } else if (kind === "wind") {
      add(5, 8, 21, 5, "#182f59"); add(9, 15, 19, 5, "#182f59"); add(4, 22, 18, 5, "#182f59");
      add(5, 7, 17, 3, "#5ccde5"); add(6, 8, 14, 1, "#e3ffff"); add(22, 7, 5, 5, "#ffc84d");
      add(9, 14, 16, 3, "#a6e9ed"); add(10, 15, 13, 1, "#ffffff"); add(25, 14, 4, 5, "#f18a4d");
      add(4, 21, 13, 3, "#5ccde5"); add(5, 22, 10, 1, "#e3ffff"); add(18, 21, 5, 5, "#ffc84d");
      add(2, 14, 4, 3, "#8ed8f2"); add(1, 22, 3, 2, "#fff1a8");
    } else if (kind === "search") {
      // A lupa ganha aro em camadas, brilho de vidro e cabo com ponteira dourada.
      [[7, 3, 13, 4], [4, 7, 20, 4], [3, 11, 21, 8], [7, 19, 14, 4]].forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#102f43"));
      [[7, 3, 13, 4], [4, 7, 20, 4], [3, 11, 21, 8], [7, 19, 14, 4]].forEach((shape) => add(...shape, "#213f59"));
      [[8, 5, 11, 2], [6, 8, 16, 3], [5, 11, 17, 6], [8, 17, 12, 3]].forEach((shape) => add(...shape, "#45bfd2"));
      [[9, 7, 10, 2], [7, 10, 14, 5], [9, 15, 10, 2]].forEach((shape) => add(...shape, "#a5eced"));
      add(10, 8, 4, 2, "#fff5b0"); add(8, 11, 2, 3, "#e9ffff");
      add(15, 12, 3, 2, "#6ed4dd"); add(13, 17, 4, 2, "#5ba5c2");
      // Reflexo em forma de estrela para a lente parecer um pequeno visor.
      add(16, 7, 2, 2, "#fff5b0"); add(15, 8, 4, 1, "#fff5b0");
      [[19, 19, 4, 4], [22, 22, 7, 6], [25, 27, 5, 3]].forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#102f43"));
      add(19, 19, 4, 4, "#213f59"); add(22, 22, 7, 6, "#337f91"); add(25, 27, 5, 3, "#213f59");
      add(23, 23, 4, 2, "#62c8d0"); add(26, 27, 3, 2, yellow); add(27, 27, 1, 1, "#fff5b0");
    } else if (kind === "updated") {
      // Pequeno relógio de estação: aro verde, mostrador claro e ponteiros dourados.
      [[12, 2, 8, 3], [7, 5, 18, 3], [4, 9, 24, 13], [7, 22, 18, 3], [12, 25, 8, 3]].forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#103d47"));
      [[12, 2, 8, 3], [7, 5, 18, 3], [4, 9, 24, 13], [7, 22, 18, 3], [12, 25, 8, 3]].forEach((shape) => add(...shape, "#a7d783"));
      [[13, 5, 6, 2], [9, 7, 14, 2], [7, 10, 18, 11], [9, 21, 14, 2], [13, 23, 6, 1]].forEach((shape) => add(...shape, "#e8f0bd"));
      add(15, 10, 2, 8, teal); add(15, 16, 7, 2, teal); add(16, 11, 1, 6, yellow); add(17, 16, 5, 1, yellow);
      add(10, 11, 2, 2, "#fff5b0"); add(22, 9, 3, 3, "#fff5b0");
      add(25, 5, 3, 3, yellow); add(26, 4, 1, 5, yellow); add(24, 6, 5, 1, yellow);
    } else if (kind === "scan") {
      add(5, 5, 8, 3, teal); add(5, 5, 3, 8, teal); add(19, 5, 8, 3, teal); add(24, 5, 3, 8, teal);
      add(5, 24, 8, 3, teal); add(5, 19, 3, 8, teal); add(19, 24, 8, 3, teal); add(24, 19, 3, 8, teal);
      add(14, 13, 4, 7, yellow); add(12, 15, 8, 3, yellow); add(15, 14, 2, 2, "#fffefa");
      add(13, 9, 3, 2, blue); add(18, 21, 3, 2, blue); add(9, 14, 2, 3, blue); add(22, 14, 2, 3, blue);
    } else if (kind === "alert") {
      [[16, 3, 6, 3], [13, 6, 12, 3], [10, 9, 18, 3], [7, 12, 24, 4], [5, 16, 28, 5], [8, 21, 22, 4], [12, 25, 14, 3], [15, 28, 8, 2]].forEach((shape) => add(shape[0] + 1, shape[1] + 1, shape[2], shape[3], "#c17b4e"));
      [[16, 3, 6, 3], [13, 6, 12, 3], [10, 9, 18, 3], [7, 12, 24, 4], [5, 16, 28, 5], [8, 21, 22, 4], [12, 25, 14, 3], [15, 28, 8, 2]].forEach((shape) => add(...shape, yellow));
      add(14, 10, 4, 10, teal); add(13, 22, 6, 4, teal); add(12, 15, 2, 3, "#fff1a8");
    } else if (kind === "data") {
      add(5, 5, 22, 22, teal); add(7, 7, 18, 18, "#2a7180"); add(8, 8, 16, 16, pale);
      add(11, 11, 10, 4, yellow); add(11, 18, 3, 3, blue); add(16, 18, 5, 3, blue);
      add(11, 23, 3, 1, teal); add(16, 23, 5, 1, teal); add(20, 12, 2, 2, "#fff1a8");
    } else if (kind === "offline") {
      const wifiRows = [[13, 5, 6, 3], [9, 8, 14, 3], [5, 11, 22, 3], [9, 15, 5, 3], [18, 15, 5, 3], [13, 19, 6, 3]];
      wifiRows.forEach(([x, y, width, height]) => add(x + 1, y + 1, width, height, "#123f50"));
      wifiRows.forEach(([x, y, width, height]) => add(x, y, width, height, teal));
      add(14, 24, 4, 4, yellow); add(15, 24, 2, 2, "#fff1a8");
      [[7, 6], [10, 9], [13, 12], [16, 15], [19, 18], [22, 21]].forEach(([x, y]) => add(x, y, 3, 3, "#e77e55"));
      [[8, 7], [11, 10], [14, 13], [17, 16], [20, 19]].forEach(([x, y]) => add(x, y, 1, 1, "#ffd095"));
    }
    return svg;
  }

  function conditionFor(code, isDay = true) {
    const numericCode = finiteNumber(code);
    const condition = numericCode === null ? null : WMO_CONDITIONS[numericCode];
    if (!condition) {
      return {
        label: "Condição do tempo variável",
        category: "cloudy",
        intensity: "moderate",
        isDay,
      };
    }
    return { ...condition, isDay };
  }

  function setSearchStatus(message, isError = false) {
    elements.searchStatus.textContent = message;
    elements.searchStatus.setAttribute("data-state", isError ? "error" : "info");
  }

  function setWeatherFeedback({ icon, title, detail, retry = false }) {
    elements.feedbackIcon.replaceChildren(createUtilityIcon(icon));
    elements.feedbackTitle.textContent = title;
    elements.feedbackDetail.textContent = detail;
    elements.retryButton.hidden = !retry;
    elements.weatherFeedback.hidden = false;
    elements.weatherContent.hidden = true;
  }

  function showWeatherContent() {
    elements.weatherFeedback.hidden = true;
    elements.weatherContent.hidden = false;
  }

  function clearSearchResults() {
    elements.searchResults.replaceChildren();
    elements.searchResults.hidden = true;
    renderedSearchQuery = null;
    activeOptionIndex = -1;
    searchOptionButtons = [];
    elements.cityInput.setAttribute("aria-expanded", "false");
    elements.cityInput.removeAttribute("aria-activedescendant");
  }

  function cancelPendingCitySearch() {
    if (searchDebounceTimer !== null) {
      window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    if (activeSearchController) {
      activeSearchController.abort();
      activeSearchController = null;
      activeSearchQuery = null;
    }
    searchSequence += 1;
  }

  function setActiveOption(index) {
    if (searchOptionButtons.length === 0) return;
    activeOptionIndex = Math.max(0, Math.min(index, searchOptionButtons.length - 1));
    searchOptionButtons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-selected", buttonIndex === activeOptionIndex ? "true" : "false");
    });
    const activeButton = searchOptionButtons[activeOptionIndex];
    elements.cityInput.setAttribute("aria-activedescendant", activeButton.id);
    activeButton.scrollIntoView?.({ block: "nearest" });
  }

  function closeCitySuggestions() {
    cancelPendingCitySearch();
    submitRequestedQuery = null;
    clearSearchResults();
  }

  function choosePlace(place) {
    submitRequestedQuery = null;
    cancelPendingCitySearch();
    elements.cityInput.value = place.name;
    clearSearchResults();
    setSearchStatus(`Carregando o clima de ${place.name}…`);
    loadWeather(place);
  }

  function readJson(response) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.kind = "http";
      error.status = response.status;
      throw error;
    }
    return response.json().catch(() => {
      const error = new Error("Resposta JSON inválida");
      error.kind = "json";
      throw error;
    });
  }

  function locationDescription(place) {
    const pieces = [place.admin1, place.country].filter((part) => typeof part === "string" && part.trim());
    return pieces.join(", ");
  }

  function normalizeLocation(place) {
    if (!place || typeof place !== "object") return null;
    const latitude = finiteNumber(place.latitude);
    const longitude = finiteNumber(place.longitude);
    if (typeof place.name !== "string" || latitude === null || longitude === null) return null;
    return {
      name: place.name,
      region: locationDescription(place),
      latitude,
      longitude,
    };
  }

  async function searchCities(query) {
    if (searchDebounceTimer !== null) {
      window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    const sequence = ++searchSequence;
    const controller = new AbortController();
    activeSearchController = controller;
    activeSearchQuery = query;
    clearSearchResults();
    setSearchStatus("Buscando cidades…");

    const params = new URLSearchParams({ name: query, count: "10", language: "pt", format: "json" });
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, { signal: controller.signal });
      const data = await readJson(response);
      if (sequence !== searchSequence) return;

      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        setSearchStatus(`Nenhuma cidade encontrada para “${query}”.`, true);
        return;
      }

      const places = data.results.map(normalizeLocation).filter(Boolean);
      if (places.length === 0) {
        setSearchStatus("A busca retornou locais sem coordenadas válidas. Tente outro nome.", true);
        return;
      }

      if (submitRequestedQuery === query) {
        submitRequestedQuery = null;
        choosePlace(places[0]);
        return;
      }

      renderSearchResults(places, query);
      setSearchStatus(`${places.length} ${places.length === 1 ? "local encontrado" : "locais encontrados"}. Escolha uma cidade.`);
    } catch (error) {
      if (sequence !== searchSequence) return;
      const message = error.kind === "json"
        ? "A busca retornou uma resposta inválida. Tente novamente."
        : error.kind === "http"
          ? `Não foi possível buscar agora (erro ${error.status}). Tente novamente.`
          : "Não foi possível conectar à busca de cidades. Confira sua conexão e tente novamente.";
      setSearchStatus(message, true);
    } finally {
      if (sequence === searchSequence) {
        activeSearchController = null;
        activeSearchQuery = null;
      }
    }
  }

  function renderSearchResults(places, query) {
    clearSearchResults();
    renderedSearchQuery = query;
    searchOptionButtons = [];
    places.forEach((place, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.id = `city-option-${searchSequence}-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.tabIndex = -1;

      const name = document.createElement("span");
      name.className = "search-result-name";
      name.textContent = place.name;
      button.append(name);

      if (place.region) {
        const region = document.createElement("span");
        region.className = "search-result-region";
        region.textContent = place.region;
        button.append(region);
      }

      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => choosePlace(place));
      elements.searchResults.append(button);
      searchOptionButtons.push(button);
    });
    elements.searchResults.setAttribute("role", "listbox");
    elements.searchResults.hidden = false;
    elements.cityInput.setAttribute("aria-expanded", "true");
  }

  function formatTemperature(value) {
    const number = finiteNumber(value);
    return number === null ? "— °C" : `${Math.round(number)} °C`;
  }

  function formatTemperatureValue(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : String(Math.round(number));
  }

  function formatSpeed(value) {
    const number = finiteNumber(value);
    return number === null ? "— km/h" : `${Math.round(number)} km/h`;
  }

  function formatPercent(value) {
    const number = finiteNumber(value);
    return number === null ? "—%" : `${Math.round(number)}%`;
  }

  function formatUpdatedTime(value) {
    if (typeof value !== "string") return "Atualização recente";
    const match = value.match(/T(\d{2}:\d{2})/);
    return match ? `Atualizado às ${match[1]}` : "Atualização recente";
  }

  function formatForecastDate(value, index) {
    if (typeof value !== "string") return index === 0 ? "Hoje" : `Dia ${index + 1}`;
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    const datePart = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
    if (index === 0) return `Hoje · ${datePart}`;
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date);
    return `${weekday} · ${datePart}`;
  }

  function windIntensity(speed) {
    const kmh = finiteNumber(speed);
    if (kmh === null || kmh < 10) return "calm";
    return kmh < 30 ? "breezy" : "windy";
  }

  function updateCityArt(condition, isDay, cityName, windSpeed) {
    elements.cityArt.dataset.weather = condition.category;
    elements.cityArt.dataset.time = isDay ? "day" : "night";
    elements.cityArt.dataset.intensity = condition.intensity;
    elements.cityArt.dataset.wind = windIntensity(windSpeed);
    elements.cityArt.setAttribute("aria-label", `Ilustração pixel art de ${cityName}: ${condition.label.toLowerCase()}, período ${isDay ? "diurno" : "noturno"}`);
  }

  function hasFiveFiniteValues(values) {
    return Array.isArray(values) && values.length >= 5 && values.slice(0, 5).every(Number.isFinite);
  }

  function hasFiveDates(values) {
    return Array.isArray(values) && values.length >= 5 && values.slice(0, 5).every((value) => typeof value === "string" && value.trim());
  }

  function renderForecast(daily) {
    elements.forecastCards.replaceChildren();
    for (let index = 0; index < 5; index += 1) {
      const dayCondition = conditionFor(daily.weather_code?.[index], true);
      const card = document.createElement("article");
      card.className = "forecast-card";

      const date = document.createElement("h3");
      date.className = "forecast-date";
      date.textContent = formatForecastDate(daily.time?.[index], index);
      card.append(date);

      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "forecast-icon";
      icon.setAttribute("aria-label", `Animar ícone da previsão: ${dayCondition.label}`);
      icon.title = "Clique ou toque para ver a animação do clima";
      icon.append(createWeatherIcon(dayCondition.category, { intensity: dayCondition.intensity, isDay: true }));
      icon.addEventListener("click", () => {
        icon.classList.remove("is-animating");
        void icon.offsetWidth;
        icon.classList.add("is-animating");
        window.setTimeout(() => icon.classList.remove("is-animating"), 700);
      });
      card.append(icon);

      const description = document.createElement("span");
      description.className = "forecast-description";
      description.textContent = dayCondition.label;
      card.append(description);

      const temperatures = document.createElement("p");
      temperatures.className = "forecast-temperatures";
      temperatures.textContent = `${formatTemperature(daily.temperature_2m_min?.[index])} / ${formatTemperature(daily.temperature_2m_max?.[index])}`;
      card.append(temperatures);

      const probability = finiteNumber(daily.precipitation_probability_max?.[index]);
      if (probability !== null) {
        const precipitation = document.createElement("p");
        precipitation.className = "forecast-precipitation";
        precipitation.append(createWeatherIcon("rain", { intensity: "light", className: "precipitation-icon" }), document.createTextNode(`${Math.round(probability)}% de chuva`));
        card.append(precipitation);
      }
      elements.forecastCards.append(card);
    }
  }

  function renderWeather(place, data) {
    const current = data?.current;
    const daily = data?.daily;
    const currentFieldsValid = current
      && Number.isFinite(current.temperature_2m)
      && Number.isFinite(current.relative_humidity_2m)
      && Number.isFinite(current.weather_code);
    const forecastFieldsValid = daily
      && hasFiveDates(daily.time)
      && hasFiveFiniteValues(daily.weather_code)
      && hasFiveFiniteValues(daily.temperature_2m_min)
      && hasFiveFiniteValues(daily.temperature_2m_max);
    if (!currentFieldsValid || !forecastFieldsValid) {
      const error = new Error("Dados incompletos");
      error.kind = "missing";
      throw error;
    }

    const isDay = finiteNumber(current.is_day) !== 0;
    const condition = conditionFor(current.weather_code, isDay);
    elements.cityName.textContent = place.name;
    elements.cityRegion.textContent = place.region || "";
    elements.currentIcon.replaceChildren(createWeatherIcon(condition.category, { intensity: condition.intensity, isDay }));
    elements.currentTemperature.textContent = formatTemperatureValue(current.temperature_2m);
    elements.currentDescription.textContent = condition.label;
    elements.updatedTime.textContent = formatUpdatedTime(current.time);
    elements.currentHumidity.textContent = formatPercent(current.relative_humidity_2m);
    elements.currentFeelsLike.textContent = formatTemperature(current.apparent_temperature);
    elements.currentWind.textContent = formatSpeed(current.wind_speed_10m);
    updateCityArt(condition, isDay, place.name, current.wind_speed_10m);
    renderForecast(data.daily);
    showWeatherContent();
  }

  async function loadWeather(place) {
    const sequence = ++weatherSequence;
    cancelPendingCitySearch();
    lastLocation = place;
    clearSearchResults();
    setWeatherFeedback({
      icon: "scan",
      title: "Consultando o céu…",
      detail: `Buscando as condições de ${place.name}.`,
    });
    elements.searchStatus.textContent = "";

    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "5",
    });

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      const data = await readJson(response);
      if (sequence !== weatherSequence) return;
      renderWeather(place, data);
    } catch (error) {
      if (sequence !== weatherSequence) return;
      if (error.kind === "http") {
        setWeatherFeedback({
          icon: "alert",
          title: "Não foi possível carregar o clima",
          detail: `O serviço respondeu com erro ${error.status}. Tente novamente em instantes.`,
          retry: true,
        });
      } else if (error.kind === "json") {
        setWeatherFeedback({
          icon: "alert",
          title: "Resposta inválida",
          detail: "O serviço enviou dados que não conseguimos ler. Tente novamente.",
          retry: true,
        });
      } else if (error.kind === "missing") {
        setWeatherFeedback({
          icon: "data",
          title: "Dados do clima incompletos",
          detail: "Não recebemos os dados necessários para montar a previsão. Tente novamente.",
          retry: true,
        });
      } else {
        setWeatherFeedback({
          icon: "offline",
          title: "Sem conexão com o serviço",
          detail: "Confira sua conexão com a internet e tente carregar o clima novamente.",
          retry: true,
        });
      }
      elements.searchStatus.textContent = "";
    }
  }

  function initialize() {
    const ids = {
      searchForm: "search-form",
      cityInput: "city-input",
      searchStatus: "search-status",
      searchResults: "search-results",
      weatherFeedback: "weather-feedback",
      feedbackIcon: "feedback-icon",
      feedbackTitle: "feedback-title",
      feedbackDetail: "feedback-detail",
      retryButton: "retry-button",
      weatherContent: "weather-content",
      cityName: "city-name",
      cityRegion: "city-region",
      currentIcon: "current-icon",
      currentTemperature: "current-temperature",
      currentDescription: "current-description",
      updatedTime: "updated-time",
      currentHumidity: "current-humidity",
      currentFeelsLike: "current-feels-like",
      currentWind: "current-wind",
      cityArt: "city-art",
      forecastCards: "forecast-cards",
    };

    for (const [key, id] of Object.entries(ids)) {
      elements[key] = document.getElementById(id);
    }
    if (Object.values(elements).some((element) => !element)) return;

    elements.feedbackIcon.replaceChildren(createUtilityIcon("location"));
    document.querySelector(".location-pin")?.replaceChildren(createUtilityIcon("location"));
    document.querySelector(".status-dot")?.replaceChildren(createUtilityIcon("updated"));
    document.querySelectorAll(".stat-icon[data-icon]").forEach((icon) => {
      icon.replaceChildren(createUtilityIcon(icon.dataset.icon));
    });
    document.querySelectorAll(".search-icon, .search-button-icon").forEach((icon) => {
      icon.replaceChildren(createUtilityIcon("search"));
    });

    elements.searchForm.noValidate = true;
    elements.cityInput.setAttribute("role", "combobox");
    elements.cityInput.setAttribute("aria-autocomplete", "list");
    elements.cityInput.setAttribute("aria-haspopup", "listbox");
    elements.cityInput.setAttribute("aria-controls", "search-results");
    elements.cityInput.setAttribute("aria-expanded", "false");
    elements.searchResults.setAttribute("role", "listbox");
    elements.searchStatus.setAttribute("role", "status");
    elements.searchStatus.setAttribute("aria-live", "polite");
    elements.searchStatus.setAttribute("aria-atomic", "true");

    elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = elements.cityInput.value.trim();
      if (!query) {
        cancelPendingCitySearch();
        clearSearchResults();
        setSearchStatus("Digite o nome de uma cidade para começar.", true);
        elements.cityInput.focus();
        return;
      }
      if (searchDebounceTimer !== null) {
        window.clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
      if (renderedSearchQuery === query && !elements.searchResults.hidden && searchOptionButtons.length > 0) {
        const indexToChoose = activeOptionIndex >= 0 ? activeOptionIndex : 0;
        searchOptionButtons[indexToChoose]?.click();
        return;
      }
      if (activeSearchController && activeSearchQuery === query) {
        submitRequestedQuery = query;
        setSearchStatus("Escolhendo a primeira cidade encontrada…");
        return;
      }
      cancelPendingCitySearch();
      submitRequestedQuery = query;
      searchCities(query);
    });

    elements.cityInput.addEventListener("input", () => {
      submitRequestedQuery = null;
      cancelPendingCitySearch();
      clearSearchResults();
      const query = elements.cityInput.value.trim();
      if (!query) {
        setSearchStatus("");
        return;
      }
      if (query.length < 2) {
        setSearchStatus("Digite ao menos 2 caracteres para ver sugestões.");
        return;
      }
      setSearchStatus("Continue digitando ou aguarde para ver sugestões.");
      searchDebounceTimer = window.setTimeout(() => {
        searchDebounceTimer = null;
        searchCities(query);
      }, 300);
    });

    elements.cityInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && searchOptionButtons.length > 0) {
        event.preventDefault();
        setActiveOption(activeOptionIndex < 0 ? 0 : activeOptionIndex + 1);
      } else if (event.key === "ArrowUp" && searchOptionButtons.length > 0) {
        event.preventDefault();
        setActiveOption(activeOptionIndex < 0 ? searchOptionButtons.length - 1 : activeOptionIndex - 1);
      } else if (event.key === "Enter" && activeOptionIndex >= 0) {
        event.preventDefault();
        searchOptionButtons[activeOptionIndex]?.click();
      } else if (event.key === "Escape" && (elements.cityInput.value || !elements.searchResults.hidden || searchDebounceTimer !== null || activeSearchController)) {
        event.preventDefault();
        closeCitySuggestions();
        setSearchStatus("");
      }
    });

    elements.retryButton.addEventListener("click", () => {
      if (lastLocation) loadWeather(lastLocation);
    });

    lastLocation = { name: "Chapecó", region: "Santa Catarina, Brasil", latitude: -27.10, longitude: -52.62 };
    loadWeather(lastLocation);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

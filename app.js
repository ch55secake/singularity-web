/* global SINGULARITY_CONFIG */

const DEMO_DASHBOARD = {
  updatedAt: "2026-10-09T14:30:00Z",
  metrics: { matches: 248, players: 8, winRate: 56.4, avgDuration: "32m 18s" },
  matches: [
    { id: "#42476710", result: "win", score: "30 — 24", duration: "38m 12s", time: "Today, 12:42", hero: "Vindicta", player: "cheesecake", accent: "violet" },
    { id: "#42475182", result: "loss", score: "21 — 30", duration: "29m 47s", time: "Yesterday, 21:08", hero: "Pocket", player: "mira", accent: "blue" },
    { id: "#42473904", result: "win", score: "30 — 18", duration: "34m 05s", time: "Yesterday, 20:31", hero: "Seven", player: "rune", accent: "orange" },
    { id: "#42471229", result: "win", score: "30 — 27", duration: "41m 20s", time: "Oct 07, 22:16", hero: "Infernus", player: "sable", accent: "red" },
    { id: "#42470081", result: "loss", score: "26 — 30", duration: "36m 49s", time: "Oct 07, 21:42", hero: "Grey Talon", player: "niko", accent: "green" },
  ],
  players: [
    { name: "cheesecake", initials: "CH", games: 42, winRate: 64.3, kda: "3.8", hero: "Vindicta", trend: 12, color: "violet" },
    { name: "mira", initials: "MI", games: 38, winRate: 60.5, kda: "3.4", hero: "Pocket", trend: 8, color: "blue" },
    { name: "rune", initials: "RU", games: 35, winRate: 57.1, kda: "3.1", hero: "Seven", trend: 4, color: "orange" },
    { name: "sable", initials: "SA", games: 31, winRate: 54.8, kda: "2.9", hero: "Infernus", trend: -2, color: "red" },
    { name: "niko", initials: "NI", games: 29, winRate: 48.3, kda: "2.5", hero: "Grey Talon", trend: -7, color: "green" },
  ],
};

let dashboard = DEMO_DASHBOARD;
let activeFilter = "all";
const config = window.SINGULARITY_CONFIG || {};
const apiBaseUrl = (config.apiBaseUrl || "").replace(/\/$/, "");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatNumber(value) { return new Intl.NumberFormat("en-US").format(value); }

function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated just now";
  return `Updated ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function renderMetrics() {
  const metrics = [
    { label: "Matches tracked", value: formatNumber(dashboard.metrics.matches), change: "+18 this month", icon: "⌁", color: "violet" },
    { label: "Group win rate", value: `${dashboard.metrics.winRate}%`, change: "+4.2% vs. prior", icon: "✦", color: "orange" },
    { label: "Active players", value: dashboard.metrics.players, change: "3 online now", icon: "◎", color: "blue" },
    { label: "Avg. match length", value: dashboard.metrics.avgDuration, change: "−1m 12s vs. prior", icon: "◷", color: "green" },
  ];
  const container = $("[data-role=metrics]");
  container.replaceChildren();
  metrics.forEach((metric) => {
    const card = createElement("article", "metric-card");
    const top = createElement("div", "metric-top");
    top.append(createElement("span", `metric-icon ${metric.color}`, metric.icon), createElement("span", "metric-change", metric.change));
    card.append(top, createElement("span", "metric-label", metric.label), createElement("strong", "metric-value", metric.value));
    container.append(card);
  });
}

function createMatchCard(match) {
  const card = createElement("article", `match-card ${match.accent}`);
  const header = createElement("div", "match-card-header");
  header.append(createElement("span", `result-label ${match.result}`, match.result === "win" ? "Victory" : "Defeat"), createElement("span", "match-id", match.id));
  card.append(header);
  const score = createElement("div", "match-score");
  score.append(createElement("strong", "score-value", match.score), createElement("span", "score-meta", `${match.hero} · ${match.player}`));
  card.append(score);
  const footer = createElement("div", "match-card-footer");
  footer.append(createElement("span", "match-time", match.time), createElement("span", "match-duration", match.duration));
  card.append(footer);
  return card;
}

function renderRecentMatches() {
  const container = $("[data-role=recent-matches]");
  container.replaceChildren(...dashboard.matches.slice(0, 3).map(createMatchCard));
}

function createTrend(value) {
  const trend = createElement("span", `trend ${value >= 0 ? "positive" : "negative"}`);
  trend.append(createElement("span", "trend-arrow", value >= 0 ? "↗" : "↘"), document.createTextNode(`${Math.abs(value)}%`));
  return trend;
}

function createPlayerRow(player, includeHero = false) {
  const row = createElement("tr");
  const playerCell = createElement("td");
  const identity = createElement("div", "player-identity");
  identity.append(createElement("span", `avatar ${player.color}`, player.initials), createElement("strong", "player-name", player.name));
  playerCell.append(identity);
  row.append(playerCell, createElement("td", "muted-cell", String(player.games)), createElement("td", "win-rate-cell", `${player.winRate}%`), createElement("td", "muted-cell", player.kda));
  if (includeHero) row.append(createElement("td", "muted-cell", player.hero));
  const trendCell = createElement("td");
  trendCell.append(createTrend(player.trend));
  row.append(trendCell);
  return row;
}

function renderPlayers() {
  $("[data-role=top-players]").replaceChildren(...dashboard.players.slice(0, 4).map((player) => createPlayerRow(player)));
  $("[data-role=all-players]").replaceChildren(...dashboard.players.map((player) => createPlayerRow(player, true)));
}

function renderAllMatches() {
  const container = $("[data-role=all-matches]");
  const matches = dashboard.matches.filter((match) => activeFilter === "all" || match.result === activeFilter);
  container.replaceChildren();
  if (!matches.length) {
    container.append(createElement("div", "empty-state", "No matches in this view yet."));
    return;
  }
  matches.forEach((match) => {
    const row = createElement("article", "match-list-row");
    row.append(createElement("span", `match-result-mark ${match.result}`, match.result === "win" ? "W" : "L"));
    const main = createElement("div", "match-list-main");
    const title = createElement("div", "match-list-title");
    title.append(createElement("strong", "match-list-score", match.score), createElement("span", "match-id", match.id));
    main.append(title, createElement("span", "match-list-meta", `${match.hero} · ${match.player} · ${match.duration}`));
    row.append(main, createElement("time", "match-list-time", match.time));
    container.append(row);
  });
}

function render() {
  renderMetrics();
  renderRecentMatches();
  renderPlayers();
  renderAllMatches();
  $("[data-role=last-updated]").textContent = formatUpdatedAt(dashboard.updatedAt);
}

function showView(view) {
  $$(`[data-panel]`).forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-visible", active);
  });
  $$(`[data-view]`).forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $("[data-role=page-title]").textContent = view[0].toUpperCase() + view.slice(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setConnectionStatus(connected) {
  $("[data-role=connection-status]").textContent = connected ? "Platform connected" : "Demo data";
  $("[data-role=status-dot]").classList.toggle("is-connected", connected);
}

function showToast(message) {
  const toast = $("[data-role=toast]");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

async function loadDashboard() {
  if (!apiBaseUrl) {
    setConnectionStatus(false);
    render();
    return;
  }
  try {
    const response = await fetch(`${apiBaseUrl}/api/dashboard`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`dashboard request failed: ${response.status}`);
    dashboard = await response.json();
    setConnectionStatus(true);
  } catch (error) {
    console.warn("Using demo dashboard data:", error);
    setConnectionStatus(false);
    showToast("Platform unavailable — showing demo data");
  }
  render();
}

$$(`[data-view], [data-view-link]`).forEach((element) => {
  element.addEventListener("click", () => showView(element.dataset.view || element.dataset.viewLink));
});
$$(`[data-filter]`).forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$(`[data-filter]`).forEach((item) => item.classList.toggle("is-active", item === button));
    renderAllMatches();
  });
});
$("[data-action=refresh]").addEventListener("click", () => {
  loadDashboard();
  showToast(apiBaseUrl ? "Refreshing dashboard…" : "Demo data is up to date");
});
loadDashboard();

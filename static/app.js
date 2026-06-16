const notesList = document.getElementById("notes-list");
const emptyState = document.getElementById("empty-state");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");
const exportCsvBtn = document.getElementById("export-csv-btn");
const themeToggle = document.getElementById("theme-toggle");
const selectionPlaceholder = document.getElementById("selection-placeholder");
const selectionDetail = document.getElementById("selection-detail");
const selectedDate = document.getElementById("selected-date");
const selectedCategory = document.getElementById("selected-category");
const selectedPreview = document.getElementById("selected-preview");
const tweetText = document.getElementById("tweet-text");
const charCount = document.getElementById("char-count");
const tweetBtn = document.getElementById("tweet-btn");

const THEME_STORAGE_KEY = "bq-release-notes-theme";

let selectedCard = null;
let selectedUpdate = null;
let currentFeedData = null;

function setLoading(isLoading) {
  refreshBtn.disabled = isLoading;
  refreshBtn.classList.toggle("loading", isLoading);
}

function formatStatus(feedUpdated) {
  if (!feedUpdated) {
    return "Feed loaded.";
  }
  const date = new Date(feedUpdated);
  if (Number.isNaN(date.getTime())) {
    return `Feed updated: ${feedUpdated}`;
  }
  return `Feed updated: ${date.toLocaleString()}`;
}

function buildCopyText(update, entry) {
  return `${entry.date} — ${update.category}\n${update.text}\n${entry.link}`;
}

function buildTweetText(update, entry) {
  const prefix = `BigQuery ${update.category} (${entry.date}): `;
  const suffix = `\n\n${entry.link}`;
  const maxBodyLength = 280 - prefix.length - suffix.length - 3;

  let body = update.text.trim();
  if (body.length > maxBodyLength) {
    body = `${body.slice(0, Math.max(maxBodyLength, 0)).trim()}...`;
  }

  return `${prefix}${body}${suffix}`;
}

function updateTweetPreview() {
  const text = tweetText.value;
  charCount.textContent = String(text.length);
  const params = new URLSearchParams({ text });
  tweetBtn.href = `https://twitter.com/intent/tweet?${params.toString()}`;
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalLabel = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("copied");
    }, 1500);
  } catch (error) {
    button.textContent = "Copy failed";
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1500);
  }
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildCsv(data) {
  const rows = [["Date", "Category", "Summary", "Link"]];

  (data.entries || []).forEach((entry) => {
    entry.updates.forEach((update) => {
      rows.push([
        entry.date,
        update.category,
        update.text,
        entry.link,
      ]);
    });
  });

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function exportToCsv() {
  if (!currentFeedData || !currentFeedData.entries?.length) {
    return;
  }

  const csv = buildCsv(currentFeedData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `bigquery-release-notes-${timestamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function applyTheme(isDark) {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  themeToggle.checked = isDark;
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme ? savedTheme === "dark" : prefersDark;
  applyTheme(isDark);
}

function selectUpdate(card, update, entry) {
  if (selectedCard) {
    selectedCard.classList.remove("selected");
  }

  selectedCard = card;
  selectedUpdate = { update, entry };
  card.classList.add("selected");

  selectionPlaceholder.classList.add("hidden");
  selectionDetail.classList.remove("hidden");
  selectedDate.textContent = entry.date;
  selectedCategory.textContent = update.category;
  selectedPreview.innerHTML = update.html;
  tweetText.value = buildTweetText(update, entry);
  updateTweetPreview();
}

function renderNotes(data) {
  notesList.innerHTML = "";

  if (!data.entries || data.entries.length === 0) {
    emptyState.classList.remove("hidden");
    exportCsvBtn.disabled = true;
    return;
  }

  emptyState.classList.add("hidden");
  exportCsvBtn.disabled = false;

  data.entries.forEach((entry) => {
    const group = document.createElement("section");
    group.className = "day-group";

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("h3");
    title.textContent = entry.date;

    const link = document.createElement("a");
    link.className = "day-link";
    link.href = entry.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on docs";

    header.append(title, link);
    group.appendChild(header);

    entry.updates.forEach((update) => {
      const card = document.createElement("article");
      card.className = "update-card";
      card.dataset.entryId = entry.id;
      card.dataset.updateId = String(update.id);

      const cardHeader = document.createElement("div");
      cardHeader.className = "update-card-header";

      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = update.category;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        copyToClipboard(buildCopyText(update, entry), copyBtn);
      });

      cardHeader.append(badge, copyBtn);

      const content = document.createElement("div");
      content.className = "update-content";
      content.innerHTML = update.html;

      card.append(cardHeader, content);
      card.addEventListener("click", () => selectUpdate(card, update, entry));
      group.appendChild(card);
    });

    notesList.appendChild(group);
  });
}

function showError(message) {
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = message;
  notesList.prepend(banner);
}

async function loadReleaseNotes() {
  setLoading(true);
  statusEl.textContent = "Loading release notes...";

  try {
    const response = await fetch("/api/release-notes");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load release notes.");
    }

    currentFeedData = data;
    renderNotes(data);
    statusEl.textContent = formatStatus(data.feed_updated);

    if (
      selectedUpdate &&
      selectedCard &&
      !selectedCard.isConnected
    ) {
      selectionPlaceholder.classList.remove("hidden");
      selectionDetail.classList.add("hidden");
      selectedCard = null;
      selectedUpdate = null;
    }
  } catch (error) {
    currentFeedData = null;
    exportCsvBtn.disabled = true;
    notesList.innerHTML = "";
    showError(error.message);
    statusEl.textContent = "Failed to load release notes.";
  } finally {
    setLoading(false);
  }
}

refreshBtn.addEventListener("click", loadReleaseNotes);
exportCsvBtn.addEventListener("click", exportToCsv);
tweetText.addEventListener("input", updateTweetPreview);
themeToggle.addEventListener("change", (event) => {
  applyTheme(event.target.checked);
});

initTheme();
loadReleaseNotes();

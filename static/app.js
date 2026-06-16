const notesList = document.getElementById("notes-list");
const emptyState = document.getElementById("empty-state");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh-btn");
const selectionPlaceholder = document.getElementById("selection-placeholder");
const selectionDetail = document.getElementById("selection-detail");
const selectedDate = document.getElementById("selected-date");
const selectedCategory = document.getElementById("selected-category");
const selectedPreview = document.getElementById("selected-preview");
const tweetText = document.getElementById("tweet-text");
const charCount = document.getElementById("char-count");
const tweetBtn = document.getElementById("tweet-btn");

let selectedCard = null;
let selectedUpdate = null;

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
    return;
  }

  emptyState.classList.add("hidden");

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
      const card = document.createElement("button");
      card.type = "button";
      card.className = "update-card";
      card.dataset.entryId = entry.id;
      card.dataset.updateId = String(update.id);

      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = update.category;

      const content = document.createElement("div");
      content.className = "update-content";
      content.innerHTML = update.html;

      card.append(badge, content);
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
    notesList.innerHTML = "";
    showError(error.message);
    statusEl.textContent = "Failed to load release notes.";
  } finally {
    setLoading(false);
  }
}

refreshBtn.addEventListener("click", loadReleaseNotes);
tweetText.addEventListener("input", updateTweetPreview);

loadReleaseNotes();

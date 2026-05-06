const STORAGE_KEY = "eye-drop-manager-v1";
const MINUTE = 60 * 1000;

const defaultState = {
  settings: {
    operationDate: "2026-05-03",
    wakeTime: "07:30",
    sleepTime: "23:30",
    defaultInterval: 5,
    recommendedTimes: {
      1: ["21:30"],
      2: ["08:30", "21:30"],
      3: ["08:30", "14:30", "21:30"],
      4: ["08:30", "12:30", "18:30", "22:30"],
      5: ["08:30", "11:30", "14:30", "18:30", "22:30"],
      6: ["08:30", "10:30", "12:30", "15:30", "18:30", "22:30"],
    },
  },
  meds: [
    {
      id: "levo",
      name: "左氧氟沙星滴眼液",
      timesPerDay: 4,
      intervalMinutes: 5,
      startDate: "2026-05-03",
      endDate: "2026-05-09",
      note: "双眼，每次1滴；常规抗感染用药，请按医生要求停用",
      preferredTimes: ["08:30", "12:30", "18:30", "22:30"],
      color: "#c84b5f",
      active: true,
    },
    {
      id: "fluoro",
      name: "0.1%氟米龙滴眼液",
      timesPerDay: 4,
      intervalMinutes: 5,
      startDate: "2026-05-03",
      endDate: "2026-08-03",
      note: "双眼，每次1滴；使用前摇匀，后续递减按医嘱调整",
      preferredTimes: ["08:35", "12:35", "18:35", "22:35"],
      color: "#3b82c4",
      active: true,
    },
    {
      id: "hyaluronate",
      name: "玻璃酸钠滴眼液",
      timesPerDay: 4,
      intervalMinutes: 5,
      startDate: "2026-05-03",
      endDate: "2026-06-03",
      note: "双眼，每次1滴；干涩时按医生要求使用",
      preferredTimes: ["08:40", "12:40", "18:40", "22:40"],
      color: "#2f9d8f",
      active: true,
    },
    {
      id: "artificial",
      name: "七叶洋地黄双苷滴眼液",
      timesPerDay: 3,
      intervalMinutes: 5,
      startDate: "2026-05-03",
      endDate: "2026-08-03",
      note: "双眼，每次1滴；1日多次时请与其他药间隔",
      preferredTimes: ["08:45", "15:30", "22:45"],
      color: "#6f63c4",
      active: true,
    },
  ],
  records: {},
  delays: {},
};

let state = loadState();
let selectedDate = formatDate(new Date());
let selectedMedId = state.meds[0]?.id || "";
let notificationTimer = null;
let medFormDirty = false;
let settingsFormDirty = false;
let statusTimer = null;

const el = {
  todayLabel: document.querySelector("#todayLabel"),
  postOpDay: document.querySelector("#postOpDay"),
  nextTitle: document.querySelector("#nextTitle"),
  nextDetail: document.querySelector("#nextDetail"),
  completeNextButton: document.querySelector("#completeNextButton"),
  delayNextButton: document.querySelector("#delayNextButton"),
  notifyButton: document.querySelector("#notifyButton"),
  todayProgress: document.querySelector("#todayProgress"),
  progressBar: document.querySelector("#progressBar"),
  missedSummary: document.querySelector("#missedSummary"),
  sequenceText: document.querySelector("#sequenceText"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  selectedDate: document.querySelector("#selectedDate"),
  prevDayButton: document.querySelector("#prevDayButton"),
  nextDayButton: document.querySelector("#nextDayButton"),
  timelineList: document.querySelector("#timelineList"),
  doseChart: document.querySelector("#doseChart"),
  medList: document.querySelector("#medList"),
  medForm: document.querySelector("#medForm"),
  medId: document.querySelector("#medId"),
  medName: document.querySelector("#medName"),
  medTimes: document.querySelector("#medTimes"),
  medInterval: document.querySelector("#medInterval"),
  medStart: document.querySelector("#medStart"),
  medEnd: document.querySelector("#medEnd"),
  medNote: document.querySelector("#medNote"),
  medPreferredTimes: document.querySelector("#medPreferredTimes"),
  medColor: document.querySelector("#medColor"),
  medActive: document.querySelector("#medActive"),
  medSaveStatus: document.querySelector("#medSaveStatus"),
  newMedButton: document.querySelector("#newMedButton"),
  deleteMedButton: document.querySelector("#deleteMedButton"),
  recordsList: document.querySelector("#recordsList"),
  clearDayButton: document.querySelector("#clearDayButton"),
  settingsForm: document.querySelector("#settingsForm"),
  operationDate: document.querySelector("#operationDate"),
  wakeTime: document.querySelector("#wakeTime"),
  sleepTime: document.querySelector("#sleepTime"),
  defaultInterval: document.querySelector("#defaultInterval"),
  recommendedTimes: document.querySelector("#recommendedTimes"),
  exportButton: document.querySelector("#exportButton"),
  importBox: document.querySelector("#importBox"),
  importButton: document.querySelector("#importButton"),
  resetButton: document.querySelector("#resetButton"),
  settingsSaveStatus: document.querySelector("#settingsSaveStatus"),
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...defaultState.settings, ...parsed.settings },
      meds: parsed.meds?.length ? parsed.meds : defaultState.meds,
      records: parsed.records || {},
      delays: parsed.delays || {},
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function dateLabel(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toDateTime(dateString, time) {
  return new Date(`${dateString}T${time}:00`);
}

function activeMedsFor(dateString) {
  return state.meds.filter((med) => {
    return med.active && dateString >= med.startDate && dateString <= med.endDate;
  });
}

function normalizeTimeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(",")
    .map((time) => time.trim())
    .filter(Boolean);
}

function doseBaseTimes(med) {
  const customTimes = normalizeTimeList(med.preferredTimes);
  const recommended = customTimes.length
    ? customTimes
    : state.settings.recommendedTimes?.[med.timesPerDay] || state.settings.recommendedTimes?.[String(med.timesPerDay)] || [];
  if (recommended.length) {
    return Array.from({ length: Number(med.timesPerDay) }, (_, index) => {
      const time = recommended[Math.min(index, recommended.length - 1)];
      return minutesFromTime(time);
    });
  }

  const start = minutesFromTime(state.settings.wakeTime);
  const end = minutesFromTime(state.settings.sleepTime);
  const timesPerDay = Number(med.timesPerDay);
  if (timesPerDay <= 1) return [start];
  const step = (end - start) / (timesPerDay - 1);
  return Array.from({ length: timesPerDay }, (_, index) => start + step * index);
}

function doseKey(dateString, medId, doseIndex) {
  return `${dateString}_${medId}_${doseIndex}`;
}

function generateSchedule(dateString) {
  const defaultInterval = Number(state.settings.defaultInterval || 5);
  const candidates = [];

  activeMedsFor(dateString).forEach((med) => {
    doseBaseTimes(med).forEach((baseMinute, index) => {
      const key = doseKey(dateString, med.id, index + 1);
      const delay = Number(state.delays[key] || 0);
      candidates.push({
        key,
        med,
        doseIndex: index + 1,
        baseMinute: baseMinute + delay,
        recommendedMinute: baseMinute,
      });
    });
  });

  candidates.sort((a, b) => a.baseMinute - b.baseMinute || a.med.name.localeCompare(b.med.name, "zh-CN"));

  let lastMinute = -Infinity;
  return candidates.map((item) => {
    const interval = Number(item.med.intervalMinutes || defaultInterval);
    let scheduledMinute = Math.max(item.baseMinute, lastMinute + interval);
    lastMinute = scheduledMinute;
    const scheduledTime = timeFromMinutes(scheduledMinute);
    const record = state.records[item.key];
    return {
      ...item,
      scheduledMinute,
      scheduledTime,
      recommendedTime: timeFromMinutes(item.recommendedMinute),
      scheduledAt: toDateTime(dateString, scheduledTime),
      record,
      isDone: record?.status === "done",
      isSkipped: record?.status === "skipped",
    };
  });
}

function getDoseState(dose) {
  if (dose.isDone) return "已滴";
  if (dose.isSkipped) return "已跳过";
  if (dose.scheduledAt < new Date() && selectedDate <= formatDate(new Date())) return "逾期";
  return "待滴";
}

function getTodayStats(schedule) {
  const done = schedule.filter((dose) => dose.isDone).length;
  const missed = schedule.filter((dose) => getDoseState(dose) === "逾期").length;
  return { total: schedule.length, done, missed };
}

function nextDose(schedule) {
  return schedule.find((dose) => !dose.isDone && !dose.isSkipped) || null;
}

function renderHeader() {
  const today = formatDate(new Date());
  el.todayLabel.textContent = dateLabel(today);
  const operation = new Date(`${state.settings.operationDate}T12:00:00`);
  const current = new Date(`${today}T12:00:00`);
  const day = Math.floor((current - operation) / (24 * 60 * MINUTE)) + 1;
  el.postOpDay.textContent = day > 0 ? `术后第 ${day} 天` : "手术前";
}

function renderNextPanel(schedule) {
  const upcoming = nextDose(schedule);
  if (!upcoming) {
    el.nextTitle.textContent = schedule.length ? "今日已完成" : "今日无计划";
    el.nextDetail.textContent = schedule.length ? "今天的滴眼药水记录已全部完成。" : "当前日期没有启用的药水。";
    el.completeNextButton.disabled = true;
    el.delayNextButton.disabled = true;
    return;
  }

  const now = new Date();
  const diff = upcoming.scheduledAt - now;
  const waitText = diff > 0 ? `还有 ${Math.ceil(diff / MINUTE)} 分钟` : "现在可以滴";
  const recommendedText =
    upcoming.recommendedTime === upcoming.scheduledTime ? "" : `推荐 ${upcoming.recommendedTime}，`;
  el.nextTitle.textContent = upcoming.med.name;
  el.nextDetail.textContent = `${recommendedText}当前排队 ${upcoming.scheduledTime}，第 ${upcoming.doseIndex}/${upcoming.med.timesPerDay} 次。${waitText}。${upcoming.med.note || ""}`;
  el.completeNextButton.disabled = false;
  el.delayNextButton.disabled = false;
  el.completeNextButton.dataset.key = upcoming.key;
  el.delayNextButton.dataset.key = upcoming.key;
}

function renderSummary(schedule) {
  const { total, done, missed } = getTodayStats(schedule);
  el.todayProgress.textContent = `${done}/${total}`;
  el.progressBar.style.width = total ? `${Math.round((done / total) * 100)}%` : "0";
  el.missedSummary.textContent = missed ? `${missed} 次已逾期，可按实际情况补滴或跳过` : "暂无逾期";
}

function renderSequenceMode(schedule) {
  const activeCount = new Set(schedule.map((dose) => dose.med.id)).size;
  const interval = Number(state.settings.defaultInterval || 5);
  el.sequenceText.textContent = activeCount
    ? `${activeCount} 种药水按推荐时间排序；晚点时优先补最早未完成的一次，并保持至少 ${interval} 分钟间隔。`
    : "当前日期没有启用的药水。";
}

function renderTimeline(schedule) {
  const template = document.querySelector("#timelineItemTemplate");
  el.timelineList.innerHTML = "";
  if (!schedule.length) {
    el.timelineList.innerHTML = '<p class="empty">这一天没有滴药计划。</p>';
    return;
  }
  const next = nextDose(schedule);

  schedule.forEach((dose) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const stateText = getDoseState(dose);
    node.style.setProperty("--dose-color", dose.med.color);
    node.classList.toggle("done", dose.isDone);
    node.classList.toggle("missed", stateText === "逾期");
    node.classList.toggle("next", next?.key === dose.key);
    node.querySelector(".dose-time").textContent = dose.scheduledTime;
    node.querySelector(".dose-state").textContent = stateText;
    node.querySelector("h3").textContent = dose.med.name;
    node.querySelector("p").textContent = `第 ${dose.doseIndex}/${dose.med.timesPerDay} 次，推荐 ${dose.recommendedTime}`;
    node.querySelector("small").textContent = dose.record?.time
      ? `实际记录：${new Date(dose.record.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
      : dose.med.note || "按医嘱使用";
    const complete = node.querySelector(".complete-dose");
    const delay = node.querySelector(".delay-dose");
    const undo = node.querySelector(".undo-dose");
    complete.dataset.key = dose.key;
    delay.dataset.key = dose.key;
    undo.dataset.key = dose.key;
    complete.disabled = dose.isDone;
    undo.disabled = !dose.record;
    el.timelineList.appendChild(node);
  });
}

function renderDoseChart(schedule) {
  el.doseChart.innerHTML = "";
  if (!schedule.length) return;

  const groups = activeMedsFor(selectedDate).map((med) => ({
    med,
    doses: schedule.filter((dose) => dose.med.id === med.id),
  }));

  const start = minutesFromTime(state.settings.wakeTime);
  const end = minutesFromTime(state.settings.sleepTime);
  const span = Math.max(1, end - start);

  const ruler = document.createElement("div");
  ruler.className = "chart-ruler";
  ["08:00", "12:00", "16:00", "20:00", "23:00"].forEach((time) => {
    const marker = document.createElement("span");
    const minute = minutesFromTime(time);
    marker.style.left = `${Math.max(0, Math.min(100, ((minute - start) / span) * 100))}%`;
    marker.textContent = time;
    ruler.appendChild(marker);
  });
  el.doseChart.appendChild(ruler);

  groups.forEach(({ med, doses }) => {
    const row = document.createElement("div");
    row.className = "chart-row";
    row.style.setProperty("--dose-color", med.color);

    const label = document.createElement("div");
    label.className = "chart-label";
    label.innerHTML = `<strong>${med.name}</strong><span>${doses.filter((dose) => dose.isDone).length}/${doses.length}</span>`;

    const track = document.createElement("div");
    track.className = "chart-track";

    doses.forEach((dose) => {
      const point = document.createElement("button");
      point.type = "button";
      point.className = "chart-point";
      point.classList.toggle("done", dose.isDone);
      point.classList.toggle("missed", getDoseState(dose) === "逾期");
      point.dataset.key = dose.key;
      point.style.left = `${Math.max(2, Math.min(98, ((dose.scheduledMinute - start) / span) * 100))}%`;
      point.title = `${dose.med.name} ${dose.scheduledTime}`;
      point.textContent = dose.doseIndex;
      point.disabled = dose.isDone;
      track.appendChild(point);
    });

    row.append(label, track);
    el.doseChart.appendChild(row);
  });
}

function renderMeds() {
  el.medList.innerHTML = "";
  state.meds.forEach((med) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `med-card ${med.id === selectedMedId ? "active" : ""}`;
    button.style.setProperty("--dose-color", med.color);
    button.dataset.id = med.id;
    button.innerHTML = `<strong>${med.name}</strong><span>${med.timesPerDay} 次/天，${med.startDate} 至 ${med.endDate}</span>`;
    el.medList.appendChild(button);
  });

  const med = state.meds.find((item) => item.id === selectedMedId) || state.meds[0];
  if (!med) return;
  if (medFormDirty && el.medId.value === med.id) return;
  selectedMedId = med.id;
  el.medId.value = med.id;
  el.medName.value = med.name;
  el.medTimes.value = med.timesPerDay;
  el.medInterval.value = med.intervalMinutes;
  el.medStart.value = med.startDate;
  el.medEnd.value = med.endDate;
  el.medNote.value = med.note;
  el.medPreferredTimes.value = normalizeTimeList(med.preferredTimes).join(",");
  el.medColor.value = med.color;
  el.medActive.checked = med.active;
}

function renderRecords(schedule) {
  const records = schedule.filter((dose) => dose.record);
  el.recordsList.innerHTML = "";
  if (!records.length) {
    el.recordsList.innerHTML = '<p class="empty">当天还没有手动记录。</p>';
    return;
  }
  records
    .sort((a, b) => new Date(b.record.time) - new Date(a.record.time))
    .forEach((dose) => {
      const row = document.createElement("div");
      row.className = "record-row";
      const actual = new Date(dose.record.time).toLocaleString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        day: "2-digit",
      });
      row.innerHTML = `<strong>${dose.med.name}</strong><span>计划 ${dose.scheduledTime}，记录 ${actual}</span>`;
      el.recordsList.appendChild(row);
    });
}

function renderSettings() {
  if (settingsFormDirty) return;
  el.operationDate.value = state.settings.operationDate;
  el.wakeTime.value = state.settings.wakeTime;
  el.sleepTime.value = state.settings.sleepTime;
  el.defaultInterval.value = state.settings.defaultInterval;
  el.recommendedTimes.value = stringifyRecommendedTimes(state.settings.recommendedTimes);
}

function stringifyRecommendedTimes(recommendedTimes) {
  return Object.keys(recommendedTimes || {})
    .sort((a, b) => Number(a) - Number(b))
    .map((count) => `${count}=${normalizeTimeList(recommendedTimes[count]).join(",")}`)
    .join("\n");
}

function parseRecommendedTimes(value) {
  const result = {};
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [count, times] = line.split("=");
      const key = Number(count);
      if (!Number.isFinite(key) || key < 1) return;
      result[key] = normalizeTimeList(times);
    });
  return result;
}

function renderAll() {
  el.selectedDate.value = selectedDate;
  const schedule = generateSchedule(selectedDate);
  renderHeader();
  renderNextPanel(schedule);
  renderSummary(schedule);
  renderSequenceMode(schedule);
  renderDoseChart(schedule);
  renderTimeline(schedule);
  renderMeds();
  renderRecords(schedule);
  renderSettings();
  scheduleNotification(schedule);
}

function showStatus(target, message) {
  if (statusTimer) clearTimeout(statusTimer);
  target.textContent = message;
  target.classList.add("visible");
  statusTimer = setTimeout(() => {
    target.classList.remove("visible");
    target.textContent = "";
  }, 2200);
}

function completeDose(key) {
  state.records[key] = { status: "done", time: new Date().toISOString() };
  saveState();
  renderAll();
}

function delayDose(key, minutes = 15) {
  state.delays[key] = Number(state.delays[key] || 0) + minutes;
  saveState();
  renderAll();
}

function undoDose(key) {
  delete state.records[key];
  saveState();
  renderAll();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

function exportState() {
  const json = JSON.stringify(state, null, 2);
  navigator.clipboard?.writeText(json);
  el.importBox.value = json;
}

function importState() {
  try {
    const imported = JSON.parse(el.importBox.value);
    state = {
      ...structuredClone(defaultState),
      ...imported,
      settings: { ...defaultState.settings, ...imported.settings },
      meds: imported.meds || defaultState.meds,
      records: imported.records || {},
      delays: imported.delays || {},
    };
    selectedMedId = state.meds[0]?.id || "";
    saveState();
    renderAll();
  } catch {
    alert("导入失败，请检查 JSON 格式。");
  }
}

function scheduleNotification(schedule) {
  if (notificationTimer) clearTimeout(notificationTimer);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const upcoming = nextDose(schedule);
  if (!upcoming) return;
  const delay = upcoming.scheduledAt - new Date();
  if (delay < 0 || delay > 60 * MINUTE) return;
  notificationTimer = setTimeout(() => {
    new Notification("该滴眼药水了", {
      body: `${upcoming.med.name}，第 ${upcoming.doseIndex}/${upcoming.med.timesPerDay} 次`,
    });
  }, delay);
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

el.completeNextButton.addEventListener("click", () => completeDose(el.completeNextButton.dataset.key));
el.delayNextButton.addEventListener("click", () => delayDose(el.delayNextButton.dataset.key));

el.timelineList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.classList.contains("complete-dose")) completeDose(button.dataset.key);
  if (button.classList.contains("delay-dose")) delayDose(button.dataset.key);
  if (button.classList.contains("undo-dose")) undoDose(button.dataset.key);
});

el.doseChart.addEventListener("click", (event) => {
  const button = event.target.closest(".chart-point");
  if (!button) return;
  completeDose(button.dataset.key);
});

el.prevDayButton.addEventListener("click", () => {
  selectedDate = addDays(selectedDate, -1);
  renderAll();
});

el.nextDayButton.addEventListener("click", () => {
  selectedDate = addDays(selectedDate, 1);
  renderAll();
});

el.selectedDate.addEventListener("change", () => {
  selectedDate = el.selectedDate.value;
  renderAll();
});

el.openSettingsButton.addEventListener("click", () => switchTab("settings"));

el.medList.addEventListener("click", (event) => {
  const card = event.target.closest(".med-card");
  if (!card) return;
  medFormDirty = false;
  selectedMedId = card.dataset.id;
  renderMeds();
});

el.medForm.addEventListener("input", () => {
  medFormDirty = true;
});

el.settingsForm.addEventListener("input", () => {
  settingsFormDirty = true;
});

el.newMedButton.addEventListener("click", () => {
  const id = `med-${Date.now()}`;
  const med = {
    id,
    name: "新药水",
    timesPerDay: 4,
    intervalMinutes: Number(state.settings.defaultInterval || 5),
    startDate: selectedDate,
    endDate: addDays(selectedDate, 7),
    note: "双眼，每次1滴",
    preferredTimes: [],
    color: "#116b61",
    active: true,
  };
  state.meds.push(med);
  selectedMedId = id;
  medFormDirty = false;
  saveState();
  renderAll();
});

el.medForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const med = state.meds.find((item) => item.id === el.medId.value);
  if (!med) return;
  med.name = el.medName.value.trim();
  med.timesPerDay = Number(el.medTimes.value);
  med.intervalMinutes = Number(el.medInterval.value);
  med.startDate = el.medStart.value;
  med.endDate = el.medEnd.value;
  med.note = el.medNote.value.trim();
  med.preferredTimes = normalizeTimeList(el.medPreferredTimes.value);
  med.color = el.medColor.value;
  med.active = el.medActive.checked;
  medFormDirty = false;
  saveState();
  renderAll();
  showStatus(el.medSaveStatus, "已保存");
});

el.deleteMedButton.addEventListener("click", () => {
  if (!confirm("确定删除这瓶药水吗？历史记录不会自动清除。")) return;
  state.meds = state.meds.filter((med) => med.id !== el.medId.value);
  selectedMedId = state.meds[0]?.id || "";
  medFormDirty = false;
  saveState();
  renderAll();
});

el.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings.operationDate = el.operationDate.value;
  state.settings.wakeTime = el.wakeTime.value;
  state.settings.sleepTime = el.sleepTime.value;
  state.settings.defaultInterval = Number(el.defaultInterval.value);
  state.settings.recommendedTimes = parseRecommendedTimes(el.recommendedTimes.value);
  settingsFormDirty = false;
  saveState();
  renderAll();
  showStatus(el.settingsSaveStatus, "已保存");
});

el.clearDayButton.addEventListener("click", () => {
  if (!confirm("确定清空当天记录吗？")) return;
  Object.keys(state.records).forEach((key) => {
    if (key.startsWith(`${selectedDate}_`)) delete state.records[key];
  });
  saveState();
  renderAll();
});

el.exportButton.addEventListener("click", exportState);
el.importButton.addEventListener("click", importState);
el.resetButton.addEventListener("click", () => {
  if (!confirm("确定恢复默认配置吗？这会清空本地记录。")) return;
  state = structuredClone(defaultState);
  selectedMedId = state.meds[0]?.id || "";
  medFormDirty = false;
  settingsFormDirty = false;
  saveState();
  renderAll();
});

el.notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("当前浏览器不支持通知。");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") renderAll();
});

setInterval(renderAll, 60 * 1000);
renderAll();

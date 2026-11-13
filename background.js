const MAIN = 'sheep-main';
const SNOOZE = 'sheep-snooze';
const RESUME = 'sheep-resume';
const DEFAULTS = { intervalMin: 30, enabled: true, pausedUntil: 0 };

const getSettings = () =>
  chrome.storage.local.get(DEFAULTS).then((s) => ({ ...DEFAULTS, ...s }));
const isActive = (s) => s.enabled && s.pausedUntil <= Date.now();

async function schedule() {
  await chrome.alarms.clear(MAIN);
  const s = await getSettings();
  if (!isActive(s)) return;
  const minutes = Math.max(0.5, Number(s.intervalMin) || 30);
  chrome.alarms.create(MAIN, {
    delayInMinutes: minutes,
    periodInMinutes: minutes,
  });
}

async function trigger(force = false) {
  if (!force) {
    const s = await getSettings();
    if (!isActive(s)) return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/sheep.js'],
    });
  } catch (e) {
    // chrome:// 、Web Store、PDF 等不可注入页面：静默跳过
  }
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === MAIN || alarm.name === SNOOZE) return trigger();
  if (alarm.name === RESUME) {
    await chrome.storage.local.set({ pausedUntil: 0 });
    return schedule();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'getStatus': {
        const settings = await getSettings();
        const alarm = isActive(settings) ? await chrome.alarms.get(MAIN) : null;
        return { settings, nextAt: alarm ? alarm.scheduledTime : null };
      }
      case 'setSettings': {
        await chrome.storage.local.set(msg.patch);
        await schedule();
        return { ok: true };
      }
      case 'snooze': {
        await chrome.alarms.create(SNOOZE, { delayInMinutes: 10 });
        return { ok: true };
      }
      case 'pause': {
        await chrome.storage.local.set({ pausedUntil: Date.now() + 60 * 60 * 1000 });
        await chrome.alarms.clear(MAIN);
        await chrome.alarms.create(RESUME, { delayInMinutes: 60 });
        return { ok: true };
      }
      case 'resume': {
        await chrome.alarms.clear(RESUME);
        await chrome.storage.local.set({ pausedUntil: 0 });
        await schedule();
        return { ok: true };
      }
      case 'preview': {
        await trigger(true);
        return { ok: true };
      }
      default:
        return { ok: false };
    }
  })()
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false }));
  return true;
});

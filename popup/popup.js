const el = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function formatTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function refresh() {
  const { settings, nextAt } = await send({ type: 'getStatus' });
  const paused = settings.pausedUntil > Date.now();

  el('toggle').checked = settings.enabled;
  el('interval').value = String(settings.intervalMin);
  el('state').textContent = !settings.enabled ? '已关闭' : paused ? '已暂停' : '运行中';
  el('next').textContent = !settings.enabled || paused ? '--:--' : formatTime(nextAt);
  el('pause').textContent = paused ? '恢复提醒' : '暂停 1 小时';
  el('pause').dataset.mode = paused ? 'resume' : 'pause';
  el('pause').disabled = !settings.enabled;
}

el('toggle').addEventListener('change', async (e) => {
  await send({ type: 'setSettings', patch: { enabled: e.target.checked } });
  refresh();
});

el('interval').addEventListener('change', async (e) => {
  await send({ type: 'setSettings', patch: { intervalMin: Number(e.target.value) } });
  refresh();
});

el('pause').addEventListener('click', async (e) => {
  await send({ type: e.currentTarget.dataset.mode });
  refresh();
});

el('preview').addEventListener('click', async () => {
  await send({ type: 'preview' });
});

refresh();

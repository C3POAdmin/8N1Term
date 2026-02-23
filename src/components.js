export function addButton(parent, {
  label,
  onClick,
  className = "",
  small = false,
  style = ""
}) {
  const btn = document.createElement("button");
  btn.textContent = label;

  btn.className = [
    "component-btn",
    small ? "component-btn-small" : "",
    className
  ].filter(Boolean).join(" ");

  if (style) btn.style.cssText = style;
  if (onClick) btn.addEventListener("click", onClick);

  parent.appendChild(btn);
  return btn;
}

export function addToggle(parent, {
  label = "",
  initial = false,
  onChange,
  text_width,
  className = ""
}) {
  let state = !!initial;

  const wrap = document.createElement("div");
  wrap.className = ["component-toggle-wrap", className].filter(Boolean).join(" ");

  const lbl = document.createElement("span");
  lbl.className = "component-toggle-label";
  lbl.textContent = label;

  if (typeof text_width === "number") {
    lbl.style.width = `${text_width}px`;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "component-toggle";

  const knob = document.createElement("div");
  knob.className = "component-toggle-knob";

  btn.appendChild(knob);
  wrap.appendChild(lbl);
  wrap.appendChild(btn);

  const apply = (fire = true) => {
    btn.classList.toggle("on", state);
    if (fire && typeof onChange === "function") {
      onChange(label, state);
    }
  };

  btn.addEventListener("click", () => {
    state = !state;
    apply(true);
  });

  wrap.set = (v) => {
    state = !!v;
    apply(false);
  };

  wrap.get = () => state;

  apply(false);

  parent.appendChild(wrap);
  return wrap;
}

/* Usage of session cluster
const session = addSessionCluster('#top-bar', {
  onStart: () => console.log('started'),
  onPause: () => console.log('paused'),
  onStop:  () => console.log('stopped')
});
*/

function addSessionCluster(containerSelector, callbacks = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  container.insertAdjacentHTML('beforeend', `
    <div class="session-cluster state-idle">
      <div class="session-controls">
        <button class="ctrl-btn btn-start">
          <span class="icon icon-play"></span>
        </button>
        <button class="ctrl-btn btn-pause" disabled>
          <span class="icon icon-pause"></span>
        </button>
        <button class="ctrl-btn btn-stop" disabled>
          <span class="icon icon-stop"></span>
        </button>
      </div>

      <div class="session-info">
        <div>Start: <span class="start-time">--:--:--</span></div>
        <div>Duration: <span class="duration">--:--:--</span></div>
      </div>
    </div>
  `);

  const cluster = container.querySelector('.session-cluster');
  const btnStart = cluster.querySelector('.btn-start');
  const btnPause = cluster.querySelector('.btn-pause');
  const btnStop  = cluster.querySelector('.btn-stop');
  const startEl  = cluster.querySelector('.start-time');
  const durEl    = cluster.querySelector('.duration');

  let state = 'IDLE';
  let startTimestamp = null;
  let timer = null;

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatClock(date) {
    return date.toTimeString().slice(0, 8);
  }

  function updateDuration() {
    if (state !== 'RUNNING') return;
    const elapsed = Date.now() - startTimestamp;
    durEl.textContent = formatTime(elapsed);
  }

  function setState(newState) {
    state = newState;

    cluster.classList.remove('state-idle', 'state-running', 'state-paused');
    cluster.classList.add(`state-${newState.toLowerCase()}`);

    if (state === 'IDLE') {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled  = true;
    }

    if (state === 'RUNNING') {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled  = false;
    }

    if (state === 'PAUSED') {
      btnStart.disabled = false; // acts as resume
      btnPause.disabled = true;
      btnStop.disabled  = false;
    }
  }

  function start() {
    startTimestamp = Date.now();
    startEl.textContent = formatClock(new Date());
    durEl.textContent = '00:00:00';

    if (timer) clearInterval(timer);
    timer = setInterval(updateDuration, 250);

    setState('RUNNING');
    callbacks.onStart?.();
  }

  function pause() {
    if (state !== 'RUNNING') return;

    clearInterval(timer);
    timer = null;

    setState('PAUSED');
    callbacks.onPause?.();
  }

  function stop() {
    clearInterval(timer);
    timer = null;

    startTimestamp = null;
    startEl.textContent = '--:--:--';
    durEl.textContent = '--:--:--';

    setState('IDLE');
    callbacks.onStop?.();
  }

  btnStart.addEventListener('click', () => {
    if (state === 'IDLE') start();
    else if (state === 'PAUSED') start(); // reset per your requirement
  });

  btnPause.addEventListener('click', pause);
  btnStop.addEventListener('click', stop);

  setState('IDLE');

  return {
    start,
    pause,
    stop,
    getState: () => state
  };
}

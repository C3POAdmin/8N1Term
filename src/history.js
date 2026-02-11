import './style.css';
import './components.css';
import { renderRXBytes }  from './renderer.js';
import { addToggle } 	  from'./components.js';
import { emit, listen }   from '@tauri-apps/api/event'

const 	root 		 	= document.getElementById('app');
let		historyArray	= [];
let 	auto_history 	= true;

await   renderApp();
await	startListeners();

function renderHistory(historyArray) {
  const el = document.querySelector("#select_history");
  el.innerHTML = ""; // clear previous content

  const df = document.createDocumentFragment();
  let hasHistory = false;

  for (let i = historyArray.length - 1; i >= 0; i--) {
    const h = historyArray[i];
	console.log(h);
    if (!h || h.length === 0) continue;

    hasHistory = true;

    const btn = document.createElement("button");
    btn.classList.add("component-btn", "ft-btn-column");
    btn.type = "button";
    btn.dataset.history = i;

    const frag = renderRXBytes(h, true);
    btn.appendChild(frag);

    df.appendChild(btn);
  }

  if (!hasHistory) {
    const hint = document.createElement("div");
    hint.className = "ft-hint";
    hint.textContent = "No history yet";

	hint.style.textAlign = "center";
	hint.style.width = "98%";
	hint.style.padding = "10px 0";
    el.appendChild(hint);
    return;
  }

  el.appendChild(df);
}

function handleHistory() {
  const root = document.getElementById("select_history");

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".component-btn");
    if (!btn) return;

    const idx = Number(btn.dataset.history);
	console.log('[History Click]',historyArray[idx]);
	if(!historyArray[idx])
		return;


	if(auto_history == false) {
		emit('history_to_tx',historyArray[idx]);
		return;
	} 
	try {
		emit('history_to_send',historyArray[idx]);
	} catch (e) {
		console.log('history_to_send',e);
	}
  });
}

function timeAgo(epochMs) {
  const now = Date.now();
  const diff = Math.max(0, now - epochMs);

  const sec = 1000;
  const min = 60 * sec;
  const hour = 60 * min;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < 30 * sec) return "now";
  if (diff < 90 * sec) return "1 min ago";

  const mins = Math.round(diff / min);
  if (mins < 10) return `${mins} mins ago`;
  if (mins < 15) return "10 mins ago";
  if (mins < 20) return "15 mins ago";
  if (mins < 30) return "20 mins ago";
  if (mins < 45) return "30 mins ago";
  if (mins < 60) return "45 mins ago";

  const hours = Math.round(diff / hour);
  if (hours < 2) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.round(diff / day);
  if (days < 2) return "1 day ago";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.round(diff / week);
  if (weeks < 2) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;

  const months = Math.round(diff / month);
  if (months < 2) return "1 month ago";
  if (months < 12) return `${months} months ago`;

  const years = Math.round(diff / year);
  return years < 2 ? "1 year ago" : `${years} years ago`;
}

function startEpochUpdater(intervalMs = 1000) {
  function update() {
    const now = Date.now();

    document.querySelectorAll('.epoc[data-epoc]').forEach(el => {
      const epoch = Number(el.dataset.epoc);
      if (!epoch || epoch > now) return;

      const text = timeAgo(epoch);
      if (el.textContent !== text) {
        el.textContent = text;
      }
    });
  }

  update();
  return setInterval(update, intervalMs);
}

function startListeners() {
	listen("history_update", e => {
		try {
			console.log('[history_update]',e.payload);
			historyArray = e.payload;
			renderHistory(e.payload);
			handleHistory();
		} catch (e) {
			console.log('[startListeners] history_update Error:',e);
		}
	});
	emit("history_get");	
}

function renderApp() {
	root.innerHTML = 
	`<div class="ft-wrap" style="padding-bottom:2px;padding:5px;" role="table" id="select_history"></div>
	 <div style="margin-top:5px;margin-left:-10px" id="auto-send-outer"></div>`;
    const el = document.querySelector("#auto-send-outer");
	const tog_auto_history = addToggle(el, {
		label: "Auto Send",
		initial: auto_history,
		onChange: (label, state) => {
			console.log(label, state);
			auto_history = state;
		}
	});
}

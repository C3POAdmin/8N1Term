// NOTE:
// state.value is intentional.
// Wrapping primitives in a state object allows components to mutate shared truth
// without relying on closures, globals, or callback chains.
// This keeps reads simple (if (state.value)) and makes state inspectable/debuggable.

export function addButton(parent, {
  label,
  onClick,
  className = "",
  style = ""
}) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = className;
  if (style) btn.style.cssText = style;
  if (onClick) btn.addEventListener("click", onClick);

  parent.appendChild(btn);
  return btn;
}

/**************** USAGE ***********************
const AUTO_SEND = { value: false }; // because objects are pointers and primiteves (bools) will copy and not change within the function.

addToggle(panel, {
  label: "Auto send",
  state: AUTO_SEND
});

if (AUTO_SEND.value) {
  sendFrame();
}
**************************/


export function addToggle(parent, {
  label = "",
  state,              // { value: boolean }
  onChange,
  text_width
}) {
  if (!state || typeof state.value !== "boolean") {
    throw new Error("addToggle requires state: { value: boolean }");
  }

  const wrap = document.createElement("div");
  wrap.className = "ft-toggle-wrap";

  const lbl = document.createElement("span");
  lbl.className = "ft-toggle-label";
  lbl.textContent = label;

  if (typeof text_width === "number") {
    lbl.style.width = `${text_width}px`;
  }

  const btn = document.createElement("button");
  btn.className = "ft-toggle" + (state.value ? " on" : "");
  btn.type = "button";

  const knob = document.createElement("div");
  knob.className = "ft-toggle-knob";

  btn.appendChild(knob);
  wrap.appendChild(lbl);
  wrap.appendChild(btn);

  const apply = (fire = true) => {
    btn.classList.toggle("on", state.value);
    if (fire && typeof onChange === "function") {
      onChange(label, state.value);
    }
  };

  btn.addEventListener("click", () => {
    state.value = !state.value;
    apply(true);
  });

  // minimal, explicit API
  wrap.set = (v) => {
    state.value = !!v;
    apply(false);
  };

  wrap.get = () => state.value;

  parent.appendChild(wrap);
  return wrap;
}

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

export function addToggle(parent, {
  label = "",
  initial = false,
  onChange,
  text_width
}) {
  let state = !!initial;

  const wrap = document.createElement("div");
  wrap.className = "ft-toggle-wrap";

  const lbl = document.createElement("span");
  lbl.className = "ft-toggle-label";
  lbl.textContent = label;

  if (typeof text_width === "number") {
    lbl.style.width = `${text_width}px`;
  }

  const btn = document.createElement("button");
  btn.className = "ft-toggle" + (state ? " on" : "");
  btn.type = "button";

  const knob = document.createElement("div");
  knob.className = "ft-toggle-knob";

  btn.appendChild(knob);
  wrap.appendChild(lbl);
  wrap.appendChild(btn);

  const setState = (v, fire = true) => {
    state = !!v;
    btn.classList.toggle("on", state);
    if (fire && typeof onChange === "function") {
      onChange(label, state);
    }
  };

  btn.addEventListener("click", () => setState(!state));

  // minimal, explicit API
  wrap.set = (v) => setState(v, false);
  wrap.get = () => state;

  parent.appendChild(wrap);
  return wrap;
}

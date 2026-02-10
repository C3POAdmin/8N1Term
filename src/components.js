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

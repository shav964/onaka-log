// 画面部品の共通処理

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'open') el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  appendKids(el, kids);
  return el;
}

function appendKids(el, kids) {
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) appendKids(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

// 下から出てくるシート。重ねて開ける
export function openSheet({ title, body, foot, onClose }) {
  const overlay = h('div', { class: 'sheet-wrap' });
  const bodyEl = h('div', { class: 'sheet-body' }, body);
  // 未入力の赤枠は、その項目を触ったら消す
  bodyEl.addEventListener('click', (e) => e.target.closest('.missing')?.classList.remove('missing'));
  const footEl = h('div', { class: 'sheet-foot' }, foot);
  const titleEl = h('div', { class: 'sheet-title' }, title);
  const api = {
    body: bodyEl,
    foot: footEl,
    closed: false,
    close() {
      if (api.closed) return;
      api.closed = true;
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 220);
      if (!document.querySelector('.sheet-wrap.open')) document.body.classList.remove('noscroll');
      if (onClose) onClose();
    },
  };
  overlay.append(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'sheet-head' },
      titleEl,
      h('button', { type: 'button', class: 'sheet-close', onclick: () => api.close() }, '閉じる')),
    bodyEl,
    foot ? footEl : null));
  document.body.append(overlay);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => overlay.classList.add('open'));
  return api;
}

let toastTimer;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status' });
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// 画面中央のダイアログ
export function dialog({ title, body, buttons, tone }) {
  const overlay = h('div', { class: 'dialog-wrap' });
  const close = () => overlay.remove();
  overlay.append(h('div', { class: 'dialog' + (tone ? ' ' + tone : ''), role: 'alertdialog', 'aria-modal': 'true' },
    h('div', { class: 'dialog-title' }, title),
    h('div', { class: 'dialog-body' }, body),
    h('div', { class: 'dialog-btns' }, buttons.map((b) =>
      h('button', { type: 'button', class: 'btn ' + (b.cls || ''), onclick: () => { close(); if (b.onclick) b.onclick(); } }, b.label)))));
  document.body.append(overlay);
  return close;
}

export function confirmDialog(title, message, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    dialog({
      title,
      body: message,
      buttons: [
        { label: 'やめる', onclick: () => resolve(false) },
        { label: okLabel, cls: danger ? 'danger' : 'primary', onclick: () => resolve(true) },
      ],
    });
  });
}

// 横並びの選択ボタン。clearable なら選択中をもう一度押すと外れる
export function seg(opts, get, set, { cols, clearable, cls = '' } = {}) {
  const wrap = h('div', { class: 'seg ' + cls });
  wrap.style.gridTemplateColumns = `repeat(${cols || opts.length}, minmax(0, 1fr))`;
  const btns = opts.map(([v, label]) => h('button', {
    type: 'button',
    class: 'seg-btn',
    onclick: () => { set(clearable && get() === v ? undefined : v); mark(); },
  }, label));
  function mark() { btns.forEach((b, i) => b.classList.toggle('on', get() === opts[i][0])); }
  wrap.append(...btns);
  mark();
  wrap.mark = mark;
  return wrap;
}

// 数値スケール＋選んだ値の基準文
export function scale(get, set, textFn, { max = 10, clearable } = {}) {
  const crit = h('div', { class: 'crit' });
  const upd = () => {
    const v = get();
    crit.textContent = v == null ? '未選択' : textFn(v);
    crit.classList.toggle('empty', v == null);
  };
  const opts = Array.from({ length: max + 1 }, (_, i) => [i, String(i)]);
  const s = seg(opts, get, (v) => { set(v); upd(); }, { cls: 'num', clearable });
  upd();
  return h('div', null, s, crit);
}

// 項目の枠
export function field(label, content, { key, req, hint } = {}) {
  return h('section', { class: 'field', 'data-key': key },
    h('div', { class: 'field-head' },
      h('span', { class: 'field-label' }, label),
      req === true ? h('span', { class: 'mark req' }, '必須') : req === false ? h('span', { class: 'mark' }, '任意') : null,
      hint ? h('span', { class: 'field-hint' }, hint) : null),
    content);
}

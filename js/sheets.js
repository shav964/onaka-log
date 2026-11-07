// 記録入力シート（うんち・1日の記録・週次評価・食事・症状）

import { h, openSheet, toast, seg, scale, field, dialog, confirmDialog } from './ui.js';
import {
  state, bus, saveEntry, removeEntry, saveDish, saveFood, byCount,
  dailyFor, prevDaily, stoolsOn, weeklyFor, dailiesBetween, groupOf, isFodmap, intakeName,
} from './store.js';
import {
  BRISTOL, STOOL_DETAIL, RED_FLAG_COLORS, GROUPS, GAS_FREQ, GAS_SMELL, SLEEP,
  WEEKLY_Q, SYMPTOMS, severityText, sleepQualityText, sssLevel,
} from './config.js';
import {
  today, ymd, parseYmd, addDays, fmtDate, fmtDateTime, toInputDT, fromInputDT, uid, clone,
  editableDailyDates, defaultDailyDate, isDailyEditable, dailyDeadline, lastSunday,
} from './util.js';
import { bristolSvg } from './bristol.js';

const YES_NO = [[true, 'はい'], [false, 'いいえ']];

function timeField(get, set) {
  return field('日時', h('input', {
    type: 'datetime-local', class: 'input', value: toInputDT(get()),
    onchange: (e) => { if (e.target.value) set(fromInputDT(e.target.value)); },
  }));
}

function footButtons(onSave, onDelete) {
  return h('div', { class: 'foot-row' },
    onDelete ? h('button', { type: 'button', class: 'btn danger-outline', onclick: onDelete }, '削除') : null,
    h('button', { type: 'button', class: 'btn primary grow', onclick: onSave }, '保存'));
}

function deleter(entry, sheet, label) {
  if (!entry) return null;
  return async () => {
    if (!(await confirmDialog('削除しますか？', `この${label}の記録を削除します。元に戻せません。`, '削除', true))) return;
    await removeEntry(entry.id);
    sheet.close();
    toast('削除しました');
  };
}

function markMissing(sheet, keys) {
  sheet.body.querySelectorAll('.missing').forEach((el) => el.classList.remove('missing'));
  for (const k of keys) sheet.body.querySelector(`[data-key="${k}"]`)?.classList.add('missing');
  sheet.body.querySelector('.missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 受診をすすめる表示
export function showRedFlag(onRecord) {
  const picks = { blood: false, black: false, white: false };
  const opt = (k, label) => {
    const b = h('button', {
      type: 'button', class: 'check',
      onclick: () => { picks[k] = !picks[k]; b.classList.toggle('on', picks[k]); },
    }, label);
    return b;
  };
  dialog({
    tone: 'alert',
    title: '早めに消化器内科を受診してください',
    body: [
      h('p', null, '血が混じる便、黒くてドロッとした（タール状の）便、白っぽい・灰色の便は、消化管からの出血や胆道の病気などのサインのことがあります。'),
      h('p', null, '量が多い出血、ふらつき、強い腹痛、発熱があるときは、ためらわず救急を受診してください。'),
      onRecord ? h('div', { class: 'checks' },
        h('div', { class: 'muted small' }, 'この便の記録に残す（あてはまるもの）'),
        opt('blood', '血が混じっていた'),
        opt('black', '黒くてドロッとしていた'),
        opt('white', '白っぽい／灰色だった')) : null,
    ],
    buttons: [{ label: onRecord ? '記録に反映して閉じる' : '閉じる', cls: 'primary', onclick: () => onRecord && onRecord(picks) }],
  });
}

/* ---------- うんち ---------- */

export function openStool(existing, { presetDate } = {}) {
  const isNew = !existing;
  const d = existing ? clone(existing.data) : {};
  // 過去の日の分を後から記録するときは、その日の12:00を初期値にする
  let at = new Date().toISOString();
  if (existing) at = existing.at;
  else if (presetDate && presetDate !== today()) {
    const p = parseYmd(presetDate);
    p.setHours(12, 0, 0, 0);
    at = p.toISOString();
  }
  let detailOpen = !!existing && STOOL_DETAIL.some((x) => d[x.key] != null);
  let saving = false;

  const desc = h('div', { class: 'crit' });
  const updDesc = () => {
    const b = BRISTOL.find((x) => x.t === d.bristol);
    desc.textContent = b ? `タイプ${b.t}：${b.desc}（${b.zone}）` : 'いちばん近い形をタップ';
    desc.classList.toggle('empty', !b);
  };
  const bbtns = BRISTOL.map((b) => h('button', {
    type: 'button', class: 'bristol-btn k-' + b.kind,
    onclick: () => { d.bristol = b.t; markB(); updDesc(); auto(); },
  }, h('span', { class: 'bt-num' }, b.t), h('span', { class: 'bt-img', html: bristolSvg(b.t) }), h('span', { class: 'bt-label' }, b.label)));
  const markB = () => bbtns.forEach((x, i) => x.classList.toggle('on', BRISTOL[i].t === d.bristol));
  markB(); updDesc();

  const refreshed = seg(YES_NO, () => d.refreshed, (v) => { d.refreshed = v; auto(); }, { cls: 'big' });

  // 2タップで保存（新規かつ詳細を開いていないとき）
  function auto() {
    if (isNew && !detailOpen && d.bristol && typeof d.refreshed === 'boolean') save();
  }

  const warn = h('div', { class: 'warn-line', hidden: true }, '受診をすすめる所見があります。早めに消化器内科へ。');
  const updWarn = () => { warn.hidden = !(d.blood === true || RED_FLAG_COLORS.includes(d.color)); };

  const detailSegs = [];
  const detailBox = h('div', { class: 'detail-box', hidden: !detailOpen },
    STOOL_DETAIL.map((x) => {
      const s = seg(x.opts, () => d[x.key], (v) => { if (v === undefined) delete d[x.key]; else d[x.key] = v; updWarn(); }, { clearable: true, cols: x.cols });
      detailSegs.push(s);
      return field(x.label, s);
    }));
  const detailToggle = h('button', {
    type: 'button', class: 'btn block',
    onclick: () => { detailOpen = !detailOpen; detailBox.hidden = !detailOpen; detailToggle.textContent = detailOpen ? '詳しく記録を閉じる' : '詳しく記録（任意）'; },
  }, detailOpen ? '詳しく記録を閉じる' : '詳しく記録（任意）');

  const redBtn = h('button', {
    type: 'button', class: 'btn danger-outline block',
    onclick: () => showRedFlag((p) => {
      if (p.blood) d.blood = true;
      if (p.black) d.color = 'black';
      else if (p.white) d.color = 'white';
      detailOpen = true; detailBox.hidden = false; detailToggle.textContent = '詳しく記録を閉じる';
      detailSegs.forEach((s) => s.mark()); updWarn();
    }),
  }, '血・黒い便・白っぽい便');
  updWarn();

  const sheet = openSheet({
    title: isNew ? 'うんちの記録' : 'うんちの記録を修正',
    body: [
      isNew ? h('div', { class: 'note' }, '形と「スッキリした？」を選ぶと自動で保存します。') : null,
      field('便の形（ブリストル）', [h('div', { class: 'bristol-grid' }, bbtns), desc], { key: 'bristol', req: true }),
      field('スッキリした？', refreshed, { key: 'refreshed', req: true }),
      redBtn, warn,
      timeField(() => at, (v) => { at = v; }),
      detailToggle, detailBox,
    ],
    foot: footButtons(save, deleter(existing, { close: () => sheet.close() }, 'うんち')),
  });

  async function save() {
    if (saving) return;
    const miss = [];
    if (!d.bristol) miss.push('bristol');
    if (typeof d.refreshed !== 'boolean') miss.push('refreshed');
    if (miss.length) { markMissing(sheet, miss); toast('形と「スッキリした？」を選んでください'); return; }
    saving = true;
    d.good = d.bristol >= 3 && d.bristol <= 5 && d.refreshed === true;
    await saveEntry({ id: existing?.id || uid(), type: 'stool', at, data: d, note: existing?.note || '' });
    // 「排便なし」と記録済みの日にうんちを足したら、その確認を外す
    const daily = dailyFor(ymd(new Date(at)));
    if (daily?.data.noStool) await saveEntry({ ...daily, data: { ...daily.data, noStool: false } });
    sheet.close();
    toast(`保存しました：タイプ${d.bristol}${d.good ? '・良便' : ''}`);
  }
}

/* ---------- 1日の記録 ---------- */

const REQ_DAILY = [
  ['painMax', '腹痛'], ['bloatingMax', '張り'], ['heavinessMax', '胃もたれ'], ['gasFreq', 'おならの頻度'],
  ['gasSmell', 'おならのにおい'], ['stress', 'ストレス'], ['sleepHours', '睡眠時間'],
];
const COPY_KEYS = ['painMax', 'bloatingMax', 'heavinessMax', 'gasFreq', 'gasSmell', 'stress', 'sleepHours',
  'coffeeCups', 'fatigue', 'mood', 'sleepQuality'];
const OPTIONAL_KEYS = ['fatigue', 'mood', 'sleepQuality'];

export function openDaily(dateArg) {
  const dates = editableDailyDates();
  let date = dates.includes(dateArg) ? dateArg : defaultDailyDate();
  if (!dates.includes(date)) date = dates[dates.length - 1];
  let d, existing, prev, saving = false;

  function init() {
    existing = dailyFor(date);
    prev = prevDaily(date);
    if (existing) {
      d = clone(existing.data);
      d.note = existing.note || '';
    } else {
      d = { intake: [], dishes: [], meds: [], coffeeCups: 0, note: '' };
      if (prev) {
        for (const k of COPY_KEYS) if (prev.data[k] != null) d[k] = prev.data[k];
        // 毎日食べる「おなかにやさしい」グループだけ前日の値を初期値にする
        d.intake = (prev.data.intake || []).filter((id) => groupOf(id) === 'gentle');
        d.meds = [...(prev.data.meds || [])];
      }
    }
    d.date = date;
  }

  const onChange = () => renderStoolBox();
  bus.addEventListener('change', onChange);

  const sheet = openSheet({
    title: '1日の記録',
    body: [],
    foot: footButtons(save, null),
    onClose: () => bus.removeEventListener('change', onChange),
  });

  let stoolBox;
  function renderStoolBox() {
    if (!stoolBox) return;
    const n = stoolsOn(date).length;
    if (n) {
      stoolBox.replaceChildren(
        h('div', { class: 'row-between' },
          h('span', null, `この日の排便：`, h('b', null, `${n}回`), '（記録済み）'),
          h('button', { type: 'button', class: 'btn small', onclick: () => openStool(null, { presetDate: date }) }, 'うんちを追加')));
    } else {
      const t = h('button', {
        type: 'button', class: 'check' + (d.noStool ? ' on' : ''),
        onclick: () => { d.noStool = !d.noStool; t.classList.toggle('on', !!d.noStool); },
      }, 'この日は排便なし');
      stoolBox.replaceChildren(
        h('div', { class: 'muted small' }, 'この日の排便記録がありません。記録忘れでなければ「排便なし」を押してください。'),
        h('div', { class: 'row-gap' }, t,
          h('button', { type: 'button', class: 'btn small', onclick: () => openStool(null, { presetDate: date }) }, 'うんちを記録')));
    }
  }

  function build() {
    const t = today();
    const dl = dailyDeadline(date);
    stoolBox = h('div', { class: 'stool-box' });
    renderStoolBox();
    const hasOptional = OPTIONAL_KEYS.some((k) => existing && existing.data[k] != null) || (existing && existing.note);

    sheet.body.replaceChildren(...[
      h('div', { class: 'daybar' },
        h('div', { class: 'daybar-date' }, fmtDate(date), h('small', null, ' の記録')),
        dates.length > 1 ? seg(dates.map((s) => [s, s === t ? '今日' : '昨日']), () => date, (v) => { date = v; init(); build(); }) : null,
        h('div', { class: 'daybar-sub' }, `締め切り ${fmtDateTime(dl)}　症状は「この日いちばん強かったとき」、睡眠は「この日の朝までの睡眠」`)),
      existing ? h('div', { class: 'note' }, '入力済みの記録を修正しています。')
        : prev ? h('div', { class: 'note' }, '前回の値が入っています。変わらない項目はそのまま保存でOK。') : null,
      field('腹痛（いちばん強かったとき）', scale(() => d.painMax, (v) => { d.painMax = v; }, severityText), { key: 'painMax', req: true }),
      field('張り・膨満感（いちばん強かったとき）', scale(() => d.bloatingMax, (v) => { d.bloatingMax = v; }, severityText), { key: 'bloatingMax', req: true }),
      field('胃もたれ（いちばん強かったとき）', scale(() => d.heavinessMax, (v) => { d.heavinessMax = v; }, severityText), { key: 'heavinessMax', req: true }),
      field('おならの頻度', scale(() => d.gasFreq, (v) => { d.gasFreq = v; }, (v) => `${v}：${GAS_FREQ[v]}`, { max: 4 }), { key: 'gasFreq', req: true }),
      field('おならのにおい', scale(() => d.gasSmell, (v) => { d.gasSmell = v; }, (v) => `${v}：${GAS_SMELL[v]}`, { max: 3 }), { key: 'gasSmell', req: true }),
      field('ストレス', scale(() => d.stress, (v) => { d.stress = v; }, severityText), { key: 'stress', req: true }),
      field('睡眠時間（この日の朝まで）', seg(SLEEP, () => d.sleepHours, (v) => { d.sleepHours = v; }), { key: 'sleepHours', req: true }),
      field('今日とったもの', intakeUI(d, () => prev), { hint: 'あてはまるものだけタップ' }),
      field('排便', stoolBox, { key: 'noStool', req: true }),
      h('details', { class: 'more', open: !!hasOptional },
        h('summary', null, '詳しく記録（任意）'),
        field('疲労感', scale(() => d.fatigue, (v) => { d.fatigue = v; }, severityText, { clearable: true })),
        field('気分の落ち込み', scale(() => d.mood, (v) => { d.mood = v; }, severityText, { clearable: true })),
        field('睡眠の質（高いほど良い）', scale(() => d.sleepQuality, (v) => { d.sleepQuality = v; }, sleepQualityText, { clearable: true })),
        state.meds.length ? field('薬・サプリ（飲んだもの）', medsUI(d)) : null,
        field('メモ', h('textarea', { class: 'input', rows: 3, value: d.note || '', oninput: (e) => { d.note = e.target.value; } }))),
    ].filter(Boolean));
  }

  async function save() {
    if (saving) return;
    if (!isDailyEditable(date)) { toast('締め切りを過ぎたため保存できません'); return; }
    const n = stoolsOn(date).length;
    const miss = REQ_DAILY.filter(([k]) => d[k] == null);
    if (!n && !d.noStool) miss.push(['noStool', '排便の確認']);
    if (miss.length) {
      markMissing(sheet, miss.map((m) => m[0]));
      toast('未入力：' + miss.map((m) => m[1]).join('、'));
      return;
    }
    saving = true;
    if (n) d.noStool = false;
    const before = existing?.data.dishes || [];
    for (const id of d.dishes) {
      const dish = state.dishes.find((x) => x.id === id);
      if (dish && !before.includes(id)) await saveDish({ ...dish, count: (dish.count || 0) + 1 });
    }
    const note = (d.note || '').trim();
    const data = { ...d, recordedAt: new Date().toISOString() };
    delete data.note;
    await saveEntry({ id: 'daily-' + date, type: 'daily', at: data.recordedAt, data, note });
    sheet.close();
    toast(`${fmtDate(date)} の記録を保存しました`);
  }

  init();
  build();
}

export const fodBadge = () => h('span', { class: 'fod', title: '高FODMAP' }, 'F');

// チェック項目の表示名（高FODMAPには F を付ける）
export const intakeLabel = (it) => [it.name, it.fodmap?.length ? fodBadge() : null];

// 今日とったものチェック（料理・グループ別チェック・飲み物）
function intakeUI(d, getPrev) {
  const chips = [];
  const fodLine = h('div', { class: 'fod-line' });
  const markAll = () => {
    chips.forEach(({ el, test }) => el.classList.toggle('on', test()));
    const fods = d.intake.filter(isFodmap);
    fodLine.replaceChildren(fodBadge(), fods.length ? ` 高FODMAP ${fods.length}項目：${fods.map(intakeName).join('、')}` : ' 高FODMAPの食材：なし');
  };

  const toggleItem = (id) => {
    d.intake = d.intake.includes(id) ? d.intake.filter((x) => x !== id) : [...d.intake, id];
    markAll();
  };
  const toggleDish = (dish) => {
    if (d.dishes.includes(dish.id)) {
      d.dishes = d.dishes.filter((x) => x !== dish.id);
      // ほかに選んでいる料理に含まれない項目だけ外す
      const keep = new Set(d.dishes.flatMap((id) => state.dishes.find((x) => x.id === id)?.items || []));
      d.intake = d.intake.filter((id) => !dish.items.includes(id) || keep.has(id));
    } else {
      d.dishes = [...d.dishes, dish.id];
      d.intake = [...new Set([...d.intake, ...dish.items])];
    }
    markAll();
  };

  const dishes = [...state.dishes].sort(byCount);
  const dishRow = dishes.length ? h('div', { class: 'chips' }, dishes.map((dish) => {
    const el = h('button', { type: 'button', class: 'chip dish', onclick: () => toggleDish(dish) }, dish.name);
    chips.push({ el, test: () => d.dishes.includes(dish.id) });
    return el;
  })) : null;

  const groups = GROUPS.map((g) => {
    const items = state.intake.filter((x) => x.group === g.id);
    if (!items.length) return null;
    return h('div', { class: 'grp g-' + g.id },
      h('div', { class: 'grp-name' }, g.name),
      h('div', { class: 'chips' }, items.map((it) => {
        const el = h('button', { type: 'button', class: 'chip', onclick: () => toggleItem(it.id) }, intakeLabel(it));
        chips.push({ el, test: () => d.intake.includes(it.id) });
        return el;
      })));
  });

  const coffee = seg([[0, '0'], [1, '1'], [2, '2'], [3, '3杯以上']], () => d.coffeeCups, (v) => { d.coffeeCups = v; });

  const sameBtn = h('button', {
    type: 'button', class: 'btn small',
    onclick: () => {
      const p = getPrev();
      if (!p) { toast('前回の記録がありません'); return; }
      d.intake = [...(p.data.intake || [])];
      d.dishes = [...(p.data.dishes || [])];
      d.coffeeCups = p.data.coffeeCups ?? 0;
      markAll(); coffee.mark();
      toast('前回と同じ内容にしました');
    },
  }, '前回と同じ');

  markAll();
  return h('div', null,
    h('div', { class: 'row-between sub-head' }, h('span', { class: 'muted small' }, '料理（タップでまとめてチェック）'), sameBtn),
    dishRow || h('div', { class: 'muted small' }, '料理は設定で登録できます'),
    groups,
    fodLine,
    h('div', { class: 'drink' }, h('span', { class: 'drink-label' }, 'コーヒー'), coffee));
}

function medsUI(d) {
  const chips = state.meds.map((m) => {
    const el = h('button', {
      type: 'button', class: 'chip' + (d.meds.includes(m.id) ? ' on' : ''),
      onclick: () => {
        d.meds = d.meds.includes(m.id) ? d.meds.filter((x) => x !== m.id) : [...d.meds, m.id];
        el.classList.toggle('on', d.meds.includes(m.id));
      },
    }, m.name);
    return el;
  });
  return h('div', { class: 'chips' }, chips);
}

/* ---------- 週次評価 ---------- */

export function openWeekly(sunArg) {
  const sun = sunArg || lastSunday(today());
  const existing = weeklyFor(sun);
  const d = existing ? clone(existing.data) : { weekEnd: sun };
  let saving = false;

  // 腹痛があった日数：直近10日のうち何日か ×10
  const painDays = dailiesBetween(addDays(sun, -9), sun).filter((e) => e.data.painMax > 0).length;
  const painDays10 = painDays * 10;
  const recDays = dailiesBetween(addDays(sun, -6), sun).length;

  const totalEl = h('div', { class: 'total' });
  const updTotal = () => {
    const done = WEEKLY_Q.every((q) => d[q.key] != null);
    const sum = WEEKLY_Q.reduce((a, q) => a + (d[q.key] ?? 0), 0) + painDays10;
    totalEl.replaceChildren(
      h('span', { class: 'muted' }, '合計'),
      h('b', { class: 'total-num' }, done ? sum : '—'),
      h('span', { class: 'muted' }, ' / 500'),
      done ? h('span', { class: 'tag' }, `目安：${sssLevel(sum)}`) : null);
  };

  const sliders = WEEKLY_Q.map((q) => {
    const val = h('b', { class: 'slider-val' }, d[q.key] ?? '未回答');
    const input = h('input', {
      type: 'range', min: 0, max: 100, step: 1, class: 'slider' + (d[q.key] == null ? ' untouched' : ''),
      value: d[q.key] ?? 50,
      oninput: (e) => { d[q.key] = +e.target.value; val.textContent = d[q.key]; input.classList.remove('untouched'); updTotal(); },
    });
    return field(q.label, h('div', null,
      h('div', { class: 'slider-row' }, input, val),
      h('div', { class: 'slider-ends' }, h('span', null, `0 ${q.lo}`), h('span', null, `${q.hi} 100`))), { key: q.key, req: true });
  });
  updTotal();

  const sheet = openSheet({
    title: '週次評価',
    body: [
      h('div', { class: 'daybar' },
        h('div', { class: 'daybar-date' }, `${fmtDate(addDays(sun, -6))} 〜 ${fmtDate(sun)}`),
        h('div', { class: 'daybar-sub' }, 'この1週間をふり返って、それぞれ0〜100で答えてください。正式な評価は病院で受けてください。')),
      recDays < 4 ? h('div', { class: 'banner' }, `この週の1日の記録は${recDays}日です。4日未満の週は週の評価から外れます（グラフでは「データ不足」）。`) : null,
      sliders,
      field('腹痛があった日数（自動）', h('div', null, `直近10日のうち ${painDays}日 → `, h('b', null, painDays10), ' 点')),
      totalEl,
      field('この1週間、お腹の症状は十分に楽だった？', seg(YES_NO, () => d.adequateRelief, (v) => { d.adequateRelief = v; }, { cls: 'big' }), { key: 'adequateRelief', req: true }),
    ],
    foot: footButtons(save, deleter(existing, { close: () => sheet.close() }, '週次評価')),
  });

  async function save() {
    if (saving) return;
    const miss = WEEKLY_Q.filter((q) => d[q.key] == null).map((q) => q.key);
    if (typeof d.adequateRelief !== 'boolean') miss.push('adequateRelief');
    if (miss.length) { markMissing(sheet, miss); toast('未回答の質問があります'); return; }
    saving = true;
    const total = WEEKLY_Q.reduce((a, q) => a + d[q.key], 0) + painDays10;
    await saveEntry({ id: 'weekly-' + sun, type: 'weekly', at: new Date().toISOString(), data: { ...d, painDays10, total }, note: '' });
    sheet.close();
    toast(`週次評価を保存しました（${total}点）`);
  }
}

/* ---------- 食事（任意） ---------- */

export function openMeal(existing) {
  const d = existing ? clone(existing.data) : { items: [], tags: [], amount: 'normal' };
  let at = existing ? existing.at : new Date().toISOString();
  let saving = false;
  const chips = [];
  const markAll = () => chips.forEach(({ el, test }) => el.classList.toggle('on', test()));

  const selected = h('div', { class: 'chips' });
  function renderSelected() {
    selected.replaceChildren(...(d.items.length ? d.items.map((name) => h('button', {
      type: 'button', class: 'chip on',
      onclick: () => { d.items = d.items.filter((x) => x !== name); renderSelected(); markAll(); },
    }, name, ' ×')) : [h('span', { class: 'muted small' }, 'まだ選んでいません')]));
  }

  const toggleFood = (f) => {
    if (d.items.includes(f.name)) d.items = d.items.filter((x) => x !== f.name);
    else {
      d.items = [...d.items, f.name];
      d.tags = [...new Set([...d.tags, ...(f.tags || [])])];
    }
    renderSelected(); markAll();
  };

  const foodRow = h('div', { class: 'chips' });
  function renderFoods() {
    chips.splice(0, chips.length);
    foodRow.replaceChildren(...[...state.foods].sort(byCount).map((f) => {
      const el = h('button', { type: 'button', class: 'chip', onclick: () => toggleFood(f) }, f.name);
      chips.push({ el, test: () => d.items.includes(f.name) });
      return el;
    }));
    tagChips.forEach((c) => chips.push(c));
    markAll();
  }

  const input = h('input', { type: 'text', class: 'input', placeholder: '新しい食べもの', enterkeyhint: 'done' });
  const addNew = async () => {
    const name = input.value.trim();
    if (!name) return;
    input.value = '';
    let f = state.foods.find((x) => x.name === name);
    if (!f) { f = { id: uid(), name, tags: [], count: 0 }; await saveFood(f); }
    if (!d.items.includes(name)) d.items = [...d.items, name];
    renderFoods(); renderSelected();
  };

  const tagChips = [];
  const groups = GROUPS.map((g) => {
    const items = state.intake.filter((x) => x.group === g.id);
    if (!items.length) return null;
    return h('div', { class: 'grp g-' + g.id },
      h('div', { class: 'grp-name' }, g.name),
      h('div', { class: 'chips' }, items.map((it) => {
        const el = h('button', {
          type: 'button', class: 'chip',
          onclick: () => { d.tags = d.tags.includes(it.id) ? d.tags.filter((x) => x !== it.id) : [...d.tags, it.id]; markAll(); },
        }, intakeLabel(it));
        tagChips.push({ el, test: () => d.tags.includes(it.id) });
        return el;
      })));
  });

  const sheet = openSheet({
    title: existing ? '食事の記録を修正' : '食事の記録（任意）',
    body: [
      h('div', { class: 'note' }, '特定の食べものを確かめたい時期だけ使えばOK。ふだんは「1日の記録」のチェックで十分です。'),
      timeField(() => at, (v) => { at = v; }),
      field('よく食べるもの', [foodRow, h('div', { class: 'row-gap' }, input, h('button', { type: 'button', class: 'btn', onclick: addNew }, '追加'))]),
      field('食べたもの', selected),
      field('タグ', groups),
      field('量', seg([['small', '少なめ'], ['normal', '普通'], ['large', '多め']], () => d.amount, (v) => { d.amount = v; })),
    ],
    foot: footButtons(save, deleter(existing, { close: () => sheet.close() }, '食事')),
  });
  renderFoods(); renderSelected();

  async function save() {
    if (saving) return;
    if (input.value.trim()) await addNew();
    if (!d.items.length && !d.tags.length) { toast('食べたものかタグを選んでください'); return; }
    saving = true;
    const before = existing?.data.items || [];
    for (const name of d.items) {
      const f = state.foods.find((x) => x.name === name);
      if (f && !before.includes(name)) await saveFood({ ...f, count: (f.count || 0) + 1 });
    }
    await saveEntry({ id: existing?.id || uid(), type: 'meal', at, data: d, note: existing?.note || '' });
    sheet.close();
    toast('食事を保存しました');
  }
}

/* ---------- 症状（任意） ---------- */

export function openSymptom(existing) {
  const d = existing ? clone(existing.data) : {};
  let at = existing ? existing.at : new Date().toISOString();
  let saving = false;
  const sheet = openSheet({
    title: existing ? '症状の記録を修正' : '症状の記録（任意）',
    body: [
      h('div', { class: 'note' }, 'いま、この瞬間の強さを記録します。気になる症状だけ選べばOK（もう一度押すと外れます）。'),
      timeField(() => at, (v) => { at = v; }),
      SYMPTOMS.map(([k, label]) => field(label, scale(() => d[k], (v) => {
        if (v === undefined) delete d[k]; else d[k] = v;
        sheet.body.querySelectorAll('.missing').forEach((el) => el.classList.remove('missing'));
      }, severityText, { clearable: true }), { key: k })),
    ],
    foot: footButtons(save, deleter(existing, { close: () => sheet.close() }, '症状')),
  });
  async function save() {
    if (saving) return;
    if (SYMPTOMS.every(([k]) => d[k] == null)) {
      markMissing(sheet, SYMPTOMS.map(([k]) => k));
      toast('どれか1つは選んでください');
      return;
    }
    saving = true;
    await saveEntry({ id: existing?.id || uid(), type: 'symptom', at, data: d, note: existing?.note || '' });
    sheet.close();
    toast('症状を保存しました');
  }
}

/* ---------- ＋メニュー ---------- */

export function openPlusMenu() {
  const go = (fn) => () => { sheet.close(); fn(); };
  const item = (label, sub, fn, cls = '') => h('button', { type: 'button', class: 'menu-item ' + cls, onclick: go(fn) },
    h('span', { class: 'menu-label' }, label), h('span', { class: 'menu-sub' }, sub));
  const sheet = openSheet({
    title: '記録する',
    body: h('div', { class: 'menu' },
      item('うんち', '形とスッキリしたか（2タップ）', () => openStool(null), 'primary'),
      item('1日の記録', '1日1回・約30秒', () => openDaily()),
      item('食事', '任意。確かめたい時期だけ', () => openMeal(null)),
      item('症状', '任意。腹痛・張り・胃もたれが強いときに', () => openSymptom(null)),
      item('週次評価', '日曜の夜に。1〜2分', () => openWeekly())),
  });
}

export function openEntry(e) {
  if (e.type === 'stool') openStool(e);
  else if (e.type === 'meal') openMeal(e);
  else if (e.type === 'symptom') openSymptom(e);
  else if (e.type === 'weekly') openWeekly(e.data.weekEnd);
  else if (e.type === 'daily') {
    if (isDailyEditable(e.data.date)) openDaily(e.data.date);
    else toast('締め切り（翌日の正午）を過ぎた記録は変更できません');
  }
}

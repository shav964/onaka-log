// 画面の骨組み（ヘッダー・タブ・今日の画面）

import { h, toast } from './ui.js';
import {
  state, bus, load, dailyFor, weeklyFor, stoolsOn, dailiesBetween, intakeName, groupOf, medName, isFodmap,
} from './store.js';
import { BRISTOL, SLEEP_LABEL, STOOL_DETAIL, RED_FLAG_COLORS, SYMPTOMS } from './config.js';
import {
  today, addDays, fmtDate, fmtTime, fmtDateTime, WD, parseYmd, entryDate,
  defaultDailyDate, dailyDeadline, weekStart, lastSunday,
} from './util.js';
import {
  openStool, openDaily, openWeekly, openPlusMenu, openEntry, showRedFlag, fodBadge,
} from './sheets.js';
import { renderSettings, applyTheme, THEME_KEY } from './settings.js';
import { renderCalendar, thisMonth } from './review.js';

const ui = { tab: 'today', viewDate: today(), month: thisMonth() };
const main = document.getElementById('main');
const header = document.getElementById('header');
const actionbar = document.getElementById('actionbar');

const TABS = [
  ['today', '今日'], ['review', '振り返り'], ['plus', '＋'], ['report', 'レポート'], ['settings', '設定'],
];

function renderTabs() {
  const bar = document.getElementById('tabbar');
  bar.replaceChildren(...TABS.map(([id, label]) => h('button', {
    type: 'button',
    class: 'tab' + (id === 'plus' ? ' tab-plus' : '') + (ui.tab === id ? ' on' : ''),
    'aria-label': id === 'plus' ? '記録する' : null,
    onclick: () => {
      if (id === 'plus') { openPlusMenu(); return; }
      ui.tab = id;
      if (id === 'today') ui.viewDate = today();
      if (id === 'review') ui.month = thisMonth();
      render();
      window.scrollTo(0, 0);
    },
  }, label)));
}

function renderHeader(left, right) {
  header.replaceChildren(h('div', { class: 'head-in' },
    h('div', { class: 'head-left' }, left),
    h('div', { class: 'head-right' }, right)));
}

/* ---------- 今日 ---------- */

const KIND_CLASS = { hard: 'warn', normal: 'good', loose: 'bad' };

function stat(num, label, cls = '') {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-num ' + cls }, num), h('div', { class: 'stat-label' }, label));
}

function tag(text, cls = '') { return h('span', { class: 'tag ' + cls }, text); }

const intakeTag = (id) => tag([intakeName(id), isFodmap(id) ? fodBadge() : null], 'g-' + groupOf(id));

function stoolCard(e) {
  const d = e.data;
  const b = BRISTOL.find((x) => x.t === d.bristol);
  const flags = [];
  if (d.blood) flags.push(tag('血', 'bad'));
  if (RED_FLAG_COLORS.includes(d.color)) flags.push(tag(STOOL_DETAIL[1].opts.find((o) => o[0] === d.color)[1], 'bad'));
  const details = STOOL_DETAIL
    .filter((x) => d[x.key] != null && x.key !== 'blood' && !(x.key === 'color' && RED_FLAG_COLORS.includes(d.color)))
    .map((x) => `${x.label.replace(/（.*）/, '')} ${x.opts.find((o) => o[0] === d[x.key])?.[1] ?? ''}`);
  return h('button', { type: 'button', class: 'card', onclick: () => openEntry(e) },
    h('div', { class: 'card-time' }, fmtTime(e.at), h('span', { class: 'card-type' }, 'うんち')),
    h('div', { class: 'card-main' },
      h('div', { class: 'numbox ' + KIND_CLASS[b.kind] }, d.bristol),
      h('div', { class: 'card-body' },
        h('div', { class: 'card-title' }, `タイプ${d.bristol}　${b.label}`),
        h('div', { class: 'card-sub' }, `${b.zone} ・ スッキリ ${d.refreshed ? 'した' : 'しない'}`)),
      h('div', { class: 'card-tags' }, d.good ? tag('良便', 'good') : null, flags)),
    details.length ? h('div', { class: 'card-foot' }, details.join(' ・ ')) : null);
}

function mealCard(e) {
  const d = e.data;
  const amount = { small: '少なめ', normal: '普通', large: '多め' }[d.amount];
  return h('button', { type: 'button', class: 'card', onclick: () => openEntry(e) },
    h('div', { class: 'card-time' }, fmtTime(e.at), h('span', { class: 'card-type' }, '食事')),
    h('div', { class: 'card-title' }, d.items.join('、') || '（タグのみ）'),
    h('div', { class: 'card-tags left' }, d.tags.map(intakeTag), amount ? tag('量 ' + amount) : null));
}

function symptomCard(e) {
  return h('button', { type: 'button', class: 'card', onclick: () => openEntry(e) },
    h('div', { class: 'card-time' }, fmtTime(e.at), h('span', { class: 'card-type' }, '症状')),
    h('div', { class: 'card-sub' }, SYMPTOMS.filter(([k]) => e.data[k] != null).map(([k, label], i) =>
      [i ? ' ・ ' : '', label.replace(/（.*）/, '') + ' ', h('b', null, e.data[k])])));
}

function dailyCard(e) {
  const d = e.data;
  const kv = (k, v) => h('div', { class: 'kv-cell' }, h('span', null, k), h('b', null, v));
  const dishes = (d.dishes || []).map((id) => state.dishes.find((x) => x.id === id)?.name).filter(Boolean);
  const opt = [];
  if (d.fatigue != null) opt.push(`疲労 ${d.fatigue}`);
  if (d.mood != null) opt.push(`気分の落ち込み ${d.mood}`);
  if (d.sleepQuality != null) opt.push(`睡眠の質 ${d.sleepQuality}`);
  if (d.meds?.length) opt.push('薬 ' + d.meds.map(medName).join('、'));
  return h('button', { type: 'button', class: 'card daily', onclick: () => openEntry(e) },
    h('div', { class: 'card-time' }, '1日の記録', h('span', { class: 'card-type' }, `入力 ${fmtDateTime(new Date(d.recordedAt))}`)),
    h('div', { class: 'kv-grid' },
      kv('腹痛', d.painMax), kv('張り', d.bloatingMax), kv('胃もたれ', d.heavinessMax ?? '—'), kv('ストレス', d.stress),
      kv('おなら', `${d.gasFreq}/${d.gasSmell}`), kv('睡眠', SLEEP_LABEL[d.sleepHours]),
      kv('コーヒー', d.coffeeCups ?? 0), kv('排便', stoolsOn(d.date).length ? `${stoolsOn(d.date).length}回` : d.noStool ? 'なし' : '—')),
    dishes.length ? h('div', { class: 'card-sub' }, '料理：' + dishes.join('、')) : null,
    h('div', { class: 'card-tags left' }, (d.intake || []).map(intakeTag)),
    (d.intake || []).some(isFodmap) ? h('div', { class: 'card-sub' }, fodBadge(), ` 高FODMAP ${(d.intake || []).filter(isFodmap).length}項目`) : null,
    opt.length ? h('div', { class: 'card-foot' }, opt.join(' ・ ')) : null,
    e.note ? h('div', { class: 'card-foot' }, 'メモ：' + e.note) : null);
}

function weeklyCard(e) {
  const d = e.data;
  return h('button', { type: 'button', class: 'card', onclick: () => openEntry(e) },
    h('div', { class: 'card-time' }, '週次評価', h('span', { class: 'card-type' }, `${fmtDate(addDays(d.weekEnd, -6))}〜`)),
    h('div', { class: 'card-sub' }, '合計 ', h('b', null, d.total), ' / 500 ・ 十分に楽だった：', d.adequateRelief ? 'はい' : 'いいえ'));
}

function banners(t) {
  const out = [];
  const now = new Date();
  const target = defaultDailyDate(now);
  if (!dailyFor(target)) {
    out.push(h('button', { type: 'button', class: 'banner action', onclick: () => openDaily(target) },
      `${fmtDate(target)} の1日の記録がまだです（締め切り ${fmtDateTime(dailyDeadline(target))}）`));
  }
  // 週次評価：日曜18時以降〜水曜まで
  const sun = lastSunday(t);
  const dow = parseYmd(t).getDay();
  const due = (dow === 0 && now.getHours() >= 18) || (dow >= 1 && dow <= 3);
  if (due && !weeklyFor(sun)) {
    out.push(h('button', { type: 'button', class: 'banner action', onclick: () => openWeekly(sun) },
      `週次評価（${fmtDate(addDays(sun, -6))}〜${fmtDate(sun)}）がまだです。1〜2分で終わります`));
  }
  if (state.entries.length >= 10) {
    const days = state.lastBackup ? (now - new Date(state.lastBackup)) / 864e5 : Infinity;
    if (days > 14) {
      out.push(h('button', { type: 'button', class: 'banner muted-banner', onclick: () => { ui.tab = 'settings'; render(); } },
        state.lastBackup ? `最後のバックアップから${Math.floor(days)}日たちました。設定から書き出せます` : 'まだバックアップがありません。設定から書き出せます'));
    }
  }
  return out;
}

function renderToday() {
  const t = today();
  const v = ui.viewDate;
  const pd = parseYmd(v);
  renderHeader(
    [h('span', { class: 'head-date' }, `${pd.getMonth() + 1}月${pd.getDate()}日`), h('span', { class: 'head-wd' }, WD[pd.getDay()] + '曜')],
    v === t ? '腹記録' : h('button', { type: 'button', class: 'head-link', onclick: () => { ui.viewDate = t; render(); } }, '今日へ戻る'));

  const stools = stoolsOn(v);
  const good = stools.filter((e) => e.data.good).length;
  const daily = dailyFor(v);
  const ws = weekStart(t);
  const weekDays = dailiesBetween(ws, addDays(ws, 6)).length;

  const list = state.entries
    .filter((e) => e.type !== 'daily' && entryDate(e) === v)
    .sort((a, b) => (a.at < b.at ? -1 : 1));

  const cards = list.map((e) => (e.type === 'stool' ? stoolCard(e) : e.type === 'meal' ? mealCard(e) : e.type === 'symptom' ? symptomCard(e) : weeklyCard(e)));

  main.replaceChildren(h('div', { class: 'stack' },
    h('section', { class: 'panel summary' },
      h('div', { class: 'summary-left' },
        h('div', { class: 'summary-title' }, '今週の記録'),
        h('div', { class: 'small' }, h('b', { class: weekDays >= 4 ? 'good' : 'warn' }, `${weekDays}日`), ' / 7日（週の評価には4日以上）')),
      h('div', { class: 'stats' },
        stat(stools.length, '排便'),
        stat(good, '良便', 'good'),
        stat(daily ? daily.data.painMax : '—', '腹痛', daily && daily.data.painMax >= 4 ? 'bad' : ''),
        stat(daily ? daily.data.bloatingMax : '—', '張り', daily && daily.data.bloatingMax >= 4 ? 'bad' : ''))),
    h('div', { class: 'daynav' },
      h('button', { type: 'button', class: 'btn small', onclick: () => { ui.viewDate = addDays(v, -1); render(); } }, '◀ 前日'),
      h('span', { class: 'daynav-date' }, fmtDate(v)),
      h('button', { type: 'button', class: 'btn small', disabled: v >= t, onclick: () => { ui.viewDate = addDays(v, 1); render(); } }, '翌日 ▶')),
    v === t ? banners(t) : null,
    h('button', { type: 'button', class: 'btn danger-outline block', onclick: () => showRedFlag(null) }, '血・黒い便・白っぽい便が出たとき'),
    daily ? dailyCard(daily) : null,
    cards.length ? cards : h('div', { class: 'empty' }, 'この日の記録はまだありません'),
  ));

  const target = defaultDailyDate();
  const needDaily = !dailyFor(target);
  actionbar.hidden = false;
  actionbar.replaceChildren(
    h('button', { type: 'button', class: 'btn primary big', onclick: () => openStool(null) }, 'うんちした'),
    h('button', { type: 'button', class: 'btn big' + (needDaily ? ' attention' : ''), onclick: () => openDaily() }, needDaily ? '1日の記録（未）' : '1日の記録'));
}

/* ---------- 振り返り・レポート（ステップ2・3で作る） ---------- */

function renderPlaceholder(title, text) {
  renderHeader(h('span', { class: 'head-date' }, title), '腹記録');
  main.replaceChildren(h('div', { class: 'stack' },
    h('section', { class: 'panel' }, h('h2', { class: 'panel-title' }, '準備中'), h('div', { class: 'muted' }, text))));
}

/* ---------- 描画 ---------- */

function render() {
  renderTabs();
  actionbar.hidden = true;
  document.body.classList.toggle('has-actionbar', ui.tab === 'today');
  if (ui.tab === 'today') renderToday();
  else if (ui.tab === 'review') {
    renderHeader(h('span', { class: 'head-date' }, '振り返り'), 'カレンダー');
    main.replaceChildren(renderCalendar(ui.month, {
      onPick: (date) => { ui.tab = 'today'; ui.viewDate = date; render(); window.scrollTo(0, 0); },
      onMonth: (ym) => { ui.month = ym; render(); },
    }));
  }
  else if (ui.tab === 'report') renderPlaceholder('レポート', '受診用のまとめ（印刷・PDF保存）は、次のステップで追加します。');
  else if (ui.tab === 'settings') {
    renderHeader(h('span', { class: 'head-date' }, '設定'), '腹記録');
    main.replaceChildren(renderSettings());
  }
}

async function start() {
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* 既定のテーマのまま */ }
  bus.addEventListener('change', () => {
    // 入力中のフォーカスを奪わないよう、設定画面は入力中なら描き直さない
    if (ui.tab === 'settings' && document.activeElement?.matches('input[type=text]')) return;
    render();
  });
  try {
    await load();
  } catch (err) {
    main.replaceChildren(h('div', { class: 'panel' }, 'データを読み込めませんでした：' + err.message));
    return;
  }
  render();
  // 日付が変わってから戻ってきたら、今日の表示に切り替える
  let shownOn = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || document.querySelector('.sheet-wrap')) return;
    if (shownOn !== today()) { shownOn = today(); ui.viewDate = shownOn; }
    render();
  });
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) {
    // 新しい版が入ったら自動で読み込み直す（初回のインストール時は除く）
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!document.querySelector('.sheet-wrap')) location.reload();
      });
    }
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  }
}

window.addEventListener('error', (e) => toast('エラー：' + e.message));
start();

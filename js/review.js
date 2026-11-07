// 振り返り：カレンダー（快調な日とつらい日を色で表示）

import { h } from './ui.js';
import { dailyFor, stoolsOn } from './store.js';
import { BRISTOL } from './config.js';
import { ymd, today, pad } from './util.js';

// 1日の状態
// 最悪値は腹痛・張り・胃もたれのうちいちばん高いもの
// good：快調（最悪値が2以下で、排便がすべてブリストル3〜5）
// mild：やや不調（最悪値が4〜6） / bad：つらい（最悪値が7以上）
// normal：それ以外 / none：1日の記録なし
export function dayStatus(date) {
  const daily = dailyFor(date);
  if (!daily) return 'none';
  const worst = Math.max(daily.data.painMax, daily.data.bloatingMax, daily.data.heavinessMax ?? 0);
  if (worst >= 7) return 'bad';
  if (worst >= 4) return 'mild';
  const stools = stoolsOn(date);
  if (worst <= 2 && stools.length && stools.every((e) => e.data.bristol >= 3 && e.data.bristol <= 5)) return 'good';
  return 'normal';
}

const STATUS_LABEL = { good: '快調', normal: 'ふつう', mild: 'やや不調', bad: 'つらい', none: '記録なし' };
const KIND = Object.fromEntries(BRISTOL.map((b) => [b.t, b.kind]));

function monthDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${ym}-${pad(i + 1)}`);
}

export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function renderCalendar(ym, { onPick, onMonth }) {
  const t = today();
  const days = monthDays(ym);
  const [y, m] = ym.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const count = { good: 0, normal: 0, mild: 0, bad: 0, none: 0 };
  let stoolTotal = 0;
  let goodStool = 0;

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('div', { class: 'cal-cell blank' }));
  for (const date of days) {
    const future = date > t;
    const st = future ? 'future' : dayStatus(date);
    const stools = future ? [] : stoolsOn(date).sort((a, b) => (a.at < b.at ? -1 : 1));
    if (!future) {
      count[st]++;
      stoolTotal += stools.length;
      goodStool += stools.filter((e) => e.data.good).length;
    }
    const flag = stools.some((e) => e.data.blood || ['white', 'black', 'red'].includes(e.data.color));
    cells.push(h('button', {
      type: 'button',
      class: `cal-cell st-${st}` + (date === t ? ' today' : ''),
      disabled: future,
      'aria-label': `${date} ${STATUS_LABEL[st] || ''}`,
      onclick: () => onPick(date),
    },
    h('span', { class: 'cal-day' }, Number(date.slice(8))),
    flag ? h('span', { class: 'cal-flag' }, '!') : null,
    h('span', { class: 'cal-dots' }, stools.slice(0, 6).map((e) => h('i', { class: 'k-' + KIND[e.data.bristol] })))));
  }

  const past = days.filter((d) => d <= t).length;
  const rate = stoolTotal ? Math.round((goodStool / stoolTotal) * 100) : null;
  const isCurrent = ym === t.slice(0, 7);

  const stat = (num, label, cls = '') => h('div', { class: 'stat' }, h('div', { class: 'stat-num ' + cls }, num), h('div', { class: 'stat-label' }, label));
  const legend = (st) => h('span', { class: 'legend' }, h('i', { class: 'sw st-' + st }), STATUS_LABEL[st]);

  return h('div', { class: 'stack' },
    h('div', { class: 'daynav' },
      h('button', { type: 'button', class: 'btn small', onclick: () => onMonth(shiftMonth(ym, -1)) }, '◀ 前月'),
      h('span', { class: 'daynav-date' }, `${y}年${m}月`),
      h('button', { type: 'button', class: 'btn small', disabled: isCurrent, onclick: () => onMonth(shiftMonth(ym, 1)) }, '翌月 ▶')),
    h('section', { class: 'panel cal' },
      h('div', { class: 'cal-grid cal-head' }, ['日', '月', '火', '水', '木', '金', '土'].map((w, i) =>
        h('div', { class: 'cal-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') }, w))),
      h('div', { class: 'cal-grid' }, cells),
      h('div', { class: 'legends' },
        legend('good'), legend('normal'), legend('mild'), legend('bad'), legend('none'),
        h('span', { class: 'legend' }, h('i', { class: 'dot k-normal' }), '排便（色は便の形）'))),
    h('section', { class: 'panel' },
      h('h2', { class: 'panel-title' }, `${m}月のまとめ`),
      h('div', { class: 'stats spread' },
        stat(`${past - count.none}/${past}`, '記録日数'),
        stat(count.good, '快調', 'good'),
        stat(count.mild + count.bad, '不調', count.bad ? 'bad' : ''),
        stat(stoolTotal, '排便'),
        stat(rate == null ? '—' : `${rate}%`, '良便率', 'good'))),
    h('div', { class: 'note' }, '最悪値は腹痛・張り・胃もたれのうちいちばん高いもの。快調：最悪値が2以下で、排便がすべてブリストル3〜5の日。やや不調：最悪値4〜6。つらい：最悪値7以上。日付を押すとその日の記録を表示します。'));
}

export const thisMonth = () => ymd(new Date()).slice(0, 7);

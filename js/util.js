// 日付まわり。日付は "YYYY-MM-DD"（端末のローカル時刻）で扱う

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());

export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function fmtDate(s) {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
}

export function fmtTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(d) {
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 正午より前は「昨日の記録」、正午以降は「今日の記録」
export function defaultDailyDate(now = new Date()) {
  return now.getHours() < 12 ? addDays(ymd(now), -1) : ymd(now);
}

// 1日の記録は翌日の正午まで入力・修正できる
export function dailyDeadline(s) {
  const d = parseYmd(addDays(s, 1));
  d.setHours(12, 0, 0, 0);
  return d;
}

export function isDailyEditable(s, now = new Date()) {
  return s <= ymd(now) && now < dailyDeadline(s);
}

export function editableDailyDates(now = new Date()) {
  const t = ymd(now);
  return [addDays(t, -1), t].filter((s) => isDailyEditable(s, now));
}

// 週は月曜〜日曜
export function weekStart(s) {
  const d = parseYmd(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

// 直近の日曜（日曜ならその日）
export function lastSunday(s) {
  const d = parseYmd(s);
  d.setDate(d.getDate() - d.getDay());
  return ymd(d);
}

export function toInputDT(iso) {
  const d = new Date(iso);
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Safari の解釈差を避けるため、datetime-local の値は手で分解する
export function fromInputDT(v) {
  const [date, time = '00:00'] = v.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mi).toISOString();
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const clone = (o) => JSON.parse(JSON.stringify(o));

// 記録がどの日に属するか
export function entryDate(e) {
  if (e.type === 'daily') return e.data.date;
  if (e.type === 'weekly') return e.data.weekEnd;
  return ymd(new Date(e.at));
}

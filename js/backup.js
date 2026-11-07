// バックアップ（JSON書き出し・読み込み）と CSV 書き出し

import { dumpAll, replaceAll, setMeta } from './db.js';
import { state, load, intakeName, medName } from './store.js';
import { ymd, entryDate, toInputDT } from './util.js';

const APP_ID = 'harakiroku';

// iPhone では共有シート（「ファイルに保存」）、それ以外はダウンロード
async function saveFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

export async function exportJSON() {
  const data = await dumpAll();
  const payload = { app: APP_ID, schema: 1, exportedAt: new Date().toISOString(), ...data };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const ok = await saveFile(blob, `harakiroku-${ymd(new Date())}.json`);
  if (ok) {
    state.lastBackup = new Date().toISOString();
    await setMeta('lastBackup', state.lastBackup);
  }
  return ok;
}

export async function parseBackup(file) {
  const data = JSON.parse(await file.text());
  if (data.app !== APP_ID || !Array.isArray(data.entries)) throw new Error('腹記録のバックアップファイルではありません');
  return data;
}

export async function importJSON(data) {
  await replaceAll(data);
  await load();
}

// CSV：1行1記録。配列は「|」区切り、チェック項目と薬は名前に変換
const FIXED = ['id', 'type', 'date', 'at', 'note'];
const NAME_MAP = {
  intake: intakeName,
  tags: intakeName,
  meds: medName,
  dishes: (id) => state.dishes.find((x) => x.id === id)?.name ?? id,
};

function cell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCSV() {
  const entries = [...state.entries].sort((a, b) => (a.at < b.at ? -1 : 1));
  const keys = [];
  for (const e of entries) for (const k of Object.keys(e.data)) if (!keys.includes(k) && !FIXED.includes(k)) keys.push(k);
  const rows = [[...FIXED, ...keys].join(',')];
  for (const e of entries) {
    const base = [e.id, e.type, entryDate(e), toInputDT(e.at).replace('T', ' '), e.note || ''];
    const rest = keys.map((k) => {
      const v = e.data[k];
      if (Array.isArray(v)) return v.map(NAME_MAP[k] || String).join('|');
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    rows.push([...base, ...rest].map(cell).join(','));
  }
  // Excel で文字化けしないよう BOM をつける
  const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv' });
  return saveFile(blob, `harakiroku-${ymd(new Date())}.csv`);
}

// メモリ上の状態と保存処理。変更があったら bus に change を流す

import { getAll, put, del, getMeta, setMeta } from './db.js';
import { DEFAULT_INTAKE, DEFAULT_DISHES } from './config.js';
import { ymd } from './util.js';

export const state = { entries: [], dishes: [], foods: [], intake: [], meds: [], lastBackup: null };
export const bus = new EventTarget();
const emit = () => bus.dispatchEvent(new Event('change'));

export async function load() {
  if (!(await getMeta('seeded', false))) {
    await setMeta('intake', DEFAULT_INTAKE);
    for (const d of DEFAULT_DISHES) await put('dishes', { ...d, count: 0 });
    await setMeta('seeded', true);
  }
  [state.entries, state.dishes, state.foods] = await Promise.all([
    getAll('entries'), getAll('dishes'), getAll('foods'),
  ]);
  state.intake = await getMeta('intake', DEFAULT_INTAKE);
  state.meds = await getMeta('meds', []);
  state.lastBackup = await getMeta('lastBackup', null);
  emit();
}

function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
}

export async function saveEntry(e) {
  await put('entries', e);
  upsert(state.entries, e);
  emit();
}

export async function removeEntry(id) {
  await del('entries', id);
  state.entries = state.entries.filter((x) => x.id !== id);
  emit();
}

export async function saveDish(d) { await put('dishes', d); upsert(state.dishes, d); emit(); }
export async function removeDish(id) {
  await del('dishes', id);
  state.dishes = state.dishes.filter((x) => x.id !== id);
  emit();
}

export async function saveFood(f) { await put('foods', f); upsert(state.foods, f); emit(); }
export async function removeFood(id) {
  await del('foods', id);
  state.foods = state.foods.filter((x) => x.id !== id);
  emit();
}

export async function setIntake(list) { state.intake = list; await setMeta('intake', list); emit(); }
export async function setMeds(list) { state.meds = list; await setMeta('meds', list); emit(); }

export const byCount = (a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name, 'ja');

export const intakeName = (id) => state.intake.find((x) => x.id === id)?.name ?? id;
export const groupOf = (id) => state.intake.find((x) => x.id === id)?.group;
export const medName = (id) => state.meds.find((x) => x.id === id)?.name ?? id;

export const dailyFor = (date) => state.entries.find((e) => e.type === 'daily' && e.data.date === date);
export const weeklyFor = (sun) => state.entries.find((e) => e.type === 'weekly' && e.data.weekEnd === sun);

export function prevDaily(date) {
  let best;
  for (const e of state.entries) {
    if (e.type === 'daily' && e.data.date < date && (!best || e.data.date > best.data.date)) best = e;
  }
  return best;
}

export const stoolsOn = (date) =>
  state.entries.filter((e) => e.type === 'stool' && ymd(new Date(e.at)) === date);

export const dailiesBetween = (from, to) =>
  state.entries.filter((e) => e.type === 'daily' && e.data.date >= from && e.data.date <= to);

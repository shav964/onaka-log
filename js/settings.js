// 設定画面

import { h, openSheet, toast, seg, field, confirmDialog } from './ui.js';
import {
  state, saveDish, removeDish, saveFood, removeFood, setIntake, setMeds, byCount, intakeName,
} from './store.js';
import { GROUPS, FODMAP_TYPES } from './config.js';
import { intakeLabel, fodBadge } from './sheets.js';
import { uid, fmtDateTime } from './util.js';
import { exportJSON, exportCSV, parseBackup, importJSON } from './backup.js';

export const THEME_KEY = 'hk-theme';

const FODMAP_DESC = {
  fructan: '小麦、玉ねぎ、ニンニク、ごぼう、アスパラ',
  gos: '大豆・あずき・ひよこ豆などの豆類',
  lactose: '牛乳、ヨーグルト、アイス',
  fructose: 'りんご、はちみつ、果糖ぶどう糖液糖入りのジュース',
  polyol: 'きのこ、梨・桃、糖アルコール（キシリトールなど）',
};

export function applyTheme(v) {
  if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v;
  else delete document.documentElement.dataset.theme;
}

function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
}

function panel(title, ...kids) {
  return h('section', { class: 'panel' }, h('h2', { class: 'panel-title' }, title), kids);
}

// 料理（items）と、よく食べるもの（tags）の共通エディタ
function openSetEditor(kind, obj) {
  const isDish = kind === 'dish';
  const key = isDish ? 'items' : 'tags';
  const d = obj ? { ...obj, [key]: [...(obj[key] || [])] } : { id: (isDish ? 'd_' : 'f_') + uid(), name: '', [key]: [], count: 0 };
  const chips = [];
  const name = h('input', { type: 'text', class: 'input', value: d.name, placeholder: isDish ? '例：親子丼' : '例：ヨーグルト' });
  const groups = GROUPS.map((g) => {
    const items = state.intake.filter((x) => x.group === g.id);
    if (!items.length) return null;
    return h('div', { class: 'grp g-' + g.id },
      h('div', { class: 'grp-name' }, g.name),
      h('div', { class: 'chips' }, items.map((it) => {
        const el = h('button', {
          type: 'button', class: 'chip' + (d[key].includes(it.id) ? ' on' : ''),
          onclick: () => {
            d[key] = d[key].includes(it.id) ? d[key].filter((x) => x !== it.id) : [...d[key], it.id];
            el.classList.toggle('on', d[key].includes(it.id));
          },
        }, intakeLabel(it));
        chips.push(el);
        return el;
      })));
  });
  const label = isDish ? '料理' : '食べもの';
  const sheet = openSheet({
    title: obj ? `${label}を編集` : `${label}を追加`,
    body: [
      field(isDish ? '料理名' : '名前', name),
      field(isDish ? 'この料理で自動で入るチェック' : 'タグ', groups),
    ],
    foot: h('div', { class: 'foot-row' },
      obj ? h('button', {
        type: 'button', class: 'btn danger-outline',
        onclick: async () => {
          if (!(await confirmDialog('削除しますか？', `「${d.name}」を削除します。これまでの記録はそのまま残ります。`, '削除', true))) return;
          await (isDish ? removeDish(d.id) : removeFood(d.id));
          sheet.close();
        },
      }, '削除') : null,
      h('button', {
        type: 'button', class: 'btn primary grow',
        onclick: async () => {
          d.name = name.value.trim();
          if (!d.name) { toast('名前を入れてください'); return; }
          await (isDish ? saveDish(d) : saveFood(d));
          sheet.close();
          toast('保存しました');
        },
      }, '保存')),
  });
}

function setList(list, kind, emptyText) {
  const key = kind === 'dish' ? 'items' : 'tags';
  const sorted = [...list].sort(byCount);
  return h('div', { class: 'list' },
    sorted.length ? sorted.map((x) => h('button', { type: 'button', class: 'list-row', onclick: () => openSetEditor(kind, x) },
      h('div', { class: 'list-main' },
        h('div', { class: 'list-title' }, x.name),
        h('div', { class: 'list-sub' }, (x[key] || []).map(intakeName).join('、') || 'チェックなし')),
      h('span', { class: 'list-meta' }, `${x.count || 0}回`))) : h('div', { class: 'muted small pad' }, emptyText),
    h('button', { type: 'button', class: 'btn block', onclick: () => openSetEditor(kind, null) }, '＋ 追加'));
}

function intakeEditor() {
  const rows = state.intake.map((it) => h('div', { class: 'list-row static' },
    h('div', { class: 'list-main' },
      h('div', { class: 'list-title' }, it.name),
      it.fodmap?.length ? h('div', { class: 'list-sub' }, it.fodmap.map((t) => FODMAP_TYPES[t]).filter(Boolean).join('・') || '高FODMAP') : null),
    h('button', {
      type: 'button', class: 'btn small fod-toggle' + (it.fodmap?.length ? ' on' : ''), 'aria-label': '高FODMAPのしるし',
      onclick: async () => {
        const fodmap = it.fodmap?.length ? [] : ['custom'];
        await setIntake(state.intake.map((x) => (x.id === it.id ? { ...x, fodmap } : x)));
        toast(fodmap.length ? `「${it.name}」を高FODMAPにしました` : `「${it.name}」の高FODMAPを外しました`);
      },
    }, 'F'),
    h('select', {
      class: 'input select g-' + it.group,
      onchange: async (e) => {
        await setIntake(state.intake.map((x) => (x.id === it.id ? { ...x, group: e.target.value } : x)));
        toast('グループを変更しました');
      },
    }, GROUPS.map((g) => h('option', { value: g.id, selected: g.id === it.group }, g.name))),
    h('button', {
      type: 'button', class: 'btn small danger-outline',
      onclick: async () => {
        if (!(await confirmDialog('削除しますか？', `「${it.name}」をチェック項目から外します。これまでの記録は残ります。`, '削除', true))) return;
        await setIntake(state.intake.filter((x) => x.id !== it.id));
        for (const dish of state.dishes) {
          if (dish.items.includes(it.id)) await saveDish({ ...dish, items: dish.items.filter((x) => x !== it.id) });
        }
      },
    }, '削除')));
  const name = h('input', { type: 'text', class: 'input', placeholder: '新しい項目' });
  let group = 'depends';
  const add = async () => {
    const n = name.value.trim();
    if (!n) return;
    if (state.intake.some((x) => x.name === n)) { toast('同じ名前の項目があります'); return; }
    await setIntake([...state.intake, { id: 'c_' + uid(), name: n, group }]);
    toast(`「${n}」を追加しました`);
  };
  return h('div', { class: 'list' }, rows,
    h('div', { class: 'add-box' },
      name,
      seg(GROUPS.map((g) => [g.id, g.name]), () => group, (v) => { group = v; }, { cols: 2, cls: 'small' }),
      h('button', { type: 'button', class: 'btn block', onclick: add }, '＋ 項目を追加')));
}

function medsEditor() {
  const name = h('input', { type: 'text', class: 'input', placeholder: '例：ビオフェルミン' });
  const add = async () => {
    const n = name.value.trim();
    if (!n) return;
    await setMeds([...state.meds, { id: 'm_' + uid(), name: n }]);
  };
  return h('div', { class: 'list' },
    state.meds.map((m) => h('div', { class: 'list-row static' },
      h('div', { class: 'list-main' }, h('div', { class: 'list-title' }, m.name)),
      h('button', {
        type: 'button', class: 'btn small danger-outline',
        onclick: async () => {
          if (!(await confirmDialog('削除しますか？', `「${m.name}」を外します。これまでの記録は残ります。`, '削除', true))) return;
          await setMeds(state.meds.filter((x) => x.id !== m.id));
        },
      }, '削除'))),
    !state.meds.length ? h('div', { class: 'muted small pad' }, '登録すると、1日の記録の「詳しく記録」に表示されます。') : null,
    h('div', { class: 'row-gap' }, name, h('button', { type: 'button', class: 'btn', onclick: add }, '追加')));
}

function backupPanel() {
  const last = h('span', null, state.lastBackup ? fmtDateTime(new Date(state.lastBackup)) : 'まだありません');
  const file = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true,
    onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const data = await parseBackup(f);
        const ok = await confirmDialog('読み込みますか？', `いまのデータはすべて、このバックアップ（記録${data.entries.length}件）に置き換わります。`, '置き換える', true);
        if (!ok) return;
        await importJSON(data);
        toast('バックアップを読み込みました');
      } catch (err) {
        toast('読み込めませんでした：' + err.message);
      }
    },
  });
  return panel('バックアップ',
    h('div', { class: 'muted small' }, 'データはこのスマホの中だけにあります。機種変更や万一に備えて、ときどき書き出してください。'),
    h('div', { class: 'kv' }, h('span', { class: 'muted' }, '最終バックアップ'), last),
    h('div', { class: 'btn-grid' },
      h('button', { type: 'button', class: 'btn primary', onclick: async () => { if (await exportJSON()) { toast('書き出しました'); last.textContent = fmtDateTime(new Date()); } } }, 'JSONで書き出し'),
      h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'JSONを読み込み'),
      h('button', { type: 'button', class: 'btn', onclick: exportCSV }, 'CSVで書き出し')),
    file);
}

export function renderSettings() {
  let theme = getTheme();
  const persisted = h('span', null, '…');
  if (navigator.storage?.persisted) navigator.storage.persisted().then((p) => { persisted.textContent = p ? '保護されています' : '未保護（ホーム画面から開いてください）'; });
  else persisted.textContent = '不明';

  return h('div', { class: 'stack' },
    panel('表示',
      field('テーマ', seg([['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク']], () => theme, (v) => {
        theme = v;
        try { localStorage.setItem(THEME_KEY, v); } catch { /* 保存できなくても表示は切り替える */ }
        applyTheme(v);
      }))),
    panel('よく食べる料理', h('div', { class: 'muted small' }, '1日の記録で料理名をタップすると、登録したチェックがまとめて入ります。'), setList(state.dishes, 'dish', 'まだ登録がありません')),
    panel('チェック項目',
      h('div', { class: 'muted small' }, 'グループは一般論です。自分の記録で結果が違ったら、自分の結果を優先して変えてください。'),
      h('div', { class: 'muted small' }, fodBadge(), ' は高FODMAPの食材。右の「F」ボタンで付け外しできます。'),
      intakeEditor()),
    panel('FODMAPについて',
      h('div', { class: 'small' }, 'FODMAPは、小腸で吸収されにくく、大腸で発酵してガスや水分を増やしやすい糖のなかまです。IBSの人の多くで、張り・腹痛・下痢の原因になりやすいと言われています。'),
      h('div', { class: 'kv-list small' }, Object.entries(FODMAP_DESC).map(([t, ex]) =>
        h('div', { class: 'kv' }, h('b', null, FODMAP_TYPES[t]), h('span', { class: 'muted' }, ex)))),
      h('div', { class: 'muted small' }, '合う・合わないは人によります。FODMAPを減らす食事（低FODMAP）は制限が大きいので、試すときは医師か管理栄養士と相談してから。')),
    panel('薬・サプリ', medsEditor()),
    panel('よく食べるもの（食事記録用）', setList(state.foods, 'food', '食事記録で入力すると、ここに増えていきます')),
    backupPanel(),
    panel('このアプリについて',
      h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'データ保存'), persisted),
      h('div', { class: 'muted small' }, '腹記録は診断をしません。表示される分析は傾向のヒントです。判断は医師と一緒にしてください。')));
}

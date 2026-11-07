// 記録の基準（SPEC.md「記録の基準」に対応）

export const APP_NAME = '腹記録';

// 今日とったものチェックのグループ
export const GROUPS = [
  { id: 'gentle', name: 'おなかにやさしい' },
  { id: 'depends', name: '人による' },
  { id: 'worse', name: '悪化しやすい' },
  { id: 'other', name: 'その他' },
];

export const DEFAULT_INTAKE = [
  { id: 'rice', name: 'ご飯', group: 'gentle' },
  { id: 'meat', name: '肉', group: 'gentle' },
  { id: 'fish', name: '魚', group: 'gentle' },
  { id: 'egg', name: '卵', group: 'gentle' },
  { id: 'fiber', name: '水溶性食物繊維', group: 'gentle' },
  { id: 'wheat', name: '小麦（パン・麺）', group: 'depends' },
  { id: 'dairy', name: '牛乳・ヨーグルト', group: 'depends' },
  { id: 'onion', name: '玉ねぎ・ニンニク', group: 'depends' },
  { id: 'beans', name: '豆類', group: 'depends' },
  { id: 'fruit', name: '果物多め', group: 'depends' },
  { id: 'mushroom', name: 'きのこ', group: 'depends' },
  { id: 'ferment', name: '発酵食品', group: 'depends' },
  { id: 'spicy', name: '辛いもの', group: 'depends' },
  { id: 'alcohol', name: 'アルコール', group: 'worse' },
  { id: 'fried', name: '揚げ物', group: 'worse' },
  { id: 'fatty', name: '脂っこいもの', group: 'worse' },
  { id: 'sweetener', name: '人工甘味料', group: 'worse' },
  { id: 'soda', name: '炭酸', group: 'worse' },
  { id: 'overeat', name: '食べすぎ', group: 'worse' },
  { id: 'smallmeal', name: '食べる量が少なかった', group: 'other' },
  { id: 'exercise', name: '20分以上運動した', group: 'other' },
];

export const DEFAULT_DISHES = [
  { id: 'd_katsudon', name: 'カツ丼', items: ['rice', 'meat', 'egg', 'wheat', 'fried', 'onion'] },
  { id: 'd_yasaiitame', name: '肉野菜炒め', items: ['meat', 'fatty'] },
  { id: 'd_ramen', name: 'ラーメン', items: ['wheat', 'fatty', 'onion'] },
  { id: 'd_curry', name: 'カレーライス', items: ['rice', 'meat', 'onion', 'fatty'] },
  { id: 'd_yakizakana', name: '焼き魚定食', items: ['rice', 'fish'] },
];

// 0〜10 の基準文（腹痛・張り・ストレス・疲労・気分で共通）
export function severityText(v) {
  if (v === 0) return '0：まったくない';
  if (v <= 3) return '1〜3：気づくけど、やっていることは普通に続けられる';
  if (v <= 6) return '4〜6：何度も意識がそっちに向く。集中が途切れる';
  if (v <= 9) return '7〜9：作業を中断したり、横になったりしたくなる';
  return '10：考えられる中で最悪';
}

export function sleepQualityText(v) {
  if (v <= 2) return `${v}：ほとんど眠れなかった`;
  if (v <= 4) return `${v}：浅い・何度も起きた`;
  if (v <= 6) return `${v}：ふつう`;
  if (v <= 8) return `${v}：よく眠れた`;
  return `${v}：とてもよく眠れた`;
}

export const GAS_FREQ = [
  'ほとんど出なかった',
  'ときどき出た。数えようと思えば数えられるくらい',
  'よく出た。1時間に何回か',
  'かなり多い。1時間に何度もで、気になる',
  'ほぼずっと出てる感じ',
];

export const GAS_SMELL = [
  'ほとんどにおわない',
  '普通',
  '強め。自分でも気になる',
  'かなり強い',
];

export const SLEEP = [
  ['lt5', '5h未満'],
  ['5to6', '5〜6'],
  ['6to7', '6〜7'],
  ['7to8', '7〜8'],
  ['gt8', '8h以上'],
];

export const SLEEP_LABEL = {
  lt5: '5時間未満', '5to6': '5〜6時間', '6to7': '6〜7時間', '7to8': '7〜8時間', gt8: '8時間以上',
};

// ブリストル便形状スケール
export const BRISTOL = [
  { t: 1, label: 'コロコロ', desc: 'コロコロの硬い粒がバラバラ', zone: '硬い（便秘寄り）', kind: 'hard' },
  { t: 2, label: 'ゴツゴツ', desc: '粒がくっついたような、ゴツゴツした硬い棒状', zone: '硬い（便秘寄り）', kind: 'hard' },
  { t: 3, label: 'ひび割れ', desc: '表面にひび割れがある棒状', zone: '正常', kind: 'normal' },
  { t: 4, label: 'バナナ', desc: 'なめらかでやわらかい棒状', zone: '正常', kind: 'normal' },
  { t: 5, label: '半固形', desc: 'やわらかい半固形で、形の境目がはっきり', zone: '正常寄り', kind: 'normal' },
  { t: 6, label: '泥状', desc: '形が崩れた泥状', zone: 'ゆるい（下痢寄り）', kind: 'loose' },
  { t: 7, label: '水様', desc: '固形物のない水っぽい状態', zone: 'ゆるい（下痢寄り）', kind: 'loose' },
];

export const YESNO = [[true, 'あり'], [false, 'なし']];

// 便のクオリティ（任意）
export const STOOL_DETAIL = [
  { key: 'amount', label: '量', opts: [['small', '少ない'], ['normal', '普通'], ['large', '多い']] },
  {
    key: 'color', label: '色', cols: 2, opts: [
      ['ocher', '黄土色'], ['brown', '茶色'], ['dark', 'こげ茶'], ['green', '緑っぽい'],
      ['white', '白っぽい／灰色'], ['black', '黒くてドロッ'], ['red', '赤い'],
    ],
  },
  { key: 'mucus', label: '粘液（ヌルッとしたもの）', opts: [['none', 'なし'], ['some', '少し'], ['much', '多い']] },
  { key: 'floating', label: '浮き・油っぽさ', opts: [['none', 'なし'], ['floats', '水に浮く'], ['oily', '油が浮く']] },
  { key: 'undigested', label: '未消化物', opts: YESNO },
  { key: 'smell', label: 'におい', opts: [['usual', 'いつも通り'], ['strong', 'いつもより強い']] },
  { key: 'toiletTime', label: 'トイレにいた時間', opts: [['lt5', '5分未満'], ['5to10', '5〜10分'], ['gt10', '10分以上']] },
  { key: 'urgency', label: '急な便意', opts: YESNO },
  { key: 'straining', label: '強いいきみ', opts: YESNO },
  { key: 'incomplete', label: '残便感', opts: YESNO },
  { key: 'blood', label: '血', opts: YESNO },
];

// 受診をすすめる色
export const RED_FLAG_COLORS = ['white', 'black', 'red'];

export const WEEKLY_Q = [
  { key: 'painSeverity', label: '腹痛の強さ', lo: 'なし', hi: 'とても強い' },
  { key: 'bloatingSeverity', label: 'お腹の張りの強さ', lo: 'なし', hi: 'とても強い' },
  { key: 'bowelDissatisfaction', label: '便通の状態への不満度', lo: '満足', hi: 'とても不満' },
  { key: 'lifeInterference', label: '生活への支障', lo: 'なし', hi: 'とても大きい' },
];

export function sssLevel(total) {
  if (total < 75) return 'ほぼ症状なし';
  if (total < 175) return '軽症';
  if (total < 300) return '中等症';
  return '重症';
}

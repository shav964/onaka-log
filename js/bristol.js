// ブリストル便形状スケールのイラスト（SVG）

const SHAPES = {
  1: '<circle cx="12" cy="14" r="5"/><circle cx="28" cy="10" r="5"/><circle cx="45" cy="15" r="5"/><circle cx="20" cy="28" r="5"/><circle cx="38" cy="29" r="5"/>',
  2: '<circle cx="11" cy="21" r="7"/><circle cx="21" cy="17" r="7.5"/><circle cx="31" cy="21" r="7"/><circle cx="41" cy="17" r="7.5"/><circle cx="50" cy="21" r="6.5"/>',
  3: '<rect x="5" y="13" width="50" height="15" rx="7.5"/><path class="cut" d="M15 13l2.5 5M25 13l-1.5 6M35 13l2.5 5M45 14l-2 5M20 28l1.5-4M40 28l-1.5-4"/>',
  4: '<path d="M5 15 Q30 38 55 13 Q58 18 54 23 Q30 42 7 22 Q3 19 5 15Z"/>',
  5: '<ellipse cx="13" cy="21" rx="9" ry="7"/><ellipse cx="31" cy="22" rx="8" ry="6.5"/><ellipse cx="47" cy="19" rx="8.5" ry="7"/>',
  6: '<path d="M8 25q1-8 8-6q3-7 9-3q4-6 10 0q6-4 9 3q7 0 6 7q-1 6-8 5q-4 4-10 1q-5 4-10 0q-7 2-9-4q-6 0-5-3z"/>',
  7: '<ellipse cx="30" cy="25" rx="25" ry="9" opacity=".55"/><path class="cut" d="M10 24q4-3 8 0t8 0t8 0t8 0t8 0"/><circle cx="18" cy="10" r="2" opacity=".55"/><circle cx="40" cy="8" r="1.6" opacity=".55"/>',
};

export function bristolSvg(t) {
  return `<svg viewBox="0 0 60 40" aria-hidden="true" class="bsvg">${SHAPES[t]}</svg>`;
}

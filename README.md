# 腹記録

お腹の調子と食事を30秒で記録するPWA。仕様は [SPEC.md](SPEC.md)。

- ビルド不要（HTML / CSS / JavaScript のみ）。GitHub Pages にそのまま置ける
- データは端末内の IndexedDB だけに保存。外部には送らない
- ファイルを変えたら `sw.js` の `VERSION` を上げる（上げないと古いキャッシュが残る）

## ローカルで確認

```sh
python -m http.server 8765
```

http://localhost:8765/ を開く。

## 構成

| ファイル | 中身 |
| --- | --- |
| `js/app.js` | 画面の骨組み、今日のタイムライン |
| `js/sheets.js` | 記録入力（うんち・1日の記録・週次評価・食事・症状） |
| `js/settings.js` | 設定画面 |
| `js/backup.js` | JSON バックアップ、CSV 書き出し |
| `js/store.js` / `js/db.js` | 状態と IndexedDB |
| `js/config.js` | スケールの基準文、チェック項目の初期値 |

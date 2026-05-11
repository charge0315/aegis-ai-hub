/**
 * カテゴリ名を正規化します。
 * 記号（＆, &, ・）や空白を除去し、小文字に変換します。
 * 
 * 意図: AIが提案するカテゴリ名の表記揺れを吸収し、既存設定との確実な紐付けを行うためです。
 */
export const normalizeCategoryName = (name: string): string => {
  return name.replace(/[＆&＆\s・]/g, '').toLowerCase();
};

/**
 * 下位互換性のためのエイリアス
 */
export const clean = normalizeCategoryName;

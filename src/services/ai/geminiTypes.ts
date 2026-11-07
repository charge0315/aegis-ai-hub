/**
 * 構造化出力のスキーマ型を、Gemini SDK から 1 か所で受け取って再公開する。
 *
 * エージェント・プロンプト・各プロバイダーは SDK を直接 import せず、ここを参照する。
 * 旧 SDK（@google/generative-ai）の名前 `SchemaType` / `ResponseSchema` を残しているので、
 * SDK を上げるときに変えるのはこのファイルだけで済む。
 * 注意: 値は @google/genai の `Type`（大文字。例: "OBJECT"）。旧 SDK は小文字だった。
 */
export { Type as SchemaType } from "@google/genai";
export type { Schema as ResponseSchema } from "@google/genai";

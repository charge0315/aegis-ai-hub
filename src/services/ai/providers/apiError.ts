import axios from 'axios';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** throw された値から message 文字列を取り出す。AxiosError も Error として扱う。 */
export function readThrownMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
}

/**
 * API 失敗の表示用メッセージ。
 * Axios の応答ボディ error.message を優先し、無ければ Error.message に戻す。
 */
export function readApiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (isRecord(data) && isRecord(data.error)) {
      const message = data.error.message;
      if (typeof message === 'string' && message) {
        return message;
      }
    }
    return error.message;
  }
  return readThrownMessage(error);
}

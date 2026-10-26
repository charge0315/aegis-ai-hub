export function axiosError(message: string, data?: unknown): Error {
  const error = new Error(message) as Error & {
    isAxiosError: boolean;
    response?: { data: unknown };
  };
  error.isAxiosError = true;
  if (data !== undefined) {
    error.response = { data };
  }
  return error;
}

import { BadGatewayException, Logger } from '@nestjs/common';

type ExternalHttpOptions = RequestInit & {
  serviceName: string;
  timeoutMs: number;
  retries?: number;
  retryDelayMs?: number;
  userMessage?: string;
};

const logger = new Logger('ExternalHttpClient');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export async function externalFetch(url: string, options: ExternalHttpOptions) {
  const {
    serviceName,
    timeoutMs,
    retries = 0,
    retryDelayMs = 300,
    userMessage = `${serviceName} 服务繁忙，请稍后重试`,
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;
      logger.log(
        JSON.stringify({
          serviceName,
          url,
          attempt: attempt + 1,
          status: response.status,
          ok: response.ok,
          durationMs,
        }),
      );
      return response;
    } catch (error) {
      lastError = error;
      const durationMs = Date.now() - startedAt;
      logger.warn(
        JSON.stringify({
          serviceName,
          url,
          attempt: attempt + 1,
          timeout: isAbortError(error),
          durationMs,
        }),
      );

      if (attempt < retries) {
        await sleep(retryDelayMs * 2 ** attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new BadGatewayException(
    isAbortError(lastError) ? `${serviceName} 响应超时，请稍后重试` : userMessage,
  );
}

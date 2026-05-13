import type { AxiosHeaderValue, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ResponseType } from './type';

export function getContentType(config: InternalAxiosRequestConfig) {
  const contentType: AxiosHeaderValue = config.headers?.['Content-Type'] || 'application/json';

  return contentType;
}

/**
 * check if http status should be treated as a valid response
 *
 * Accepts 2xx, 304, and 4xx (backend returns standard {code, msg, data} JSON for business errors).
 * Only 5xx (server errors) and network failures go to the error interceptor.
 *
 * @param status
 */
export function isHttpSuccess(status: number) {
  const isSuccessCode = status >= 200 && status < 300;
  const isBusinessError = status >= 400 && status < 500;
  return isSuccessCode || status === 304 || isBusinessError;
}

/**
 * is response json
 *
 * @param response axios response
 */
export function isResponseJson(response: AxiosResponse) {
  const { responseType } = response.config;

  return responseType === 'json' || responseType === undefined;
}

export async function transformResponse(response: AxiosResponse) {
  const responseType: ResponseType = (response.config?.responseType as ResponseType) || 'json';
  if (responseType === 'json') return;

  const isJson = (response.headers['content-type'] as string)?.includes('application/json');
  if (!isJson) return;

  if (responseType === 'blob') {
    await transformBlobToJson(response);
  }

  if (responseType === 'arrayBuffer') {
    await transformArrayBufferToJson(response);
  }
}

export async function transformBlobToJson(response: AxiosResponse) {
  try {
    let data = response.data;

    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (Object.prototype.toString.call(data) === '[object Blob]') {
      const json = await data.text();
      data = JSON.parse(json);
    }

    response.data = data;
  } catch {}
}

export async function transformArrayBufferToJson(response: AxiosResponse) {
  try {
    let data = response.data;

    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
      const json = new TextDecoder().decode(data);
      data = JSON.parse(json);
    }

    response.data = data;
  } catch {}
}

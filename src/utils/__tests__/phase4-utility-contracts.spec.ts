import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPC } from '../agent';
import { createServiceConfig, getServiceBaseURL } from '../service';

function env(other: string): Env.ImportMeta {
  return {
    VITE_SERVICE_BASE_URL: 'https://api.example.test',
    VITE_OTHER_SERVICE_BASE_URL: other
  } as Env.ImportMeta;
}

describe('runtime utility contracts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps default and named services for direct and proxied modes', () => {
    const value = env('{ demo: "https://demo.example.test" }');
    expect(createServiceConfig(value)).toEqual({
      baseURL: 'https://api.example.test',
      proxyPattern: '/proxy-default',
      other: [{ key: 'demo', baseURL: 'https://demo.example.test', proxyPattern: '/proxy-demo' }]
    });
    expect(getServiceBaseURL(value, false)).toEqual({
      baseURL: 'https://api.example.test',
      otherBaseURL: { demo: 'https://demo.example.test' }
    });
    expect(getServiceBaseURL(value, true)).toEqual({
      baseURL: '/proxy-default',
      otherBaseURL: { demo: '/proxy-demo' }
    });
  });

  it('degrades invalid optional service JSON to an empty mapping', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(createServiceConfig(env('invalid json')).other).toEqual([]);
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('distinguishes mobile and desktop user agents', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla Android');
    expect(isPC()).toBe(false);
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla Desktop');
    expect(isPC()).toBe(true);
  });
});

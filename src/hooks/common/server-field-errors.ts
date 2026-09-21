import { ref } from 'vue';

type RequestErrorLike = {
  response?: {
    data?: {
      msg?: string;
      data?: {
        fieldErrors?: Array<{ field: string; message: string }> | null;
      } | null;
    };
  };
};

const FIELD_ERROR_MSG_RE = /^参数错误:\s*(\w+)\s+(.+)$/;
const FIELD_ERROR_MSG_RE_FALLBACK = /^Param error:\s*(\w+)\s+(.+)$/;

/**
 * Extract per-field error messages from a failed request error.
 *
 * Prefers the structured `data.fieldErrors` (all fields, 422 validation),
 * falls back to parsing the legacy `msg` (first field only).
 */
export function parseServerFieldErrors(error: unknown): Record<string, string> {
  const data = (error as RequestErrorLike | null | undefined)?.response?.data;
  if (!data) return {};

  const structured = data.data?.fieldErrors;
  if (Array.isArray(structured) && structured.length > 0) {
    const result: Record<string, string> = {};
    for (const item of structured) {
      if (item && typeof item.field === 'string' && typeof item.message === 'string') {
        // pydantic emits camelCase aliases for regular validation but
        // snake_case field names on default-value validation; normalize so
        // both shapes hit the camelCase form model keys.
        const key = item.field.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
        result[key] = item.message;
      }
    }
    if (Object.keys(result).length > 0) return result;
  }

  const msg = typeof data.msg === 'string' ? data.msg : '';
  const match = msg.match(FIELD_ERROR_MSG_RE) || msg.match(FIELD_ERROR_MSG_RE_FALLBACK);
  if (match) return { [match[1]]: match[2] };
  return {};
}

/**
 * Surface server-side field errors inline below the matching form items.
 *
 * Usage in an operate drawer:
 *   const { serverErrors, applyServerFieldErrors, clearServerFieldErrors, fieldProps } =
 *     useServerFieldErrors();
 *   // on submit error:  if (error) { applyServerFieldErrors(error); return; }
 *   // on model change:  watch(model, clearServerFieldErrors, { deep: true })
 *   // template:        <NFormItem v-bind="fieldProps('userEmail')" ...>
 */
export function useServerFieldErrors() {
  const serverErrors = ref<Record<string, string>>({});

  /** Returns true when the error carried at least one field error. */
  function applyServerFieldErrors(error: unknown): boolean {
    serverErrors.value = parseServerFieldErrors(error);
    return Object.keys(serverErrors.value).length > 0;
  }

  function clearServerFieldErrors() {
    serverErrors.value = {};
  }

  function fieldProps(key: string) {
    const message = serverErrors.value[key];
    return {
      status: message ? ('error' as const) : undefined,
      feedback: message || undefined
    };
  }

  return { serverErrors, applyServerFieldErrors, clearServerFieldErrors, fieldProps };
}

/** Best-effort backend msg for non-field request failures (toast fallback). */
export function getServerErrorMessage(error: unknown): string | null {
  const data = (error as RequestErrorLike | null | undefined)?.response?.data;
  return typeof data?.msg === 'string' && data.msg ? data.msg : null;
}

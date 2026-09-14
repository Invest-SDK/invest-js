export interface ErrorHubEvent {
  message?: string;
  extra?: Record<string, unknown>;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
    }>;
  };
}

export const FILTERED_VALUE = '[***Filtered***]';
export const CIRCULAR_VALUE = '[Circular]';

const ARITHMETIC_ERROR_NAMES = new Set(['ArithmeticError', 'ZeroDivisionError', 'OverflowError']);
const ARITHMETIC_RANGE_MESSAGES = new Set([
  'division by zero',
  'arithmetic overflow',
  'numeric overflow',
  'integer overflow',
  'floating point overflow',
]);
const BUSINESS_CODE_PATTERN = /^[3589][0-9]{4}$/;
const BUSINESS_ERROR_MESSAGE_PATTERN =
  /(?:^|\b(?:error[_ -]?code|status[_ -]?code|code|status|error|failure)\b[\s:=]+)[3589][0-9]{4}(?=$|[\s:,;])/i;
const BEARER_PATTERN = /\bBearer\s+[^\s]+/gi;
const URL_PARAMETER_PATTERN = /[?&#]([^=?&#\s"'<>]+)=/g;

export function isBinary(value: unknown): boolean {
  return (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) ||
    ArrayBuffer.isView(value)
  );
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  if (normalized === 'traceid' || normalized === 'traceids' || normalized === 'trackingid') {
    return false;
  }
  return (
    normalized.includes('authorization') ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized.includes('apikey') ||
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('credential') ||
    normalized.includes('cookie') ||
    normalized.includes('session') ||
    normalized === 'user' ||
    normalized === 'users' ||
    normalized.includes('userid') ||
    normalized === 'account' ||
    normalized === 'accounts' ||
    normalized.includes('accountid') ||
    normalized.includes('accountlist') ||
    normalized === 'accountids' ||
    normalized.includes('orderid') ||
    normalized.includes('tradeid') ||
    normalized.includes('clientid') ||
    normalized.includes('operationid') ||
    normalized.includes('instrumentid') ||
    normalized === 'figi' ||
    normalized === 'ticker' ||
    normalized.includes('position') ||
    normalized.includes('balance') ||
    normalized.includes('amount') ||
    normalized.includes('quantity') ||
    normalized.includes('lot') ||
    normalized.includes('price') ||
    normalized.includes('payment') ||
    normalized.includes('commission') ||
    normalized.includes('income') ||
    normalized.includes('yield') ||
    normalized.includes('blocked')
  );
}

export function scrubString(value: string): string {
  const text = value.replace(BEARER_PATTERN, FILTERED_VALUE);
  const parameters = new RegExp(URL_PARAMETER_PATTERN);
  let result = '';
  let offset = 0;
  for (let match = parameters.exec(text); match !== null; match = parameters.exec(text)) {
    const key = new URLSearchParams(`key=${match[1]}`).get('key') ?? match[1];
    if (match.index < offset || !isSensitiveKey(key)) {
      continue;
    }

    const valueStart = match.index + match[0].length;
    const valueEnd = text.slice(valueStart).search(/[&#\s"'<>]/);
    result += text.slice(offset, valueStart) + FILTERED_VALUE;
    offset = valueEnd === -1 ? text.length : valueStart + valueEnd;
  }
  return result + text.slice(offset);
}

export function scrubErrorHubValue(value: unknown): unknown {
  const ancestors = new WeakSet<object>();

  function scrub(current: unknown): unknown {
    if (typeof current === 'string') {
      return scrubString(current);
    }
    if (current === null || typeof current !== 'object') {
      return current;
    }
    if (isBinary(current)) {
      return FILTERED_VALUE;
    }
    if (ancestors.has(current)) {
      return CIRCULAR_VALUE;
    }

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        return current.map((item) => scrub(item));
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(current)) {
        result[key] = isSensitiveKey(key)
          ? FILTERED_VALUE
          : scrub((current as Record<string, unknown>)[key]);
      }
      return result;
    } finally {
      ancestors.delete(current);
    }
  }

  return scrub(value);
}

function isBusinessCodeKey(key: string): boolean {
  return /^(?:code|status|errorcode|statuscode|businesscode)$/.test(normalizedKey(key));
}

function isBusinessCode(value: unknown, key?: string): boolean {
  const codeField = key !== undefined && isBusinessCodeKey(key);
  if (key !== undefined && !codeField && key !== 'message' && key !== 'details') {
    return false;
  }
  if (typeof value === 'number') {
    return (codeField || key === undefined) && BUSINESS_CODE_PATTERN.test(String(value));
  }
  if (typeof value !== 'string') {
    return false;
  }

  if (codeField) {
    return BUSINESS_CODE_PATTERN.test(value.trim());
  }
  return BUSINESS_ERROR_MESSAGE_PATTERN.test(value.trim());
}

function containsBusinessCode(
  value: unknown,
  source: 'error' | 'details' | 'message',
  key?: string,
  seen = new WeakSet<object>()
): boolean {
  const messageHasBusinessCode =
    source !== 'message' &&
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    errorMessageHasBusinessCode(value);
  if (messageHasBusinessCode) {
    return true;
  }
  return containsBusinessCodeValue(value, source, key, seen);
}

function errorMessageHasBusinessCode(value: object): boolean {
  try {
    const message = (value as { message?: unknown }).message;
    return typeof message === 'string' && isBusinessCode(message);
  } catch {
    return false;
  }
}

function containsBusinessCodeValue(
  value: unknown,
  source: 'error' | 'details' | 'message',
  key: string | undefined,
  seen: WeakSet<object>
): boolean {
  if (
    isBusinessCode(value, key) &&
    (source !== 'message' || key === undefined || isBusinessCodeKey(key))
  ) {
    return true;
  }
  if (value === null || typeof value !== 'object' || isBinary(value) || seen.has(value)) {
    return false;
  }

  seen.add(value);
  for (const directKey of ['code', 'statusCode', 'status']) {
    if (
      directKey in value &&
      isBusinessCode((value as Record<string, unknown>)[directKey], directKey)
    ) {
      return true;
    }
  }
  for (const childKey of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[childKey];
    if (containsBusinessCode(child, source, childKey, seen)) {
      return true;
    }
  }
  return false;
}

function arithmeticError(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { name?: unknown; message?: unknown };
  if (typeof candidate.name === 'string' && ARITHMETIC_ERROR_NAMES.has(candidate.name)) {
    return true;
  }
  return (
    candidate.name === 'RangeError' &&
    typeof candidate.message === 'string' &&
    ARITHMETIC_RANGE_MESSAGES.has(candidate.message.trim().toLowerCase())
  );
}

function arithmeticEvent(event: ErrorHubEvent): boolean {
  const exception = event.exception?.values?.[0];
  if (!exception) {
    return false;
  }
  if (typeof exception.type === 'string' && ARITHMETIC_ERROR_NAMES.has(exception.type)) {
    return true;
  }
  return (
    exception.type === 'RangeError' &&
    typeof exception.value === 'string' &&
    ARITHMETIC_RANGE_MESSAGES.has(exception.value.trim().toLowerCase())
  );
}

export function isErrorHubErrorReportable(
  error: unknown,
  details?: unknown,
  lastMessage?: unknown,
  event?: ErrorHubEvent
): boolean {
  if (arithmeticError(error) || (event ? arithmeticEvent(event) : false)) {
    return false;
  }
  if (
    containsBusinessCode(error, 'error') ||
    containsBusinessCode(details, 'details') ||
    containsBusinessCode(lastMessage, 'message')
  ) {
    return false;
  }
  return true;
}

import { useEffect, useState } from 'react';

export type PrimitiveSettingValue = string | number | boolean | null;

export type LocalSettingOptions<T extends PrimitiveSettingValue> = {
  key: string;
  defaultValue: T;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
};

function inferPrimitiveParse<T extends PrimitiveSettingValue>(
  raw: string,
  defaultValue: T
): T {
  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as T;
  }

  if (typeof defaultValue === 'number') {
    const parsed = Number(raw);
    return (Number.isFinite(parsed) ? parsed : defaultValue) as T;
  }

  if (defaultValue === null) {
    return (raw === 'null' ? null : raw) as T;
  }

  return raw as T;
}

function inferPrimitiveSerialize<T extends PrimitiveSettingValue>(
  value: T
): string {
  return value === null ? 'null' : String(value);
}

export function readLocalSetting<T extends PrimitiveSettingValue>({
  key,
  defaultValue,
  parse,
}: LocalSettingOptions<T>): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return defaultValue;
  }

  try {
    return parse ? parse(raw) : inferPrimitiveParse(raw, defaultValue);
  } catch {
    return defaultValue;
  }
}

export function writeLocalSetting<T extends PrimitiveSettingValue>({
  key,
  value,
  serialize,
}: {
  key: string;
  value: T;
  serialize?: (value: T) => string;
}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const raw = serialize ? serialize(value) : inferPrimitiveSerialize(value);
  window.localStorage.setItem(key, raw);
}

export function resetLocalSetting<T extends PrimitiveSettingValue>({
  key,
  defaultValue,
  serialize,
}: {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
}): void {
  writeLocalSetting({ key, value: defaultValue, serialize });
}

export function useLocalSetting<T extends PrimitiveSettingValue>(
  options: LocalSettingOptions<T>
) {
  const [value, setValue] = useState<T>(() => readLocalSetting(options));

  useEffect(() => {
    writeLocalSetting({
      key: options.key,
      value,
      serialize: options.serialize,
    });
  }, [options.key, options.serialize, value]);

  return {
    value,
    setValue,
    reset: () =>
      resetLocalSetting({
        key: options.key,
        defaultValue: options.defaultValue,
        serialize: options.serialize,
      }),
  };
}

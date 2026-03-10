import {
  resetLocalSetting,
  useLocalSetting,
  type PrimitiveSettingValue,
} from '@/lib/hooks/useLocalSetting';

const appSettingDefinitions = {
  allowReorderDuringLiveDraft: {
    key: 'draft:allow-reorder-during-live',
    defaultValue: false as boolean,
  },
} as const;

type AppSettingDefinitions = typeof appSettingDefinitions;
export type AppSettingName = keyof AppSettingDefinitions;
export type AppSettingValue<K extends AppSettingName> =
  AppSettingDefinitions[K]['defaultValue'];

export function useAppSetting<K extends AppSettingName>(name: K) {
  const definition = appSettingDefinitions[name];
  const { value, setValue, reset } = useLocalSetting<AppSettingValue<K>>({
    key: definition.key,
    defaultValue: definition.defaultValue,
  });

  return {
    value,
    setValue,
    reset,
  };
}

export function resetAppSetting<K extends AppSettingName>(name: K): void {
  const definition = appSettingDefinitions[name];
  resetLocalSetting<AppSettingValue<K>>({
    key: definition.key,
    defaultValue: definition.defaultValue,
  });
}

export type AppSettingPrimitive = PrimitiveSettingValue;

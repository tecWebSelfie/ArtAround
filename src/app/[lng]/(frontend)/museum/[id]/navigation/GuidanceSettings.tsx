'use client'

import { ActionIcon, Popover, SegmentedControl, Stack, Switch, Text } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GPS_SIMULATOR_ENABLED, type GpsMode } from './gps-source'

/**
 * The visitor's guidance choices. Assistance is opt-in (PRODUCT.md), so
 * everything starts off. They are per-device conveniences, kept in
 * localStorage, not in the shareable URL.
 */
export function useGuidanceSettings() {
  const [assistant, setAssistant] = useLocalStorage({ key: 'aa-assistant', defaultValue: false })
  const [voiceGuidance, setVoiceGuidance] = useLocalStorage({
    key: 'aa-voice-guidance',
    defaultValue: false,
  })
  const [suggestions, setSuggestions] = useLocalStorage({
    key: 'aa-nearby-suggestions',
    defaultValue: false,
  })
  const [storedGps, setGpsMode] = useLocalStorage<GpsMode>({ key: 'aa-gps', defaultValue: 'off' })
  // A build without the simulator never runs a stored "simulated" choice.
  const gpsMode = storedGps === 'simulated' && !GPS_SIMULATOR_ENABLED ? 'off' : storedGps
  return {
    assistant,
    setAssistant,
    voiceGuidance,
    setVoiceGuidance,
    suggestions,
    setSuggestions,
    gpsMode,
    setGpsMode,
  }
}

export type GuidanceSettingsValue = ReturnType<typeof useGuidanceSettings>

export function GuidanceSettings({
  settings,
  gpsError,
}: {
  settings: GuidanceSettingsValue
  gpsError: string | null
}) {
  const { t } = useTranslation('tour-navigation')
  const gpsOptions = [
    { value: 'off', label: t('Off') },
    { value: 'device', label: t('GPS') },
    ...(GPS_SIMULATOR_ENABLED ? [{ value: 'simulated', label: t('Simulated') }] : []),
  ]
  return (
    <Popover position="top-end" withArrow shadow="md" width={260}>
      <Popover.Target>
        <ActionIcon
          aria-label={t('Guidance settings')}
          title={t('Guidance settings')}
          variant="white"
          radius="xl"
          size="lg"
        >
          <SlidersHorizontal size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Switch
            label={t('Voice assistant')}
            description={t('Tap the orb, speak, and it acts')}
            checked={settings.assistant}
            onChange={(event) => settings.setAssistant(event.currentTarget.checked)}
          />
          <Switch
            label={t('Speak directions')}
            description={t('Reads each new step aloud')}
            checked={settings.voiceGuidance}
            onChange={(event) => settings.setVoiceGuidance(event.currentTarget.checked)}
          />
          <Switch
            label={t('Nearby suggestions')}
            description={t('Contents in the room you enter')}
            checked={settings.suggestions}
            onChange={(event) => settings.setSuggestions(event.currentTarget.checked)}
          />
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              {t('Follow my position')}
            </Text>
            <SegmentedControl
              size="xs"
              fullWidth
              data={gpsOptions}
              value={settings.gpsMode}
              onChange={(value) => settings.setGpsMode(value as GpsMode)}
              aria-label={t('Follow my position')}
            />
            {gpsError && (
              <Text size="xs" c="red">
                {gpsError === 'denied'
                  ? t('Location permission was denied.')
                  : t('Location is not available on this device.')}
              </Text>
            )}
          </Stack>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

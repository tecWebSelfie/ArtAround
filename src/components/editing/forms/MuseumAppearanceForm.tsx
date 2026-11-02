'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Museum } from '@/payload-types'
import { HEX, PRIMARY_SHADE } from '@/lib/museum-color'
import { museumTheme } from '@/lib/museum-theme'
import {
  Alert,
  Anchor,
  Badge,
  Button,
  ColorInput,
  ColorSwatch,
  Group,
  MantineProvider,
  Stack,
  Text,
} from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { SOURCE_LOCALE, useSave } from '../saving'

type PaletteModule = typeof import('@/lib/museum-palette')

/** Starting points that already read well on white, none of them red or orange. */
const SWATCHES = [
  '#1864ab', // blue
  '#1b2a4a', // navy
  '#5f3dc4', // indigo
  '#862e9c', // purple
  '#a61e4d', // raspberry
  '#0b7285', // teal
  '#2b8a3e', // green
  '#5c940d', // olive
  '#7b1113', // bordeaux
  '#495057', // slate
]

/**
 * The museum's color (director only, `brandColor` in `Museums.ts`): the one
 * input of the per-museum theme. The form explains the result before saving
 * (what the buttons will really use, and when the color was darkened to stay
 * readable) and refuses the hues that already carry a meaning on every page
 * (red = delete, orange = paid). The server repeats both checks: this is
 * feedback, not enforcement.
 *
 * The color math (`museum-palette`, Leonardo) loads on demand, so visitors who
 * never open this form don't download it.
 */
export function MuseumAppearanceForm({ museum }: { museum: Pick<Museum, 'id' | 'brandColor'> }) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const [value, setValue] = useState(museum.brandColor ?? '')
  const [palette, setPalette] = useState<PaletteModule | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('@/lib/museum-palette').then((module) => {
      if (!cancelled) setPalette(module)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const brand = value.trim().toLowerCase()
  const analysis = useMemo(() => {
    if (!palette || !HEX.test(brand)) return null
    const reserved = palette.reservedHue(brand)
    // Only a color the server would accept gets a preview.
    const result = reserved ? null : palette.museumPalette(brand)
    return {
      reserved,
      alternative: reserved ? palette.nearestAllowed(brand) : null,
      similar: palette.similarHue(brand),
      result,
      theme: result ? museumTheme(result.palette) : null,
    }
  }, [palette, brand])

  // Anything that is not a full hex (half-typed, or not a color at all) only
  // blocks saving.
  const invalid = brand !== '' && !HEX.test(brand)
  const blocked = Boolean(analysis?.reserved) || invalid

  const save = useSave(
    (next: string | null) =>
      payloadSdk.update({
        collection: 'museums',
        id: museum.id,
        locale: SOURCE_LOCALE,
        data: { brandColor: next },
      }),
    close,
  )

  const error = invalid
    ? t('Enter a color like #1b2a4a.')
    : analysis?.reserved === 'destructive'
      ? t('Red marks the actions that delete something, so it cannot be the museum color.')
      : analysis?.reserved === 'paid'
        ? t('Orange marks paid contents, so it cannot be the museum color.')
        : null

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!blocked) save.mutate(brand || null)
      }}
    >
      <Stack gap="sm">
        <ColorInput
          label={t('Museum color')}
          description={t(
            'Buttons, links and highlights use it while visitors are in this museum. Leave empty for the default blue.',
          )}
          format="hex"
          withEyeDropper={false}
          swatches={SWATCHES}
          swatchesPerRow={5}
          placeholder="#1b2a4a"
          value={value}
          onChange={setValue}
          error={error}
        />
        {analysis?.alternative && (
          <Group gap="xs">
            <ColorSwatch color={analysis.alternative} size={18} aria-hidden />
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => setValue(analysis.alternative ?? '')}
            >
              {t('Use {{color}} instead', { color: analysis.alternative })}
            </Button>
          </Group>
        )}
        {analysis?.similar && !analysis.reserved && (
          <Alert color="yellow" variant="light">
            {t(
              'This color is close to one the app uses for tours, contents or the Navigator, so some highlights may look alike.',
            )}
          </Alert>
        )}
        {analysis?.result && analysis.theme && (
          <Stack gap="xs" aria-live="polite">
            {analysis.result.adjusted && (
              <Alert color="yellow" variant="light">
                {t('We darkened this color so text and buttons stay readable.')}
              </Alert>
            )}
            <Group gap="lg">
              <Group gap="xs">
                <ColorSwatch color={brand} size={22} aria-hidden />
                <Text size="sm">{t('Your color')}</Text>
              </Group>
              <Group gap="xs">
                <ColorSwatch color={analysis.result.palette[PRIMARY_SHADE]} size={22} aria-hidden />
                <Text size="sm">{t('Used for buttons and links')}</Text>
              </Group>
            </Group>
            <Text size="sm" fw={500}>
              {t('Preview')}
            </Text>
            {/* Scoped copy of the theme: Mantine's variables normally live on
                `:root`, so a nested provider writes them on this wrapper only
                and the rest of the page keeps its own colors. */}
            <MantineProvider
              theme={analysis.theme}
              cssVariablesSelector="[data-museum-preview]"
              getRootElement={() => undefined}
              withGlobalClasses={false}
              withStaticClasses={false}
            >
              <Group
                // Mantine writes the light-scheme variables (filled, light,
                // anchor) for `selector[data-mantine-color-scheme="light"]`.
                data-museum-preview
                data-mantine-color-scheme="light"
                gap="sm"
                align="center"
                wrap="wrap"
              >
                <Button size="compact-md">{t('Button')}</Button>
                <Button size="compact-md" variant="light">
                  {t('Button')}
                </Button>
                <Anchor component="span" size="sm">
                  {t('Link')}
                </Anchor>
                <Badge variant="light">{t('Tag')}</Badge>
              </Group>
            </MantineProvider>
          </Stack>
        )}
        {brand === '' && museum.brandColor && (
          <Text size="sm" c="dimmed">
            {t('The app will use its default blue in this museum.')}
          </Text>
        )}
        <Group justify="space-between" align="center" wrap="wrap">
          <Button
            variant="subtle"
            size="compact-sm"
            disabled={value === ''}
            onClick={() => setValue('')}
          >
            {t('Reset to default')}
          </Button>
          <FormActions saving={save.isPending} disabled={blocked} />
        </Group>
      </Stack>
    </form>
  )
}

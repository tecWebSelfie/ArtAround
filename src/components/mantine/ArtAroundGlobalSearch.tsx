'use client'

import type { Difficulty } from '@/payload-types'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import {
  Button,
  Combobox,
  ComboboxDropdown,
  ComboboxOption,
  ComboboxOptions,
  ComboboxProps,
  ComboboxTarget,
  Group,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core'
import { useUncontrolled } from '@mantine/hooks'
import { Search } from 'lucide-react'
import { DifficultyBadge } from './DifficultyBadge'
import { DurationBadge } from './DurationBadge'

/**
 * Display-only shape returned by `/api/navigator-search`.
 *
 * The combobox intentionally does not receive full Payload documents: search
 * rows already carry the title/excerpt/city needed for the dropdown, and keeping
 * the payload small avoids leaking fields the public API does not need.
 */
export type AutoCompleteItem = {
  kind: 'content' | 'tour' | 'museum' | 'object' | 'user'
  key: string
  title: string
  /** Canonical localized URL (for example `/en/museum/ID`). */
  href: string
  subtitle?: string
  city?: string
  difficulty?: Difficulty
  readingTimeMins?: number
}

export function ArtAroundGlobalSearch({
  items,
  onChange,
  value, // use it if you want to control the value of the input
  defaultValue, // use it if you want to set the initial value of the input (uncontrolled input)
  filter,
  ...props
}: ComboboxProps & {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
} & { items: AutoCompleteItem[]; filter?: (item: AutoCompleteItem) => boolean }) {
  const [_value, handleChange] = useUncontrolled({
    value,
    defaultValue,
    onChange,
    finalValue: '',
  })
  const filteredOptions = items.filter(
    filter ??
      ((item) => {
        const label = `${item.title} ${item.subtitle ?? ''} ${item.city ?? ''}`
        return label.toLowerCase().includes(_value.toLowerCase())
      }),
  )
  const combobox = useCombobox()

  return (
    <Combobox {...props} store={combobox} offset={0}>
      <ComboboxTarget>
        <BorderAnimate radius="xl" borderWidth="sm" size="sm" duration={4}>
          <TextInput
            leftSection={<Search size={16} />}
            bd="1px solid purple"
            bdrs="xl"
            size="lg"
            radius="xl"
            w="100%"
            placeholder="Look for the next tour"
            value={_value}
            onChange={(e) => {
              handleChange(e.currentTarget.value)
              combobox.openDropdown()
              combobox.updateSelectedOptionIndex()
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </BorderAnimate>
      </ComboboxTarget>
      <ComboboxDropdown>
        <ComboboxOptions>
          {filteredOptions.map((item) => {
            if (item.kind === 'tour') {
              return (
                <BorderAnimate variant="draw" my="xs" key={item.href}>
                  <ComboboxOption value={item.href}>{renderDropdownItem(item)}</ComboboxOption>
                </BorderAnimate>
              )
            }
            return (
              <ComboboxOption value={item.href} key={item.href}>
                {renderDropdownItem(item)}
              </ComboboxOption>
            )
          })}
        </ComboboxOptions>
      </ComboboxDropdown>
    </Combobox>
  )
}

function renderDropdownItem(item: AutoCompleteItem) {
  return item.kind === 'content' ? (
    <ContentDropdownItem item={item} />
  ) : (
    <ResultDropdownItem item={item} />
  )
}

const ContentDropdownItem = ({ item }: { item: AutoCompleteItem }) => {
  return (
    <Stack>
      <div>{item.title}</div>
      <Group justify="space-between">
        <Group justify="left" gap={'xs'}>
          {item.readingTimeMins && <DurationBadge time={item.readingTimeMins} />}
          {item.difficulty && <DifficultyBadge difficulty={item.difficulty} />}
        </Group>
        <Button size="compact-xs">See more</Button>
      </Group>
    </Stack>
  )
}

/** Shared compact row for tours, museums, objects and profiles. */
const ResultDropdownItem = ({ item }: { item: AutoCompleteItem }) => {
  return (
    <Stack gap={2}>
      <Text fw={600}>{item.title}</Text>
      {item.subtitle ? (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {item.subtitle}
        </Text>
      ) : null}
      {item.city && !item.subtitle?.includes(item.city) ? (
        <Text size="xs" c="dimmed">
          {item.city}
        </Text>
      ) : null}
    </Stack>
  )
}

'use client'

import type { Content, Museum, Tour, User } from '@/payload-types'
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
  TextInput,
  useCombobox,
} from '@mantine/core'
import { useUncontrolled } from '@mantine/hooks'
import { Search } from 'lucide-react'
import { DifficultyBadge } from './DifficultyBadge'
import { DurationBadge } from './DurationBadge'

type AutoCompleteItem = (
  | { kind: 'content'; content: Content }
  | { kind: 'tour'; tour: Tour }
  | { kind: 'museum'; museum: Museum }
  | { kind: 'user'; user: User }
) & { key: string }

export function ArtAroundGlobalSearch({
  items,
  onChange,
  value, // use it if you want to control the value of the input
  defaultValue, // use it if you want to set the initial value of the input (uncontrolled input)
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
    props.filter ??
      ((item) => {
        const label =
          item.kind === 'content'
            ? item.content.title
            : item.kind === 'tour'
              ? item.tour.title
              : item.kind === 'museum'
                ? item.museum.name
                : item.user.name.fullName
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
            const value = `${item.kind}/${item.key}`
            if (item.kind == 'tour') {
              return (
                <BorderAnimate variant="draw" my="xs" key={value}>
                  <ComboboxOption value={`${item.kind}/${item.key}`}>
                    {renderDropdownItem(item)}
                  </ComboboxOption>
                </BorderAnimate>
              )
            } else {
              return (
                <ComboboxOption value={value} key={value}>
                  {renderDropdownItem(item)}
                </ComboboxOption>
              )
            }
          })}
        </ComboboxOptions>
      </ComboboxDropdown>
    </Combobox>
  )
}

function renderDropdownItem(item: AutoCompleteItem) {
  switch (item.kind) {
    case 'content':
      return <ContentDropdownItem content={item.content} />
    case 'tour':
      return <TourDropdownItem tour={item.tour} />
    case 'museum':
      return <MuseumDropdownItem museum={item.museum} />
    case 'user':
      return <UserDropdownItem user={item.user} />
    default:
      return assertNever(item)
  }
}

const ContentDropdownItem = ({ content }: { content: Content }) => {
  return (
    <Stack>
      <div>{content.title}</div>
      <Group justify="space-between">
        <Group justify="left" gap={'xs'}>
          {content.readingTimeMins && <DurationBadge time={content.readingTimeMins} />}
          <DifficultyBadge difficulty={content.difficulty} />
        </Group>
        <Button size="compact-xs">See more</Button>
      </Group>
    </Stack>
  )
}

const TourDropdownItem = ({ tour }: { tour: Tour }) => {
  return (
    <div>
      <div>{tour.title}</div>
    </div>
  )
}

const MuseumDropdownItem = ({ museum }: { museum: Museum }) => {
  return (
    <div>
      <div>{museum.name}</div>
    </div>
  )
}

const UserDropdownItem = ({ user }: { user: User }) => {
  return (
    <div>
      <div>{user.name.fullName}</div>
    </div>
  )
}

function assertNever(value: never): never {
  throw new Error(`Unhandled autocomplete item: ${JSON.stringify(value)}`)
}

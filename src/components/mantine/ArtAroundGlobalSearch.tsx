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
  ...props
}: ComboboxProps & { items: AutoCompleteItem[] }) {
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
            onClick={() => combobox.openDropdown()}
          />
        </BorderAnimate>
      </ComboboxTarget>
      <ComboboxDropdown>
        <ComboboxOptions>
          {items.map((item) => {
            const value = `${item.kind}/${item.key}`
            if (item.kind == 'tour') {
              return (
                <BorderAnimate my="xs" key={value}>
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

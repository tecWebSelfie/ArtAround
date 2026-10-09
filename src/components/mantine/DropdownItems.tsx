import type { Content, Museum, Tour, User } from '@/payload-types'
import {
  Combobox,
  ComboboxDropdown,
  ComboboxProps,
  ComboboxTarget,
  Group,
  TextInput,
  useCombobox,
} from '@mantine/core'
import { Search } from 'lucide-react'

type ExperienceItem = ({ kind: 'content'; content: Content } | { kind: 'tour'; tour: Tour }) & {
  key: string
}

type AutoCompleteItem = (
  | { kind: 'experience'; experience: ExperienceItem }
  | { kind: 'museum'; museum: Museum }
  | { kind: 'user'; user: User }
) & { key: string }

export default function ArtAroundAutocomplete({
  items,
  ...props
}: ComboboxProps & { items: AutoCompleteItem[] }) {
  const combobox = useCombobox()
  return (
    <Combobox {...props} store={combobox}>
      <ComboboxTarget>
        <TextInput onClick={() => combobox.openDropdown()} leftSection={<Search size={16} />} />
      </ComboboxTarget>
      <ComboboxDropdown>
        {items.map((item) => (
          <Group key={`${item.kind}-${item.key}`}>{renderDropdownItem(item)}</Group>
        ))}
      </ComboboxDropdown>
    </Combobox>
  )
}

function renderDropdownItem(item: AutoCompleteItem) {
  switch (item.kind) {
    case 'experience':
      return renderExperienceItem(item.experience)
    case 'museum':
      return <div>{item.museum.name}</div>
    case 'user':
      return <div>{item.user.name.fullName}</div>
    default:
      return assertNever(item)
  }
}

function renderExperienceItem(item: ExperienceItem) {
  switch (item.kind) {
    case 'content':
      return <div>{item.content.title}</div>
    case 'tour':
      return <div>{item.tour.title}</div>
    default:
      return assertNever(item)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled autocomplete item: ${JSON.stringify(value)}`)
}

'use client'

import { ActionIcon, Button, Popover } from '@mantine/core'
import { MapPin, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NAVIGATION_ACTION_CLASS } from './navigation-touch'

export type NavigationServiceAction = {
  id: string
  label: string
  Icon: LucideIcon
  color: string
  active: boolean
  onSelect: () => void
}

/** Services stay one tap away without consuming the map's limited vertical space. */
export function NavigationServices({ actions }: { actions: NavigationServiceAction[] }) {
  const [opened, setOpened] = useState(false)
  const { t } = useTranslation('tour-navigation')
  if (!actions.length) return null
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      trapFocus
      position="top-start"
      withArrow
      shadow="md"
      width={280}
    >
      <Popover.Target>
        <ActionIcon
          size={44}
          variant="white"
          aria-label={t('Services')}
          aria-expanded={opened}
          onClick={() => setOpened((value) => !value)}
        >
          <MapPin size={22} aria-hidden />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown className="max-w-[calc(100vw-2rem)]">
        <div
          className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto"
          role="group"
          aria-label={t('Services')}
        >
          {actions.map(({ id, label, Icon, color, active, onSelect }) => (
            <Button
              key={id}
              variant={active ? 'light' : 'default'}
              color={color}
              className={NAVIGATION_ACTION_CLASS}
              aria-pressed={active}
              leftSection={<Icon size={20} aria-hidden />}
              onClick={() => {
                onSelect()
                setOpened(false)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}

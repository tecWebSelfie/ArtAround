'use client'

import { useMemo, useState } from 'react'
import {
  FloatingIndicator,
  Tabs as MantineTabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Group,
  Center,
  Box,
  type TabsProps as MantineTabsProps,
} from '@mantine/core'

export type ArtAroundTabDef = {
  value: string
  icon?: React.ReactNode
  panel?: React.ReactNode
  disabled?: boolean
}

export type ArtaroundTabsProps = Omit<
  MantineTabsProps,
  'value' | 'defaultValue' | 'onChange' | 'children'
> & {
  tabs: ArtAroundTabDef[]
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null) => void
}

export function toTabLabel(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function ArtaroundTabs({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  variant = 'none',
  ...rest
}: ArtaroundTabsProps) {
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null)
  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
    defaultValue ?? tabs[0]?.value ?? null,
  )
  const [controlsRefs, setControlsRefs] = useState<Record<string, HTMLButtonElement | null>>({})

  const isControlled = controlledValue !== undefined
  const rawActive = isControlled ? controlledValue : uncontrolledValue
  const values = tabs.map((t) => t.value)
  const active = values.includes(rawActive ?? '') ? rawActive : (values[0] ?? null)

  const handleChange = (next: string | null) => {
    if (!isControlled) setUncontrolledValue(next)
    onChange?.(next)
  }

  // Stable ref callbacks: a new closure every render makes React detach
  // (call with null) + re-attach on each render, which setState-loops.
  // One cached callback per tab value keeps ref identity stable across
  // renders. Keyed by joined values (not the array identity) so inline
  // `tabs` literals don't recreate callbacks every parent render.
  const valuesKey = values.join('\n')
  const refCallbacks = useMemo(() => {
    const map = new Map<string, (node: HTMLButtonElement | null) => void>()
    for (const tabValue of valuesKey.split('\n')) {
      if (!tabValue) continue
      map.set(tabValue, (node: HTMLButtonElement | null) => {
        setControlsRefs((prev) => {
          if (prev[tabValue] === node) return prev
          return { ...prev, [tabValue]: node }
        })
      })
    }
    return map
  }, [valuesKey])

  const panels = tabs.filter((t) => t.panel !== undefined)

  return (
    <MantineTabs variant={variant} value={active} onChange={handleChange} {...rest}>
      <TabsList ref={setRootRef} grow justify="center" pos="relative">
        <FloatingIndicator
          className="border-b-2 border-b-(--mantine-color-blue-6)"
          parent={rootRef}
          target={active ? (controlsRefs[active] ?? null) : null}
        />

        {tabs.map((tab) => (
          <TabsTab
            key={tab.value}
            value={tab.value}
            ref={refCallbacks.get(tab.value)}
            disabled={tab.disabled}
          >
            <Center>
              <Group>
                {tab.icon} {toTabLabel(tab.value)}{' '}
              </Group>
            </Center>
          </TabsTab>
        ))}
      </TabsList>

      {panels.map((tab) => (
        <TabsPanel key={tab.value} value={tab.value}>
          <Box p="sm">{tab.panel}</Box>
        </TabsPanel>
      ))}
    </MantineTabs>
  )
}

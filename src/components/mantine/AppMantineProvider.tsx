'use client'

import { cssVariablesResolver } from '@/theme'
import {
  Drawer,
  MantineProvider,
  Modal,
  type MantineProviderProps,
  type MantineThemeOverride,
} from '@mantine/core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The app's MantineProvider with its CSS variables resolver (readable
 * `dimmed`, see `src/theme.ts`). A client component because the resolver is a
 * function, which a server layout can't pass across to a client component;
 * the theme itself is plain data and still comes from the server
 * (`museumTheme`, so museum mode paints its colors on the first render).
 *
 * It also names every modal's and drawer's close button ("Close", in the
 * visitor's language): Mantine's is an icon-only button, which screen readers
 * announced as an unnamed button wherever a dialog forgot to pass a label.
 * A dialog's own `closeButtonProps` still wins.
 */
export function AppMantineProvider({
  theme,
  ...props
}: Omit<MantineProviderProps, 'cssVariablesResolver'>) {
  const { t } = useTranslation('common')
  const close = t('Close')
  const withDialogLabels = useMemo<MantineThemeOverride>(() => {
    const closeButtonProps = { 'aria-label': close }
    return {
      ...theme,
      components: {
        ...theme?.components,
        Modal: Modal.extend({ defaultProps: { closeButtonProps } }),
        Drawer: Drawer.extend({ defaultProps: { closeButtonProps } }),
      },
    }
  }, [theme, close])

  return (
    <MantineProvider
      // Light or dark as the visitor's system says (DESIGN.md → Color
      // scheme); must match `MantineColorSchemeScript`'s default.
      defaultColorScheme="auto"
      {...props}
      theme={withDialogLabels}
      cssVariablesResolver={cssVariablesResolver}
    />
  )
}

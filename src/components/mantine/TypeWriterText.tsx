'use client'

import React from 'react'
import { TextAnimate, type TypewriterProps } from '@gfazioli/mantine-text-animate'
import { polymorphic, type MantineColor, type PolymorphicComponentProps } from '@mantine/core'

export type TypeWriterTextProps<TWords extends MantineColor = string> = Omit<
  TypewriterProps,
  'value'
> & {
  value: TWords | TWords[]
  /**
   * Word in `value` -> color. Keys are restricted to the words passed in
   * `value`, so a typo is a compile error. The rendered color always follows
   * the word being typed. Values use Mantine's `c` prop, so theme colors
   * ('red', 'blue', ...) and any CSS color work.
   */
  loopColors?: Partial<Record<NoInfer<TWords>, MantineColor>>
  /**
   * The color to use when a word has no entry in `loopColors`.
   */
  fallbackColor?: MantineColor
}

export type TypeWriterTextComponent = <
  TWords extends string = string,
  C extends React.ElementType = 'p',
>(
  props: PolymorphicComponentProps<C, TypeWriterTextProps<TWords>>,
) => React.ReactElement

const toWords = <TWords extends string>(value: TWords | TWords[]): TWords[] =>
  Array.isArray(value) ? value : [value]

/**
 * Tracks which word of `words` is currently being typed.
 *
 * `onTypeLoop` only fires once per full cycle, not per word, so a new word is
 * detected via `onCharType`: every word starts typing at char index 0, right
 * after the previous word has been deleted.
 */
function useCurrentWordIndex(words: string[]): [number, (index: number) => void] {
  const wordsKey = JSON.stringify(words)
  const [cycle, setCycle] = React.useState({ key: wordsKey, index: 0, started: false })

  if (cycle.key !== wordsKey) {
    setCycle({ key: wordsKey, index: 0, started: false })
  }

  const trackChar = React.useCallback(
    (index: number) => {
      if (index !== 0) return
      setCycle((prev) =>
        prev.started
          ? { ...prev, index: (prev.index + 1) % Math.max(words.length, 1) }
          : { ...prev, started: true },
      )
    },
    [words.length],
  )

  return [cycle.index, trackChar]
}

function TypeWriterTextView<TWords extends string>(props: TypeWriterTextProps<TWords>) {
  // `c` is Mantine's text-color style prop; `color` would land on the DOM as a
  // no-op attribute. It doubles as the fallback when a word has no entry.
  const { loopColors, value, fallbackColor, c, onCharType, ...rest } = props
  const words = React.useMemo(() => toWords(value), [value])
  const [wordIndex, trackChar] = useCurrentWordIndex(words)

  const handleCharType = React.useCallback(
    (char: string, index: number) => {
      trackChar(index)
      onCharType?.(char, index)
    },
    [trackChar, onCharType],
  )

  const currentWord = words[wordIndex % Math.max(words.length, 1)]
  const currentColor = (currentWord && loopColors?.[currentWord]) ?? c ?? fallbackColor

  return (
    <TextAnimate.Typewriter {...rest} value={value} c={currentColor} onCharType={handleCharType} />
  )
}

// `polymorphic` is an identity function at runtime; the cast only carries the
// generic signature so `TWords` is inferred from `value` at each call site.
export const TypeWriterText: TypeWriterTextComponent = polymorphic<'p', TypeWriterTextProps>(
  TypeWriterTextView,
) as TypeWriterTextComponent

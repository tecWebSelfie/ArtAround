'use client'

import React from 'react'
import { TextAnimate, type TypewriterProps } from '@gfazioli/mantine-text-animate'
import { polymorphic, Text, type MantineColor, type PolymorphicComponentProps } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'

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
  // Stable by content: callers pass inline literals, a new array every render,
  // and each new array makes the Typewriter schedule another typing timer.
  const wordsKey = JSON.stringify(toWords(value))
  const words = React.useMemo(() => JSON.parse(wordsKey) as TWords[], [wordsKey])
  const [wordIndex, trackChar] = useCurrentWordIndex(words)
  const reducedMotion = useReducedMotion()

  const handleCharType = React.useCallback(
    (char: string, index: number) => {
      trackChar(index)
      onCharType?.(char, index)
    },
    [trackChar, onCharType],
  )

  const currentWord = words[wordIndex % Math.max(words.length, 1)]
  const currentColor = (currentWord && loopColors?.[currentWord]) ?? c ?? fallbackColor

  if (reducedMotion) {
    // `prefers-reduced-motion`: no typing, no cycling, just one word in its
    // color (the first; nothing advances `wordIndex` without the Typewriter).
    // The Typewriter's own fallback isn't usable: it shows the last word, whose
    // color our `onCharType` tracking never reaches, and a typing timer it set
    // before switching itself off still overwrites it with the first char.
    const {
      animate: _animate,
      delay: _delay,
      loop: _loop,
      multiline: _multiline,
      speed: _speed,
      pauseAt: _pauseAt,
      withSound: _withSound,
      soundVolume: _soundVolume,
      onTypeEnd: _onTypeEnd,
      onTypeLoop: _onTypeLoop,
      leftSection,
      withCursor: _withCursor,
      cursorChar: _cursorChar,
      withBlink: _withBlink,
      classNames: _classNames,
      styles: _styles,
      vars: _vars,
      unstyled: _unstyled,
      ...textProps
    } = rest
    return (
      <Text {...textProps} c={currentColor}>
        {leftSection}
        {currentWord}
      </Text>
    )
  }

  return (
    <TextAnimate.Typewriter {...rest} value={words} c={currentColor} onCharType={handleCharType} />
  )
}

// `polymorphic` is an identity function at runtime; the cast only carries the
// generic signature so `TWords` is inferred from `value` at each call site.
export const TypeWriterText: TypeWriterTextComponent = polymorphic<'p', TypeWriterTextProps>(
  TypeWriterTextView,
) as TypeWriterTextComponent

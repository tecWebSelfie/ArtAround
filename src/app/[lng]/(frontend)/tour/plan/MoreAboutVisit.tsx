'use client'

import {
  Collapse,
  Group,
  Input,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { COUNT_INPUT, MAX_CHILDREN, type Answers } from './plan-visit-state'

/**
 * "More about your visit": first or returning visit, adults, children and
 * their ages. Optional, so it starts closed; its toggle (two lines, which
 * don't fit a fixed-height Button, hence an UnstyledButton with Mantine's
 * focus ring) still says what is set.
 */
export function MoreAboutVisit({
  answers,
  update,
  setChildren,
  setAge,
  ageError,
  open,
  onToggle,
}: {
  answers: Answers
  update: <K extends keyof Answers>(key: K, value: Answers[K]) => void
  setChildren: (count: number) => void
  setAge: (index: number, age: number | '') => void
  /** A child's age is missing on submit. */
  ageError: boolean
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('plan-visit')
  const moreSummary = [
    answers.returning === 'returning' ? t('Been before') : t('First visit'),
    t('Adults: {{n}}', { n: answers.adults }),
    answers.childrenAges.length ? t('Children: {{n}}', { n: answers.childrenAges.length }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Stack gap="sm">
      <UnstyledButton
        aria-expanded={open}
        aria-controls="plan-more"
        onClick={onToggle}
        className="rounded-(--mantine-radius-sm) border border-solid border-(--mantine-color-default-border) px-(--mantine-spacing-sm) py-(--mantine-spacing-xs) hover:bg-(--mantine-color-default-hover)"
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <span className="flex min-w-0 flex-col">
            <Text component="span" size="md" fw={500}>
              {t('More about your visit')}
            </Text>
            <Text component="span" size="sm" c="dimmed" truncate="end">
              {moreSummary}
            </Text>
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={open} id="plan-more">
        <Stack gap="lg" pt="xs">
          <Stack gap={6}>
            <Text size="md" fw={500} id="plan-returning">
              {t('Have you been here before?')}
            </Text>
            <SegmentedControl
              size="md"
              aria-labelledby="plan-returning"
              aria-describedby="plan-returning-help"
              value={answers.returning}
              onChange={(value) => update('returning', value as Answers['returning'])}
              data={[
                { value: 'first', label: t('First visit') },
                { value: 'returning', label: t('Been before') },
              ]}
            />
            <Text size="sm" c="dimmed" id="plan-returning-help">
              {t('A first visit takes in the must-sees; after that, less obvious works.')}
            </Text>
          </Stack>
          <SimpleGrid cols={2} spacing="md">
            <NumberInput
              {...COUNT_INPUT}
              label={t('Adults')}
              min={answers.childrenAges.length ? 0 : 1}
              max={30}
              value={answers.adults}
              onChange={(value) => update('adults', typeof value === 'number' ? value : 0)}
              onBlur={() => {
                if (!answers.childrenAges.length && answers.adults < 1) update('adults', 1)
              }}
            />
            <NumberInput
              {...COUNT_INPUT}
              label={t('Children')}
              min={0}
              max={MAX_CHILDREN}
              value={answers.childrenAges.length}
              onChange={(value) => setChildren(typeof value === 'number' ? value : 0)}
            />
          </SimpleGrid>
          {answers.childrenAges.length > 0 && (
            <Input.Wrapper
              labelElement="div"
              label={t("Children's ages")}
              description={t("Their ages choose easier contents and children's versions.")}
              error={ageError ? t("Enter each child's age, from 0 to 17.") : undefined}
            >
              <SimpleGrid cols={{ base: 3, xs: 4 }} spacing="xs" mt={6}>
                {answers.childrenAges.map((age, index) => (
                  <NumberInput
                    // Children are positional: the nth field is the nth child.
                    key={index}
                    {...COUNT_INPUT}
                    aria-label={t('Age of child {{n}}', { n: index + 1 })}
                    min={0}
                    max={17}
                    value={age}
                    error={ageError && age === ''}
                    onChange={(value) => setAge(index, typeof value === 'number' ? value : '')}
                  />
                ))}
              </SimpleGrid>
            </Input.Wrapper>
          )}
        </Stack>
      </Collapse>
    </Stack>
  )
}

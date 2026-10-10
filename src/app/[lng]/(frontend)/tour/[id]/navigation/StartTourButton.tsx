import { getT } from '@/i18n.server'
import { BorderAnimate, BorderAnimateProps } from '@gfazioli/mantine-border-animate'
import { Group, Text, UnstyledButton } from '@mantine/core'
import { cn } from 'cn'
import { PlayCircle } from 'lucide-react'
import Link from 'next/link'

export const StartTourButton = async ({
  tourId,
  ...props
}: { tourId: string } & BorderAnimateProps) => {
  const { t } = await getT('tour-navigation')
  return (
    <BorderAnimate
      {...props}
      variant="draw"
      borderWidth={'sm'}
      className={cn('transition hover:scale-105', props.className)}
    >
      <UnstyledButton component={Link} href={`/tour/${tourId}/navigation`} className="p-2">
        <Group align="center" gap="xs" justify="center">
          <Text
            className="font-semibold"
            variant="gradient"
            gradient={{ from: 'grape.8', to: 'orange.8' }}
          >
            {t('Start Tour')}
          </Text>
          <PlayCircle size={24} />
        </Group>
      </UnstyledButton>
    </BorderAnimate>
  )
}

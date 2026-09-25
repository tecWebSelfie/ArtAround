'use client'

import { AppShell, AppShellFooter, Button, Grid, GridCol, Text, Center } from '@mantine/core'
import { LfrsRating, LfrsShare } from 'payload-lfrs/client'
export default function MantinePlayground() {
  return (
    <AppShell
      footer={{
        height: 50,
      }}
    >
      <Grid>
        <GridCol span="auto">
          <Text>Playground</Text>
          <LfrsRating readonly targetCollection="contents" targetDoc="6ab62dfce8dc0694c7ef33d1" />
        </GridCol>
        <GridCol span="auto">
          <Text>Playground</Text>
        </GridCol>
      </Grid>
      <AppShellFooter component="nav">
        <Grid>
          <GridCol span="auto">
            <Button>1</Button>
          </GridCol>
          <GridCol span="auto">
            <Button>1</Button>
          </GridCol>
          <GridCol span="auto">
            <Button>1</Button>
          </GridCol>
        </Grid>
      </AppShellFooter>
    </AppShell>
  )
}

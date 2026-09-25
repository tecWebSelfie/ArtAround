'use client'

import { AppShell, AppShellFooter, Button, Grid, GridCol, Text, Center } from '@mantine/core'
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

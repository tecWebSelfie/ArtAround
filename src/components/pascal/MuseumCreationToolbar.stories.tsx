import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { BuildingNode, LevelNode, loadPlugin, useScene } from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { ModelGenerationProviders } from '../../../.storybook/model-generation-providers'
import { MuseumCreationToolbar } from './MuseumCreationToolbar'

const meta = {
  title: 'Museum Map/Creation Toolbar',
  component: MuseumCreationToolbar,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div style={{ height: 600, position: 'relative' }}>
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  beforeEach: async () => {
    await loadPlugin(builtinPlugin)
    const scene = useScene.getState()
    const viewer = useViewer.getState()
    const editor = useEditor.getState()
    const building = BuildingNode.parse({})
    const level = LevelNode.parse({ parentId: building.id })
    building.children = [level.id]
    useScene.getState().setScene({ [building.id]: building, [level.id]: level }, [building.id])
    useScene.setState({ readOnly: false })
    useViewer.getState().setSelection({ levelId: level.id, buildingId: building.id })
    useEditor.setState({
      workspaceMode: 'edit',
      isPreviewMode: false,
      isCaptureMode: false,
      selectedReferenceId: null,
    })
    useEditor.getState().armToolMode({ mode: 'select' })
    return () => {
      useScene.setState(scene)
      useViewer.setState(viewer)
      useEditor.setState(editor)
    }
  },
} satisfies Meta<typeof MuseumCreationToolbar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    for (const label of ['Draw walls', 'Draw a slab', 'Add a door', 'Add a window']) {
      const button = canvas.getByRole('button', { name: label })
      await userEvent.click(button)
      await expect(button).toHaveAttribute('aria-pressed', 'true')
    }
    const select = canvas.getByRole('button', { name: 'Select objects' })
    await userEvent.click(select)
    await expect(select).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Add a window' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Add object to the map' }))
    await expect(useEditor.getState().activeSidebarPanel).toBe('items')
  },
}

export const NoActiveLevel: Story = {
  beforeEach: () => {
    useViewer.getState().setSelection({ levelId: null })
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Draw walls' })).toBeDisabled()
    await expect(
      canvas.getByRole('button', { name: 'Add a floorplan (SVG or image)' }),
    ).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Add object to the map' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Select objects' })).toBeEnabled()
  },
}

export const ReadOnly: Story = {
  beforeEach: () => {
    useScene.setState({ readOnly: true })
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('group', { name: 'Museum creation tools' }),
    ).not.toBeInTheDocument()
  },
}

export const CaptureMode: Story = {
  beforeEach: () => {
    useEditor.setState({ isCaptureMode: true })
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('group', { name: 'Museum creation tools' }),
    ).not.toBeInTheDocument()
  },
}

const svg = new File(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path d="M10 10H190V90H10Z" fill="none" stroke="black"/></svg>',
  ],
  'museum-floorplan.svg',
  { type: 'image/svg+xml' },
)

export const FloorplanImported: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/museumMaps', () =>
          HttpResponse.json({
            doc: { id: 'floorplan', url: '/api/museumMaps/file/museum-floorplan.svg' },
          }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    const levelId = useViewer.getState().selection.levelId
    await userEvent.upload(canvas.getByLabelText('Choose a floorplan file'), svg)
    await waitFor(() => expect(useEditor.getState().selectedReferenceId).not.toBeNull())
    const guide = Object.values(useScene.getState().nodes).find(
      (node) => node.id === useEditor.getState().selectedReferenceId,
    )
    await expect(guide).toMatchObject({
      type: 'guide',
      name: 'museum-floorplan.svg',
      parentId: levelId,
      url: expect.stringMatching(/^https?:.*museum-floorplan\.svg$/),
    })
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
  },
}

export const UploadFailed: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('*/api/museumMaps', () =>
          HttpResponse.json({ errors: [{ message: 'Upload failed' }] }, { status: 503 }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText('Choose a floorplan file'), svg)
    await expect(canvas.findByRole('alert')).resolves.toHaveTextContent(
      'Could not upload the floorplan. Try again.',
    )
    await expect(useEditor.getState().selectedReferenceId).toBeNull()
    await expect(
      canvas.getByRole('button', { name: 'Add a floorplan (SVG or image)' }),
    ).toBeEnabled()
  },
}

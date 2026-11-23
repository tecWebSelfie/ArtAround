// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentChatInput } from '@/components/agents-ui/agent-control-bar'

// The chat input's Enter-to-submit must be IME-safe (modern-web-guidance:
// ime-safe-enter-submit): the Enter that confirms a CJK composition must
// reach the converter, not the send button. jsdom honours `isComposing` in
// the KeyboardEvent init, and `keyCode` lets the spec replay Safari's
// out-of-order composing Enter (delivered as VK_PROCESSKEY 229).

afterEach(cleanup)

/** Types a message and presses Enter with the given keyboard event extras. */
function typeEnter(extra: Record<string, unknown>) {
  const onSend = vi.fn(async () => {})
  render(<AgentChatInput chatOpen onSend={onSend} />)
  const textarea = screen.getByPlaceholderText('Type something...') as HTMLTextAreaElement
  fireEvent.change(textarea, { target: { value: 'こんにちは' } })
  fireEvent.keyDown(textarea, { key: 'Enter', ...extra })
  return { onSend, textarea }
}

describe('agent chat input IME-safe Enter', () => {
  it('sends and clears on a plain Enter', async () => {
    const { onSend, textarea } = typeEnter({})
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('こんにちは')
    await waitFor(() => expect(textarea.value).toBe(''))
  })

  it('keeps the message when Enter confirms an active composition', async () => {
    const { onSend, textarea } = typeEnter({ isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
    // Flush any pending send bookkeeping: the text must survive the keypress.
    await act(async () => {})
    expect(onSend).not.toHaveBeenCalled()
    expect(textarea.value).toBe('こんにちは')
  })

  it('keeps the message on Safari composing Enter (keyCode 229)', async () => {
    const { onSend, textarea } = typeEnter({ keyCode: 229 })
    expect(onSend).not.toHaveBeenCalled()
    await act(async () => {})
    expect(onSend).not.toHaveBeenCalled()
    expect(textarea.value).toBe('こんにちは')
  })
})

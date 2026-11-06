import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DemoApp } from './DemoApp'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('DemoApp', () => {
  it('walks from demo entry through a filtered account and clears that change on sign-out', async () => {
    render(<DemoApp />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue into the demo' }))
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Total users' }))
    expect(screen.getByRole('heading', { name: 'Users' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(screen.getByText('The demo account status changed. This did not call the staff API.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Users' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Demo sign out' }))
    expect(screen.getByRole('button', { name: 'Enter demo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue into the demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(screen.getByText('Omar Al-Harbi')).toBeTruthy()
    expect(screen.queryByText('The demo account status changed. This did not call the staff API.')).toBeNull()
  })

  it('resets a filter to the open report queue and cancels a dialog', () => {
    render(<DemoApp />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue into the demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'dismissed' } })
    expect(screen.getByText('Comment on a portrait')).toBeTruthy()
    expect(screen.queryByText('Omar Al-Harbi')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Omar Al-Harbi')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Profile photo may include a logo the member does not own')).toBeTruthy()
    expect(screen.queryByText('The demo report changed. No moderation API was called.')).toBeNull()
  })

  it('keeps the selected section and does not treat hiding as cancelling work', () => {
    render(<DemoApp />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue into the demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Marketplace' }))
    expect(screen.getByRole('button', { name: 'Marketplace' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('tab', { name: 'Services' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'View service' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Hide listing' }))
    expect(screen.getByText('This changes only the demo listing. Engagements stay as they are.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  })
})

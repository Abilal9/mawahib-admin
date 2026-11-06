import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DemoApp } from './DemoApp'

const demoRoot: { current: Root | null } = { current: null }

export function mountDemo(element: HTMLElement) {
  demoRoot.current = createRoot(element)
  demoRoot.current.render(
    <StrictMode>
      <DemoApp />
    </StrictMode>,
  )
}

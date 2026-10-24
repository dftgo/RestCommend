import type { ReactNode } from 'react'

export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="screen-header">
      <h1 className="screen-title">{title}</h1>
      {children}
    </header>
  )
}

'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { CommandBar } from './CommandBar'

interface CommandBarContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandBarContext = createContext<CommandBarContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function useCommandBar() {
  return useContext(CommandBarContext)
}

export function CommandBarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <CommandBarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <CommandBar isOpen={isOpen} onClose={close} />
    </CommandBarContext.Provider>
  )
}

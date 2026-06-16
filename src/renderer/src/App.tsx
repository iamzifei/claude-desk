import { JSX, useEffect, useState } from 'react'
import { useStore } from './store'
import { TooltipProvider } from './components/ui/tooltip'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { SettingsModal } from './components/SettingsModal'

function App(): JSX.Element {
  const init = useStore((s) => s.init)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col bg-sidebar">
        <TitleBar />
        <div className="grid min-h-0 flex-1 grid-cols-[232px_1fr]">
          <Sidebar onOpenSettings={() => setShowSettings(true)} />
          <ChatView />
        </div>
        <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </TooltipProvider>
  )
}

export default App

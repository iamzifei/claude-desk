import { JSX, useEffect, useState } from 'react'
import { useStore } from './store'
import { useShortcuts } from './useShortcuts'
import { TooltipProvider } from './components/ui/tooltip'
import { WorkspaceTabs } from './components/WorkspaceTabs'
import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { SettingsModal } from './components/SettingsModal'
import { QuickSwitcher } from './components/QuickSwitcher'
import { QuickCapture } from './components/QuickCapture'
import { CardExportModal } from './components/CardExportModal'
import { OnboardingTour } from './components/OnboardingTour'

function App(): JSX.Element {
  const init = useStore((s) => s.init)
  const [showSettings, setShowSettings] = useState(false)
  useShortcuts()

  useEffect(() => {
    init()
  }, [init])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col bg-sidebar">
        <WorkspaceTabs />
        <div className="grid min-h-0 flex-1 grid-cols-[232px_1fr] grid-rows-[minmax(0,1fr)]">
          <Sidebar onOpenSettings={() => setShowSettings(true)} />
          <ChatView />
        </div>
        <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
        <QuickSwitcher />
        <QuickCapture />
        <CardExportModal />
        <OnboardingTour />
      </div>
    </TooltipProvider>
  )
}

export default App

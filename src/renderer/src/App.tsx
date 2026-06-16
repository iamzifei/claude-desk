import { JSX, useEffect, useState } from 'react'
import { useStore } from './store'
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
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar onOpenSettings={() => setShowSettings(true)} />
        <ChatView />
      </div>
      {showSettings ? <SettingsModal onClose={() => setShowSettings(false)} /> : null}
    </div>
  )
}

export default App

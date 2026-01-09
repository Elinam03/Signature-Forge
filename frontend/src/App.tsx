import { Header } from './components/Header';
import { AssemblyEditor } from './components/Editor';
import { SignaturePanel } from './components/SignaturePanel';
import { OptionsPanel } from './components/OptionsPanel';
import { HistoryPanel } from './components/HistoryPanel/HistoryPanel';
import { ShortcutsPanel } from './components/ShortcutsPanel/ShortcutsPanel';
import { TitleBar } from './components/TitleBar';

function App() {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Electron title bar */}
      <TitleBar />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Left panel - Editor */}
        <div className="w-1/2 min-w-0">
          <AssemblyEditor />
        </div>

        {/* Right panel - Signatures */}
        <div className="w-1/2 min-w-0">
          <SignaturePanel />
        </div>
      </main>

      {/* Slide-out panels */}
      <OptionsPanel />
      <HistoryPanel />
      <ShortcutsPanel />
    </div>
  );
}

export default App;

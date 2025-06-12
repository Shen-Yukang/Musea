import { useEffect } from 'react';
import { RuntimeTaskManager } from './runtimeTaskManager';

export default function App() {
  useEffect(() => {
    console.log('🚀 Runtime script loaded - ready for dynamic execution');

    // Initialize the runtime task manager
    const taskManager = RuntimeTaskManager.getInstance();
    taskManager.initialize();

    // Expose the task manager globally for external access
    (window as Window & { runtimeTaskManager?: RuntimeTaskManager; runtimeScriptLoaded?: boolean }).runtimeTaskManager =
      taskManager;
    (
      window as Window & { runtimeTaskManager?: RuntimeTaskManager; runtimeScriptLoaded?: boolean }
    ).runtimeScriptLoaded = true;

    console.log('✅ Runtime task manager initialized and ready');
  }, []);

  return (
    <div style={{ display: 'none' }}>
      {/* This component is for runtime execution, not UI display */}
      <span>Runtime Script Component - Task Manager Active</span>
    </div>
  );
}

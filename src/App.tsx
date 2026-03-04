import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { HomePage } from '@/pages/HomePage';
import { CanvasPage } from '@/pages/CanvasPage';
import { BranchPage } from '@/pages/BranchPage';
import { ToastContainer } from '@/components/shared/Toast';
import { TaskPanel } from '@/components/shared/TaskPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function AppInner() {
  useKeyboardShortcuts();
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project" element={<CanvasPage />} />
        <Route path="/branch/:branchId" element={<BranchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
      <TaskPanel />
    </>
  );
}

export default function App() {
  const loadProject = useProjectStore((s) => s.loadProject);
  const firstProject = useProjectsStore((s) => s.projects[0]);

  // Load the first project by default so direct /project navigation works
  useEffect(() => {
    if (firstProject) loadProject(firstProject);
  }, [firstProject, loadProject]);

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

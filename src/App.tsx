import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { mockProject } from '@/data/mockProject';
import { HomePage } from '@/pages/HomePage';
import { CanvasPage } from '@/pages/CanvasPage';
import { BranchPage } from '@/pages/BranchPage';
import { ToastContainer } from '@/components/shared/Toast';
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
    </>
  );
}

export default function App() {
  const loadProject = useProjectStore((s) => s.loadProject);

  useEffect(() => {
    loadProject(mockProject);
  }, [loadProject]);

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/useUIStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const closeModal = useUIStore((s) => s.closeModal);
  const lastUndo = useUIStore((s) => s.lastUndo);
  const setLastUndo = useUIStore((s) => s.setLastUndo);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        closeModal();
      }

      if (meta && e.key === 'z') {
        e.preventDefault();
        if (lastUndo) {
          lastUndo();
          setLastUndo(null);
        }
      }

      if (meta && e.key === 'b') {
        e.preventDefault();
        navigate('/');
      }
    };

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [navigate, closeModal, lastUndo, setLastUndo]);
}

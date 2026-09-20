import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ritualApi, analyticsApi } from '../api';

export interface DailyRitual {
  id: string;
  title: string;
  target_minutes: number;
  is_completed: boolean;
}

interface RitualContextType {
  rituals: DailyRitual[];
  loading: boolean;
  error: string | null;
  fetchRituals: () => Promise<void>;
  addRitual: (title: string, targetMinutes: number) => Promise<boolean>;
  toggleRitual: (id: string) => Promise<void>;
  deleteRitual: (id: string) => Promise<void>;
}

const RitualContext = createContext<RitualContextType | undefined>(undefined);

export const RitualProvider = ({ children }: { children: ReactNode }) => {
  const [rituals, setRituals] = useState<DailyRitual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRituals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ritualApi.getAll();
      if (res.success) {
        setRituals(res.data);
      } else {
        setError("Gagal memuat daily rituals");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  const addRitual = async (title: string, targetMinutes: number) => {
    try {
      const res = await ritualApi.create({ title, target_minutes: targetMinutes.toString() });
      if (res.success) {
        setRituals([...rituals, res.data]);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(err);
      return false;
    }
  };

  const toggleRitual = async (id: string) => {
    const ritual = rituals.find((r) => r.id === id);
    if (!ritual) return;

    // Optimistic update
    setRituals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_completed: !ritual.is_completed } : r))
    );

    try {
      await ritualApi.toggle(id);
      // Refresh analytics in background if possible
      analyticsApi.getSummary().catch(() => {});
    } catch {
      // Revert if error
      setRituals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_completed: ritual.is_completed } : r))
      );
    }
  };

  const deleteRitual = async (id: string) => {
    // Optimistic update
    const previous = [...rituals];
    setRituals(rituals.filter(r => r.id !== id));
    try {
      await ritualApi.delete(id);
    } catch {
      setRituals(previous);
    }
  };

  useEffect(() => {
    fetchRituals();
  }, [fetchRituals]);

  return (
    <RitualContext.Provider value={{ rituals, loading, error, fetchRituals, addRitual, toggleRitual, deleteRitual }}>
      {children}
    </RitualContext.Provider>
  );
};

export const useDailyRituals = () => {
  const context = useContext(RitualContext);
  if (context === undefined) {
    throw new Error('useDailyRituals must be used within a RitualProvider');
  }
  return context;
};

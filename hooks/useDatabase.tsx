import React from "react";
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { fetchDb, mutateDb } from '../lib/api';
import { Student, Session, Convocation, Teacher } from '../types';

interface DatabaseState {
  students: Student[];
  sessions: Session[];
  convocations: Convocation[];
  teachers: Teacher[];
  loading: boolean;
  error: string | null;
  mutate: (op: any) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseState | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
};

export const DatabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState({
    students: [] as Student[],
    sessions: [] as Session[],
    convocations: [] as Convocation[],
    teachers: [] as Teacher[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = React.useRef(true);

  const loadData = useCallback(async () => {
    try {
      const db = await fetchDb();
      if (db) {
        setData({
          students: db.students || [],
          sessions: db.sessions || [],
          convocations: db.convocations || [],
          teachers: db.teachers || []
        });
      }
      setError(null);
      isFirstLoad.current = false;
    } catch (e: any) {
      console.warn("Database fetch error:", e.message);
      if (isFirstLoad.current) {
         setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const mutate = async (op: any) => {
    // Optimistic UI update could go here
    const newDb = await mutateDb(op);
    if (newDb && newDb.data) {
      setData({
        students: newDb.data.students || [],
        sessions: newDb.data.sessions || [],
        convocations: newDb.data.convocations || [],
        teachers: newDb.data.teachers || []
      });
    } else {
        loadData(); // fallback refresh
    }
  };

  return (
    <DatabaseContext.Provider value={{ ...data, loading, error, mutate }}>
      {children}
    </DatabaseContext.Provider>
  );
};

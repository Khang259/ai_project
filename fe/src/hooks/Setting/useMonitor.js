import { useCallback, useState } from 'react';
import { getTasksByDate, upsertDailyPlan } from '../../services/monitor';

function todayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function useMonitor() {
  const [data, setData] = useState([]);

  const fetchData = useCallback(async (date) => {
    const d = date ?? todayYMD();
    const list = await getTasksByDate(d);
    setData(list);
  }, []);

  // Upsert rồi fetch lại, trả về result từ server
  const saveDailyPlan = useCallback(async (tasks) => {
    const payload = (tasks || []).map((t) => ({ ...t, date: todayYMD() }));
    const result = await upsertDailyPlan(payload);
    await fetchData();
    return result;
  }, [fetchData]);

  return { data, fetchData, saveDailyPlan };
}




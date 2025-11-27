import api from './api';

// GET /tasks?date=YYYY-MM-DD
export async function getTasksByDate(dateYMD) {
  const res = await api.get('/monitor', { params: { date: dateYMD } });
  return Array.isArray(res.data) ? res.data : [];
}

// POST /tasks/sync-plan: upsert kế hoạch trong ngày
export async function upsertDailyPlan(tasks) {
  const res = await api.post('/monitor/sync-plan', tasks || []);
  return res.data;
}




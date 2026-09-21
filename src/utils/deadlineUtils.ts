import { taskApi, competitionApi, goalApi } from '../api';

export interface CrucialDeadlineItem {
  id: string;
  originalId: string;
  source: 'LOMBA' | 'GOAL' | 'TASK';
  title: string;
  dateStr: string;
  countdown: string; // "Hari ini", "Besok", "H-2", "H-5"
  diffDays: number;
  categoryOrPriority?: string;
}

export const fetchCrucialDeadlines = async (): Promise<CrucialDeadlineItem[]> => {
  try {
    const [taskRes, compRes, goalRes] = await Promise.all([
      taskApi.getAll(),
      competitionApi.getAll(),
      goalApi.getAll(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: CrucialDeadlineItem[] = [];

    // 1. Competitions: deadline / target_date within 7 days, not finished/archived
    if (compRes?.success && Array.isArray(compRes.data)) {
      compRes.data.forEach((c: any) => {
        const st = (c.status || '').toLowerCase();
        if (st === 'finished' || st === 'completed' || st === 'archived') return;

        const dateVal = c.deadline || c.target_date || (c.timeline && typeof c.timeline === 'object' ? c.timeline.submission : null);
        if (dateVal) {
          const due = new Date(dateVal);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 7) {
            let countdown = '';
            if (diffDays === 0) countdown = 'Hari ini';
            else if (diffDays === 1) countdown = 'Besok';
            else countdown = `H-${diffDays}`;

            items.push({
              id: `comp-${c.id}`,
              originalId: c.id,
              source: 'LOMBA',
              title: c.title,
              dateStr: due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              countdown,
              diffDays,
              categoryOrPriority: c.type || c.organizer || 'Lomba',
            });
          }
        }
      });
    }

    // 2. Goals: target_date or deadline of active goal within 7 days
    if (goalRes?.success && Array.isArray(goalRes.data)) {
      goalRes.data.forEach((g: any) => {
        const st = (g.status || 'active').toLowerCase();
        if (st !== 'active') return;

        const dateVal = g.target_date || g.deadline;
        if (dateVal) {
          const due = new Date(dateVal);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 7) {
            let countdown = '';
            if (diffDays === 0) countdown = 'Hari ini';
            else if (diffDays === 1) countdown = 'Besok';
            else countdown = `H-${diffDays}`;

            items.push({
              id: `goal-${g.id}`,
              originalId: g.id,
              source: 'GOAL',
              title: g.title,
              dateStr: due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              countdown,
              diffDays,
              categoryOrPriority: g.category || 'Target',
            });
          }
        }
      });
    }

    // 3. Tasks: due_date of HIGH priority incomplete tasks within 7 days
    if (taskRes?.success && Array.isArray(taskRes.data)) {
      taskRes.data.forEach((t: any) => {
        const prio = (t.priority || '').toLowerCase();
        if (!t.is_completed && (prio === 'high' || prio === 'critical') && t.due_date) {
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 7) {
            let countdown = '';
            if (diffDays === 0) countdown = 'Hari ini';
            else if (diffDays === 1) countdown = 'Besok';
            else countdown = `H-${diffDays}`;

            items.push({
              id: `task-${t.id}`,
              originalId: t.id,
              source: 'TASK',
              title: t.title,
              dateStr: due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              countdown,
              diffDays,
              categoryOrPriority: t.category || 'Task High',
            });
          }
        }
      });
    }

    // Sort by nearest deadline
    items.sort((a, b) => a.diffDays - b.diffDays);

    // Limit to top 3
    return items.slice(0, 3);
  } catch (err) {
    console.error('Error fetching crucial deadlines:', err);
    return [];
  }
};

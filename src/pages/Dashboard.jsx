import React, { useState, useEffect } from 'react'
import { supabase, MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM', plan: '기획', confirmed: '확정' }
const TYPE_COLOR = { tm: 'badge-tm', sales: 'badge-sales', dm: 'badge-dm', plan: 'badge-plan', confirmed: 'badge-confirmed' }

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [done, setDone] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('task_date', today)
      .order('created_at')
    const all = data || []
    setTasks(all.filter(t => !t.is_done))
    setDone(all.filter(t => t.is_done))
    setLoading(false)
  }

  async function toggleDone(task) {
    await supabase.from('daily_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    fetchAll()
  }

  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">대시보드</div>
          <div className="page-subtitle">{todayStr}</div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid-4 mb-16">
        {[
          { label: '오늘 할 일', value: tasks.length, color: 'var(--accent)' },
          { label: '완료', value: done.length, color: 'var(--success)' },
          { label: '완료율', value: tasks.length + done.length > 0 ? Math.round(done.length / (tasks.length + done.length) * 100) + '%' : '0%', color: 'var(--confirmed)' },
          { label: '미완료', value: tasks.length, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card stat-card">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* 인원별 할 일 */}
        <div>
          <div className="mb-16" style={{ fontWeight: 600, fontSize: 15 }}>오늘 할 일</div>
          {loading ? (
            <div className="loading"><div className="spinner" /> 불러오는 중...</div>
          ) : (
            MEMBERS.map(member => {
              const memberTasks = tasks.filter(t => t.assigned_to === member)
              if (memberTasks.length === 0) return null
              return (
                <div key={member} className="card mb-16">
                  <div className="flex-between mb-8">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{member}</div>
                    <span className="text-sm text-muted">{memberTasks.length}건</span>
                  </div>
                  {memberTasks.map(t => (
                    <div key={t.id} className="flex-center gap-8 mb-8" style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                      <input
                        type="checkbox"
                        checked={t.is_done}
                        onChange={() => toggleDone(t)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                      <span className={`badge ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                      <span style={{ flex: 1, fontSize: 13.5 }}>{t.content}</span>
                    </div>
                  ))}
                </div>
              )
            })
          )}
          {!loading && tasks.length === 0 && (
            <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>
              오늘 할 일이 없어요 🎉
            </div>
          )}
        </div>

        {/* 실행 완료 */}
        <div>
          <div className="mb-16" style={{ fontWeight: 600, fontSize: 15 }}>실행 완료</div>
          {done.length === 0 ? (
            <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>
              아직 완료된 항목이 없어요
            </div>
          ) : (
            MEMBERS.map(member => {
              const memberDone = done.filter(t => t.assigned_to === member)
              if (memberDone.length === 0) return null
              return (
                <div key={member} className="card mb-16" style={{ borderColor: 'var(--success)', borderLeftWidth: 3 }}>
                  <div className="flex-between mb-8">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{member}</div>
                    <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓ {memberDone.length}건 완료</span>
                  </div>
                  {memberDone.map(t => (
                    <div key={t.id} className="flex-center gap-8 mb-8 done" style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleDone(t)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--success)' }}
                      />
                      <span className={`badge ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                      <span style={{ flex: 1, fontSize: 13.5 }}>{t.content}</span>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

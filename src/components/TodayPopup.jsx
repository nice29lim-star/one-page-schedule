import React, { useState } from 'react'
import { MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM', plan: '기획', confirmed: '확정' }
const TYPE_COLOR = {
  tm: 'badge-tm',
  sales: 'badge-sales',
  dm: 'badge-dm',
  plan: 'badge-plan',
  confirmed: 'badge-confirmed',
}

function MemberSection({ name, tasks, events }) {
  const [open, setOpen] = useState(true)
  const total = tasks.length + events.length

  return (
    <div className="popup-member-section" style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* 헤더 - 클릭으로 접기/펼치기 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          background: 'var(--surface2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>· {name}</span>
          <span style={{
            fontSize: 11,
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 20,
            padding: '1px 7px',
            fontWeight: 600,
          }}>{total}건</span>
        </div>
        <span style={{
          fontSize: 11,
          color: 'var(--text3)',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▶</span>
      </div>

      {/* 내용 - 펼쳐졌을 때만 표시 */}
      {open && (
        <div style={{ padding: '8px 12px 10px' }}>
          {/* daily_tasks 항목 */}
          {tasks.map(t => (
            <div key={`t_${t.id}`} className={`popup-task-item${t.is_done ? ' done' : ''}`}>
              <span className={`badge ${TYPE_COLOR[t.type] || 'badge-confirmed'}`}>
                {TYPE_LABEL[t.type] || t.type}
              </span>
              <span style={{ flex: 1 }}>{t.content}</span>
              {t.is_done && <span style={{ fontSize: 11, color: 'var(--success)' }}>완료</span>}
            </div>
          ))}
          {/* calendar_events 항목 */}
          {events.map((e, i) => (
            <div key={`e_${i}`} className="popup-task-item">
              <span className={`badge ${TYPE_COLOR[e.event_type] || 'badge-confirmed'}`}>
                {TYPE_LABEL[e.event_type] || e.event_type}
              </span>
              <span style={{ flex: 1 }}>
                <strong style={{ marginRight: 6, fontWeight: 600, color: 'var(--text2)' }}>
                  [{e.school_name}]
                </strong>
                {e.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TodayPopup({ tasks, events = [], onClose }) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  const byMember = MEMBERS.map(m => {
    const memberTasks = tasks.filter(t => t.assigned_to === m)
    const memberEvents = events.filter(e => e.assigned_to === m)
    return { name: m, tasks: memberTasks, events: memberEvents }
  }).filter(m => m.tasks.length > 0 || m.events.length > 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal popup-today" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">오늘의 일정</div>
            <div className="text-sm text-muted mt-8">{today}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {byMember.length === 0 ? (
          <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '24px 0' }}>
            오늘 등록된 일정이 없어요
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              ▶ 클릭하면 접거나 펼칠 수 있어요
            </div>
            {byMember.map(({ name, tasks: mt, events: me }) => (
              <MemberSection key={name} name={name} tasks={mt} events={me} />
            ))}
          </div>
        )}

        <div className="mt-16" style={{ textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  )
}

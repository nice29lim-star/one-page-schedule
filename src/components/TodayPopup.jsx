import React from 'react'
import { MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM' }
const TYPE_COLOR = { tm: 'badge-tm', sales: 'badge-sales', dm: 'badge-dm' }

export default function TodayPopup({ tasks, events = [], onClose }) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  const byMember = MEMBERS.map(m => {
    const memberTasks = tasks.filter(t => t.assigned_to === m)
    const memberEvents = events.filter(e => e.assigned_to === m)
    return {
      name: m,
      tasks: memberTasks,
      events: memberEvents,
    }
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
          byMember.map(({ name, tasks: memberTasks, events: memberEvents }) => (
            <div key={name} className="popup-member-section">
              <div className="popup-member-name">· {name}</div>
              {/* 내일 할 일에서 가져온 항목 */}
              {memberTasks.map(t => (
                <div key={`t_${t.id}`} className={`popup-task-item${t.is_done ? ' done' : ''}`}>
                  <span className={`badge ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type] || '기획'}</span>
                  <span style={{ flex: 1 }}>{t.content}</span>
                  {t.is_done && <span style={{ fontSize: 11, color: 'var(--success)' }}>완료</span>}
                </div>
              ))}
              {/* 프로젝트 달력 일정에서 가져온 항목 */}
              {memberEvents.map((e, i) => (
                <div key={`e_${i}`} className="popup-task-item">
                  <span className={`badge ${e.event_type === 'plan' ? 'badge-plan' : TYPE_COLOR[e.event_type] || 'badge-confirmed'}`}>
                    {TYPE_LABEL[e.event_type] || (e.event_type === 'plan' ? '기획' : e.event_type)}
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong style={{marginRight: 6, fontWeight: 600, color: 'var(--text2)'}}>[{e.school_name}]</strong>
                    {e.content}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}

        <div className="mt-16" style={{ textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  )
}

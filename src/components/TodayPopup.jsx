import React from 'react'
import { MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM' }
const TYPE_COLOR = { tm: 'badge-tm', sales: 'badge-sales', dm: 'badge-dm' }

export default function TodayPopup({ tasks, onClose }) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  const byMember = MEMBERS.map(m => ({
    name: m,
    tasks: tasks.filter(t => t.assigned_to === m),
  })).filter(m => m.tasks.length > 0)

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
          byMember.map(({ name, tasks: memberTasks }) => (
            <div key={name} className="popup-member-section">
              <div className="popup-member-name">· {name}</div>
              {memberTasks.map(t => (
                <div key={t.id} className={`popup-task-item${t.is_done ? ' done' : ''}`}>
                  <span className={`badge ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                  <span style={{ flex: 1 }}>{t.content}</span>
                  {t.is_done && <span style={{ fontSize: 11, color: 'var(--success)' }}>완료</span>}
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

import React, { useState, useEffect } from 'react'
import { supabase, MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM', plan: '기획', confirmed: '확정' }
const TYPE_COLOR = { tm: 'badge-tm', sales: 'badge-sales', dm: 'badge-dm', plan: 'badge-plan', confirmed: 'badge-confirmed' }

export default function TomorrowTasks() {
  const [tasks, setTasks] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [form, setForm] = useState({ type: 'tm', content: '', assigned_to: MEMBERS[0], task_date: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetch() }, [targetDate])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('daily_tasks').select('*').eq('task_date', targetDate).order('assigned_to')
    setTasks(data || [])
    setLoading(false)
  }

  async function addTask() {
    if (!form.content.trim()) return
    const insertDate = form.task_date || targetDate
    const { error } = await supabase.from('daily_tasks').insert([{ 
      type: form.type, 
      content: form.content, 
      assigned_to: form.assigned_to, 
      task_date: insertDate 
    }])
    
    if (error) {
      alert('할 일 저장 중 오류 발생: ' + error.message)
      return
    }
    
    setShowAdd(false)
    if (insertDate !== targetDate) {
      setTargetDate(insertDate) // 날짜가 바뀌면 useEffect가 fetch를 실행함
    } else {
      fetch() // 같은 날짜면 수동으로 fetch 실행
    }
    setForm({ type: 'tm', content: '', assigned_to: MEMBERS[0], task_date: '' })
  }

  async function deleteTask(id) {
    if (!confirm('삭제할까요?')) return
    await supabase.from('daily_tasks').delete().eq('id', id)
    fetch()
  }

  const byMember = MEMBERS.map(m => ({ name: m, tasks: tasks.filter(t => t.assigned_to === m) }))
  const dateLabel = new Date(targetDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">할 일 관리</div>
          <div className="page-subtitle">날짜별로 TM·영업·DM 할 일을 관리해요</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ 할 일 추가</button>
      </div>

      {/* 날짜 선택 */}
      <div className="card mb-24" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>날짜 선택</span>
        <input type="date" className="form-input" style={{ width: 180 }} value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{dateLabel}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setTargetDate(d.toISOString().split('T')[0]) }}>내일</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setTargetDate(new Date().toISOString().split('T')[0])}>오늘</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> 불러오는 중...</div>
      ) : (
        <div className="grid-2">
          {byMember.map(({ name, tasks: mt }) => (
            <div key={name} className="card">
              <div className="flex-between mb-16">
                <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
                <span className="text-sm text-muted">{mt.length}건</span>
              </div>
              {mt.length === 0 ? (
                <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '16px 0' }}>등록된 할 일 없음</div>
              ) : (
                mt.map(t => (
                  <div key={t.id} className={`flex-center gap-8 mb-8${t.is_done ? ' done' : ''}`} style={{ padding: '9px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                    <span className={`badge ${TYPE_COLOR[t.type]}`}>{TYPE_LABEL[t.type]}</span>
                    <span style={{ flex: 1, fontSize: 13.5 }}>{t.content}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteTask(t.id)} style={{ color: 'var(--danger)', padding: '2px 6px' }}>삭제</button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">할 일 추가</div>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">날짜 선택</label>
              <input type="date" className="form-input" value={form.task_date || targetDate} onChange={e => setForm(f => ({ ...f, task_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">유형</label>
              <div className="flex gap-8">
                {['tm', 'sales', 'dm', 'plan', 'confirmed'].map(t => (
                  <button key={t} className={`btn ${form.type === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">담당자</label>
              <select className="form-select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">내용 *</label>
              <textarea className="form-textarea" placeholder="할 일 내용을 입력하세요" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>취소</button>
              <button className="btn btn-primary" onClick={addTask}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

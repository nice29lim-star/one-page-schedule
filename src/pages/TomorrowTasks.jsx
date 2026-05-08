import React, { useState, useEffect } from 'react'
import { supabase, MEMBERS } from '../lib/supabase.js'

const TYPE_LABEL = { tm: 'TM', sales: '영업', dm: 'DM', plan: '기획', confirmed: '확정' }
const TYPE_COLOR = { tm: 'badge-tm', sales: 'badge-sales', dm: 'badge-dm', plan: 'badge-plan', confirmed: 'badge-confirmed' }

export default function TomorrowTasks() {
  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  // ── 오늘 할 일 ──
  const [todayTasks, setTodayTasks] = useState([])
  const [todayLoading, setTodayLoading] = useState(true)

  // ── 내일 할 일 기록 ──
  const [targetDate, setTargetDate] = useState(tomorrowDate)
  const [tomorrowTasks, setTomorrowTasks] = useState([])
  const [tomorrowLoading, setTomorrowLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState({ type: 'tm', content: '', assigned_to: MEMBERS[0], task_date: '' })

  useEffect(() => { fetchToday() }, [])
  useEffect(() => { fetchTomorrow() }, [targetDate])

  async function fetchToday() {
    setTodayLoading(true)
    const { data } = await supabase.from('daily_tasks').select('*').eq('task_date', today).order('assigned_to')
    setTodayTasks(data || [])
    setTodayLoading(false)
  }

  async function fetchTomorrow() {
    setTomorrowLoading(true)
    const { data } = await supabase.from('daily_tasks').select('*').eq('task_date', targetDate).order('assigned_to')
    setTomorrowTasks(data || [])
    setTomorrowLoading(false)
  }

  async function toggleDone(task) {
    await supabase.from('daily_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    fetchToday()
  }

  async function addTask() {
    if (!form.content.trim()) return
    const insertDate = form.task_date || targetDate
    const { error } = await supabase.from('daily_tasks').insert([{
      type: form.type,
      content: form.content,
      assigned_to: form.assigned_to,
      task_date: insertDate,
    }])
    if (error) { alert('저장 중 오류: ' + error.message); return }
    closeModal()
    if (insertDate !== targetDate) setTargetDate(insertDate)
    else fetchTomorrow()
  }

  async function updateTask() {
    if (!form.content.trim()) return
    const newDate = form.task_date || targetDate
    const { error } = await supabase.from('daily_tasks').update({
      type: form.type,
      content: form.content,
      assigned_to: form.assigned_to,
      task_date: newDate,
    }).eq('id', editingTask.id)
    if (error) { alert('수정 중 오류: ' + error.message); return }
    closeModal()
    if (newDate !== targetDate) setTargetDate(newDate)
    else fetchTomorrow()
  }

  async function deleteTask(id) {
    if (!confirm('삭제할까요?')) return
    await supabase.from('daily_tasks').delete().eq('id', id)
    fetchTomorrow()
  }

  function openAdd() {
    setEditingTask(null)
    setForm({ type: 'tm', content: '', assigned_to: MEMBERS[0], task_date: tomorrowDate })
    setShowAdd(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setForm({ type: task.type, content: task.content, assigned_to: task.assigned_to, task_date: task.task_date })
    setShowAdd(true)
  }

  function closeModal() {
    setShowAdd(false)
    setEditingTask(null)
    setForm({ type: 'tm', content: '', assigned_to: MEMBERS[0], task_date: '' })
  }

  const todayStr = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const targetStr = new Date(targetDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  // 오늘 완료/미완료 통계
  const doneCnt = todayTasks.filter(t => t.is_done).length
  const totalCnt = todayTasks.length

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">할 일</div>
          <div className="page-subtitle">오늘의 체크리스트 확인 · 내일 할 일을 미리 계획해요</div>
        </div>
      </div>

      {/* ══════════════════════════════════
          상단: 오늘 할 일 체크리스트
         ══════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📋 오늘 할 일</div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{todayStr}</span>
          {totalCnt > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: doneCnt === totalCnt ? 'var(--success)' : 'var(--accent)',
              color: '#fff', borderRadius: 20, padding: '2px 10px'
            }}>
              {doneCnt}/{totalCnt} 완료
            </span>
          )}
        </div>

        {todayLoading ? (
          <div className="loading"><div className="spinner" /> 불러오는 중...</div>
        ) : totalCnt === 0 ? (
          <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 28 }}>
            오늘 할 일이 없어요 🎉<br />
            <span style={{ fontSize: 12 }}>아래에서 내일 할 일을 미리 등록해보세요</span>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 16 }}>
            {MEMBERS.map(member => {
              const mt = todayTasks.filter(t => t.assigned_to === member)
              if (mt.length === 0) return null
              const memberDone = mt.filter(t => t.is_done).length
              return (
                <div key={member} className="card" style={{ padding: '16px 18px' }}>
                  <div className="flex-between mb-12">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{member}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: memberDone === mt.length ? 'var(--success)' : 'var(--text3)'
                    }}>
                      {memberDone === mt.length ? '✓ 완료!' : `${memberDone}/${mt.length}`}
                    </span>
                  </div>
                  {mt.map(t => (
                    <div
                      key={t.id}
                      className={`flex-center gap-8 mb-8${t.is_done ? ' done' : ''}`}
                      style={{ padding: '9px 12px', background: 'var(--bg)', borderRadius: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={t.is_done}
                        onChange={() => toggleDone(t)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <span className={`badge ${TYPE_COLOR[t.type] || 'badge-confirmed'}`}>
                        {TYPE_LABEL[t.type] || t.type}
                      </span>
                      <span style={{ flex: 1, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{t.content}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          하단: 내일 할 일 기록
         ══════════════════════════════════ */}
      <div style={{ borderTop: '2px solid var(--border)', paddingTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>✏️ 내일 할 일 기록</div>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>마감하면서 다음날 할 일을 미리 적어두세요</span>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ 할 일 추가</button>
        </div>

        {/* 날짜 선택 */}
        <div className="card mb-20" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>날짜</span>
          <input
            type="date"
            className="form-input"
            style={{ width: 170 }}
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{targetStr}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setTargetDate(tomorrowDate)}
          >내일</button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setTargetDate(today)}
          >오늘</button>
        </div>

        {tomorrowLoading ? (
          <div className="loading"><div className="spinner" /> 불러오는 중...</div>
        ) : tomorrowTasks.length === 0 ? (
          <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 28 }}>
            {targetStr}에 등록된 할 일이 없어요<br />
            <span style={{ fontSize: 12 }}>+ 할 일 추가 버튼으로 등록하면<br />다음날 팝업·대시보드·달력에 모두 표시돼요</span>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 16 }}>
            {MEMBERS.map(member => {
              const mt = tomorrowTasks.filter(t => t.assigned_to === member)
              if (mt.length === 0) return null
              return (
                <div key={member} className="card" style={{ padding: '16px 18px' }}>
                  <div className="flex-between mb-12">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{member}</div>
                    <span className="text-sm text-muted">{mt.length}건</span>
                  </div>
                  {mt.map(t => (
                    <div
                      key={t.id}
                      className="flex-center gap-8 mb-8"
                      style={{ padding: '9px 12px', background: 'var(--bg)', borderRadius: 8 }}
                    >
                      <span className={`badge ${TYPE_COLOR[t.type] || 'badge-confirmed'}`}>
                        {TYPE_LABEL[t.type] || t.type}
                      </span>
                      <span style={{ flex: 1, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{t.content}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(t)}
                        style={{ color: 'var(--accent)', padding: '2px 6px' }}
                      >수정</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteTask(t.id)}
                        style={{ color: 'var(--danger)', padding: '2px 6px' }}
                      >삭제</button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 할 일 추가/수정 모달 */}
      {showAdd && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingTask ? '할 일 수정' : '할 일 추가'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">날짜</label>
              <input
                type="date"
                className="form-input"
                value={form.task_date || targetDate}
                onChange={e => setForm(f => ({ ...f, task_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">유형</label>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {['tm', 'sales', 'dm', 'plan', 'confirmed'].map(t => (
                  <button
                    key={t}
                    className={`btn ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">담당자</label>
              <select
                className="form-select"
                value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              >
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">내용 *</label>
              <textarea
                className="form-textarea"
                placeholder="할 일 내용을 입력하세요"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeModal}>취소</button>
              <button className="btn btn-primary" onClick={editingTask ? updateTask : addTask}>
                {editingTask ? '수정 저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

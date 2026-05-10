import React, { useState, useEffect } from 'react'
// Trigger Vercel rebuild - 2026-05-05 17:35
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, MEMBERS } from '../lib/supabase.js'
import { generateTmComment, generateSalesComment, generateDmComment, generatePlanComment } from '../lib/gemini.js'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

const TABS = ['TM', '영업', 'DM', '기획', '확정']
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function LogCard({ log, type, onDelete, onEdit }) {
  const [open, setOpen] = useState(false)
  const typeColor = { tm: '#3B82F6', sales: '#10B981', dm: '#8B5CF6', plan: '#E11D48' }
  const typeLabel = { tm: 'TM', sales: '영업', dm: 'DM', plan: '기획' }
  const color = typeColor[type]
  const text = log.content || log.dm_content || ''
  const preview = text.split('\n')[0].substring(0, 60) + (text.length > 60 || text.includes('\n') ? '...' : '')

  return (
    <div className="card card-sm mb-8" style={{ borderLeft: `3px solid ${color}`, padding: 0, overflow: 'hidden' }}>
      {/* 접힌 헤더 - 항상 표시 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 11, transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text3)' }}>▶</span>
        <span style={{ fontSize: 11, fontWeight: 600, background: `${color}18`, color, padding: '1px 7px', borderRadius: 10 }}>{typeLabel[type]}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{log.assigned_to || log.sent_by}</span>
        <span className="text-sm text-muted">{new Date(log.created_at).toLocaleDateString('ko-KR')}</span>
        {log.next_contact_date && <span style={{ fontSize: 11, color: 'var(--text3)' }}>다음: {log.next_contact_date}</span>}
        {log.follow_call_date && <span style={{ fontSize: 11, color: 'var(--text3)' }}>확인전화: {log.follow_call_date}</span>}
        {log.ai_comment && <span style={{ fontSize: 10, color: '#6366F1' }}>✦ AI</span>}
        {!open && <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>}
      </div>

      {/* 펼쳐진 본문 */}
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 0 8px', color: 'var(--text)' }}>
            {text}
          </div>
          {log.follow_call_done && (
            <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 8 }}>
              ✓ 확인전화 완료 {log.follow_called_by && `(${log.follow_called_by})`}
            </div>
          )}
          {log.ai_comment && (
            <div className="ai-comment" style={{ marginTop: 4, marginBottom: 8 }}>
              <div className="ai-comment-header">✦ AI 전략 코멘트</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{log.ai_comment}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(log); }} style={{ color: 'var(--accent)', padding: '4px 10px', fontSize: 12 }}>수정</button>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(log.id); }} style={{ color: 'var(--danger)', padding: '4px 10px', fontSize: 12 }}>삭제</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmedCard({ log, displayContent, preview, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card card-sm mb-8" style={{ borderLeft: '3px solid var(--confirmed)', padding: 0, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 11, transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text3)' }}>▶</span>
        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--confirmed-bg)', color: 'var(--confirmed)', padding: '1px 7px', borderRadius: 10 }}>확정</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--confirmed)' }}>{log.assigned_to}</span>
        <span className="text-sm" style={{ fontWeight: 600 }}>교육일: {log.task_date}</span>
        {!open && <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>}
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 0 8px', color: 'var(--text)' }}>
            {displayContent}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ color: 'var(--accent)', padding: '4px 10px', fontSize: 12 }}>수정</button>
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ color: 'var(--danger)', padding: '4px 10px', fontSize: 12 }}>삭제</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('TM')
  const [tmLogs, setTmLogs] = useState([])
  const [salesLogs, setSalesLogs] = useState([])
  const [dmLogs, setDmLogs] = useState([])
  const [planLogs, setPlanLogs] = useState([])
  const [confirmedTasks, setConfirmedTasks] = useState([])
  const [editingLogId, setEditingLogId] = useState(null)
  const [editingTable, setEditingTable] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const defaultForm = {
    record_date: new Date().toISOString().split('T')[0],
    assigned_to: MEMBERS[0], sent_by: MEMBERS[0],
    content: '', dm_content: '',
    next_contact_date: '', follow_call_date: '',
    sent_at: new Date().toISOString().split('T')[0],
    follow_call_done: false, follow_called_by: MEMBERS[0],
    confirmed_date: new Date().toISOString().split('T')[0],
    confirmed_time: '14:00',
  }
  const [form, setForm] = useState(defaultForm)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    if (!proj) return

    const [tm, s, dm, pl, conf] = await Promise.all([
      supabase.from('tm_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('sales_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('dm_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('plan_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('daily_tasks').select('*').eq('type', 'confirmed').ilike('content', `[${proj.name}]%`).order('task_date', { ascending: false }),
    ])

    setProject(proj)
    setTmLogs(tm.data || [])
    setSalesLogs(s.data || [])
    setDmLogs(dm.data || [])
    setPlanLogs(pl.data || [])
    setConfirmedTasks(conf.data || [])
  }

  // 일반 로그(TM/영업/DM/기획) 수정 시작
  function startEditLog(log, tableKey) {
    setEditingLogId(log.id)
    setEditingTable(tableKey)
    if (tableKey === 'dm_logs') {
      setForm({
        ...defaultForm,
        record_date: log.created_at ? log.created_at.split('T')[0] : defaultForm.record_date,
        sent_by: log.sent_by || MEMBERS[0],
        dm_content: log.dm_content || '',
        sent_at: log.sent_at || defaultForm.sent_at,
        follow_call_date: log.follow_call_date || '',
        follow_call_done: log.follow_call_done || false,
        follow_called_by: log.follow_called_by || MEMBERS[0],
      })
    } else {
      setForm({
        ...defaultForm,
        record_date: log.created_at ? log.created_at.split('T')[0] : defaultForm.record_date,
        assigned_to: log.assigned_to || MEMBERS[0],
        content: log.content || '',
        next_contact_date: log.next_contact_date || '',
      })
    }
    setShowForm(true)
  }

  async function submitForm() {
    setAiLoading(true)
    try {
      if (tab === 'TM') {
        if (editingLogId && editingTable === 'tm_logs') {
          await supabase.from('tm_logs').update({
            assigned_to: form.assigned_to,
            content: form.content,
            next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
          }).eq('id', editingLogId)
        } else {
          const history = tmLogs.map(l => l.content).join('\n')
          const ai = await generateTmComment(form.content, form.next_contact_date, history)
          await supabase.from('tm_logs').insert([{
            project_id: id, assigned_to: form.assigned_to,
            content: form.content, next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
            ai_comment: ai,
          }])
        }
      } else if (tab === '영업') {
        if (editingLogId && editingTable === 'sales_logs') {
          await supabase.from('sales_logs').update({
            assigned_to: form.assigned_to,
            content: form.content,
            next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
          }).eq('id', editingLogId)
        } else {
          const history = salesLogs.map(l => l.content).join('\n')
          const ai = await generateSalesComment(form.content, form.next_contact_date, history)
          await supabase.from('sales_logs').insert([{
            project_id: id, assigned_to: form.assigned_to,
            content: form.content, next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
            ai_comment: ai,
          }])
        }
      } else if (tab === 'DM') {
        if (editingLogId && editingTable === 'dm_logs') {
          await supabase.from('dm_logs').update({
            sent_by: form.sent_by,
            dm_content: form.dm_content,
            sent_at: form.sent_at,
            follow_call_date: form.follow_call_date || null,
            follow_call_done: form.follow_call_done,
            follow_called_by: form.follow_call_done ? form.follow_called_by : null,
            created_at: new Date(form.record_date).toISOString(),
          }).eq('id', editingLogId)
        } else {
          const history = dmLogs.map(l => l.dm_content).join('\n')
          const ai = await generateDmComment(form.dm_content, form.follow_call_date, history)
          await supabase.from('dm_logs').insert([{
            project_id: id, sent_by: form.sent_by,
            dm_content: form.dm_content, sent_at: form.sent_at,
            follow_call_date: form.follow_call_date || null,
            follow_call_done: form.follow_call_done,
            follow_called_by: form.follow_call_done ? form.follow_called_by : null,
            created_at: new Date(form.record_date).toISOString(),
            ai_comment: ai,
          }])
        }
      } else if (tab === '기획') {
        if (editingLogId && editingTable === 'plan_logs') {
          await supabase.from('plan_logs').update({
            assigned_to: form.assigned_to,
            content: form.content,
            next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
          }).eq('id', editingLogId)
        } else {
          await supabase.from('plan_logs').insert([{
            project_id: id, assigned_to: form.assigned_to,
            content: form.content, next_contact_date: form.next_contact_date || null,
            created_at: new Date(form.record_date).toISOString(),
            ai_comment: null,
          }])
        }
      } else if (tab === '확정') {
        const payload = {
          type: 'confirmed',
          assigned_to: form.assigned_to,
          content: `[${project.name}] ${form.confirmed_time} - ${form.content}`,
          task_date: form.confirmed_date,
        }
        if (editingLogId) {
          await supabase.from('daily_tasks').update(payload).eq('id', editingLogId)
        } else {
          await supabase.from('daily_tasks').insert([payload])
        }
      }

      // TM / 영업 / 기획: 예정일이 있으면 daily_tasks에도 자동 연결 (신규만)
      if ((tab === 'TM' || tab === '영업' || tab === '기획') && form.next_contact_date && !editingLogId) {
        const typeMap = { 'TM': 'tm', '영업': 'sales', '기획': 'plan' }
        const preview = form.content.split('\n')[0].substring(0, 30)
        const suffix = form.content.length > 30 ? '...' : ''
        const taskContent = `[${project.name}] ${tab} 예정 - ${preview}${suffix}`
        await supabase.from('daily_tasks').insert([{
          type: typeMap[tab],
          assigned_to: form.assigned_to,
          content: taskContent,
          task_date: form.next_contact_date,
        }])
      }

      // DM: 확인전화 예정일이 있으면 daily_tasks에도 자동 연결 (신규만)
      if (tab === 'DM' && form.follow_call_date && !editingLogId) {
        const preview = form.dm_content.split('\n')[0].substring(0, 30)
        const suffix = form.dm_content.length > 30 ? '...' : ''
        const taskContent = `[${project.name}] DM 확인전화 예정 - ${preview}${suffix}`
        await supabase.from('daily_tasks').insert([{
          type: 'dm',
          assigned_to: form.sent_by,
          content: taskContent,
          task_date: form.follow_call_date,
        }])
      }

      setShowForm(false)
      setEditingLogId(null)
      setEditingTable(null)
      setForm(defaultForm)
      fetchAll()
    } catch (e) {
      alert('저장 중 오류가 발생했어요: ' + e.message)
    }
    setAiLoading(false)
  }

  async function deleteLog(table, logId) {
    if (!confirm('삭제할까요?')) return
    await supabase.from(table).delete().eq('id', logId)
    fetchAll()
  }

  async function deleteConfirmed(logId) {
    if (!confirm('삭제할까요?')) return
    await supabase.from('daily_tasks').delete().eq('id', logId)
    fetchAll()
  }

  function startEditConfirmed(log) {
    const match = log.content.match(/^\[.*?\] (.*?) - (.*)/)
    const time = match ? match[1] : '14:00'
    const content = match ? match[2] : log.content.replace(`[${project.name}] `, '')
    
    setForm({
      ...defaultForm,
      confirmed_date: log.task_date,
      confirmed_time: time,
      content: content,
      assigned_to: log.assigned_to
    })
    setEditingLogId(log.id)
    setEditingTable('daily_tasks')
    setShowForm(true)
  }

  async function deleteProject() {
    if (!confirm('정말 이 학교(프로젝트)를 삭제하시겠습니까? 관련된 모든 기록이 함께 삭제됩니다.')) return
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      
      alert('삭제되었습니다.')
      navigate('/projects')
    } catch (e) {
      alert('프로젝트 삭제 중 오류 발생: ' + e.message)
    }
  }

  function openAddForm() {
    setEditingLogId(null)
    setEditingTable(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  if (!project) return <div className="loading"><div className="spinner" /></div>

  const isEditing = !!(editingLogId && editingTable)
  const modalTitle = isEditing ? `${tab} 수정` : `${tab} 추가`

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-8" onClick={() => navigate('/projects')}>← 목록으로</button>
        <div className="flex-between">
          <div className="flex-center gap-12">
            <div className="page-title">{project.name}</div>
            <button className="btn btn-ghost btn-sm" onClick={deleteProject} style={{ color: 'var(--danger)', padding: '4px 8px' }}>학교 삭제</button>
          </div>
          <button className="btn btn-primary" onClick={openAddForm}>+ {tab} 추가</button>
        </div>
      </div>

      <div className="tabs mb-16">
        {TABS.map(t => <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* TM 탭 */}
      {tab === 'TM' && (
        <div>
          {tmLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>TM 기록이 없어요</div>
            : tmLogs.map(l => <LogCard key={l.id} log={l} type="tm" onDelete={id => deleteLog('tm_logs', id)} onEdit={log => startEditLog(log, 'tm_logs')} />)}
        </div>
      )}

      {/* 영업 탭 */}
      {tab === '영업' && (
        <div>
          {salesLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>영업 기록이 없어요</div>
            : salesLogs.map(l => <LogCard key={l.id} log={l} type="sales" onDelete={id => deleteLog('sales_logs', id)} onEdit={log => startEditLog(log, 'sales_logs')} />)}
        </div>
      )}

      {/* DM 탭 */}
      {tab === 'DM' && (
        <div>
          {dmLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>DM 기록이 없어요</div>
            : dmLogs.map(l => <LogCard key={l.id} log={l} type="dm" onDelete={id => deleteLog('dm_logs', id)} onEdit={log => startEditLog(log, 'dm_logs')} />)}
        </div>
      )}

      {/* 기획 탭 */}
      {tab === '기획' && (
        <div>
          {planLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>기획 기록이 없어요</div>
            : planLogs.map(l => <LogCard key={l.id} log={l} type="plan" onDelete={id => deleteLog('plan_logs', id)} onEdit={log => startEditLog(log, 'plan_logs')} />)}
        </div>
      )}

      {/* 확정 탭 */}
      {tab === '확정' && (
        <div>
          {confirmedTasks.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>확정된 일정이 없어요</div>
            : confirmedTasks.map(l => {
              const displayContent = l.content.replace(`[${project.name}] `, '')
              const preview = displayContent.split('\n')[0].substring(0, 50) + (displayContent.length > 50 || displayContent.includes('\n') ? '...' : '')
              return <ConfirmedCard key={l.id} log={l} displayContent={displayContent} preview={preview} onEdit={() => startEditConfirmed(l)} onDelete={() => deleteConfirmed(l.id)} />
            })}
        </div>
      )}

      {/* 입력/수정 모달 */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingLogId(null); setEditingTable(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modalTitle}</div>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingLogId(null); setEditingTable(null); }}>×</button>
            </div>

            {tab === 'DM' ? (
              <>
                <div className="form-group">
                  <label className="form-label">작성 일자</label>
                  <input type="date" className="form-input" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">발송자</label>
                  <select className="form-select" value={form.sent_by} onChange={e => setForm(f => ({ ...f, sent_by: e.target.value }))}>
                    {MEMBERS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">발송일</label>
                  <input type="date" className="form-input" value={form.sent_at} onChange={e => setForm(f => ({ ...f, sent_at: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">DM 내용 *</label>
                  <textarea className="form-textarea" style={{ minHeight: 100 }} placeholder="어떤 내용으로 DM을 보냈는지 입력하세요" value={form.dm_content} onChange={e => setForm(f => ({ ...f, dm_content: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">확인 전화 예정일</label>
                  <input type="date" className="form-input" value={form.follow_call_date} onChange={e => setForm(f => ({ ...f, follow_call_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.follow_call_done} onChange={e => setForm(f => ({ ...f, follow_call_done: e.target.checked }))} />
                    확인 전화 완료
                  </label>
                </div>
                {form.follow_call_done && (
                  <div className="form-group">
                    <label className="form-label">전화한 사람</label>
                    <select className="form-select" value={form.follow_called_by} onChange={e => setForm(f => ({ ...f, follow_called_by: e.target.value }))}>
                      {MEMBERS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </>
            ) : tab === '확정' ? (
              <>
                <div className="form-group">
                  <label className="form-label">교육 확정 일자 *</label>
                  <input type="date" className="form-input" value={form.confirmed_date} onChange={e => setForm(f => ({ ...f, confirmed_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">교육 시간 *</label>
                  <input type="time" className="form-input" value={form.confirmed_time} onChange={e => setForm(f => ({ ...f, confirmed_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">담당 강사/담당자</label>
                  <select className="form-select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    {MEMBERS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">상세 내용 (교육명 등)</label>
                  <textarea className="form-textarea" style={{ minHeight: 100 }} placeholder="확정된 교육 내용을 입력하세요" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">작성 일자</label>
                  <input type="date" className="form-input" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">담당자</label>
                  <select className="form-select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    {MEMBERS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{tab} 내용 *</label>
                  <textarea className="form-textarea" style={{ minHeight: 100 }} placeholder={tab === 'TM' ? '통화 내용을 입력하세요' : '미팅/방문 내용을 입력하세요'} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">예정일 (언제 할지)</label>
                  <input type="date" className="form-input" value={form.next_contact_date} onChange={e => setForm(f => ({ ...f, next_contact_date: e.target.value }))} />
                </div>
              </>
            )}

            {/* 신규 추가이고 AI 코멘트 대상 탭일 때만 안내 표시 */}
            {!isEditing && tab !== '기획' && tab !== '확정' && (
              <div style={{ background: 'var(--accent-bg)', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1D4ED8', marginBottom: 16 }}>
                ✦ 저장 시 Gemini AI가 전략 코멘트를 자동 생성해요
              </div>
            )}

            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingLogId(null); setEditingTable(null); }}>취소</button>
              <button className="btn btn-primary" onClick={submitForm} disabled={aiLoading}>
                {aiLoading ? '✦ AI 분석 중...' : isEditing ? '수정 저장' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

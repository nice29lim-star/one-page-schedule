import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, MEMBERS } from '../lib/supabase.js'
import { generateTmComment, generateSalesComment, generateDmComment, generatePlanComment } from '../lib/gemini.js'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

const TABS = ['TM', '영업', 'DM', '기획', '확정']
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function LogCard({ log, type, onDelete }) {
  const typeColor = { tm: '#3B82F6', sales: '#10B981', dm: '#8B5CF6', plan: '#E11D48' }
  const color = typeColor[type]
  return (
    <div className="card card-sm mb-16" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex-between mb-8">
        <div className="flex-center gap-8">
          <span style={{ fontSize: 12, fontWeight: 600, color }}>{log.assigned_to || log.sent_by}</span>
          {log.next_contact_date && <span className="text-sm text-muted">다음: {log.next_contact_date}</span>}
          {log.follow_call_date && <span className="text-sm text-muted">확인전화: {log.follow_call_date}</span>}
          {log.sent_at && <span className="text-sm text-muted">발송: {log.sent_at}</span>}
        </div>
        <div className="flex-center gap-8">
          <span className="text-sm text-muted">{new Date(log.created_at).toLocaleDateString('ko-KR')}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(log.id)} style={{ color: 'var(--danger)', padding: '2px 6px' }}>삭제</button>
        </div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: log.dm_content ? 0 : 8 }}>
        {log.content || log.dm_content}
      </div>
      {log.follow_call_done && (
        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
          ✓ 확인전화 완료 {log.follow_called_by && `(${log.follow_called_by})`}
        </div>
      )}
      {log.ai_comment && (
        <div className="ai-comment">
          <div className="ai-comment-header">✦ AI 전략 코멘트</div>
          {log.ai_comment}
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
  const [showForm, setShowForm] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [form, setForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    assigned_to: MEMBERS[0], sent_by: MEMBERS[0],
    content: '', dm_content: '',
    next_contact_date: '', follow_call_date: '',
    sent_at: new Date().toISOString().split('T')[0],
    follow_call_done: false, follow_called_by: MEMBERS[0],
    confirmed_date: new Date().toISOString().split('T')[0],
    confirmed_time: '14:00',
  })

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



  async function submitForm() {
    setAiLoading(true)
    try {
      if (tab === 'TM') {
        const history = tmLogs.map(l => l.content).join('\n')
        const ai = await generateTmComment(form.content, form.next_contact_date, history)
        await supabase.from('tm_logs').insert([{
          project_id: id, assigned_to: form.assigned_to,
          content: form.content, next_contact_date: form.next_contact_date || null,
          created_at: new Date(form.record_date).toISOString(),
          ai_comment: ai,
        }])
      } else if (tab === '영업') {
        const history = salesLogs.map(l => l.content).join('\n')
        const ai = await generateSalesComment(form.content, form.next_contact_date, history)
        await supabase.from('sales_logs').insert([{
          project_id: id, assigned_to: form.assigned_to,
          content: form.content, next_contact_date: form.next_contact_date || null,
          created_at: new Date(form.record_date).toISOString(),
          ai_comment: ai,
        }])
      } else if (tab === 'DM') {
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
      } else if (tab === '기획') {
        const history = planLogs.map(l => l.content).join('\n')
        const ai = null // 기획은 AI 코멘트 생략
        await supabase.from('plan_logs').insert([{
          project_id: id, assigned_to: form.assigned_to,
          content: form.content, next_contact_date: form.next_contact_date || null,
          created_at: new Date(form.record_date).toISOString(),
          ai_comment: ai,
        }])
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
      setShowForm(false)
      setEditingLogId(null)
      setForm({ record_date: new Date().toISOString().split('T')[0], assigned_to: MEMBERS[0], sent_by: MEMBERS[0], content: '', dm_content: '', next_contact_date: '', follow_call_date: '', sent_at: new Date().toISOString().split('T')[0], follow_call_done: false, follow_called_by: MEMBERS[0], confirmed_date: new Date().toISOString().split('T')[0], confirmed_time: '14:00' })
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
      ...form,
      confirmed_date: log.task_date,
      confirmed_time: time,
      content: content,
      assigned_to: log.assigned_to
    })
    setEditingLogId(log.id)
    setShowForm(true)
  }

  async function deleteProject() {
    if (!confirm('정말 이 학교(프로젝트)를 삭제하시겠습니까? 관련된 모든 기록이 함께 삭제됩니다.')) return
    
    try {
      // 1. 프로젝트 삭제 (관련 로그는 DB의 ON DELETE CASCADE 설정으로 자동 삭제되거나, 뷰에서 사라짐)
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      
      alert('삭제되었습니다.')
      navigate('/projects') // 삭제 후 목록으로 이동
    } catch (e) {
      alert('프로젝트 삭제 중 오류 발생: ' + e.message)
    }
  }

  if (!project) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-8" onClick={() => navigate('/projects')}>← 목록으로</button>
        <div className="flex-between">
          <div>
            <div className="flex-center gap-12">
              <div className="page-title">{project.name}</div>
              <button className="btn btn-ghost btn-sm" onClick={deleteProject} style={{ color: 'var(--danger)', padding: '4px 8px' }}>학교 삭제</button>
            </div>
            <div className="page-subtitle">담당: {project.assigned_to} {project.memo && `· ${project.memo}`}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingLogId(null); setShowForm(true); }}>+ {tab} 추가</button>
        </div>
      </div>

      <div className="tabs mb-16">
        {TABS.map(t => <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {/* TM 탭 */}
      {tab === 'TM' && (
        <div>
          {tmLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>TM 기록이 없어요</div>
            : tmLogs.map(l => <LogCard key={l.id} log={l} type="tm" onDelete={id => deleteLog('tm_logs', id)} />)}
        </div>
      )}

      {/* 영업 탭 */}
      {tab === '영업' && (
        <div>
          {salesLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>영업 기록이 없어요</div>
            : salesLogs.map(l => <LogCard key={l.id} log={l} type="sales" onDelete={id => deleteLog('sales_logs', id)} />)}
        </div>
      )}

      {/* DM 탭 */}
      {tab === 'DM' && (
        <div>
          {dmLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>DM 기록이 없어요</div>
            : dmLogs.map(l => <LogCard key={l.id} log={l} type="dm" onDelete={id => deleteLog('dm_logs', id)} />)}
        </div>
      )}

      {/* 기획 탭 */}
      {tab === '기획' && (
        <div>
          {planLogs.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>기획 기록이 없어요</div>
            : planLogs.map(l => <LogCard key={l.id} log={l} type="plan" onDelete={id => deleteLog('plan_logs', id)} />)}
        </div>
      )}

      {/* 확정 탭 */}
      {tab === '확정' && (
        <div>
          {confirmedTasks.length === 0 ? <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>확정된 일정이 없어요</div>
            : confirmedTasks.map(l => {
              const displayContent = l.content.replace(`[${project.name}] `, '')
              return (
                <div key={l.id} className="card card-sm mb-16" style={{ borderLeft: `3px solid var(--confirmed)` }}>
                  <div className="flex-between mb-8">
                    <div className="flex-center gap-8">
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--confirmed)' }}>{l.assigned_to}</span>
                      <span className="text-sm" style={{ fontWeight: 600 }}>교육일: {l.task_date}</span>
                    </div>
                    <div className="flex-center gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEditConfirmed(l)}>수정</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteConfirmed(l.id)} style={{ color: 'var(--danger)', padding: '2px 6px' }}>삭제</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{displayContent}</div>
                </div>
              )
            })}
        </div>
      )}



      {/* 입력 모달 */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingLogId ? `${tab} 수정` : `${tab} 추가`}</div>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingLogId(null); }}>×</button>
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

            {tab !== '기획' && tab !== '확정' && (
              <div style={{ background: 'var(--accent-bg)', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1D4ED8', marginBottom: 16 }}>
                ✦ 저장 시 Gemini AI가 전략 코멘트를 자동 생성해요
              </div>
            )}

            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>취소</button>
              <button className="btn btn-primary" onClick={submitForm} disabled={aiLoading}>
                {aiLoading ? '✦ AI 분석 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

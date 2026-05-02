import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, MEMBERS } from '../lib/supabase.js'
import { generateTmComment, generateSalesComment, generateDmComment } from '../lib/gemini.js'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [filter, setFilter] = useState('전체')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', assigned_to: MEMBERS[0], type: 'TM', memo: '' })
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function addProject() {
    if (!form.name.trim()) return
    setAiLoading(true)
    try {
      const { data: newProject, error } = await supabase.from('projects').insert([{
        name: form.name,
        assigned_to: form.assigned_to,
        memo: form.memo
      }]).select().single()

      if (error) throw error

      if (form.memo && form.memo.trim()) {
        if (form.type === 'TM') {
          const ai = await generateTmComment(form.memo, '', '')
          await supabase.from('tm_logs').insert([{ project_id: newProject.id, assigned_to: form.assigned_to, content: form.memo, ai_comment: ai }])
        } else if (form.type === '영업') {
          const ai = await generateSalesComment(form.memo, '', '')
          await supabase.from('sales_logs').insert([{ project_id: newProject.id, assigned_to: form.assigned_to, content: form.memo, ai_comment: ai }])
        } else if (form.type === 'DM') {
          const ai = await generateDmComment(form.memo, '', '')
          await supabase.from('dm_logs').insert([{ project_id: newProject.id, sent_by: form.assigned_to, dm_content: form.memo, sent_at: new Date().toISOString().split('T')[0], ai_comment: ai }])
        }
      }

      setShowAdd(false)
      setForm({ name: '', assigned_to: MEMBERS[0], type: 'TM', memo: '' })
      setFilter('전체')
      fetch()
    } catch (e) {
      alert("학교 추가 중 오류 발생: " + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const filtered = filter === '전체' ? projects : projects.filter(p => p.assigned_to === filter)

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">프로젝트</div>
          <div className="page-subtitle">학교 단위로 TM·영업·DM을 관리해요</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ 학교 추가</button>
      </div>

      {/* 필터 탭 */}
      <div className="tabs mb-16">
        {['전체', ...MEMBERS].map(m => (
          <button key={m} className={`tab${filter === m ? ' active' : ''}`} onClick={() => setFilter(m)}>{m}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> 불러오는 중...</div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="flex-between mb-8">
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <span style={{ fontSize: 11, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{p.assigned_to}</span>
              </div>
              {p.memo && <div className="text-sm text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{p.memo}</div>}
              <div className="text-sm text-muted" style={{ marginTop: 10 }}>
                {new Date(p.created_at).toLocaleDateString('ko-KR')} 등록
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card text-muted text-sm" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
              등록된 학교가 없어요
            </div>
          )}
        </div>
      )}

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">학교 추가</div>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">학교 이름 *</label>
              <input className="form-input" placeholder="예: ○○중학교" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">주 담당자</label>
              <select className="form-select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">메모 내용 구분</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="TM">TM</option>
                <option value="영업">영업</option>
                <option value="DM">DM</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">메모</label>
              <textarea className="form-textarea" placeholder="학교 관련 메모 및 내용" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>취소</button>
              <button className="btn btn-primary" onClick={addProject} disabled={aiLoading}>
                {aiLoading ? 'AI 분석 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

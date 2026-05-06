import React, { useState, useEffect } from 'react'
import { supabase, MEMBERS } from '../lib/supabase.js'
import { generateReport } from '../lib/gemini.js'

const REPORT_TYPES = [
  { key: 'project', label: '학교별 리포트', desc: '특정 학교의 전체 활동 분석' },
  { key: 'member', label: '인원별 리포트', desc: '담당자 활동 성과 분석' },
  { key: 'monthly', label: '월간 리포트', desc: '팀 전체 월간 현황 및 전략' },
]

export default function Reports() {
  const [type, setType] = useState('project')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedMember, setSelectedMember] = useState(MEMBERS[0])
  const [periodFrom, setPeriodFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [periodTo, setPeriodTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [savedReports, setSavedReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => setProjects(data || []))
    fetchSaved()
  }, [])

  async function fetchSaved() {
    const { data } = await supabase.from('reports').select('*, projects(name)').order('created_at', { ascending: false }).limit(20)
    setSavedReports(data || [])
  }

  async function generate() {
    setLoading(true)
    setSelectedReport(null)
    try {
      let data = {}
      if (type === 'project' && selectedProject) {
        const [{ data: tm }, { data: sales }, { data: dm }] = await Promise.all([
          supabase.from('tm_logs').select('*').eq('project_id', selectedProject).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('sales_logs').select('*').eq('project_id', selectedProject).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('dm_logs').select('*').eq('project_id', selectedProject).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
        ])
        data = { tm_logs: tm, sales_logs: sales, dm_logs: dm, period: { from: periodFrom, to: periodTo } }
      } else if (type === 'member') {
        const [{ data: tm }, { data: sales }, { data: dm }] = await Promise.all([
          supabase.from('tm_logs').select('*, projects(name)').eq('assigned_to', selectedMember).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('sales_logs').select('*, projects(name)').eq('assigned_to', selectedMember).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('dm_logs').select('*, projects(name)').eq('sent_by', selectedMember).gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
        ])
        data = { member: selectedMember, tm_logs: tm, sales_logs: sales, dm_logs: dm, period: { from: periodFrom, to: periodTo } }
      } else {
        const [{ data: tm }, { data: sales }, { data: dm }] = await Promise.all([
          supabase.from('tm_logs').select('*, projects(name)').gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('sales_logs').select('*, projects(name)').gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
          supabase.from('dm_logs').select('*, projects(name)').gte('created_at', periodFrom).lte('created_at', periodTo + 'T23:59:59'),
        ])
        data = { tm_logs: tm, sales_logs: sales, dm_logs: dm, period: { from: periodFrom, to: periodTo } }
      }

      const content = await generateReport(type, data)

      const { data: inserted } = await supabase.from('reports').insert([{
        project_id: type === 'project' ? selectedProject : null,
        generated_by: MEMBERS[0],
        report_type: type,
        content,
        period_from: periodFrom,
        period_to: periodTo,
      }]).select('*, projects(name)')

      await fetchSaved()

      if (inserted && inserted[0]) {
        setSelectedReport(inserted[0])
      } else {
        setSelectedReport({ content, report_type: type, period_from: periodFrom, period_to: periodTo, created_at: new Date().toISOString() })
      }
    } catch (e) {
      alert('리포트 생성 오류: ' + e.message)
    }
    setLoading(false)
  }

  async function deleteReport() {
    if (!selectedReport?.id) return
    if (!confirm('이 리포트를 삭제할까요?')) return
    await supabase.from('reports').delete().eq('id', selectedReport.id)
    setSelectedReport(null)
    fetchSaved()
  }

  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  }
  const modalStyle = {
    background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)',
    width: '100%', maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">리포트</div>
        <div className="page-subtitle">Gemini AI가 영업 현황을 분석하고 전략을 제안해요</div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* 리포트 생성 */}
        <div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>리포트 생성</div>
            <div className="form-group">
              <label className="form-label">리포트 유형</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REPORT_TYPES.map(r => (
                  <label key={r.key} className="checkbox-label" style={{ padding: '10px 14px', background: type === r.key ? 'var(--accent-bg)' : 'var(--bg)', borderRadius: 8, border: `1px solid ${type === r.key ? 'var(--accent)' : 'var(--border)'}` }}>
                    <input type="radio" name="rtype" checked={type === r.key} onChange={() => setType(r.key)} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {type === 'project' && (
              <div className="form-group">
                <label className="form-label">학교 선택</label>
                <select className="form-select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                  <option value="">학교를 선택하세요</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {type === 'member' && (
              <div className="form-group">
                <label className="form-label">담당자</label>
                <select className="form-select" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                  {MEMBERS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">시작일</label>
                <input type="date" className="form-input" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">종료일</label>
                <input type="date" className="form-input" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={generate} disabled={loading}>
              {loading ? '✦ AI 분석 중...' : '✦ 리포트 생성'}
            </button>
          </div>
        </div>

        {/* 저장된 리포트 */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>최근 리포트</div>
          {savedReports.length === 0 ? (
            <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>생성된 리포트가 없어요</div>
          ) : (
            savedReports.map(r => (
              <div key={r.id} className="card mb-16" style={{ cursor: 'pointer' }} onClick={() => setSelectedReport(r)}>
                <div className="flex-between mb-8">
                  <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20 }}>
                    {r.report_type === 'project' ? '학교별' : r.report_type === 'member' ? '인원별' : '월간'}
                  </span>
                  <span className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                {r.projects?.name && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{r.projects.name}</div>}
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.period_from} ~ {r.period_to}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {r.content?.substring(0, 100)}...
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 리포트 상세 모달 */}
      {selectedReport && (
        <div style={modalOverlayStyle} onClick={() => setSelectedReport(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 20 }}>
                    {selectedReport.report_type === 'project' ? '학교별' : selectedReport.report_type === 'member' ? '인원별' : '월간'} 리포트
                  </span>
                  {selectedReport.projects?.name && <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedReport.projects.name}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {selectedReport.period_from} ~ {selectedReport.period_to}
                  {selectedReport.created_at && <span> · {new Date(selectedReport.created_at).toLocaleDateString('ko-KR')}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)', padding: '4px 8px' }}>✕</button>
            </div>

            {/* 모달 본문 */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{selectedReport.content}</div>
            </div>

            {/* 모달 하단 */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedReport.id ? (
                <button onClick={deleteReport} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.target.style.background = 'var(--danger)'; e.target.style.color = '#fff' }}
                  onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = 'var(--danger)' }}
                >🗑 삭제하기</button>
              ) : <div />}
              <button className="btn btn-primary" onClick={() => setSelectedReport(null)} style={{ padding: '8px 20px', fontSize: 13 }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

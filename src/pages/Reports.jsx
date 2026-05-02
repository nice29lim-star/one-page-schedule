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
  const [currentReport, setCurrentReport] = useState(null)

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
    setCurrentReport(null)
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
      setCurrentReport(content)

      await supabase.from('reports').insert([{
        project_id: type === 'project' ? selectedProject : null,
        generated_by: MEMBERS[0],
        report_type: type,
        content,
        period_from: periodFrom,
        period_to: periodTo,
      }])
      fetchSaved()
    } catch (e) {
      alert('리포트 생성 오류: ' + e.message)
    }
    setLoading(false)
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

          {/* 현재 리포트 */}
          {currentReport && (
            <div className="card mt-16">
              <div className="ai-comment-header" style={{ fontSize: 12, marginBottom: 12 }}>✦ 생성된 리포트</div>
              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{currentReport}</div>
            </div>
          )}
        </div>

        {/* 저장된 리포트 */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>최근 리포트</div>
          {savedReports.length === 0 ? (
            <div className="card text-muted text-sm" style={{ textAlign: 'center', padding: 32 }}>생성된 리포트가 없어요</div>
          ) : (
            savedReports.map(r => (
              <div key={r.id} className="card mb-16" style={{ cursor: 'pointer' }} onClick={() => setCurrentReport(r.content)}>
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
    </div>
  )
}

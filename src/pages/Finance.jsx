import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function fmt(n) {
  if (n == null) return '-'
  return Number(n).toLocaleString('ko-KR') + '원'
}
function fmtNum(n) { return n == null ? 0 : Number(n) }

const STATUS_STYLE = {
  '계약전': { bg: '#F3F4F6', color: '#4B5563' },
  '계약완료': { bg: '#ECFDF5', color: '#065F46' },
  '진행중': { bg: '#EFF6FF', color: '#1D4ED8' },
  '완료': { bg: '#F5F3FF', color: '#5B21B6' },
  '취소': { bg: '#FEF2F2', color: '#991B1B' },
}

export default function Finance() {
  const [auth, setAuth] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [projects, setProjects] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [summary, setSummary] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [form, setForm] = useState({ name: '', project_id: '', contract_date: '', execute_date: '', status: '계약전', memo: '' })
  const [itemForm, setItemForm] = useState({ total_estimate: '', tax_amount: '', instructor_fee: '', operation_cost: '', labor_cost: '', other_cost: '', other_cost_memo: '', received_amount: '' })

  async function checkCode() {
    const { data } = await supabase
      .from('finance_access_codes')
      .select('*')
      .eq('code', code.trim())
      .eq('is_active', true)
      .single()
    if (data) {
      setAuth(true)
      sessionStorage.setItem('finance_auth', '1')
    } else {
      setCodeError('접근 코드가 올바르지 않아요')
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem('finance_auth')) setAuth(true)
  }, [])

  useEffect(() => {
    if (auth) { fetchProjects(); fetchAllProjects() }
  }, [auth])

  async function fetchAllProjects() {
    const { data } = await supabase.from('projects').select('id, name').order('name')
    setAllProjects(data || [])
  }

  async function fetchProjects() {
    const { data } = await supabase.from('finance_dashboard').select('*').order('contract_date', { ascending: false })
    setProjects(data || [])
    if (data && data.length > 0) {
      const s = data.reduce((acc, p) => ({
        total_estimate: acc.total_estimate + fmtNum(p.total_estimate),
        net_revenue: acc.net_revenue + fmtNum(p.net_revenue),
        total_expense: acc.total_expense + fmtNum(p.total_expense),
        net_profit: acc.net_profit + fmtNum(p.net_profit),
        received_amount: acc.received_amount + fmtNum(p.received_amount),
        unpaid_amount: acc.unpaid_amount + fmtNum(p.unpaid_amount),
      }), { total_estimate: 0, net_revenue: 0, total_expense: 0, net_profit: 0, received_amount: 0, unpaid_amount: 0 })
      setSummary(s)
    }
  }

  async function addProject() {
    if (!form.name.trim()) return
    
    if (form.id) {
      // Update existing
      await supabase.from('finance_projects').update({
        name: form.name, project_id: form.project_id || null,
        contract_date: form.contract_date || null,
        execute_date: form.execute_date || null,
        status: form.status, memo: form.memo,
      }).eq('id', form.id)

      await supabase.from('finance_items').update({
        total_estimate: Number(itemForm.total_estimate) || 0,
        tax_amount: Number(itemForm.tax_amount) || 0,
        instructor_fee: Number(itemForm.instructor_fee) || 0,
        operation_cost: Number(itemForm.operation_cost) || 0,
        labor_cost: Number(itemForm.labor_cost) || 0,
        other_cost: Number(itemForm.other_cost) || 0,
        other_cost_memo: itemForm.other_cost_memo,
        received_amount: Number(itemForm.received_amount) || 0,
      }).eq('finance_project_id', form.id)
      
    } else {
      // Insert new
      const { data: fp } = await supabase.from('finance_projects').insert([{
        name: form.name, project_id: form.project_id || null,
        contract_date: form.contract_date || null,
        execute_date: form.execute_date || null,
        status: form.status, memo: form.memo,
      }]).select().single()

      if (fp) {
        await supabase.from('finance_items').insert([{
          finance_project_id: fp.id,
          total_estimate: Number(itemForm.total_estimate) || 0,
          tax_amount: Number(itemForm.tax_amount) || 0,
          instructor_fee: Number(itemForm.instructor_fee) || 0,
          operation_cost: Number(itemForm.operation_cost) || 0,
          labor_cost: Number(itemForm.labor_cost) || 0,
          other_cost: Number(itemForm.other_cost) || 0,
          other_cost_memo: itemForm.other_cost_memo,
          received_amount: Number(itemForm.received_amount) || 0,
        }])
      }
    }
    
    setShowAdd(false)
    setForm({ name: '', project_id: '', contract_date: '', execute_date: '', status: '계약전', memo: '' })
    setItemForm({ total_estimate: '', tax_amount: '', instructor_fee: '', operation_cost: '', labor_cost: '', other_cost: '', other_cost_memo: '', received_amount: '' })
    fetchProjects()
  }

  if (!auth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ width: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>₩</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>매출 관리</div>
          <div className="text-sm text-muted mb-16">접근 코드를 입력하세요</div>
          <input
            className="form-input mb-8"
            type="password"
            placeholder="접근 코드"
            value={code}
            onChange={e => { setCode(e.target.value); setCodeError('') }}
            onKeyDown={e => e.key === 'Enter' && checkCode()}
          />
          {codeError && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{codeError}</div>}
          <button className="btn btn-primary w-full" onClick={checkCode}>확인</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">매출 관리</div>
          <div className="page-subtitle">한페이지 자금 흐름 현황</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ 프로젝트 추가</button>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div className="grid-3 mb-24">
          {[
            { label: '총 계약금액', value: fmt(summary.total_estimate), color: 'var(--text)' },
            { label: '순 수익', value: fmt(summary.net_revenue), color: 'var(--accent)' },
            { label: '총 지출', value: fmt(summary.total_expense), color: 'var(--danger)' },
            { label: '순이익', value: fmt(summary.net_profit), color: summary.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' },
            { label: '입금 완료', value: fmt(summary.received_amount), color: 'var(--success)' },
            { label: '미입금', value: fmt(summary.unpaid_amount), color: 'var(--confirmed)' },
          ].map(s => (
            <div key={s.label} className="card stat-card">
              <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 프로젝트 테이블 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-table">
            <thead>
              <tr>
                <th>프로젝트명</th>
                <th>상태</th>
                <th>계약일</th>
                <th>총 견적</th>
                <th>세금</th>
                <th>강사비</th>
                <th>운영비</th>
                <th>인건비</th>
                <th>기타</th>
                <th>순이익</th>
                <th>입금</th>
                <th>미입금</th>
                <th>수익률</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>등록된 프로젝트가 없어요</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setShowDetail(p)}>
                  <td style={{ fontWeight: 500 }}>{p.project_name}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...STATUS_STYLE[p.status] }}>{p.status}</span>
                  </td>
                  <td className="text-sm text-muted">{p.contract_date || '-'}</td>
                  <td className="amount">{fmt(p.total_estimate)}</td>
                  <td className="amount amount-neg">{fmt(p.tax_amount)}</td>
                  <td className="amount">{fmt(p.instructor_fee)}</td>
                  <td className="amount">{fmt(p.operation_cost)}</td>
                  <td className="amount">{fmt(p.labor_cost)}</td>
                  <td className="amount">{fmt(p.other_cost)}</td>
                  <td className={`amount ${fmtNum(p.net_profit) >= 0 ? 'amount-pos' : 'amount-neg'}`}>{fmt(p.net_profit)}</td>
                  <td className="amount amount-pos">{fmt(p.received_amount)}</td>
                  <td className="amount amount-neg">{fmt(p.unpaid_amount)}</td>
                  <td className={`amount ${fmtNum(p.profit_margin) >= 0 ? 'amount-pos' : 'amount-neg'}`}>{p.profit_margin != null ? p.profit_margin + '%' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">재무 프로젝트 추가</div>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">프로젝트명 *</label>
                <input className="form-input" placeholder="예: ○○중학교 진로프로그램" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">연결 학교 (선택)</label>
                <select className="form-select" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                  <option value="">연결 안함</option>
                  {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">계약일</label>
                <input type="date" className="form-input" value={form.contract_date} onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">실행일</label>
                <input type="date" className="form-input" value={form.execute_date} onChange={e => setForm(f => ({ ...f, execute_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">상태</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.keys(STATUS_STYLE).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <hr className="divider" />
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>수입 / 지출</div>
            <div className="grid-2">
              {[
                { key: 'total_estimate', label: '총 견적 (계약금액)' },
                { key: 'tax_amount', label: '세금 (부가세 등)' },
                { key: 'instructor_fee', label: '강사비' },
                { key: 'operation_cost', label: '운영비' },
                { key: 'labor_cost', label: '인건비 (임팀)' },
                { key: 'other_cost', label: '기타비용' },
                { key: 'received_amount', label: '입금액' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input type="number" className="form-input" placeholder="0" value={itemForm[f.key]} onChange={e => setItemForm(i => ({ ...i, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">기타비용 메모</label>
                <input className="form-input" placeholder="수리비, 구매비 등" value={itemForm.other_cost_memo} onChange={e => setItemForm(i => ({ ...i, other_cost_memo: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>취소</button>
              <button className="btn btn-primary" onClick={addProject}>추가</button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{showDetail.project_name}</div>
              <div className="flex-center gap-8">
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setForm({
                    id: showDetail.id,
                    name: showDetail.project_name,
                    project_id: showDetail.project_id || '',
                    contract_date: showDetail.contract_date || '',
                    execute_date: showDetail.execute_date || '',
                    status: showDetail.status || '계약전',
                    memo: showDetail.memo || ''
                  })
                  setItemForm({
                    total_estimate: showDetail.total_estimate || '',
                    tax_amount: showDetail.tax_amount || '',
                    instructor_fee: showDetail.instructor_fee || '',
                    operation_cost: showDetail.operation_cost || '',
                    labor_cost: showDetail.labor_cost || '',
                    other_cost: showDetail.other_cost || '',
                    other_cost_memo: showDetail.other_cost_memo || '',
                    received_amount: showDetail.received_amount || ''
                  })
                  setShowDetail(null)
                  setShowAdd(true)
                }}>수정</button>
                <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <tbody>
                {[
                  ['상태', <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, ...STATUS_STYLE[showDetail.status] }}>{showDetail.status}</span>],
                  ['계약일', showDetail.contract_date || '-'],
                  ['실행일', showDetail.execute_date || '-'],
                  ['총 견적', fmt(showDetail.total_estimate)],
                  ['세금', fmt(showDetail.tax_amount)],
                  ['순 수익', fmt(showDetail.net_revenue)],
                  ['강사비', fmt(showDetail.instructor_fee)],
                  ['운영비', fmt(showDetail.operation_cost)],
                  ['인건비', fmt(showDetail.labor_cost)],
                  ['기타비용', fmt(showDetail.other_cost)],
                  ['총 지출', fmt(showDetail.total_expense)],
                  ['순이익', <span style={{ fontWeight: 700, color: fmtNum(showDetail.net_profit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(showDetail.net_profit)}</span>],
                  ['입금액', fmt(showDetail.received_amount)],
                  ['미입금', fmt(showDetail.unpaid_amount)],
                  ['수익률', (showDetail.profit_margin ?? '-') + (showDetail.profit_margin != null ? '%' : '')],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '7px 0', color: 'var(--text2)', width: 100, borderBottom: '1px solid var(--border)' }}>{label}</td>
                    <td style={{ padding: '7px 0', fontWeight: 500, borderBottom: '1px solid var(--border)', fontFamily: typeof value === 'string' && value.includes('원') ? 'var(--mono)' : 'inherit' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

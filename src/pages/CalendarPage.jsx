import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, isSameDay, addWeeks, subWeeks } from 'date-fns'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const EVENT_STYLE = {
  tm: { bg: '#EFF6FF', color: '#1D4ED8', label: 'TM' },
  sales: { bg: '#ECFDF5', color: '#065F46', label: '영업' },
  dm: { bg: '#F5F3FF', color: '#5B21B6', label: 'DM' },
  plan: { bg: '#FFF1F2', color: '#E11D48', label: '기획' },
  confirmed: { bg: '#FFFBEB', color: '#92400E', label: '확정' },
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState('month')
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchEvents() }, [current, viewMode])

  async function fetchEvents() {
    let from, to
    if (viewMode === 'month') {
      from = format(startOfMonth(current), 'yyyy-MM-dd')
      to = format(endOfMonth(current), 'yyyy-MM-dd')
    } else {
      const ws = startOfWeek(current, { weekStartsOn: 0 })
      const we = endOfWeek(current, { weekStartsOn: 0 })
      from = format(ws, 'yyyy-MM-dd')
      to = format(we, 'yyyy-MM-dd')
    }
    const [{ data: cal }, { data: dt }] = await Promise.all([
      supabase.from('calendar_events').select('*').gte('event_date', from).lte('event_date', to).order('event_date'),
      supabase.from('daily_tasks').select('*').gte('task_date', from).lte('task_date', to)
    ])
    
    const dtMapped = (dt || []).map(t => {
      let school_name = '일반 할 일'
      let content = t.content
      
      // [학교명] 형식의 확정 일정 파싱
      if (t.type === 'confirmed') {
        const match = t.content.match(/^\[(.*?)\] (.*)/)
        if (match) {
          school_name = match[1]
          content = match[2]
        }
      }

      return {
        source_id: t.id,
        event_type: t.type,
        event_date: t.task_date,
        content: content,
        assigned_to: t.assigned_to,
        school_name: school_name
      }
    })
    
    const combined = [...(cal || []), ...dtMapped].sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    setEvents(combined)
  }

  function getEventsForDay(day) {
    return events.filter(e => e.event_date === format(day, 'yyyy-MM-dd'))
  }

  function prev() {
    if (viewMode === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))
    else setCurrent(d => subWeeks(d, 1))
  }
  function next() {
    if (viewMode === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))
    else setCurrent(d => addWeeks(d, 1))
  }

  const title = viewMode === 'month'
    ? format(current, 'yyyy년 MM월')
    : `${format(startOfWeek(current, { weekStartsOn: 0 }), 'MM/dd')} ~ ${format(endOfWeek(current, { weekStartsOn: 0 }), 'MM/dd')}`

  // 월별 달력 데이터
  const monthDays = viewMode === 'month'
    ? eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) })
    : []
  const startPad = viewMode === 'month' ? getDay(startOfMonth(current)) : 0

  // 주별 달력 데이터
  const weekDays = viewMode === 'week'
    ? eachDayOfInterval({ start: startOfWeek(current, { weekStartsOn: 0 }), end: endOfWeek(current, { weekStartsOn: 0 }) })
    : []

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div className="page-title">달력</div>
          <div className="page-subtitle">TM·영업·DM·확정 일정을 한눈에 확인해요</div>
        </div>
        <div className="flex-center gap-8">
          {/* 범례 */}
          {Object.entries(EVENT_STYLE).map(([k, v]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: v.bg, color: v.color, padding: '3px 8px', borderRadius: 20, fontWeight: 500 }}>
              {v.label}
            </span>
          ))}
        </div>
      </div>

      {/* 컨트롤 */}
      <div className="flex-between mb-16">
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab${viewMode === 'month' ? ' active' : ''}`} onClick={() => setViewMode('month')}>월별</button>
          <button className={`tab${viewMode === 'week' ? ' active' : ''}`} onClick={() => setViewMode('week')}>주별</button>
        </div>
        <div className="flex-center gap-12">
          <button className="btn btn-secondary btn-sm" onClick={prev}>←</button>
          <span style={{ fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{title}</span>
          <button className="btn btn-secondary btn-sm" onClick={next}>→</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(new Date())}>오늘</button>
        </div>
      </div>

      {/* 월별 달력 */}
      {viewMode === 'month' && (
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
          {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} className="calendar-day other-month" />)}
          {monthDays.map(day => {
            const dayEvents = getEventsForDay(day)
            const isToday = isSameDay(day, new Date())
            return (
              <div key={day.toString()} className={`calendar-day${isToday ? ' today' : ''}`}>
                <div className={`day-number${isToday ? ' today-num' : ''}`}>{format(day, 'd')}</div>
                {dayEvents.map((e, i) => {
                  const s = EVENT_STYLE[e.event_type] || {}
                  return (
                      <div
                        key={i}
                        className={`cal-event${e.school_name === '일반 할 일' ? ' cal-event-daily' : ''}`}
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
                        onClick={() => setSelected(e)}
                        title={`${s.label} · ${e.school_name} · ${e.assigned_to || ''}`}
                      >
                        {e.school_name} ({s.label}{e.assigned_to ? ` / ${e.assigned_to}` : ''})
                      </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* 주별 달력 */}
      {viewMode === 'week' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date())
              return (
                <div key={day.toString()} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{DAYS[getDay(day)]}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', margin: '0 auto', background: isToday ? 'var(--accent)' : 'none', color: isToday ? '#fff' : 'var(--text)' }}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map(day => {
              const dayEvents = getEventsForDay(day)
              return (
                <div key={day.toString()} style={{ minHeight: 160, padding: 8, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  {dayEvents.length === 0
                    ? <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 20 }}>-</div>
                    : dayEvents.map((e, i) => {
                        const s = EVENT_STYLE[e.event_type] || {}
                        return (
                          <div
                            key={i}
                            className="cal-event"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, marginBottom: 4, whiteSpace: 'normal', lineHeight: 1.4, padding: '4px 6px' }}
                            onClick={() => setSelected(e)}
                          >
                            <div style={{ fontWeight: 600, fontSize: 10 }}>{s.label}</div>
                            <div style={{ fontSize: 11 }}>{e.school_name}</div>
                            {e.assigned_to && <div style={{ fontSize: 10, opacity: 0.8 }}>{e.assigned_to}</div>}
                          </div>
                        )
                      })
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 이벤트 상세 모달 */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-center gap-8">
                <span style={{ background: EVENT_STYLE[selected.event_type]?.bg, color: EVENT_STYLE[selected.event_type]?.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {EVENT_STYLE[selected.event_type]?.label}
                </span>
                <div className="modal-title">{selected.school_name}</div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: 'var(--text2)', width: 80 }}>날짜</td><td style={{ fontWeight: 500 }}>{selected.event_date}</td></tr>
                {selected.assigned_to && <tr><td style={{ padding: '6px 0', color: 'var(--text2)' }}>담당자</td><td style={{ fontWeight: 500 }}>{selected.assigned_to}</td></tr>}
                <tr><td style={{ padding: '6px 0', color: 'var(--text2)', verticalAlign: 'top', paddingTop: 10 }}>내용</td><td style={{ paddingTop: 10, lineHeight: 1.6 }}>{selected.content}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

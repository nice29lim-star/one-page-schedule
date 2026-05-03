const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

async function callGemini(systemPrompt, userContent) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  })
  const data = await res.json()
  
  if (!data.candidates || !data.candidates[0]) {
    console.error('Gemini API 에러 상세:', data)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '코멘트 생성 실패'
}

export async function generateTmComment(content, nextDate, history = '') {
  const system = `당신은 진로 교육 콘텐츠 영업 컨설턴트입니다. 
다음 TM 기록을 보고, 다음 통화 시 유용한 조언 2~3문장을 아주 간결하게 코멘트 해주세요. 불필요한 서론/결론은 생략하세요.`
  const user = `TM 내용: ${content}\n다음 연락일: ${nextDate}\n${history ? `히스토리:\n${history}` : ''}`
  return callGemini(system, user)
}

export async function generateSalesComment(content, nextDate, history = '') {
  const system = `당신은 진로 교육 콘텐츠 영업 컨설턴트입니다.
다음 미팅/영업 기록을 보고, 계약 성사를 위한 핵심 전략 2~3문장을 아주 간결하게 코멘트 해주세요. 불필요한 서론/결론은 생략하세요.`
  const user = `영업 내용: ${content}\n다음 연락일: ${nextDate}\n${history ? `히스토리:\n${history}` : ''}`
  return callGemini(system, user)
}

export async function generateDmComment(dmContent, followDate, history = '') {
  const system = `당신은 진로 교육 콘텐츠 영업 컨설턴트입니다.
다음 발송된 DM 내용을 보고, 확인 전화 시 활용할 핵심 멘트 2~3문장을 아주 간결하게 코멘트 해주세요. 불필요한 서론/결론은 생략하세요.`
  const user = `DM 내용: ${dmContent}\n확인 전화일: ${followDate}\n${history ? `히스토리:\n${history}` : ''}`
  return callGemini(system, user)
}

export async function generatePlanComment(content, nextDate, history = '') {
  const system = `당신은 진로 교육 콘텐츠 영업 컨설턴트입니다.
다음 기획/전략 기록을 보고, 실행 성공률을 높일 수 있는 피드백 2~3문장을 아주 간결하게 코멘트 해주세요. 불필요한 서론/결론은 생략하세요.`
  const user = `기획 내용: ${content}\n다음 실행일: ${nextDate}\n${history ? `히스토리:\n${history}` : ''}`
  return callGemini(system, user)
}

export async function generateReport(type, data) {
  const prompts = {
    project: `당신은 진로·디지털 교육 콘텐츠 전문 영업 컨설턴트입니다.
아래는 특정 학교에 대한 TM, 영업, DM 전체 활동 기록입니다. 종합 영업 리포트를 작성하세요.

[학교 현황 요약]
첫 접촉일 ~ 현재까지 진행 흐름 요약 (3~5줄)
현재 관계 온도 (관심 없음 / 검토 중 / 긍정적 / 계약 임박)

[전체 활동 히스토리]
TM/영업/DM 횟수 요약 및 주요 반응

[현재 핵심 이슈]
계약을 막고 있는 장애물 및 우려사항

[앞으로의 전략]
단기(이번 주) / 중기(이번 달) 액션 플랜

[최종 의견]
계약 가능성 평가 및 우선순위 추천`,

    member: `당신은 영업팀 퍼포먼스 분석 전문가입니다.
아래는 특정 담당자의 기간별 활동 기록입니다. 성과 리포트를 작성하세요.

[활동 요약]
기간 내 TM/영업/DM 횟수 및 담당 학교 수

[잘 되고 있는 점]
긍정적 반응을 이끌어낸 접근 방식 및 강점

[개선이 필요한 점]
성과가 낮은 케이스의 공통 원인 및 개선 제안

[이번 달 집중 학교]
계약 가능성이 높은 TOP 3 학교와 이유

[다음 달 액션 플랜]
우선순위별 공략 순서 및 추천 접근 방식`,

    monthly: `당신은 진로·디지털 교육 콘텐츠 전문 영업 컨설턴트입니다.
아래는 팀 전체의 이번 달 활동 데이터입니다. 월간 영업 리포트를 작성하세요.

[이번 달 팀 전체 현황]
전체 접촉 학교 수 / TM·영업·DM 총 횟수
인원별 활동량 비교

[주요 성과]
긍정 반응 학교 및 계약 임박 케이스

[이번 달 주요 이슈]
반복되는 거절 패턴 및 공통 장애물

[다음 달 팀 전략]
집중 공략 대상 학교군 및 인원별 역할 분담

[팀 전체 액션 플랜]
우선순위 1~3위 학교와 담당자 추천`,
  }

  return callGemini(prompts[type], `데이터:\n${JSON.stringify(data, null, 2)}`)
}

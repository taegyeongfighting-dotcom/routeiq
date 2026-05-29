module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = body.message;
    if (!message) return res.status(400).json({ error: 'Message required', needsEmail: true });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured', needsEmail: true });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: {
          parts: [{
            text: `당신은 RouteIQ의 글로벌 해운 물류 인텔리전스 AI 어시스턴트입니다.

[답변 가능 범위]
해운, 물류, 운임(SCFI·BDI·FBX), 컨테이너, 항로, 선박, 항만, 스케줄, 지정학 리스크(홍해·수에즈·호르무즈 등), 무역, 수출입, 해상 보험, 화물 유형(DG·OOG 등)

[답변 규칙]
1. 위 범위의 질문은 수치와 근거를 포함해 한국어로 명확하게 답변하세요.
2. 범위 밖 질문(일반 상식, 법률, 의료, 개인 상담 등)은 정중히 "해운·물류 분야 외 질문은 직접 담당자에게 문의해 주세요. [[EMAIL]]" 로 끝내세요.
3. 실시간 정확한 운임 견적, 특정 선박 예약 요청에는 "정확한 견적·예약은 영업팀에 직접 문의해 주세요. [[EMAIL]]" 로 끝내세요.
4. 모든 답변은 한국어로, 200자 이내로 간결하게 하세요.`
          }]
        },
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Gemini API 오류가 발생했습니다.',
        needsEmail: true
      });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!raw) return res.status(500).json({ error: '응답 생성 실패', needsEmail: true });

    const needsEmail = raw.includes('[[EMAIL]]');
    const reply = raw.replace(/\[\[EMAIL\]\]/g, '').trim();

    res.status(200).json({ reply, needsEmail });
  } catch (err) {
    res.status(500).json({ error: '서버 오류: ' + err.message, needsEmail: true });
  }
};

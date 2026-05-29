module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: {
          parts: [{
            text: '당신은 RouteIQ의 글로벌 운임 항로 인텔리전스 AI 어시스턴트입니다. 해운, 물류, 운임(SCFI/BDI), 항로, 리스크(홍해·수에즈·지정학), 컨테이너 시장, 무역에 관한 전문적인 답변을 한국어로 제공하세요. 수치와 근거를 포함하여 간결하고 명확하게 답변하세요.'
          }]
        },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성할 수 없습니다.';
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

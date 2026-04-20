import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const { nodes } = await req.json();

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ recommendation: 'No crowd data available.' });
    }

    // Find the node with the highest frustration or lowest vibe_score
    const criticalNode = nodes.reduce((prev: any, current: any) => {
      return (prev.vibe_score < current.vibe_score) ? prev : current;
    });

    const prompt = `
You are an expert crowd control and safety analyst for large stadium events.
Based on the following live sensor data for a specific zone:
- Zone ID: ${criticalNode.node_id}
- Emotion Tag: ${criticalNode.emotion_tag}
- Vibe Score (0=Frustrated, 100=High Energy): ${criticalNode.vibe_score}
- Crowd Density (0-100%): ${criticalNode.density}%

Provide a concise, real-time safety recommendation (max 2 sentences) to improve the situation or maintain safety in this zone. Be actionable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({
      zone: criticalNode.node_id,
      recommendation: response.text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating recommendation:', error);
    return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
  }
}

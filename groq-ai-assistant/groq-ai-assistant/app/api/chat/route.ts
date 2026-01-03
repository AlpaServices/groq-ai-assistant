import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, fileContent } = await request.json();

    // Build the messages array for Groq
    const systemMessage = {
      role: 'system',
      content: `You are an intelligent AI assistant powered by Llama 3 70B. You help users with:
- Answering questions clearly and accurately
- Analyzing documents and extracting information
- Summarizing content
- Writing and editing text
- Code assistance
- General conversation

If the user has uploaded a file, analyze it thoroughly and provide helpful insights.
Be concise but comprehensive. Use bullet points for lists.
Always be helpful, accurate, and professional.`
    };

    // If file content is provided, add it to the context
    let userMessages = [...messages];
    if (fileContent) {
      const lastUserMessageIndex = userMessages.findLastIndex(
        (m: any) => m.role === 'user'
      );
      if (lastUserMessageIndex !== -1) {
        userMessages[lastUserMessageIndex] = {
          ...userMessages[lastUserMessageIndex],
          content: `[DOCUMENT CONTENT START]\n${fileContent}\n[DOCUMENT CONTENT END]\n\n${userMessages[lastUserMessageIndex].content}`
        };
      }
    }

    // Call Groq API with Llama 3 70B
    const completion = await groq.chat.completions.create({
      messages: [systemMessage, ...userMessages],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      stream: false,
    });

    const responseContent = completion.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({
      success: true,
      message: responseContent,
      usage: completion.usage,
    });

  } catch (error: any) {
    console.error('Groq API Error:', error);
    
    // Handle specific error types
    if (error.status === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key. Please check your Groq API key.' },
        { status: 401 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get AI response' },
      { status: 500 }
    );
  }
}

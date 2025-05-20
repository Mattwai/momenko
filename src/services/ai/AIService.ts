import OpenAI from 'openai';

class AIService {
  private openai: OpenAI;
  private conversationHistory: any[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generateResponse(userInput: string, userId: string) {
    this.conversationHistory.push({
      role: 'user',
      content: userInput,
    });
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: this.conversationHistory,
    });
    this.conversationHistory.push({
      role: 'assistant',
      content: response.choices[0].message.content,
    });
    return response.choices[0].message.content;
  }
}

export default new AIService(); 
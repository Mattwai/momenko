import axios from 'axios';

interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

class AIService {
  private conversationHistory: MessageParam[] = [];
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  }

  async generateResponse(userInput: string) {
    this.conversationHistory.push({
      role: 'user',
      content: userInput,
    });
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'deepseek-chat',
          messages: this.conversationHistory,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const botContent = response.data.choices?.[0]?.message?.content ?? '';
      this.conversationHistory.push({
        role: 'assistant',
        content: botContent,
      });
      return botContent;
    } catch (error) {
      return 'Sorry, there was an error getting a response.';
    }
  }
}

export default new AIService(); 
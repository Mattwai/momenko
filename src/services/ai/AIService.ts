import axios from 'axios';
import { AI_API_KEY, AI_API_URL } from '@env';

interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

class AIService {
  private conversationHistory: MessageParam[] = [];
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = AI_API_KEY;
    this.apiUrl = AI_API_URL;
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
    } catch {
      return 'Sorry, there was an error getting a response.';
    }
  }
}

export default new AIService(); 
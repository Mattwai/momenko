import axios from 'axios';
import { AI_API_KEY, AI_API_URL } from '@env';
import { fetchUserMemories, addUserMemory } from '../supabase/profile';

interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

interface Memory {
  id: string;
  user_id: string;
  type: string;
  content: string;
  metadata?: object;
  created_at: string;
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

  async generatePersonalizedResponse(userId: string, userInput: string) {
    const { data: memories } = await fetchUserMemories(userId);
    let memoryContext = '';
    if (memories && memories.length > 0) {
      memoryContext = (memories as Memory[]).map((m) => `- ${m.content}`).join('\n');
    }
    const systemPrompt = memoryContext
      ? `Here are some important facts about the user. Use them to personalize your response.\n${memoryContext}`
      : '';
    const conversation = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...this.conversationHistory,
      { role: 'user', content: userInput },
    ];
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'deepseek-chat',
          messages: conversation,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const botContent = response.data.choices?.[0]?.message?.content ?? '';
      this.conversationHistory.push({ role: 'user', content: userInput });
      this.conversationHistory.push({ role: 'assistant', content: botContent });
      await this.extractAndStoreMemories(userId, userInput);
      await this.extractAndStoreMemories(userId, botContent);
      return botContent;
    } catch {
      return 'Sorry, there was an error getting a response.';
    }
  }

  async extractAndStoreMemories(userId: string, text: string) {
    const lower = text.toLowerCase();
    if (lower.includes('remember') || lower.includes('my')) {
      await addUserMemory(userId, {
        type: 'fact',
        content: text,
      });
    }
  }
}

export default new AIService(); 
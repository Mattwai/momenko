import axios from 'axios';
import { AI_API_KEY, AI_API_URL } from '@env';
import { fetchUserMemories, addUserMemory } from '../supabase/profile';
import yaml from 'js-yaml';

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
    // Regex-based extraction
    const regexPatterns = [
      { type: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
      { type: 'phone', pattern: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
      { type: 'date', pattern: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g },
      { type: 'relationship', pattern: /my (son|daughter|wife|husband|friend|mother|father|brother|sister)/gi },
    ];
    for (const { type, pattern } of regexPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          await addUserMemory(userId, { type, content: match });
        }
      }
    }

    // LLM-based extraction (structured prompt for nuanced facts)
    const llmPrompt = `Extract any personal facts, preferences, relationships, or important events from the following text. Return the result as a YAML list of facts, each with a type and content.\nText: "${text}"\nExample output:\n\n- type: preference\n  content: favorite color is blue\n- type: birth_year\n  content: 1942\n- type: relationship\n  content: daughter Sarah visits every Sunday`;
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an assistant that extracts structured facts from user text.' },
            { role: 'user', content: llmPrompt },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content = response.data.choices?.[0]?.message?.content ?? '';
      // Try to parse YAML from the response
      let facts: Memory[] = [];
      try {
        facts = yaml.load(content) as Memory[];
      } catch {
        // fallback: try to extract YAML block from content
        const yamlMatch = content.match(/```yaml([\s\S]*?)```/);
        if (yamlMatch) {
          facts = yaml.load(yamlMatch[1]) as Memory[];
        }
      }
      if (Array.isArray(facts)) {
        for (const fact of facts) {
          if (fact && fact.type && fact.content) {
            await addUserMemory(userId, { type: fact.type, content: fact.content });
          }
        }
      }
    } catch {
      // Ignore LLM extraction errors
    }
  }
}

export default new AIService(); 
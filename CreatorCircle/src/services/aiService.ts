import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserService } from './userService';
import { auth } from '../config/firebase';

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class AIService {
  private static instance: AIService;
  private userApiKey: string | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize the AI service with user credentials
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    try {
      // 1) Prefer local cache for instant availability
      const cachedKey = await AsyncStorage.getItem(`ai_api_key_${userId}`);
      if (cachedKey && cachedKey.trim().length > 0) {
        this.userApiKey = cachedKey;
      }

      // 2) Load from Firestore as source of truth and refresh cache
      const profile = await UserService.getUserProfile(userId);
      const cloudKey = profile?.aiApiKey || '';
      if (cloudKey && cloudKey !== this.userApiKey) {
        this.userApiKey = cloudKey;
        await AsyncStorage.setItem(`ai_api_key_${userId}`, cloudKey);
      }
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      if (!this.userApiKey) this.userApiKey = null;
    }
  }

  /**
   * Check if AI features are available for the current user
   */
  isAIAvailable(): boolean {
    return !!this.userApiKey && this.userApiKey.trim().length > 0;
  }

  /**
   * Get the current user's API key
   */
  getUserApiKey(): string | null {
    return this.userApiKey;
  }

  /**
   * Update the user's API key
   */
  async updateUserApiKey(apiKey: string): Promise<void> {
    if (!this.userId) {
      throw new Error('AI service not initialized');
    }

    try {
      // Save to Firestore
      await UserService.updateUserProfile(this.userId, { aiApiKey: apiKey });
      // Save to local cache
      await AsyncStorage.setItem(`ai_api_key_${this.userId}`, apiKey);
      await AsyncStorage.setItem(`ai_prompted_${this.userId}`, 'true');
      this.userApiKey = apiKey;
    } catch (error) {
      console.error('Failed to update API key:', error);
      throw error;
    }
  }

  /**
   * Clear the user's API key
   */
  async clearUserApiKey(): Promise<void> {
    if (!this.userId) {
      throw new Error('AI service not initialized');
    }

    try {
      await UserService.updateUserProfile(this.userId, { aiApiKey: '' });
      await AsyncStorage.removeItem(`ai_api_key_${this.userId}`);
      await AsyncStorage.removeItem(`ai_prompted_${this.userId}`);
      this.userApiKey = null;
    } catch (error) {
      console.error('Failed to clear API key:', error);
      throw error;
    }
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    const trimmed = apiKey.trim();
    // Accept various API key formats from different providers
    return trimmed.length > 0 && (
      trimmed.startsWith('sk-') || // OpenAI
      trimmed.startsWith('claude-') || // Anthropic
      trimmed.startsWith('AIza') || // Google AI
      trimmed.length >= 20 // Generic validation for other providers
    );
  }

  /**
   * Get AI chat suggestions using direct API call (no Firebase Functions)
   */
  async getChatSuggestions(otherUserId: string, chatHistory: any[] = []): Promise<string[]> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    try {
      console.log('Getting AI suggestions with API key for user:', otherUserId);
      console.log('Chat history length:', chatHistory.length);
      
      // Try OpenAI first (most common)
      if (this.userApiKey?.startsWith('sk-')) {
        return await this.callOpenAI(otherUserId, chatHistory);
      }
      
      // Try Google Gemini
      if (this.userApiKey?.startsWith('AIza')) {
        return await this.callGemini(otherUserId, chatHistory);
      }
      
      // Try Anthropic Claude
      if (this.userApiKey?.startsWith('claude-')) {
        return await this.callClaude(otherUserId, chatHistory);
      }
      
      // Generic fallback
      return await this.callGenericAI(otherUserId, chatHistory);
      
    } catch (error) {
      console.error('AI suggestions error:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI API for chat suggestions
   */
  private async callOpenAI(otherUserId: string, chatHistory: any[]): Promise<string[]> {
    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful chat assistant. Suggest 5 natural, engaging replies for continuing a conversation. Keep them short, friendly, and relevant. Return only the suggestions as a JSON array of strings.'
      }
    ];

    // Add chat history context if available
    if (chatHistory.length > 0) {
      const recentMessages = chatHistory.slice(-10); // Last 10 messages
      messages.push({
        role: 'user',
        content: `Based on this conversation context, suggest 5 natural replies:\n${recentMessages.map(m => `${m.senderId === this.userId ? 'Me' : 'Them'}: ${m.message}`).join('\n')}`
      });
    } else {
      messages.push({
        role: 'user',
        content: `Suggest 5 natural, friendly ways to start a conversation with ${otherUserId}. Focus on being curious and professional.`
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.userApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON response
    try {
      const suggestions = JSON.parse(content);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5).filter(s => typeof s === 'string' && s.trim().length > 0);
      }
    } catch (e) {
      console.log('Failed to parse OpenAI response as JSON, using fallback parsing');
    }

    // Fallback: split by newlines and clean up
    return content
      .split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('```'))
      .slice(0, 5);
  }

  /**
   * Call Google Gemini API for chat suggestions
   */
  private async callGemini(otherUserId: string, chatHistory: any[]): Promise<string[]> {
    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    // Improved prompt engineering for better responses
    let prompt = '';
    
    if (chatHistory.length > 0) {
      const recentMessages = chatHistory.slice(-8); // Limit to last 8 messages for context
      const conversationContext = recentMessages.map(m => 
        `${m.senderId === this.userId ? 'Me' : 'Them'}: ${m.message}`
      ).join('\n');
      
      prompt = `You are a helpful AI assistant. Based on this conversation context, suggest 5 natural, engaging replies that the user (Me) could send next.

Conversation context:
${conversationContext}

Requirements:
- Generate exactly 5 different reply suggestions
- Keep each reply under 80 characters
- Make them conversational and relevant to the context
- Avoid generic responses - be specific to what was discussed
- Return ONLY a JSON array of 5 strings, no other text

Example format: ["Reply 1", "Reply 2", "Reply 3", "Reply 4", "Reply 5"]`;
    } else {
      prompt = `You are a helpful AI assistant. Suggest 5 natural, friendly ways to start a conversation with someone named ${otherUserId}.

Requirements:
- Generate exactly 5 different conversation starters
- Keep each suggestion under 80 characters
- Make them friendly, curious, and professional
- Focus on getting to know the person better
- Return ONLY a JSON array of 5 strings, no other text

Example format: ["Starter 1", "Starter 2", "Starter 3", "Starter 4", "Starter 5"]`;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.userApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 300,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('Gemini raw response:', content);
      
      // Try to parse JSON response
      try {
        const suggestions = JSON.parse(content);
        if (Array.isArray(suggestions)) {
          const validSuggestions = suggestions
            .filter(s => typeof s === 'string' && s.trim().length > 0)
            .map(s => s.trim())
            .slice(0, 5);
          
          if (validSuggestions.length > 0) {
            return validSuggestions;
          }
        }
      } catch (e) {
        console.log('Failed to parse Gemini response as JSON, using fallback parsing');
      }

      // Fallback: extract suggestions from text response
      const lines = content
        .split('\n')
        .map((line: string) => line.replace(/^[-*•\d\.]\s*/, '').trim())
        .filter((line: string) => 
          line.length > 0 && 
          line.length < 100 && 
          !line.startsWith('```') && 
          !line.startsWith('[') && 
          !line.startsWith('{')
        );

      if (lines.length > 0) {
        return lines.slice(0, 5);
      }

      // Final fallback: return generic suggestions
      console.warn('Using fallback suggestions for Gemini API');
      return this.getFallbackSuggestions(chatHistory.length === 0);
      
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call Anthropic Claude API for chat suggestions
   */
  private async callClaude(otherUserId: string, chatHistory: any[]): Promise<string[]> {
    let prompt = 'Suggest 5 natural, engaging replies for continuing a conversation. Keep them short, friendly, and relevant. Return only the suggestions as a JSON array of strings.';
    
    if (chatHistory.length > 0) {
      const recentMessages = chatHistory.slice(-10);
      prompt = `Based on this conversation context, suggest 5 natural replies:\n${recentMessages.map(m => `${m.senderId === this.userId ? 'Me' : 'Them'}: ${m.message}`).join('\n')}\n\nSuggest 5 natural replies as a JSON array of strings.`;
    } else {
      prompt = `Suggest 5 natural, friendly ways to start a conversation with ${otherUserId}. Focus on being curious and professional. Return as a JSON array of strings.`;
    }

    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.userApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Try to parse JSON response
    try {
      const suggestions = JSON.parse(content);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5).filter(s => typeof s === 'string' && s.trim().length > 0);
      }
    } catch (e) {
      console.log('Failed to parse Claude response as JSON, using fallback parsing');
    }

    // Fallback: split by newlines and clean up
    return content
      .split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('```'))
      .slice(0, 5);
  }

  /**
   * Generic AI API fallback
   */
  private async callGenericAI(otherUserId: string, chatHistory: any[]): Promise<string[]> {
    // Return default suggestions when we can't determine the API provider
    if (chatHistory.length === 0) {
      return [
        "Hey! How's your day going?",
        "What are you working on lately?",
        "Have any exciting projects coming up?",
        "Would love to hear about your latest work!",
        "How's everything going with your creative projects?"
      ];
    } else {
      return [
        "That's interesting! Tell me more about it.",
        "What do you think we should do next?",
        "I'd love to hear your thoughts on this.",
        "That sounds great! How can I help?",
        "What's your take on this?"
      ];
    }
  }

  /**
   * Generate AI chat reply (simplified version)
   */
  async generateChatReply(conversationHistory: string[], context: string): Promise<string> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    try {
      // Use the same logic as suggestions but for a single reply
      const suggestions = await this.getChatSuggestions('user', conversationHistory);
      return suggestions[0] || "That's interesting! Tell me more about it.";
    } catch (error) {
      console.error('generateChatReply error:', error);
      throw error;
    }
  }

  /**
   * Generate conversation summary (simplified version)
   */
  async generateConversationSummary(messages: string[]): Promise<string> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    try {
      // For now, return a simple summary
      const recentMessages = messages.slice(-5);
      return `Recent conversation: ${recentMessages.join(', ')}`;
    } catch (error) {
      console.error('generateConversationSummary error:', error);
      throw error;
    }
  }

  /**
   * Generate content suggestions (simplified version)
   */
  async generateContentSuggestions(topic: string, contentType: 'post' | 'comment' | 'bio'): Promise<string[]> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    try {
      // For now, return a simple suggestion
      return [`Here's a suggestion for your ${contentType} about ${topic}`];
    } catch (error) {
      console.error('generateContentSuggestions error:', error);
      throw error;
    }
  }

  /**
   * Fix grammar and improve text using AI
   */
  async fixGrammar(text: string): Promise<{ correctedText: string; corrections: string[] }> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      // Try OpenAI first (most reliable for grammar)
      if (this.userApiKey?.startsWith('sk-')) {
        return await this.fixGrammarWithOpenAI(text);
      }
      
      // Try Google Gemini
      if (this.userApiKey?.startsWith('AIza')) {
        return await this.fixGrammarWithGemini(text);
      }
      
      // Try Anthropic Claude
      if (this.userApiKey?.startsWith('claude-')) {
        return await this.fixGrammarWithClaude(text);
      }
      
      // Generic fallback
      return await this.fixGrammarGeneric(text);
      
    } catch (error) {
      console.error('Grammar correction error:', error);
      throw error;
    }
  }

  /**
   * Fix grammar using OpenAI
   */
  private async fixGrammarWithOpenAI(text: string): Promise<{ correctedText: string; corrections: string[] }> {
    const prompt = `Please fix any grammar, spelling, and punctuation errors in the following text. Return the response in this exact JSON format:

{
  "correctedText": "The corrected text here",
  "corrections": ["List of corrections made"]
}

Text to fix: "${text}"

Important: Return ONLY valid JSON, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    try {
      const result = JSON.parse(content);
      return {
        correctedText: result.correctedText || text,
        corrections: result.corrections || []
      };
    } catch (e) {
      // Fallback: just return the original text
      return { correctedText: text, corrections: [] };
    }
  }

  /**
   * Fix grammar using Google Gemini
   */
  private async fixGrammarWithGemini(text: string): Promise<{ correctedText: string; corrections: string[] }> {
    const prompt = `Please fix any grammar, spelling, and punctuation errors in the following text. Return the response in this exact JSON format:

{
  "correctedText": "The corrected text here",
  "corrections": ["List of corrections made"]
}

Text to fix: "${text}"

Important: Return ONLY valid JSON, no other text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.userApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const result = JSON.parse(content);
      return {
        correctedText: result.correctedText || text,
        corrections: result.corrections || []
      };
    } catch (e) {
      // Fallback: just return the original text
      return { correctedText: text, corrections: [] };
    }
  }

  /**
   * Fix grammar using Anthropic Claude
   */
  private async fixGrammarWithClaude(text: string): Promise<{ correctedText: string; corrections: string[] }> {
    const prompt = `Please fix any grammar, spelling, and punctuation errors in the following text. Return the response in this exact JSON format:

{
  "correctedText": "The corrected text here",
  "corrections": ["List of corrections made"]
}

Text to fix: "${text}"

Important: Return ONLY valid JSON, no other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.userApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    try {
      const result = JSON.parse(content);
      return {
        correctedText: result.correctedText || text,
        corrections: result.corrections || []
      };
    } catch (e) {
      // Fallback: just return the original text
      return { correctedText: text, corrections: [] };
    }
  }

  /**
   * Generic grammar correction fallback
   */
  private async fixGrammarGeneric(text: string): Promise<{ correctedText: string; corrections: string[] }> {
    // Simple rule-based corrections as fallback
    const corrections: string[] = [];
    let correctedText = text;

    // Basic capitalization fixes
    if (text.length > 0 && text[0] !== text[0].toUpperCase()) {
      correctedText = text[0].toUpperCase() + text.slice(1);
      corrections.push('Capitalized first letter');
    }

    // Basic punctuation fixes
    if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?') && text.length > 10) {
      correctedText += '.';
      corrections.push('Added period at end');
    }

    return { correctedText, corrections };
  }

  /**
   * Generate profile introduction suggestions based on target user's profile
   */
  async getProfileIntroductionSuggestions(targetProfile: any, style: string = 'general'): Promise<string[]> {
    if (!this.isAIAvailable()) {
      throw new Error('AI features not available. Please enter a valid API key in Settings.');
    }

    try {
      console.log('Generating profile introduction suggestions for:', targetProfile.name);
      console.log('Style requested:', style);
      
      // Try OpenAI first (most common)
      if (this.userApiKey?.startsWith('sk-')) {
        return await this.callOpenAIProfile(targetProfile, style);
      }
      
      // Try Google Gemini
      if (this.userApiKey?.startsWith('AIza')) {
        return await this.callGeminiProfile(targetProfile, style);
      }
      
      // Try Anthropic Claude
      if (this.userApiKey?.startsWith('claude-')) {
        return await this.callClaudeProfile(targetProfile, style);
      }
      
      // Generic fallback
      return await this.callGenericProfile(targetProfile, style);
      
    } catch (error) {
      console.error('Profile introduction suggestions error:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI API for profile introduction suggestions
   */
  private async callOpenAIProfile(targetProfile: any, style: string): Promise<string[]> {
    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    const profileContext = this.buildProfileContext(targetProfile, style);
    
    const messages = [
      {
        role: 'system',
        content: `You are an expert at creating engaging, natural introduction messages for connecting with creators. Your goal is to help users start meaningful conversations.

IMPORTANT RULES:
- Generate exactly 5 different introduction messages
- Each message should be 15-80 characters (short but impactful)
- Make messages feel personal and genuine, not generic
- Reference specific details from their profile when possible
- Vary the tone and approach between messages
- Avoid overly formal or robotic language
- Make it easy for the recipient to respond

Return ONLY a JSON array of 5 strings, nothing else.`
      },
      {
        role: 'user',
        content: profileContext
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.userApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON response
    try {
      const suggestions = JSON.parse(content);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5).filter(s => typeof s === 'string' && s.trim().length > 0);
      }
    } catch (e) {
      console.log('Failed to parse OpenAI response as JSON, using fallback parsing');
    }

    // Fallback: split by newlines and clean up
    return content
      .split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('```'))
      .slice(0, 5);
  }

  /**
   * Call Google Gemini API for profile introduction suggestions
   */
  private async callGeminiProfile(targetProfile: any, style: string): Promise<string[]> {
    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    const profileContext = this.buildProfileContext(targetProfile, style);
    
    const prompt = `You are an expert at creating engaging, natural introduction messages for connecting with creators.

TASK: Generate exactly 5 different introduction messages for connecting with this creator.

IMPORTANT RULES:
- Each message should be 15-80 characters (short but impactful)
- Make messages feel personal and genuine, not generic
- Reference specific details from their profile when possible
- Vary the tone and approach between messages
- Avoid overly formal or robotic language
- Make it easy for the recipient to respond

PROFILE CONTEXT:
${profileContext}

Return ONLY a JSON array of 5 strings, nothing else. Example format: ["Message 1", "Message 2", "Message 3", "Message 4", "Message 5"]`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.userApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to parse JSON response
    try {
      const suggestions = JSON.parse(content);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5).filter(s => typeof s === 'string' && s.trim().length > 0);
      }
    } catch (e) {
      console.log('Failed to parse Gemini response as JSON, using fallback parsing');
    }

    // Fallback: split by newlines and clean up
    return content
      .split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('```'))
      .slice(0, 5);
  }

  /**
   * Call Anthropic Claude API for profile introduction suggestions
   */
  private async callClaudeProfile(targetProfile: any, style: string): Promise<string[]> {
    // Ensure userApiKey is not null before making the request
    if (!this.userApiKey) {
      throw new Error('API key is required');
    }

    const profileContext = this.buildProfileContext(targetProfile, style);
    
    const prompt = `You are an expert at creating engaging, natural introduction messages for connecting with creators.

TASK: Generate exactly 5 different introduction messages for connecting with this creator.

IMPORTANT RULES:
- Each message should be 15-80 characters (short but impactful)
- Make messages feel personal and genuine, not generic
- Reference specific details from their profile when possible
- Vary the tone and approach between messages
- Avoid overly formal or robotic language
- Make it easy for the recipient to respond

PROFILE CONTEXT:
${profileContext}

Return ONLY a JSON array of 5 strings, nothing else. Example format: ["Message 1", "Message 2", "Message 3", "Message 4", "Message 5"]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.userApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Try to parse JSON response
    try {
      const suggestions = JSON.parse(content);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5).filter(s => typeof s === 'string' && s.trim().length > 0);
      }
    } catch (e) {
      console.log('Failed to parse Claude response as JSON, using fallback parsing');
    }

    // Fallback: split by newlines and clean up
    return content
      .split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('```'))
      .slice(0, 5);
  }

  /**
   * Generic profile suggestions fallback
   */
  private async callGenericProfile(targetProfile: any, style: string): Promise<string[]> {
    const name = targetProfile.name || 'there';
    const skills = targetProfile.skills?.[0] || 'creative work';
    const college = targetProfile.college || 'background';
    const interests = targetProfile.interests?.[0] || 'collaboration';

    // Modify based on style
    if (style === 'professional') {
      return [
        `Hi ${name}, I'm impressed by your ${skills} expertise`,
        `Hello! Your ${college} experience caught my attention`,
        `Hi there, I'd love to discuss potential collaboration`,
        `Greetings! Your work in ${skills} is inspiring`,
        `Hello ${name}, interested in professional networking`
      ];
    } else if (style === 'casual') {
      return [
        `Hey ${name}! 👋 Love what you're doing`,
        `Hi there! Your profile is super interesting`,
        `Hey! Fellow creator here, would love to chat`,
        `Hi ${name}! Love connecting with creative people`,
        `Hey there! Your work looks amazing`
      ];
    } else if (style === 'collaborative') {
      return [
        `Hi ${name}! Looking for collaborators on ${skills}`,
        `Hey! I think we could work together on something great`,
        `Hi there! Interested in teaming up on creative projects`,
        `Hello! Looking for like-minded creators to collaborate with`,
        `Hey ${name}! Let's create something amazing together`
      ];
    }

    // General style - more personalized
    return [
      `Hey ${name}! Love your work on ${skills}`,
      `Hi ${name}! Your ${college} experience is impressive`,
      `Hello! I'm also interested in ${interests}. Would love to connect!`,
      `Hey there! Your profile caught my eye. Love connecting with fellow creators`,
      `Hi ${name}! Looking to collaborate on ${skills}`
    ];
  }

  /**
   * Build profile context for AI prompts
   */
  private buildProfileContext(targetProfile: any, style: string): string {
    let context = `TARGET CREATOR: ${targetProfile.name || 'Unknown'}\n`;
    
    if (targetProfile.college) {
      context += `College/Background: ${targetProfile.college}\n`;
    }
    
    if (targetProfile.skills && targetProfile.skills.length > 0) {
      context += `Skills: ${targetProfile.skills.join(', ')}\n`;
    }
    
    if (targetProfile.interests && targetProfile.interests.length > 0) {
      context += `Interests: ${targetProfile.interests.join(', ')}\n`;
    }
    
    if (targetProfile.passion) {
      context += `Passion: ${targetProfile.passion}\n`;
    }
    
    if (targetProfile.bio) {
      context += `Bio: ${targetProfile.bio}\n`;
    }

    context += `\nSTYLE REQUESTED: ${style}\n`;
    context += `\nGenerate 5 personalized introduction messages that are natural, engaging, and relevant to this person's profile. Consider their background, skills, and interests. Keep messages under 80 characters each. Return only the suggestions as a JSON array of strings.`;

    return context;
  }

  /**
   * Get fallback suggestions when AI API fails
   */
  private getFallbackSuggestions(isNewConversation: boolean): string[] {
    if (isNewConversation) {
      return [
        "Hey! How's your day going?",
        "What are you working on lately?",
        "Have any exciting projects coming up?",
        "Would love to hear about your latest work!",
        "How's everything going with your creative projects?"
      ];
    } else {
      return [
        "That's interesting! Tell me more about it.",
        "What do you think we should do next?",
        "I'd love to hear your thoughts on this.",
        "That sounds great! How can I help?",
        "What's your take on this?"
      ];
    }
  }

  /**
   * Improve text quality for chat messages
   */
  static async improveText(text: string, style: 'grammar' | 'funny' | 'professional' | 'efficient'): Promise<string> {
    try {
      // Check if user has valid API key first
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const hasApiKey = await this.hasValidApiKey(currentUser.uid);
      if (!hasApiKey) {
        throw new Error('No valid API key found');
      }

      let prompt = '';
      switch (style) {
        case 'grammar':
          prompt = `Fix any grammar, spelling, and punctuation errors in this text while keeping the same meaning and tone: "${text}"`;
          break;
        case 'funny':
          prompt = `Make this text more funny and engaging while keeping the core message: "${text}"`;
          break;
        case 'professional':
          prompt = `Make this text more professional and polished while keeping the meaning: "${text}"`;
          break;
        case 'efficient':
          prompt = `Make this text more clear, concise, and easy to understand: "${text}"`;
          break;
      }

      const response = await this.callGroqAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error improving text:', error);
      throw error;
    }
  }

  /**
   * Analyze chat history and provide actionable suggestions
   */
  static async analyzeChatHistory(messages: any[], otherUser: any): Promise<string[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const hasApiKey = await this.hasValidApiKey(currentUser.uid);
      if (!hasApiKey) {
        throw new Error('No valid API key found');
      }

      // Prepare chat context
      const chatContext = messages
        .slice(-10) // Last 10 messages
        .map(msg => `${msg.senderId === currentUser.uid ? 'Me' : otherUser.name}: ${msg.text}`)
        .join('\n');

      const prompt = `
        Analyze this chat conversation and provide 5-7 actionable suggestions for what to say next.
        Consider the conversation flow, the other person's interests, and natural conversation progression.
        
        Chat history:
        ${chatContext}
        
        Other person details:
        - Name: ${otherUser.name}
        - College: ${otherUser.college || 'Unknown'}
        - Status: ${otherUser.isVerified ? 'Verified creator' : 'Creator'}
        
        Provide specific, contextual suggestions that would keep the conversation engaging and natural.
        Format as a JSON array of strings.
      `;

      const response = await this.callGroqAPI(prompt);
      
      // Try to parse JSON response
      try {
        const suggestions = JSON.parse(response);
        if (Array.isArray(suggestions)) {
          return suggestions.slice(0, 7).filter(s => typeof s === 'string' && s.trim().length > 0);
        }
      } catch (e) {
        console.log('Failed to parse chat analysis as JSON, using fallback');
      }

      // Fallback parsing
      return response
        .split('\n')
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.startsWith('{') && !line.startsWith('['))
        .slice(0, 5);
    } catch (error) {
      console.error('Error analyzing chat history:', error);
      
      // Fallback suggestions based on user context
      return [
        `How's your day going, ${otherUser.name}?`,
        "What projects are you working on lately?",
        "Any exciting plans for the weekend?",
        "What's inspiring you these days?",
        "Tell me more about your work!",
      ];
    }
  }

  /**
   * Get general chat suggestions based on user profile
   */
  static async getChatSuggestions(otherUser: any): Promise<string[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      
      const hasApiKey = await this.hasValidApiKey(currentUser.uid);
      if (!hasApiKey) {
        throw new Error('No valid API key found');
      }

      const prompt = `
        Generate 8-10 friendly, engaging conversation starters for chatting with a creator/student.
        
        Person details:
        - Name: ${otherUser.name}
        - College: ${otherUser.college || 'Student/Creator'}
        - Status: ${otherUser.isVerified ? 'Verified creator' : 'Creator'}
        
        The suggestions should be:
        - Natural and friendly
        - Appropriate for creators/students
        - Engaging and conversation-starting
        - Varied in topic (interests, work, casual chat, collaboration)
        
        Format as a JSON array of strings.
      `;

      const response = await this.callGroqAPI(prompt);
      
      // Try to parse JSON response
      try {
        const suggestions = JSON.parse(response);
        if (Array.isArray(suggestions)) {
          return suggestions.slice(0, 10).filter(s => typeof s === 'string' && s.trim().length > 0);
        }
      } catch (e) {
        console.log('Failed to parse suggestions as JSON, using fallback');
      }

      // Fallback parsing
      const lines = response
        .split('\n')
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.startsWith('{') && !line.startsWith('['))
        .slice(0, 8);

      return lines.length > 0 ? lines : this.getFallbackChatSuggestions(otherUser);
    } catch (error) {
      console.error('Error getting chat suggestions:', error);
      return this.getFallbackChatSuggestions(otherUser);
    }
  }

  /**
   * Fallback chat suggestions when API is unavailable
   */
  private static getFallbackChatSuggestions(otherUser: any): string[] {
    const name = otherUser.name || 'there';
    const college = otherUser.college || 'your background';
    
    return [
      `Hey ${name}! 👋 How's everything going?`,
      `Hi there! Love connecting with fellow creators`,
      `Hey! What kind of projects are you working on?`,
      `Hi ${name}! Your profile caught my attention`,
      "What's been inspiring you lately?",
      `How do you like ${college}?`,
      "Any exciting creative projects in the works?",
      "What's your favorite thing about being a creator?",
      "Would love to hear about your creative journey!",
      "Hey! Always looking to connect with talented people",
    ];
  }
} 
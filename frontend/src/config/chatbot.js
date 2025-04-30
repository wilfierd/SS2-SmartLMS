// src/config/chatbot.js

const chatbotConfig = {
    openRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY || "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",
    modelId: "deepseek/deepseek-chat-v3-0324:free",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultSystemPrompt: "You are a helpful assistant for our Learning Management System. You can help students and instructors with questions about courses, assignments, and using the platform. You don't have access to specific user data unless directly provided in the conversation.",
    temperature: 0.7,
    maxTokens: 1000,
    // Include site name and URL in HTTP referer header as per OpenRouter's guidelines
    referer: "LMSHub - http://localhost:3000",
    // Used to show the source of AI responses in the UI
    modelName: "DeepSeek V3-0324"
  };
  
  export default chatbotConfig;
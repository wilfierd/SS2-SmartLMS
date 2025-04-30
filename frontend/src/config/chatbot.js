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
    modelName: "DeepSeek V3"
  };
  
  export default chatbotConfig;
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TaskCategory, Task } from "../types";

// Helper to get a fresh client instance
const getAiClient = () => {
  // Ensure the API key is available
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from process.env");
    // We let the SDK throw its own error or handle it if needed, 
    // but returning a client with empty key might fail gracefully depending on usage.
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

// Schema for generating structured task data
const taskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise and professional title for the engineering task.",
    },
    description: {
      type: Type.STRING,
      description: "A detailed technical description of what needs to be implemented.",
    },
    category: {
      type: Type.STRING,
      enum: [TaskCategory.FRONTEND, TaskCategory.API, TaskCategory.DEVOPS, TaskCategory.DESIGN, TaskCategory.GENERAL],
      description: "The technical category of the task.",
    },
    priority: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "Suggested priority level based on the complexity and impact.",
    },
    acceptanceCriteria: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-5 verifiable acceptance criteria.",
    },
    estimatedHours: {
      type: Type.NUMBER,
      description: "Estimated engineering hours to complete this task (e.g. 2, 4, 8, 16).",
    },
  },
  required: ["title", "description", "category", "priority", "acceptanceCriteria", "estimatedHours"],
};

// Schema for pure effort estimation
const effortSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    estimatedHours: {
      type: Type.NUMBER,
      description: "Conservative estimate of engineering hours.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Very brief explanation referencing similar historical tasks if available (e.g. 'Similar to Login API which took 8h').",
    },
  },
  required: ["estimatedHours", "reasoning"],
};

// Schema for Team Insights
const teamInsightSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallAssessment: {
      type: Type.STRING,
      description: "A high-level executive summary of team health and velocity.",
    },
    developerInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          levelAssessment: { type: Type.STRING, description: "Inferred seniority level (Junior/Mid/Senior) based on task complexity." },
          performanceNote: { type: Type.STRING, description: "Brief observation on their output." },
          suggestion: { type: Type.STRING, description: "Actionable advice (e.g., 'Assign more API tasks', 'Reduce load')." }
        }
      }
    },
    strategicRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Bullet points for management to improve flow."
    }
  }
};

// Schema for Personal Coaching
const personalCoachingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: { 
      type: Type.STRING, 
      enum: ["ON_TRACK", "AT_RISK", "EXCELLENT", "OVERLOADED"],
      description: "Current operational status of the developer."
    },
    feedback: { 
      type: Type.STRING, 
      description: "Direct, second-person feedback message (e.g. 'You are doing great...')." 
    },
    priorities: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Top 3 specific tasks or habits to focus on right now." 
    },
    efficiencyScore: { 
      type: Type.NUMBER, 
      description: "0-100 score based on task completion rate vs estimation." 
    }
  },
  required: ["status", "feedback", "priorities", "efficiencyScore"]
};

// Schema for Technical Plan
const techPlanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        technicalPlan: {
            type: Type.STRING,
            description: "A Markdown formatted string containing the technical implementation plan."
        }
    }
};

// Schema for Standup
const standupSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        standupText: {
            type: Type.STRING,
            description: "A professional daily standup update in Markdown format."
        }
    }
};

// Schema for Meeting Summary
const meetingSummarySchema: Schema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise executive summary of the meeting content. If the meeting was very short (e.g. 'Hello'), state that a brief exchange occurred.",
        },
        actionItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of clear action items. Return an empty array if none were discussed.",
        }
    },
    required: ["summary", "actionItems"]
};

export const generateTaskFromInput = async (userInput: string) => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `You are a Senior Technical Project Manager. Create a detailed engineering task ticket based on this rough input: "${userInput}". Ensure it is technically sound for a Frontend or API team. Estimate the time required reasonably.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: taskSchema,
        temperature: 0.3,
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response text generated");
  } catch (error) {
    console.error("Gemini Task Generation Error:", error);
    throw error;
  }
};

/**
 * Trains the model via context (Few-Shot Prompting) using the team's past tasks.
 */
const formatTaskHistoryForPrompt = (history: Task[]): string => {
    if (!history || history.length === 0) return "";
    
    const relevantTasks = history
        .filter(t => t.estimatedHours && t.estimatedHours > 0)
        .slice(-5); // Take last 5 relevant tasks to keep context small but useful

    if (relevantTasks.length === 0) return "";

    return `
    TRAINING DATA (Historical Team Velocity & Estimates):
    ${relevantTasks.map(t => `- Task: "${t.title}" (${t.category}) -> Took ${t.estimatedHours}h. Desc: ${t.description.substring(0, 50)}...`).join('\n')}
    
    INSTRUCTION: Use the historical data above to calibrate your estimate. If the new task is similar to a previous one, align the hours.
    `;
};

export const estimateTaskEffort = async (title: string, description: string, pastTasks: Task[] = []) => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const trainingContext = formatTaskHistoryForPrompt(pastTasks);
    
    const response = await ai.models.generateContent({
      model,
      contents: `You are a pragmatic Senior Technical Lead. Estimate the engineering effort (in hours) for this specific task.
      
      ${trainingContext}
      
      Guidelines:
      1. Be conservative and realistic. Assume a competent developer.
      2. Small tasks (config changes, simple UI tweaks, text updates): 1-2 hours.
      3. Medium tasks (new component, simple API integration, setting up a standard library like Recharts or Tailwind): 4-8 hours.
      4. Large tasks (complex feature, significant business logic, multiple API endpoints): 8-16 hours.
      5. Avoid estimates > 20 hours for a single ticket unless strictly necessary (e.g. major migrations).
      6. Provide a very brief reasoning string explaining the breakdown. If you used historical data, mention it.
      
      CURRENT TARGET TASK:
      Task Title: ${title}
      Task Description: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: effortSchema,
        temperature: 0.1, 
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No estimation generated");
  } catch (error) {
    console.error("Gemini Estimation Error:", error);
    throw error;
  }
};

export const generateTeamInsights = async (tasks: Task[]) => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        
        // Summarize data for the prompt to save tokens
        const summary = tasks.map(t => 
            `Assignee: ${t.assignee}, Task: ${t.title}, Category: ${t.category}, Status: ${t.status}, Est: ${t.estimatedHours}h, Priority: ${t.priority}`
        ).join('\n');

        const response = await ai.models.generateContent({
            model,
            contents: `You are an Engineering Manager analyzing team performance. 
            
            Based on the following task data, analyze the developers:
            1. Infer their seniority level based on task complexity (e.g., Architecture/DevOps = Senior, Simple UI = Junior).
            2. Evaluate their load (Active tasks) vs Performance (Done tasks).
            3. Provide specific suggestions.

            Task Data:
            ${summary}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: teamInsightSchema,
                temperature: 0.4
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No insights generated");
    } catch (error) {
        console.error("Gemini Team Insight Error:", error);
        throw error;
    }
};

export const generatePersonalCoaching = async (developerName: string, tasks: Task[]) => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        const summary = tasks.map(t => 
            `- Task: ${t.title} [${t.status}] (${t.estimatedHours}h) Priority: ${t.priority}`
        ).join('\n');

        const response = await ai.models.generateContent({
            model,
            contents: `You are an AI Performance Coach for a software engineer named ${developerName}.
            
            Analyze their current workload:
            ${summary}
            
            1. Determine their status (ON_TRACK, AT_RISK, etc).
            2. Give a 1-sentence encouraging but realistic feedback message.
            3. List top 3 priorities they should focus on (e.g. finishing high priority tasks, or clearing backlog).
            4. Calculate a mock efficiency score (0-100) based on how many High Priority/Done tasks they have vs Todo.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: personalCoachingSchema,
                temperature: 0.5
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No personal insights generated");
    } catch (error) {
        console.error("Gemini Personal Coach Error:", error);
        throw error;
    }
};

export const generateStandup = async (tasks: Task[]) => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        const summary = tasks.map(t => 
            `- Task: ${t.title} [Status: ${t.status}] (${t.category})`
        ).join('\n');

        const response = await ai.models.generateContent({
            model,
            contents: `You are a helpful assistant writing a daily standup update for a developer.
            
            Based on these tasks:
            ${summary}
            
            Format the output as a concise status update in Markdown:
            **Yesterday**: [List completed or worked on tasks]
            **Today**: [List in-progress or todo tasks]
            **Blockers**: [Infer blockers if high priority tasks are stalled, otherwise 'None']
            
            Keep it professional and brief.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: standupSchema,
                temperature: 0.5
            }
        });
        
        if (response.text) {
            return JSON.parse(response.text).standupText;
        }
        throw new Error("No standup generated");
    } catch (error) {
        console.error("Gemini Standup Error:", error);
        throw error;
    }
}

export const generateTechPlan = async (title: string, description: string) => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: `You are a Senior Architect. Create a technical implementation plan for this task:
            Title: ${title}
            Description: ${description}
            
            Include:
            1. Component Structure (if frontend) or API Schema (if backend)
            2. State Management Strategy
            3. Edge Cases to consider
            4. Security/Performance considerations
            
            Format as clean Markdown.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: techPlanSchema,
                temperature: 0.4
            }
        });

        if (response.text) {
            return JSON.parse(response.text).technicalPlan;
        }
        throw new Error("No tech plan generated");
    } catch (error) {
        console.error("Gemini Tech Plan Error:", error);
        throw error;
    }
}

export const chatWithTechLead = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    try {
        const ai = getAiClient();
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: "You are an expert Senior Staff Engineer helping a team manage their frontend and API workload. Provide concise, high-level architectural advice or debugging tips. Keep responses under 200 words unless asked for code."
            }
        });
        
        const result = await chat.sendMessage({ message });
        return result.text;
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw error;
    }
}

export const summarizeMeeting = async (transcript: {role: string, text: string}[]) => {
    // 1. Defensive Check
    if (!transcript || transcript.length === 0) {
        return { summary: "No conversation content available.", actionItems: [] };
    }

    // 2. AI Generation
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash';
        const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
        
        const response = await ai.models.generateContent({
            model,
            contents: `You are a professional meeting secretary. Summarize this meeting transcript.
            
            TRANSCRIPT:
            ${transcriptText}
            
            Instructions:
            1. If the transcript is very short (e.g. just a hello), simply return a summary stating that a brief connection was made.
            2. Extract up to 3 clear action items if they exist.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: meetingSummarySchema,
                temperature: 0.3,
            }
        });

        if (response.text) {
            // responseSchema ensures valid JSON, so we can parse directly.
            return JSON.parse(response.text);
        }
        
        return { summary: "Meeting Ended.", actionItems: [] };
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        // Returns a safe object so the UI doesn't crash or show error alerts
        return { 
            summary: "Automatic summary unavailable due to service interruption.", 
            actionItems: [] 
        };
    }
}
import { CohereClientV2 } from "cohere-ai";

// if (!process.env.COHERE_API_KEY) {
//   throw new Error('COHERE_API_KEY is not configured');
// }
const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

export const cohereChat = async (content: string) => {
  const response = await cohere.chat({
    model: "command-r-08-2024",
    messages: [
      {
        role: "user",
        content: content,
      },
    ],
  });

  // For debugging - log the response structure
  console.log("Cohere API Response:", JSON.stringify(response, null, 2));
  return response;
};

// Function specifically for generating LaTeX content like resumes
export const cohereGenerateLatex = async (content: string): Promise<string> => {
  const response = await cohere.chat({
    model: "command-r-08-2024",
    messages: [
      {
        role: "system",
        content:
          "You are a LaTeX expert and professional resume editor. All responses must maintain valid LaTeX formatting with proper syntax. CRITICAL: When customizing resumes, you must NEVER add, modify, or fabricate factual information such as dates, job titles, company names, skills not present in the original, or years of experience. You may only reorder, rephrase, and reformat existing information to highlight relevant qualifications.",
      },
      {
        role: "user",
        content: content,
      },
    ],
    temperature: 0.3, // Lower temperature for more predictable and conservative outputs
  });

  // Extract text from the response based on the actual Cohere API response structure
  if (
    !response ||
    !response.message ||
    !response.message.content ||
    !Array.isArray(response.message.content) ||
    response.message.content.length === 0
  ) {
    throw new Error("Invalid or empty response from Cohere API");
  }

  // Find the text content in the response
  const textContent = response.message.content.find(
    (item) => item.type === "text"
  );
  if (!textContent || !textContent.text) {
    throw new Error("No text content found in Cohere API response");
  }

  return textContent.text;
};

// Function to score a resume against a job description
export interface ResumeScore {
  score: number;
  pros: string[];
  cons: string[];
}

export const scoreResumeAgainstJob = async (
  resumeLatex: string,
  jobDescription: string
): Promise<ResumeScore> => {
  const prompt = `You are an expert recruiter and resume analyst. Analyze the following resume against the job description and provide a scoring.

RESUME (LaTeX format):
${resumeLatex}

JOB DESCRIPTION:
${jobDescription}

Please provide a JSON response with the following structure (and ONLY this JSON, no other text):
{
  "score": <number between 0-100>,
  "pros": [<3-5 strings describing strengths of the resume for this job>],
  "cons": [<3-5 strings describing weaknesses or missing elements in the resume for this job>]
}

Consider factors like:
- Relevant skills and experience
- Educational background alignment
- Technical expertise match
- Years of experience
- Project relevance
- Keywords and industry experience

Provide constructive feedback. Be fair but realistic.`;

  const response = await cohere.chat({
    model: "command-r-08-2024",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,
  });

  // Extract text from the response
  if (
    !response ||
    !response.message ||
    !response.message.content ||
    !Array.isArray(response.message.content) ||
    response.message.content.length === 0
  ) {
    throw new Error("Invalid or empty response from Cohere API");
  }

  const textContent = response.message.content.find(
    (item) => item.type === "text"
  );
  if (!textContent || !textContent.text) {
    throw new Error("No text content found in Cohere API response");
  }

  try {
    // Parse the JSON response
    const scoreData = JSON.parse(textContent.text);

    // Validate the response structure
    if (
      typeof scoreData.score !== "number" ||
      !Array.isArray(scoreData.pros) ||
      !Array.isArray(scoreData.cons)
    ) {
      throw new Error("Invalid response structure from Cohere");
    }

    // Ensure score is between 0-100
    scoreData.score = Math.max(0, Math.min(100, scoreData.score));

    return scoreData as ResumeScore;
  } catch (error) {
    console.error("Error parsing resume score response:", error);
    throw new Error("Failed to parse resume scoring response");
  }
};

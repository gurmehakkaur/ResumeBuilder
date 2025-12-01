import { quickValidateLatex, balanceLatexTags } from "@/lib/validateLatex";
import { cohereGenerateLatex } from "@/lib/cohere";

/**
 * Generates a customized resume using Cohere API
 * @param masterResume The user's master resume in LaTeX format
 * @param jobTitle The job title to tailor the resume for
 * @param jobDescription The job description to tailor the resume for
 * @returns Promise resolving to the customized resume in LaTeX format
 */
export async function generateCustomResume(
  masterResume: string,
  jobTitle: string,
  jobDescription: string
): Promise<string> {
  try {
    // Ensure we have all required parameters
    if (!masterResume || !jobTitle || !jobDescription) {
      throw new Error("Missing required parameters");
    }

    // Construct prompt for Cohere API
    const prompt = `
      You are a professional resume customizer. Tailor the following master resume for a job with title "${jobTitle}" and description "${jobDescription}".
      
      CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
      
      1. FACTUAL ACCURACY - DO NOT MODIFY:
         - DO NOT add, remove, or change dates (employment periods, education dates, etc.)
         - DO NOT add, remove, or change job titles or positions held
         - DO NOT add, remove, or change company names or educational institutions
         - DO NOT add, remove, or change degree names or certifications
         - DO NOT add, remove, or inflate years of experience
         - DO NOT add skills, technologies, or qualifications that are NOT in the master resume
         - DO NOT fabricate or exaggerate any accomplishments, projects, or responsibilities
         - DO NOT change quantitative metrics (numbers, percentages, statistics) unless reformatting for clarity
      
      2. WHAT YOU CAN DO - ONLY THESE CHANGES ARE ALLOWED:
         - REORDER sections to prioritize the most relevant experience for this job
         - REORDER bullet points within sections to highlight relevant skills first
         - REPHRASE existing bullet points to emphasize keywords from the job description (without changing facts)
         - ADJUST formatting, spacing, and styling for better visual presentation
         - CONDENSE or EXPAND descriptions of existing experiences for better clarity (keeping all facts accurate)
         - EMPHASIZE relevant skills, tools, and technologies that are ALREADY in the resume
         - IMPROVE action verbs and word choice while maintaining the original meaning
         - REMOVE less relevant sections or experiences if space is limited (but NEVER add what's not there)
      
      3. LaTeX FORMAT REQUIREMENTS:
         - You MUST maintain valid LaTeX format
         - All '{' must be matched with '}'
         - All '[' must be matched with ']'
         - All '\\begin{env}' must be matched with '\\end{env}' with the same environment name
         - Preserve the overall LaTeX structure
         - Do not add or remove document class or document environment tags
      
      Master Resume:
      ${masterResume}
      
      Job Title: ${jobTitle}
      Job Description: ${jobDescription}
      
      Remember: Your role is to HIGHLIGHT and REORDER existing information, NOT to add or fabricate anything. 
      Think of this as strategic presentation of truthful information, not content creation.
      
      Return ONLY the customized resume in valid LaTeX format with NO additional commentary or explanation.
    `;

    // Call Cohere API using our client
    const generatedText = await cohereGenerateLatex(prompt);

    // Extract the generated text from the Cohere response
    let customizedResume = generatedText.trim();

    // Remove any markdown code blocks that might be in the response
    if (
      customizedResume.startsWith("```latex") ||
      customizedResume.startsWith("```")
    ) {
      customizedResume = customizedResume
        .replace(/^```(?:latex)?\n/, "") // Remove opening code block
        .replace(/\n```$/, ""); // Remove closing code block
    }

    // Validate the LaTeX response
    if (!quickValidateLatex(customizedResume)) {
      console.warn(
        "Generated resume failed LaTeX validation, attempting to fix common issues..."
      );

      // Try to fix some common issues that might cause validation to fail
      // 1. Ensure all begin/end tags are properly balanced
      const fixedResume = balanceLatexTags(customizedResume);

      // Check if the fixed version validates
      if (!quickValidateLatex(fixedResume)) {
        throw new Error(
          "Generated resume contains invalid LaTeX that could not be automatically fixed"
        );
      }

      customizedResume = fixedResume;
    }

    return customizedResume;
  } catch (error) {
    console.error("Error generating custom resume:", error);
    throw error;
  }
}

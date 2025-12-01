/**
 * Validates LaTeX string without requiring a LaTeX compiler
 * @param latexString The LaTeX content to validate
 * @returns Promise resolving to a boolean indicating if the LaTeX is valid
 */
export async function validateLatex(latexString: string): Promise<boolean> {
  if (!latexString || typeof latexString !== "string" || !latexString.trim()) {
    return false;
  }

  try {
    // First use the quick validation to check for basic syntax
    const quickResult = quickValidateLatex(latexString);
    if (!quickResult) {
      return false;
    }

    // Additional validation checks that might be more thorough
    // For now, this is just a placeholder for future enhancements

    // Check for mismatched or incorrect command usage (common errors)
    const suspiciousPatterns = [
      /\\usepackage\s*\{\s*\}/, // Empty usepackage
      /\\begin\s*\{\s*\}/, // Empty environment name
      /\\section\s*\{\s*\}/, // Empty section title
      /\\cite\s*\{\s*\}/, // Empty citation
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(latexString)) {
        console.warn("Suspicious LaTeX pattern found:", pattern);
        // We don't fail validation for these, just log warnings
      }
    }

    return true;
  } catch (error) {
    console.error("Error in validateLatex:", error);
    return false;
  }
}

/**
 * Attempts to fix common LaTeX issues such as unbalanced tags or braces
 * @param latexString The LaTeX string to fix
 * @returns The fixed LaTeX string
 */
export function balanceLatexTags(latexString: string): string {
  if (!latexString) return "";

  let result = latexString;

  try {
    // Fix unbalanced braces
    let braceCount = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === "{") braceCount++;
      if (result[i] === "}") braceCount--;
    }

    // Add missing closing braces
    while (braceCount > 0) {
      result += "}";
      braceCount--;
    }

    // Fix unclosed environments
    const beginEnvs: string[] = [];
    const beginEnvRegex = /\\begin\{([a-zA-Z0-9*]+)\}/g;
    let match: RegExpExecArray | null;

    while ((match = beginEnvRegex.exec(result)) !== null) {
      beginEnvs.push(match[1]);
    }

    const endEnvRegex = /\\end\{([a-zA-Z0-9*]+)\}/g;
    const endedEnvs: string[] = [];

    while ((match = endEnvRegex.exec(result)) !== null) {
      endedEnvs.push(match[1]);
    }

    // Find environments that were opened but not closed
    for (let i = beginEnvs.length - 1; i >= 0; i--) {
      const envName = beginEnvs[i];
      const index = endedEnvs.indexOf(envName);

      if (index !== -1) {
        // This environment was closed
        endedEnvs.splice(index, 1);
      } else {
        // This environment wasn't closed, add closing tag
        result += `\\end{${envName}}`;
      }
    }

    // Remove orphaned \end tags (not recommended, but if we must...)
    // This is commented out because it might be safer to leave them in
    // endedEnvs.forEach(env => {
    //   result = result.replace(new RegExp(`\\\\end\\{${env}\\}`, 'g'), '');
    // });

    return result;
  } catch (error) {
    console.error("Error in balanceLatexTags:", error);
    return latexString; // Return original if error occurs
  }
}

/**
 * Simpler validation function that checks for common LaTeX syntax issues
 * without actually compiling the document
 * @param latexString The LaTeX content to validate
 * @returns Boolean indicating if the LaTeX appears valid
 */
export function quickValidateLatex(latexString: string): boolean {
  if (!latexString || typeof latexString !== "string" || !latexString.trim()) {
    return false;
  }

  try {
    // Check for balanced braces
    let braceCount = 0;
    for (let i = 0; i < latexString.length; i++) {
      if (latexString[i] === "{") braceCount++;
      if (latexString[i] === "}") braceCount--;

      // If at any point we have more closing braces than opening ones
      if (braceCount < 0) return false;
    }

    // At the end, the number of opening and closing braces should match
    if (braceCount !== 0) return false;

    // Check for common LaTeX commands that indicate this is actually LaTeX content
    const hasLatexCommands = /\\[a-zA-Z]+(\{|\s|$)/.test(latexString);
    if (!hasLatexCommands) return false;

    // Check for unclosed environments
    const beginEnvs = latexString.match(/\\begin\{[a-zA-Z0-9*]+\}/g) || [];
    const endEnvs = latexString.match(/\\end\{[a-zA-Z0-9*]+\}/g) || [];

    if (beginEnvs.length !== endEnvs.length) return false;

    // More detailed checking for matching environment names
    const envNames = new Map();
    for (const begin of beginEnvs) {
      const name = begin.match(/\\begin\{([a-zA-Z0-9*]+)\}/)?.[1];
      if (name) {
        envNames.set(name, (envNames.get(name) || 0) + 1);
      }
    }

    for (const end of endEnvs) {
      const name = end.match(/\\end\{([a-zA-Z0-9*]+)\}/)?.[1];
      if (name) {
        const count = envNames.get(name) || 0;
        if (count === 0) return false; // Ending an environment that wasn't begun
        envNames.set(name, count - 1);
      }
    }

    // Check if all environments were properly closed
    for (const [, count] of envNames.entries()) {
      if (count !== 0) return false;
    }

    return true;
  } catch (error) {
    console.error("Error in quickValidateLatex:", error);
    return false;
  }
}

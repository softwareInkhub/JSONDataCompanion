
export function generateSchemaPrompt(data: any) {
  return `Analyze this JSON data and create a comprehensive Zod validation schema:

${JSON.stringify(data, null, 2)}

Requirements:
1. Create strict type checking
2. Add appropriate validators (min/max length, patterns, etc.)
3. Include meaningful error messages
4. Support nested objects and arrays
5. Add custom validation rules where appropriate

Return the schema in this format:
{
  "schema": "Zod schema as string",
  "validations": ["List of validation rules applied"],
  "types": ["Generated TypeScript types"],
  "examples": ["Valid data examples"]
}`;
}

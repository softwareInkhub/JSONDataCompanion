export function generateSchemaPrompt(data: any) {
  return `Create a JSON Schema for the following data structure:

${JSON.stringify(data, null, 2)}

Rules for schema generation:
1. The schema must be a valid JSON Schema
2. Each field must have appropriate type and validation rules
3. Handle all nested structures correctly
4. Add meaningful field descriptions
5. Include appropriate constraints (min/max, patterns, etc.)

Return a JSON object with this exact structure:
{
  "schema": {
    "type": "object",
    "properties": {
      "fieldName": {
        "type": "string" | "number" | "boolean" | "array" | "object",
        "description": "Description of what this field represents",
        "minLength": number,        // For strings
        "maxLength": number,        // For strings
        "pattern": "regex",         // For strings
        "minimum": number,          // For numbers
        "maximum": number,          // For numbers
        "items": {                  // For arrays
          "type": "string" | "number" | "boolean" | "object",
          // ... item validations
        },
        "properties": {             // For objects
          // ... nested property definitions
        }
      }
    },
    "required": ["list", "of", "required", "fields"],
    "additionalProperties": false
  }
}

IMPORTANT:
- All field types must be one of: "string", "number", "boolean", "array", or "object"
- Nested objects must follow the same structure
- Array items must have proper type definitions
- Required fields must be listed in the root "required" array
- The response must be valid JSON (no comments)`;
}
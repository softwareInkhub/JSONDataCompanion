export function generateSchemaPrompt(data: any) {
  return `Analyze this JSON data and create a comprehensive Zod validation schema:

${JSON.stringify(data, null, 2)}

Requirements:
1. Create strict type checking with appropriate validators for each field
2. Add meaningful description for each field
3. Determine which fields should be required based on data analysis
4. For string fields:
   - Add appropriate minLength/maxLength constraints
   - Add pattern validation where applicable (e.g., email, url, etc.)
5. For number fields:
   - Add appropriate minimum/maximum constraints
   - Determine if integers or floating points should be used
6. For arrays:
   - Define item types and validation
   - Add length constraints if appropriate
7. For nested objects:
   - Create detailed sub-schemas
   - Maintain proper type hierarchy
8. Consider adding enum validations for fields with limited value sets

Return the schema in this format:
{
  "schema": {
    "type": "object",
    "properties": {
      "fieldName": {
        "type": "string|number|boolean|array|object",
        "description": "Clear description of the field purpose",
        "required": true|false,
        // Additional validation rules based on type
        "minLength": number,
        "maxLength": number,
        "pattern": "regex pattern",
        "minimum": number,
        "maximum": number,
        "enum": ["possible", "values"],
        "items": { /* For array types */ },
        "properties": { /* For object types */ }
      }
    },
    "required": ["array of required fields"],
    "additionalProperties": false
  },
  "validations": ["List of all validation rules applied"],
  "examples": ["Valid data examples"]
}`;
}
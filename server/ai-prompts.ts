export function generateSchemaPrompt(data: any) {
  return `Analyze this JSON data and create a comprehensive JSON schema with validations:

${JSON.stringify(data, null, 2)}

Task: Create a detailed JSON Schema that accurately represents this data structure with proper validations.

Analysis Requirements:
1. Deeply analyze the structure:
   - Identify all nested objects and arrays
   - Determine the depth of nesting
   - Map relationships between objects
   - Detect patterns in data values

2. For each field, determine:
   - Appropriate data type
   - Required vs optional status
   - Common patterns or formats
   - Value constraints (min/max, patterns, etc.)
   - Possible enumerated values

3. For string fields:
   - Identify formats (email, date, URL, etc.)
   - Define length constraints
   - Extract regex patterns
   - List possible enum values if limited

4. For number fields:
   - Determine integer vs float
   - Set minimum and maximum bounds
   - Identify step values if applicable
   - Define precision requirements

5. For arrays:
   - Define item types and validations
   - Set length constraints
   - Identify unique item requirements
   - Handle nested array structures

6. For objects:
   - Create detailed sub-schemas
   - Define required properties
   - Set additional properties rules
   - Handle nested object validation

Return a JSON object with this exact structure:
{
  "schema": {
    "type": "object",
    "properties": {
      "fieldName": {
        "type": "string|number|boolean|array|object",
        "description": "Clear description of field purpose and usage",
        "required": true|false,
        "format": "email|date|uri|etc",
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
  "validations": [
    "List all validation rules applied"
  ],
  "examples": [
    "Provide valid data examples"
  ]
}

Important:
- Analyze the actual data values to determine appropriate constraints
- Include meaningful descriptions for each field
- Ensure all nested structures are properly validated
- Return response in valid JSON format
- Make the schema as strict as possible while accommodating the data`;
}
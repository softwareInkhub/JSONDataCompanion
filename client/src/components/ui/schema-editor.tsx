import { useState } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import MonacoEditor from '@monaco-editor/react';
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Trash2 } from "lucide-react";
import { type Schema, type SchemaProperty, schemaPropertySchema } from "@shared/schema";

interface SchemaEditorProps {
  schema?: Schema;
  onSave: (schema: Schema) => void;
  onDelete?: () => void;
}

export function SchemaEditor({ schema, onSave, onDelete }: SchemaEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(schema?.name || "");
  const [schemaContent, setSchemaContent] = useState(
    schema ? JSON.stringify(schema.schema, null, 2) : JSON.stringify({
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }, null, 2)
  );
  const { toast } = useToast();

  const handleSave = () => {
    try {
      const parsedSchema = JSON.parse(schemaContent);
      const validSchema = z.object({
        type: z.literal("object"),
        properties: z.record(schemaPropertySchema),
        required: z.array(z.string()).optional(),
        additionalProperties: z.boolean().optional()
      }).parse(parsedSchema);

      onSave({
        id: schema?.id,
        name,
        schema: validSchema,
        version: (schema?.version || 0) + 1,
        createdAt: schema?.createdAt || new Date()
      } as Schema);

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Schema saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid schema format",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold">{name || "New Schema"}</h3>
          {schema && (
            <p className="text-sm text-muted-foreground">Version {schema.version}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {schema ? 'Edit Schema' : 'Create New Schema'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Schema Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter schema name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schemaEditor">Schema Definition</Label>
              <div className="h-[400px] border rounded-md overflow-hidden">
                <MonacoEditor
                  height="400px"
                  language="json"
                  theme="vs-light"
                  value={schemaContent}
                  onChange={(value) => setSchemaContent(value || "")}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    formatOnPaste: true,
                  }}
                />
              </div>
            </div>
            <Button onClick={handleSave}>Save Schema</Button>
          </div>
        </DialogContent>
      </Dialog>

      <pre className="text-sm bg-muted p-2 rounded-md overflow-auto max-h-32">
        {schemaContent}
      </pre>
    </Card>
  );
}

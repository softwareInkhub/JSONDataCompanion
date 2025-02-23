import { useState } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import MonacoEditor from '@monaco-editor/react';
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Trash2, Plus } from "lucide-react";
import { type Schema, type SchemaProperty, schemaPropertySchema } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Checkbox } from "./checkbox";

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
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const { toast } = useToast();

  const handlePropertyUpdate = (propertyName: string, updates: Partial<SchemaProperty>) => {
    try {
      const parsedSchema = JSON.parse(schemaContent);
      parsedSchema.properties[propertyName] = {
        ...parsedSchema.properties[propertyName],
        ...updates
      };
      setSchemaContent(JSON.stringify(parsedSchema, null, 2));
    } catch (error) {
      console.error("Error updating property:", error);
    }
  };

  const handleAddProperty = () => {
    try {
      const parsedSchema = JSON.parse(schemaContent);
      const newProperty = {
        type: "string",
        description: "New property",
        required: false
      };

      let propertyName = "newProperty";
      let counter = 1;
      while (parsedSchema.properties[propertyName]) {
        propertyName = `newProperty${counter}`;
        counter++;
      }

      parsedSchema.properties[propertyName] = newProperty;
      setSchemaContent(JSON.stringify(parsedSchema, null, 2));
      setSelectedProperty(propertyName);
      setShowPropertyDialog(true);
    } catch (error) {
      console.error("Error adding property:", error);
    }
  };

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
        id: schema?.id || "",
        name,
        schema: validSchema,
        version: (schema?.version || 0) + 1,
        createdAt: schema?.createdAt || new Date()
      });

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

  const PropertyEditor = ({ propertyName, property }: { propertyName: string, property: SchemaProperty }) => (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Property Name</Label>
        <Input 
          value={propertyName}
          onChange={(e) => {
            const newName = e.target.value;
            if (newName && newName !== propertyName) {
              try {
                const schema = JSON.parse(schemaContent);
                schema.properties[newName] = schema.properties[propertyName];
                delete schema.properties[propertyName];
                setSchemaContent(JSON.stringify(schema, null, 2));
                setSelectedProperty(newName);
              } catch (error) {
                console.error("Error renaming property:", error);
              }
            }
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Type</Label>
        <Select 
          value={property.type}
          onValueChange={(value: any) => handlePropertyUpdate(propertyName, { type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["string", "number", "boolean", "array", "object", "null"].map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Input
          value={property.description || ""}
          onChange={(e) => handlePropertyUpdate(propertyName, { description: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="required"
          checked={property.required}
          onCheckedChange={(checked) => {
            handlePropertyUpdate(propertyName, { required: !!checked });
            try {
              const schema = JSON.parse(schemaContent);
              if (!schema.required) schema.required = [];

              if (checked) {
                if (!schema.required.includes(propertyName)) {
                  schema.required.push(propertyName);
                }
              } else {
                schema.required = schema.required.filter((name: string) => name !== propertyName);
              }

              setSchemaContent(JSON.stringify(schema, null, 2));
            } catch (error) {
              console.error("Error updating required fields:", error);
            }
          }}
        />
        <Label htmlFor="required">Required</Label>
      </div>

      {property.type === "string" && (
        <>
          <div className="grid gap-2">
            <Label>Min Length</Label>
            <Input
              type="number"
              value={property.minLength || ""}
              onChange={(e) => handlePropertyUpdate(propertyName, { minLength: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Max Length</Label>
            <Input
              type="number"
              value={property.maxLength || ""}
              onChange={(e) => handlePropertyUpdate(propertyName, { maxLength: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Pattern (regex)</Label>
            <Input
              value={property.pattern || ""}
              onChange={(e) => handlePropertyUpdate(propertyName, { pattern: e.target.value })}
            />
          </div>
        </>
      )}

      {property.type === "number" && (
        <>
          <div className="grid gap-2">
            <Label>Minimum</Label>
            <Input
              type="number"
              value={property.minimum || ""}
              onChange={(e) => handlePropertyUpdate(propertyName, { minimum: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Maximum</Label>
            <Input
              type="number"
              value={property.maximum || ""}
              onChange={(e) => handlePropertyUpdate(propertyName, { maximum: parseInt(e.target.value) || undefined })}
            />
          </div>
        </>
      )}
    </div>
  );

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
              <div className="flex justify-between items-center">
                <Label htmlFor="schemaEditor">Schema Definition</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddProperty}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
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

      <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <PropertyEditor
              propertyName={selectedProperty}
              property={JSON.parse(schemaContent).properties[selectedProperty]}
            />
          )}
        </DialogContent>
      </Dialog>

      <pre className="text-sm bg-muted p-2 rounded-md overflow-auto max-h-32">
        {schemaContent}
      </pre>
    </Card>
  );
}
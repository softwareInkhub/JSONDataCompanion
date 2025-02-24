import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { type Schema } from "@shared/schema";
import { z } from "zod";
import MonacoEditor from '@monaco-editor/react';
import { SchemaEditor } from "@/components/ui/schema-editor";

export default function Schemas() {
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schemas, isLoading, error } = useQuery({
    queryKey: ['/api/schemas'],
    queryFn: async () => {
      const response = await fetch('/api/schemas');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch schemas');
      }
      const data = await response.json();
      console.log('Fetched schemas:', data); // Debug log
      return data as Schema[];
    }
  });

  const createSchemaMutation = useMutation({
    mutationFn: async (newSchema: Schema) => {
      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchema)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schema');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schemas'] });
      toast({ title: "Success", description: "Schema created successfully" });
      setShowEditor(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateSchemaMutation = useMutation({
    mutationFn: async (schema: Schema) => {
      const response = await fetch(`/api/schemas/${schema.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schema');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schemas'] });
      toast({ title: "Success", description: "Schema updated successfully" });
      setShowEditor(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSchemaEdit = (schema: Schema) => {
    if (selectedSchema) {
      updateSchemaMutation.mutate({
        ...selectedSchema,
        ...schema
      });
    } else {
      createSchemaMutation.mutate(schema);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading schemas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Schema Management</h1>
        <Button onClick={() => {
          setSelectedSchema(null);
          setShowEditor(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Schema
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schemas?.map((schema) => (
          <Card key={schema.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">{schema.name}</h3>
                <p className="text-sm text-muted-foreground">Version {schema.version}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedSchema(schema);
                    setShowEditor(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <pre className="text-sm bg-muted p-2 rounded-md overflow-auto max-h-32">
              {JSON.stringify(schema.schema, null, 2)}
            </pre>
          </Card>
        ))}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {selectedSchema ? 'Edit Schema' : 'Create New Schema'}
            </DialogTitle>
          </DialogHeader>
          <SchemaEditor
            schema={selectedSchema || undefined}
            onSave={handleSchemaEdit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
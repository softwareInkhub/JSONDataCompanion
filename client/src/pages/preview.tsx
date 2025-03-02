import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Code2, Wand2, Edit2, Table, Eye, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import MonacoEditor from '@monaco-editor/react';
import { DataGrid } from 'react-data-grid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SchemaEditor } from "@/components/ui/schema-editor";
import 'react-data-grid/lib/styles.css';
import { useQueryClient } from '@tanstack/react-query';

interface Schema {
  id?: string;
  name: string;
  schema: any;
  version: number;
  createdAt: Date;
}

function flattenObject(obj: any, prefix = ''): any {
  if (!obj || typeof obj !== 'object') return { [prefix]: obj };

  return Object.keys(obj).reduce((acc: any, k: string) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = Array.isArray(obj[k]) ? JSON.stringify(obj[k]) : obj[k];
    }
    return acc;
  }, {});
}

function transformToTableData(data: any): { rows: any[], columns: any[] } {
  try {
    const arrayData = Array.isArray(data) ? data : [data];

    if (!arrayData.length) {
      return { rows: [], columns: [] };
    }

    const flattenedData = arrayData.map(item => flattenObject(item));

    const allKeys = new Set<string>();
    flattenedData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const columns = Array.from(allKeys).map(key => ({
      key,
      name: key,
      resizable: true,
      sortable: true,
      width: Math.max(100, key.length * 10),
      formatter(props: any) {
        const value = props.row[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
    }));

    return {
      rows: flattenedData,
      columns
    };
  } catch (error) {
    console.error('Error transforming data:', error);
    return { rows: [], columns: [] };
  }
}

export default function Preview() {
  const [location] = useLocation();
  const [data, setData] = useState<any>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw' | 'table' | 'edit'>('pretty');
  const [editableJson, setEditableJson] = useState("");
  const [showSchemaDialog, setShowSchemaDialog] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState<any>(null);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tableData = useMemo(() => {
    if (!data) return { rows: [], columns: [] };
    return transformToTableData(data);
  }, [data]);

  useEffect(() => {
    const id = location.split("/").pop();
    if (id) {
      fetch(`/api/${id}`)
        .then(res => res.json())
        .then(data => {
          setData(data);
          setEditableJson(JSON.stringify(data, null, 2));
        })
        .catch(error => {
          console.error("Error fetching data:", error);
          toast({
            title: "Error",
            description: "Failed to load data",
            variant: "destructive",
          });
        });
    }
  }, [location, toast]);

  const handleEnhance = async () => {
    try {
      setIsEnhancing(true);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Context: ${JSON.stringify(data)}\n\nEnhancement request: ${enhancePrompt}`,
          context: data
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance data');
      }

      const result = await response.json();

      if (!result.jsonData) {
        throw new Error('Invalid response from AI');
      }

      setData(result.jsonData);
      setEditableJson(JSON.stringify(result.jsonData, null, 2));
      setEnhancePrompt("");
      toast({
        title: "Success",
        description: "Data enhanced successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleJsonEdit = (value: string | undefined) => {
    if (!value) return;
    setEditableJson(value);
    try {
      const parsed = JSON.parse(value);
      setData(parsed);
      toast({
        title: "Success",
        description: "JSON updated successfully",
      });
    } catch (error) {
      console.error("Invalid JSON:", error);
    }
  };

  const handleGenerateSchema = async () => {
    try {
      setIsGeneratingSchema(true);
      const response = await fetch("/api/generate-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate schema");
      }

      const result = await response.json();
      if (!result.schema) {
        throw new Error('Invalid schema generated');
      }

      setGeneratedSchema(result);
      setShowSchemaDialog(true);

      toast({
        title: "Success",
        description: "Schema generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSchema(false);
    }
  };

  const handleSaveSchema = async (schema: Schema) => {
    try {
      const response = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schema.name || `Schema for ${location.split("/").pop()}`,
          schema: schema.schema,
          version: 1
          // Don't send createdAt, let the server handle it with defaultNow()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save schema");
      }

      setShowSchemaDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/schemas'] });
      toast({
        title: "Success",
        description: "Schema saved successfully. View it in the Schema Management section.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-xl animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      <Sheet open={showRequestDetails} onOpenChange={setShowRequestDetails}>
        <SheetTrigger asChild>
          <Button
            className="fixed top-4 right-4 z-50"
            size="lg"
            variant="outline"
          >
            <Code2 className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Request Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Request</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {`curl --request GET \\
  --url '${window.location.origin}/api/${location.split("/").pop()}'`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(`curl --request GET --url '${window.location.origin}/api/${location.split("/").pop()}'`);
                  toast({
                    title: "Copied",
                    description: "Request copied to clipboard",
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Request
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Response</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  toast({
                    title: "Copied",
                    description: "Response copied to clipboard",
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Response
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Preview & Enhance</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateSchema}
              disabled={isGeneratingSchema}
            >
              {isGeneratingSchema ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Schema
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Home
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="pretty" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Pretty
                </TabsTrigger>
                <TabsTrigger value="raw" className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Raw
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pretty" className="mt-0">
                <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                  <MonacoEditor
                    height="400px"
                    language="json"
                    theme="vs-light"
                    value={JSON.stringify(data, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      formatOnPaste: true,
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-0">
                <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                  <pre className="text-sm">
                    {JSON.stringify(data)}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="table" className="mt-0">
                <div className="bg-background rounded-lg p-4 max-h-[400px] overflow-auto border">
                  {tableData.rows.length > 0 ? (
                    <div style={{ height: 350 }}>
                      <DataGrid
                        rows={tableData.rows}
                        columns={tableData.columns}
                        className="rdg-light"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No data available in table format
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="edit" className="mt-0">
                <div className="bg-background rounded-lg border h-[400px]">
                  <MonacoEditor
                    height="400px"
                    language="json"
                    theme="vs-light"
                    value={editableJson}
                    onChange={handleJsonEdit}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      formatOnPaste: true,
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Input
                placeholder="Make desired changes (e.g., 'add ratings to movies', 'sort by year')"
                value={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleEnhance}
                disabled={!enhancePrompt || isEnhancing}
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Enhance with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Dialog open={showSchemaDialog} onOpenChange={setShowSchemaDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create Schema</DialogTitle>
            </DialogHeader>
            {generatedSchema && (
              <SchemaEditor
                schema={{
                  id: "", // This will be generated by the server
                  name: `Schema for ${location.split("/").pop()}`,
                  schema: generatedSchema.schema,
                  version: 1,
                  createdAt: new Date()
                }}
                onSave={handleSaveSchema}
              />
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              toast({
                title: "Copied",
                description: "JSON data copied to clipboard",
              });
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
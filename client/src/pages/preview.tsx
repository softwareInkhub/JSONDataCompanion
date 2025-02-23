import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Code2, Wand2, Edit2, Table, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import MonacoEditor from '@monaco-editor/react';

export default function Preview() {
  const [location] = useLocation();
  const [data, setData] = useState<any>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw' | 'table' | 'edit'>('pretty');
  const [editableJson, setEditableJson] = useState("");
  const { toast } = useToast();

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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancePrompt,
          context: data
        })
      });
      const result = await response.json();
      setData(result);
      setEditableJson(JSON.stringify(result, null, 2));
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
      // Don't update data if JSON is invalid
      console.error("Invalid JSON:", error);
    }
  };

  const renderTableView = (data: any) => {
    if (!Array.isArray(data)) {
      return <div className="text-muted-foreground">Table view is only available for array data</div>;
    }

    const columns = Object.keys(data[0] || {});
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {columns.map((col) => (
                <th key={col} className="p-2 text-left border">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-muted/50">
                {columns.map((col) => (
                  <td key={col} className="p-2 border">{JSON.stringify(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-xl animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      {/* Floating Request Details Button */}
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
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Request Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Request</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {`curl --request GET \\
  --url '${window.location.origin}/api/${data.id}'`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(`curl --request GET --url '${window.location.origin}/api/${data.id}'`);
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
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Home
          </Button>
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
                  <pre className="text-sm whitespace-pre">
                    {JSON.stringify(data, null, 2)}
                  </pre>
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
                  {renderTableView(Array.isArray(data) ? data : data.jsonData)}
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
                disabled={!enhancePrompt}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Enhance with AI
              </Button>
            </div>
          </div>
        </Card>

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
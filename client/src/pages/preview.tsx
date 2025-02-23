import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wand2, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";


export default function Preview() {
  const [location] = useLocation();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pretty");
  const [generatedSchema, setGeneratedSchema] = useState(null);

  useEffect(() => {
    const id = location.split("/").pop();
    if (id) {
      fetch(`/api/${id}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error);
    }
  }, [location]);

  const generateSchema = async () => {
    try {
      const response = await fetch("/api/generate-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: data }) // Use the existing 'data' state
      });
      const schema = await response.json();
      setGeneratedSchema(schema);
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
    }
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Response Preview</h1>
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Testing
          </Button>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pretty">Pretty</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="pretty">
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                <code className="text-sm">
                  {JSON.stringify(data, null, 2)}
                </code>
              </pre>
            </TabsContent>

            <TabsContent value="raw">
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                <code className="text-sm">
                  {JSON.stringify(data)}
                </code>
              </pre>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 flex gap-4">
          <Button variant="outline">Copy to Clipboard</Button>
          <Button variant="outline">Download JSON</Button>
          <Button variant="outline">Share</Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button onClick={generateSchema} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generate Schema
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Generated Schema</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {generatedSchema && (
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[500px]">
                      <pre className="text-sm">
                        {JSON.stringify(generatedSchema, null, 2)}
                      </pre>
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        // Placeholder for applying the schema
                        toast({
                          title: "Success",
                          description: "Schema applied successfully",
                        });
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Apply Schema
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Preview() {
  const [location] = useLocation();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pretty");

  useEffect(() => {
    const id = location.split("/").pop();
    if (id) {
      fetch(`/api/${id}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error);
    }
  }, [location]);

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
        </div>
      </motion.div>
    </div>
  );
}

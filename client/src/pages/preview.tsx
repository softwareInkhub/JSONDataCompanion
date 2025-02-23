import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Code2, Wand2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Preview() {
  const [location] = useLocation();
  const [data, setData] = useState<any>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const id = location.split("/").pop();
    if (id) {
      fetch(`/api/${id}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error);
    }
  }, [location]);

  const handleEnhance = async () => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancePrompt,
          context: JSON.stringify(data)
        })
      });
      const result = await response.json();
      setData(result);
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

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
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
              <h3 className="text-sm font-medium">Request</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {`curl --request GET \\
  --url '${window.location.origin}${data.apiUrl}'`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(`curl --request GET --url '${window.location.origin}${data.apiUrl}'`);
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
              <h3 className="text-sm font-medium">Response</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(data.jsonData, null, 2)}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(data.jsonData, null, 2));
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
            <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
              <pre className="text-sm whitespace-pre">
                {JSON.stringify(data.jsonData, null, 2)}
              </pre>
            </div>

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

        <div className="mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(data.jsonData, null, 2));
              toast({
                title: "Copied",
                description: "JSON data copied to clipboard",
              });
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          {/* Removed download and share buttons as they are now less relevant */}
          {/* Removed generate schema section as it's less relevant to the new enhancement feature */}

        </div>
      </motion.div>
    </div>
  );
}
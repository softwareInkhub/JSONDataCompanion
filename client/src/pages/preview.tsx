import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Copy, Code2, Wand2 } from "lucide-react";
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

  if (!data) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
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
        <SheetContent className="w-[400px] sm:w-[540px] bg-black border-gray-800">
          <SheetHeader>
            <SheetTitle className="text-white">Request Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Request</h3>
              <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-white">
                {`curl --request GET \\
  --url '${window.location.origin}${data.apiUrl}'`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-gray-800"
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
              <h3 className="text-sm font-medium text-gray-400">Response</h3>
              <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-white">
                {JSON.stringify(data.jsonData, null, 2)}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-gray-800"
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
          <Button variant="outline" onClick={() => window.history.back()} className="border-gray-800">
            Back to Home
          </Button>
        </div>

        <Card className="p-6 bg-black border-gray-800">
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-4 max-h-[400px] overflow-auto">
              <pre className="text-sm whitespace-pre text-white">
                {JSON.stringify(data.jsonData, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Make desired changes (e.g., 'add ratings to movies', 'sort by year')"
                value={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.value)}
                className="flex-1 bg-gray-900 border-gray-800"
              />
              <Button
                variant="outline"
                onClick={handleEnhance}
                disabled={!enhancePrompt}
                className="border-gray-800"
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
              navigator.clipboard.writeText(JSON.stringify(data.jsonData, null, 2));
              toast({
                title: "Copied",
                description: "JSON data copied to clipboard",
              });
            }}
            className="border-gray-800"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
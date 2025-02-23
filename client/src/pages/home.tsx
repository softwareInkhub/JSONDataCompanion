import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateFromPrompt, generateFromFile } from "@/lib/openai";
import { Loader2, Wand2, Upload, Globe } from "lucide-react";

const examplePrompts = [
  "rick and morty characters",
  "10 to-do list items",
  "most listened hard rock musics",
  "top western movies with name, director, release_date"
];

const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export default function Home() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiHeaders, setApiHeaders] = useState("");
  const [apiBody, setApiBody] = useState("");
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'text/html': ['.html'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        await fileMutation.mutateAsync(files[0]);
      }
    }
  });

  const promptMutation = useMutation({
    mutationFn: generateFromPrompt,
    onSuccess: (data) => {
      setLocation(`/preview/${data.id}`);
      toast({
        title: "Success",
        description: "JSON data generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fileMutation = useMutation({
    mutationFn: generateFromFile,
    onSuccess: (data) => {
      setLocation(`/preview/${data.id}`);
      toast({
        title: "Success",
        description: "File processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const apiMutation = useMutation({
    mutationFn: async () => {
      try {
        const headers = apiHeaders ? JSON.parse(apiHeaders) : {};
        const body = apiBody ? JSON.parse(apiBody) : undefined;

        const response = await fetch('/api/test-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: apiUrl,
            method: apiMethod,
            headers,
            body,
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch API data');
      }
    },
    onSuccess: (data) => {
      setLocation(`/preview/${data.id}`);
      setShowApiDialog(false);
      toast({
        title: "Success",
        description: "API data fetched successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = promptMutation.isPending || fileMutation.isPending || apiMutation.isPending;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto py-16 px-4">
        <div className="space-y-8 text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-6xl font-bold tracking-tight">
            JSON Data AI
          </h1>
          <p className="text-xl text-gray-400">
            Transform your ideas into structured data with AI
          </p>
        </div>

        <Card className="max-w-2xl mx-auto border-gray-800 bg-black">
          <CardContent className="pt-6 space-y-6">
            <div className="relative">
              <Textarea
                placeholder="Enter your prompt (e.g., 'top western movies with name, director, release_date')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] bg-gray-900 border-gray-800 text-white"
              />
              <Button
                className="absolute right-2 top-2"
                onClick={() => promptMutation.mutate(prompt)}
                disabled={!prompt || isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span className="ml-2">Generate</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {examplePrompts.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(example)}
                  className="text-sm border-gray-800 hover:bg-gray-900"
                >
                  {example}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <div {...getRootProps()} className="flex-1">
                <Input {...getInputProps()} />
                <Button
                  variant="outline"
                  className="w-full border-gray-800 hover:bg-gray-900"
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isDragActive ? "Drop file here" : "Upload CSV/Excel/JSON/XML/HTML/TXT"}
                </Button>
              </div>

              <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1 border-gray-800 hover:bg-gray-900">
                    <Globe className="h-4 w-4 mr-2" />
                    Test REST API
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-gray-800">
                  <DialogHeader>
                    <DialogTitle>Test REST API</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Enter the API details to fetch and transform the data.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="url" className="text-gray-400">API URL</label>
                      <Input
                        id="url"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com/data"
                        className="bg-gray-900 border-gray-800"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="method" className="text-gray-400">Method</label>
                      <Select value={apiMethod} onValueChange={setApiMethod}>
                        <SelectTrigger className="bg-gray-900 border-gray-800">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-gray-800">
                          {httpMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="headers" className="text-gray-400">Headers (JSON)</label>
                      <Textarea
                        id="headers"
                        value={apiHeaders}
                        onChange={(e) => setApiHeaders(e.target.value)}
                        placeholder='{"Authorization": "Bearer token"}'
                        className="bg-gray-900 border-gray-800"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="body" className="text-gray-400">Body (JSON)</label>
                      <Textarea
                        id="body"
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        className="bg-gray-900 border-gray-800"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => apiMutation.mutate()} disabled={!apiUrl || isLoading} variant="outline" className="border-gray-800">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Globe className="h-4 w-4 mr-2" />
                      )}
                      Test API
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
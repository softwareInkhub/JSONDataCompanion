import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ApiTester = () => {
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState("");
  const [result, setResult] = useState<any>(null);

  const testApi = async () => {
    try {
      const response = await fetch("/api/test-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: apiUrl }),
      });

      const data = await response.json();
      setResult(data);

      toast({
        title: "API Test Successful",
        description: "The API endpoint was tested successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test API endpoint",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>API Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <Button onClick={testApi}>Test API</Button>
          </div>
          {result && (
            <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateFromPrompt, generateFromFile } from "@/lib/openai";
import { Loader2, Copy, Wand2, Upload, RefreshCw, Globe } from "lucide-react";
import type { FilterOption, SortOption } from "@shared/schema";

const examplePrompts = [
  "rick and morty characters",
  "10 to-do list items",
  "most listened hard rock musics",
  "top western movies with name, director, release_date"
];

const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
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
    mutationFn: async (input: { prompt: string; context?: string }) => {
      const options: { prompt: string; filterOptions?: FilterOption; sortOptions?: SortOption } = {
        prompt: input.context ?
          `Context: ${input.context}\nNew request: ${input.prompt}` :
          input.prompt
      };
      return generateFromPrompt(options.prompt);
    },
    onSuccess: (data) => {
      setResult(data);
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
      setResult(data);
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

        const data = await response.json();
        return data;
      } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch API data');
      }
    },
    onSuccess: (data) => {
      setResult(data);
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  const handleEnhanceSubmit = async () => {
    try {
      // Pass both the current data and enhancement prompt
      const enhanced = await promptMutation.mutateAsync({
        prompt: enhancePrompt,
        context: JSON.stringify(result.jsonData) // Pass current JSON data as context
      });
      setResult(enhanced);
      setShowEnhanceDialog(false);
      setEnhancePrompt("");
      toast({
        title: "Success",
        description: "Data enhanced with AI",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isLoading = promptMutation.isPending || fileMutation.isPending || apiMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            JSON Data AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Get JSON data about anything with a prompt. Turn it into an API endpoint. Start fetching.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 space-y-6">
            <div className="relative">
              <Textarea
                placeholder="Enter your prompt (e.g., 'top western movies with name, director, release_date')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] pr-24"
              />
              <Button
                className="absolute right-2 top-2"
                onClick={() => promptMutation.mutate({ prompt })}
                disabled={!prompt || isLoading}
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
                  className="text-sm"
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
                  className="w-full"
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isDragActive ? "Drop file here" : "Upload CSV/Excel/JSON/XML/HTML/TXT"}
                </Button>
              </div>

              <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Globe className="h-4 w-4 mr-2" />
                    Test REST API
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Test REST API</DialogTitle>
                    <DialogDescription>
                      Enter the API details to fetch and transform the data.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="url">API URL</label>
                      <Input
                        id="url"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com/data"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="method">Method</label>
                      <Select value={apiMethod} onValueChange={setApiMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {httpMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="headers">Headers (JSON)</label>
                      <Textarea
                        id="headers"
                        value={apiHeaders}
                        onChange={(e) => setApiHeaders(e.target.value)}
                        placeholder='{"Authorization": "Bearer token"}'
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="body">Body (JSON)</label>
                      <Textarea
                        id="body"
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => apiMutation.mutate()} disabled={!apiUrl || isLoading}>
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

        {result && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Generated API Endpoint</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}${result.apiUrl}`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>

                <code className="block bg-muted p-4 rounded-lg text-sm break-all">
                  {window.location.origin}{result.apiUrl}
                </code>

                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                    <pre className="text-sm whitespace-pre">
                      {JSON.stringify(result.jsonData, null, 2)}
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
                      onClick={handleEnhanceSubmit}
                      disabled={!enhancePrompt || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Enhance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ApiTester />
          </div>
        )}
      </div>
    </div>
  );
}
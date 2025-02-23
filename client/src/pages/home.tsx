import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateFromPrompt, generateFromFile } from "@/lib/openai";
import { Loader2, Copy, Edit, Wand2, Upload, RefreshCw } from "lucide-react";
import type { FilterOption, SortOption } from "@shared/schema";
import { ApiTester } from "@/components/ApiTester";

const examplePrompts = [
  "rick and morty characters",
  "10 to-do list items",
  "most listened hard rock musics",
  "top western movies with name, director, release_date"
];

const operators = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" }
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState("");
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [filterField, setFilterField] = useState("");
  const [filterOperator, setFilterOperator] = useState<FilterOption["operator"]>("equals");
  const [filterValue, setFilterValue] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<SortOption["direction"]>("asc");
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

      if (filterField && filterValue) {
        options.filterOptions = {
          field: filterField,
          operator: filterOperator,
          value: filterValue
        };
      }

      if (sortField) {
        options.sortOptions = {
          field: sortField,
          direction: sortDirection
        };
      }

      return generateFromPrompt(options.prompt);
    },
    onSuccess: (data) => {
      setResult(data);
      setEditedData(JSON.stringify(data.jsonData, null, 2));
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
      setEditedData(JSON.stringify(data.jsonData, null, 2));
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  const handleAIEdit = async () => {
    setShowEnhanceDialog(true);
  };

  const handleEnhanceSubmit = async () => {
    try {
      const enhanced = await promptMutation.mutateAsync({
        prompt: enhancePrompt,
        context: prompt
      });
      setEditedData(JSON.stringify(enhanced.jsonData, null, 2));
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

  const saveEdits = () => {
    try {
      const parsed = JSON.parse(editedData);
      setResult({
        ...result,
        jsonData: parsed
      });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  const isLoading = promptMutation.isPending || fileMutation.isPending;

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
                onClick={() => promptMutation.mutate(prompt)}
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

            <div {...getRootProps()} className="cursor-pointer">
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
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Generated API Endpoint</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}${result.apiUrl}`)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                  </div>
                </div>

                <code className="block bg-muted p-4 rounded-lg text-sm break-all">
                  {window.location.origin}{result.apiUrl}
                </code>

                <Tabs defaultValue="preview">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="space-y-4">
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
                  </TabsContent>

                  <TabsContent value="edit" className="space-y-4">
                    <div className="flex gap-2 justify-end">
                      <Dialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAIEdit}
                            disabled={isLoading}
                          >
                            <Wand2 className="h-4 w-4 mr-2" />
                            Advanced Enhance
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Advanced AI Enhancement</DialogTitle>
                            <DialogDescription>
                              Describe complex changes or transformations you want to apply to the data.
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            value={enhancePrompt}
                            onChange={(e) => setEnhancePrompt(e.target.value)}
                            placeholder="E.g., 'Add detailed plot summaries for each movie', 'Include box office earnings and awards'"
                            className="min-h-[100px]"
                          />
                          <DialogFooter>
                            <Button
                              onClick={handleEnhanceSubmit}
                              disabled={!enhancePrompt || isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Wand2 className="h-4 w-4 mr-2" />
                              )}
                              Apply Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveEdits}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                    <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                      <Textarea
                        value={editedData}
                        onChange={(e) => setEditedData(e.target.value)}
                        className="font-mono text-sm min-h-[300px] resize-none bg-transparent border-none focus-visible:ring-0"
                      />
                    </div>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            <ApiTester apiUrl={result.apiUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
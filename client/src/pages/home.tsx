import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateFromPrompt, generateFromFile } from "@/lib/openai";
import { Loader2, Copy, CheckCircle, Filter, SortAsc } from "lucide-react";
import type { FilterOption, SortOption } from "@shared/schema";

const examplePrompts = [
  "top western movies with name, director, release_date",
  "list of fruits with name, color, nutrition_facts",
  "popular programming languages with name, creator, release_year"
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
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        await fileMutation.mutateAsync(files[0]);
      }
    }
  });

  const promptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const options: { prompt: string; filterOptions?: FilterOption; sortOptions?: SortOption } = {
        prompt
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

      return generateFromPrompt(prompt);
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API URL copied to clipboard",
    });
  };

  const isLoading = promptMutation.isPending || fileMutation.isPending;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">JSON Data AI</h1>
          <p className="text-muted-foreground">
            Generate JSON data and API endpoints from text or files
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              placeholder="Enter your prompt (e.g., 'top western movies with name, director, release_date')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Filter Options</h3>
                <div className="space-y-2">
                  <Input
                    placeholder="Field name"
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                  />
                  <Select value={filterOperator} onValueChange={(value: any) => setFilterOperator(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Filter value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sort Options</h3>
                <div className="space-y-2">
                  <Input
                    placeholder="Sort field"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                  />
                  <Select value={sortDirection} onValueChange={(value: any) => setSortDirection(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                className="flex-1"
                onClick={() => promptMutation.mutate(prompt)}
                disabled={!prompt || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate JSON
              </Button>

              <div
                {...getRootProps()}
                className="flex-1"
              >
                <Input {...getInputProps()} />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isDragActive ? "Drop file here" : "Upload CSV/Excel"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example) => (
                <Button
                  key={example}
                  variant="secondary"
                  size="sm"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated API Endpoint</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${window.location.origin}${result.apiUrl}`)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </div>

              <code className="block bg-muted p-4 rounded-lg overflow-x-auto">
                {window.location.origin}{result.apiUrl}
              </code>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">JSON Preview</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(result.jsonData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { FilterOption, SortOption } from "@shared/schema";

interface ApiTesterProps {
  apiUrl: string;
}

export function ApiTester({ apiUrl }: ApiTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [filterField, setFilterField] = useState("");
  const [filterOperator, setFilterOperator] = useState<FilterOption["operator"]>("equals");
  const [filterValue, setFilterValue] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<SortOption["direction"]>("asc");

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "greaterThan", label: "Greater Than" },
    { value: "lessThan", label: "Less Than" }
  ];

  const buildUrl = () => {
    const baseUrl = `${window.location.origin}${apiUrl}`;
    const params = new URLSearchParams();

    if (filterField && filterValue) {
      const filterOptions = {
        field: filterField,
        operator: filterOperator,
        value: filterValue
      };
      params.append("filter", JSON.stringify(filterOptions));
    }

    if (sortField) {
      const sortOptions = {
        field: sortField,
        direction: sortDirection
      };
      params.append("sort", JSON.stringify(sortOptions));
    }

    return `${baseUrl}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const testEndpoint = async () => {
    setIsLoading(true);
    try {
      const url = buildUrl();
      const response = await fetch(url);
      const data = await response.json();
      setResponse({
        status: response.status,
        data,
        url
      });
    } catch (error) {
      setResponse({
        error: error.message,
        url: buildUrl()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardContent className="pt-6 space-y-4">
        <h3 className="text-lg font-semibold">Test API Endpoint</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Filter Options</h4>
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
            <h4 className="text-sm font-medium">Sort Options</h4>
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

        <Button 
          onClick={testEndpoint}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Endpoint
        </Button>

        {response && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Request URL</h4>
              <code className="block bg-muted p-2 rounded text-sm break-all">
                {response.url}
              </code>
            </div>

            {response.error ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">Error</h4>
                <p className="text-destructive">{response.error}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status</h4>
                  <p className={response.status === 200 ? "text-green-600" : "text-destructive"}>
                    {response.status}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Response</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

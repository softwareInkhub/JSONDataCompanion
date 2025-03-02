import { useState } from 'react';
import { Card } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import MonacoEditor from '@monaco-editor/react';
import { Database, Table2, Play, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableInfo {
  tableName: string;
  columnCount: number;
  rowCount: number;
}

export function DatabaseView() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState<string>("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executeQuery = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryInput })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute query');
      }

      const result = await response.json();
      setQueryResult(result);
      toast({
        title: "Success",
        description: "Query executed successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/table-data/${tableName}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load table data');
      }

      const data = await response.json();

      // Transform data for display
      const rows = data.map((row: any) => ({
        ...row,
        schema: typeof row.schema === 'object' ? JSON.stringify(row.schema, null, 2) : row.schema,
        created_at: new Date(row.created_at).toLocaleString()
      }));

      setTableData(rows);
      setSelectedTable(tableName);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTableCell = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Query
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Database Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-4">
                <h4 className="font-medium">schemas</h4>
                <p className="text-sm text-muted-foreground mt-1">Stores schema definitions</p>
                <div className="mt-2 text-sm">
                  <p>Columns: id, name, version, schema, created_at</p>
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium">endpoints</h4>
                <p className="text-sm text-muted-foreground mt-1">Stores API endpoint data</p>
                <div className="mt-2 text-sm">
                  <p>Columns: id, name, json_data, schema_id, filter_options, sort_options, created_at</p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="query">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>SQL Query</Label>
              <div className="h-[200px] border rounded-md overflow-hidden">
                <MonacoEditor
                  height="200px"
                  language="sql"
                  theme="vs-light"
                  value={queryInput}
                  onChange={(value) => setQueryInput(value || "")}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>
            <Button 
              onClick={executeQuery} 
              disabled={!queryInput.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Query
                </>
              )}
            </Button>
            {queryResult && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Result:</h4>
                <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[300px] text-sm">
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tables">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => loadTableData('schemas')}
              >
                <h4 className="font-medium">schemas</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage schema definitions
                </p>
              </Card>
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => loadTableData('endpoints')}
              >
                <h4 className="font-medium">endpoints</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage API endpoints
                </p>
              </Card>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {!isLoading && selectedTable && tableData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-4">Table: {selectedTable}</h4>
                <div className="border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(tableData[0]).map((key) => (
                          <TableHead key={key} className="min-w-[150px]">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell 
                              key={cellIndex}
                              className="font-mono text-sm whitespace-pre-wrap"
                            >
                              {renderTableCell(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!isLoading && selectedTable && tableData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No data available in this table
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
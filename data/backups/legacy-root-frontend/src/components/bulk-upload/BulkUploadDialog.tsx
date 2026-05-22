import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { parseExcelFile, createExcelTemplate } from '@/lib/excelUtils';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'products' | 'farmers' | 'machinery' | 'sales';
  onUpload: (data: any[]) => Promise<void>;
}

interface ColumnConfig {
  required: string[];
  optional: string[];
}

const columnConfigs: Record<string, ColumnConfig> = {
  products: {
    required: ['name', 'category', 'unit_price'],
    optional: ['description', 'commission_per_unit', 'stock_quantity'],
  },
  farmers: {
    required: ['name', 'sub_county'],
    optional: ['phone', 'email', 'ward', 'village', 'farming_type', 'farm_size', 'local_mr'],
  },
  machinery: {
    required: ['name', 'category'],
    optional: ['model', 'hourly_rate', 'daily_rate', 'condition', 'registration_number'],
  },
  sales: {
    required: ['farmer', 'product', 'quantity', 'tot'],
    optional: ['sale_date', 'payment_method', 'notes'],
  },
};

const sampleData: Record<string, any[]> = {
  products: [
    { name: 'Maize Seeds 10kg', category: 'Seeds', unit_price: 2500, commission_per_unit: 100, stock_quantity: 50, description: 'High yield maize seeds' },
    { name: 'DAP Fertilizer 50kg', category: 'Fertilizers', unit_price: 4500, commission_per_unit: 150, stock_quantity: 30, description: 'Diammonium phosphate' },
  ],
  farmers: [
    { name: 'John Kamau', phone: '0712345678', sub_county: 'Olkalou', ward: 'Karau', village: 'Kamuchege', farming_type: 'Potato', farm_size: 2.5, local_mr: 'Mawingu MR' },
    { name: 'Mary Wanjiku', phone: '0723456789', sub_county: 'Kinangop', ward: 'Engineer', village: 'Njabini', farming_type: 'Barley', farm_size: 1.5, local_mr: 'Kanjuiri MR' },
  ],
  machinery: [
    { name: 'John Deere Tractor', category: 'Tractor', model: 'JD-5050', hourly_rate: 1500, daily_rate: 10000, condition: 'good', registration_number: 'KBX 123A' },
    { name: 'Planter Machine', category: 'Planter', model: 'PM-200', hourly_rate: 800, daily_rate: 5000, condition: 'good' },
  ],
  sales: [
    { farmer: 'John Kamau', product: 'Maize Seeds 10kg', quantity: 5, tot: 'Jane Wanjiru', sale_date: '2026-02-09', payment_method: 'cash', notes: 'Bulk purchase' },
    { farmer: 'Mary Wanjiku', product: 'DAP Fertilizer 50kg', quantity: 2, tot: 'Jane Wanjiru', payment_method: 'mpesa' },
  ],
};

export function BulkUploadDialog({ open, onOpenChange, entityType, onUpload }: BulkUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const config = columnConfigs[entityType];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please select an Excel or CSV file');
      return;
    }

    setFile(selectedFile);
    parseFileData(selectedFile);
  };

  const parseFileData = async (file: File) => {
    try {
      const jsonData = await parseExcelFile(file);

      if (jsonData.length === 0) {
        setErrors(['File is empty or has no valid data rows']);
        setParsedData([]);
        return;
      }

      // Validate columns
      const firstRow = jsonData[0] as Record<string, any>;
      const columns = Object.keys(firstRow).map(c => c.toLowerCase().trim());
      const missingRequired = config.required.filter(
        req => !columns.some(c => c === req || c.replace(/\s+/g, '_') === req)
      );

      if (missingRequired.length > 0) {
        setErrors([
          `Missing required columns: ${missingRequired.join(', ')}`,
          `Required columns are: ${config.required.join(', ')}`,
        ]);
        setParsedData([]);
        return;
      }

      // Normalize column names
      const normalizedData = jsonData.map((row: any) => {
        const normalized: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
          normalized[normalizedKey] = value;
        });
        return normalized;
      });

      // Validate each row
      const rowErrors: string[] = [];
      normalizedData.forEach((row, idx) => {
        config.required.forEach(field => {
          if (!row[field] || String(row[field]).trim() === '') {
            rowErrors.push(`Row ${idx + 2}: Missing required field "${field}"`);
          }
        });
      });

      if (rowErrors.length > 0) {
        setErrors(rowErrors.slice(0, 10)); // Show first 10 errors
        if (rowErrors.length > 10) {
          setErrors(prev => [...prev, `...and ${rowErrors.length - 10} more errors`]);
        }
        setParsedData([]);
        return;
      }

      setErrors([]);
      setParsedData(normalizedData);
      toast.success(`Parsed ${normalizedData.length} records`);
    } catch (error) {
      setErrors(['Failed to parse file. Please ensure it is a valid Excel/CSV file.']);
      setParsedData([]);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(parsedData);
      toast.success(`Successfully uploaded ${parsedData.length} ${entityType}`);
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    const data = sampleData[entityType];
    await createExcelTemplate(data, `${entityType}_template`, entityType);
    toast.success('Template downloaded');
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); onOpenChange(isOpen); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to add multiple {entityType} at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Column Requirements */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Required Columns:</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {config.required.map(col => (
                <Badge key={col} variant="destructive" className="text-xs">{col}</Badge>
              ))}
            </div>
            <p className="text-sm font-medium mb-2">Optional Columns:</p>
            <div className="flex flex-wrap gap-1">
              {config.optional.map(col => (
                <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select File</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" />
                Template
              </Button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">
                  {parsedData.length} records ready to upload
                </span>
              </div>
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">#</th>
                        {Object.keys(parsedData[0]).slice(0, 4).map(col => (
                          <th key={col} className="text-left p-2">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{idx + 1}</td>
                          {Object.values(row).slice(0, 4).map((val: any, i) => (
                            <td key={i} className="p-2 truncate max-w-[150px]">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-center text-muted-foreground text-xs py-2">
                      ...and {parsedData.length - 5} more rows
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="forest" 
            onClick={handleUpload}
            disabled={parsedData.length === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${parsedData.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
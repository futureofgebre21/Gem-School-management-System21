import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Printer, FileSpreadsheet } from "lucide-react";
import { exportCSV, exportPDF, printTable } from "@/lib/exportUtils";

interface ExportMenuProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
}

export default function ExportMenu({ title, headers, rows, filename = "export" }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => exportCSV(headers, rows, filename)}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(title, headers, rows)}>
          <FileText className="w-4 h-4 mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printTable(title, headers, rows)}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

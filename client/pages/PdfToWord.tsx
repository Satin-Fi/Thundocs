import React from "react";
import ToolPlaceholder from "./ToolPlaceholder";
import { FileText } from "lucide-react";

export default function PdfToWordPage() {
  return (
    <ToolPlaceholder
      toolName="PDF to Word"
      description="Convert PDF documents to editable Word files with formatting preserved"
      icon={FileText}
    />
  );
}

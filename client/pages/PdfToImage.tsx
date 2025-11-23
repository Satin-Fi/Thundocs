import React from "react";
import ToolPlaceholder from "./ToolPlaceholder";
import { Image } from "lucide-react";

export default function PdfToImagePage() {
  return (
    <ToolPlaceholder
      toolName="PDF to Image"
      description="Convert PDF pages to high-quality JPG or PNG images"
      icon={Image}
    />
  );
}

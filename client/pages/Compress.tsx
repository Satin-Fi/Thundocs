import React from "react";
import ToolPlaceholder from "./ToolPlaceholder";
import { Minimize2 } from "lucide-react";

export default function CompressPage() {
  return (
    <ToolPlaceholder
      toolName="Compress PDF"
      description="Reduce PDF file size while maintaining quality and readability"
      icon={Minimize2}
    />
  );
}

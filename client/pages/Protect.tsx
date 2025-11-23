import React from "react";
import ToolPlaceholder from "./ToolPlaceholder";
import { Shield } from "lucide-react";

export default function ProtectPage() {
  return (
    <ToolPlaceholder
      toolName="Protect PDF"
      description="Add password protection and security to your PDF documents"
      icon={Shield}
    />
  );
}

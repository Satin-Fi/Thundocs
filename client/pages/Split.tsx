import React from "react";
import ToolPlaceholder from "./ToolPlaceholder";
import { Scissors } from "lucide-react";

export default function SplitPage() {
  return (
    <ToolPlaceholder
      toolName="Split PDF"
      description="Split a PDF into separate pages or sections quickly and easily"
      icon={Scissors}
    />
  );
}

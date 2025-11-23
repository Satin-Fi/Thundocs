import React, { useState } from "react";

export default function MergePage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMerge = async () => {
    if (!files || files.length < 2) {
      alert("Please select at least 2 PDF files.");
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append("files", file);
    });

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/merge-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Merge failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to merge PDFs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl mb-4">Merge PDF Files</h2>
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={(e) => setFiles(e.target.files)}
        className="mb-4"
      />
      <br />
      <button
        onClick={handleMerge}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
      >
        {loading ? "Merging..." : "Merge Now"}
      </button>
    </div>
  );
}

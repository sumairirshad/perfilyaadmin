"use client";

import React, { useState } from "react";

export default function ExtractMetadataPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

 async function handleExtract() {
  setLoading(true);
  setError(null);
  setResult(null);

  try {
    if (!url.trim()) {
      throw new Error('Please enter a URL');
    }

    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const text = await res.text();
console.log("Raw response from Deepseek API:", text);

    try {
      const data = JSON.parse(text);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract content');
      }
      setResult(data);
    } catch (parseError) {
      console.error('Response is not JSON:', text);
      setError('Unexpected response format from server.');
    }
  } catch (err) {
    let errorMessage = 'Unknown error occurred';
    if (err instanceof Error) errorMessage = err.message;
    setError(errorMessage);
    console.error('Extraction failed:', err);
  } finally {
    setLoading(false);
  }
}


  return (
    <div  style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1>Extract Metadata (Client Side)</h1>

      <input className="border-black text-black"
        type="text"
        placeholder="Enter URL here"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <button className="bg-black"
        onClick={handleExtract}
        disabled={loading || !url.trim()}
        style={{ padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Extracting..." : "Extract Metadata"}
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>Error: {error}</p>}

      {result && (
        <div style={{ marginTop: 20, background: "#f0f0f0", padding: 12, borderRadius: 6 }}>
          <h2>Extracted Data:</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

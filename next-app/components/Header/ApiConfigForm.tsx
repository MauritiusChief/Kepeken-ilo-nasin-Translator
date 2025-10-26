"use client";

import { useState } from "react";

export function ApiConfigForm() {
  const [apiUrl, setApiUrl] = useState("https://api.example.com/parse");
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="api-config-form">
      <div className="col-span-1 sm:col-span-2">
        <label className="mb-1 block text-xs text-gray-500" htmlFor="api-endpoint">
          API Endpoint
        </label>
        <input
          id="api-endpoint"
          value={apiUrl}
          onChange={(event) => setApiUrl(event.target.value)}
          type="text"
          placeholder="https://api.example.com/parse"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="col-span-1">
        <label className="mb-1 block text-xs text-gray-500" htmlFor="api-key">
          API Key
        </label>
        <input
          id="api-key"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          type="password"
          placeholder="••••••••"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

export default ApiConfigForm;

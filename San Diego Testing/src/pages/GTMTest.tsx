import { useEffect, useState } from 'react';

export const GTMTest = () => {
  const [dataLayerExists, setDataLayerExists] = useState(false);
  const [dataLayerContent, setDataLayerContent] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      setDataLayerExists(true);
      setDataLayerContent([...(window as any).dataLayer]);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-8">GTM Verification Test</h1>

      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold mb-4">Status:</h2>
        {dataLayerExists ? (
          <div className="text-green-600 text-xl font-bold">✅ GTM is loaded successfully!</div>
        ) : (
          <div className="text-red-600 text-xl font-bold">❌ GTM not detected</div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">dataLayer Content:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(dataLayerContent, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
        <h2 className="text-2xl font-bold mb-4">Console Instructions:</h2>
        <ol className="list-decimal ml-6 space-y-2">
          <li>Open browser DevTools (F12)</li>
          <li>Go to Console tab</li>
          <li>Type: <code className="bg-gray-100 px-2 py-1 rounded">dataLayer</code></li>
          <li>Press Enter</li>
          <li>You should see an array with GTM data</li>
        </ol>
      </div>
    </div>
  );
};

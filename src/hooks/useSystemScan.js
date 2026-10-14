import { useState } from "react";

import { runSystemScan as requestSystemScan } from "../services/systemScan";

export function useSystemScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const runSystemScan = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const result = await requestSystemScan();
      setScanResult(result);
      return result;
    } catch (error) {
      setScanError(error);
      setScanResult(null);
      throw error;
    } finally {
      setIsScanning(false);
    }
  };

  const dismissScan = () => {
    setScanResult(null);
    setScanError(null);
  };

  return {
    isScanning,
    scanResult,
    scanError,
    runSystemScan,
    dismissScan,
  };
}
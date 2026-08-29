export interface DetectedSecret {
    type: string;
    matchedString: string;
    entropy: number;
    line?: number;
    startIndex: number;
    endIndex: number;
    redactedPreview: string;
}
export interface SecretScanResult {
    hasSecrets: boolean;
    secretsCount: number;
    detectedSecrets: DetectedSecret[];
    highestEntropy: number;
}
export declare class SecretDetector {
    /**
     * Computes the Shannon entropy (bits per character) of a string.
     * High entropy (> 4.2) strongly correlates with cryptographically random tokens and keys.
     */
    static calculateShannonEntropy(str: string): number;
    /**
     * Scans a text string for known credentials, private keys, and high-entropy secrets.
     */
    static scanText(text: string, entropyThreshold?: number): SecretScanResult;
    /**
     * Recursively scans an object for secrets.
     */
    static scanObject(obj: unknown, entropyThreshold?: number): SecretScanResult;
    private static redactPreview;
}
//# sourceMappingURL=SecretDetector.d.ts.map
import { createHmac, timingSafeEqual } from 'node:crypto';

export class ConnectorAuth {
  /**
   * Constant-time string equality comparison to prevent timing attacks.
   */
  public static safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Verifies Slack request signature:
   * v0=HMAC-SHA256(signingSecret, "v0:" + timestamp + ":" + rawBody)
   */
  public static verifySlackSignature(
    signingSecret: string,
    signatureHeader: string,
    timestampHeader: string,
    rawBody: string
  ): boolean {
    const ts = parseInt(timestampHeader, 10);
    const now = Math.floor(Date.now() / 1000);
    // Reject replays older than 5 minutes
    if (Math.abs(now - ts) > 300) return false;

    const sigBasestring = `v0:${timestampHeader}:${rawBody}`;
    const expectedSig = 'v0=' + createHmac('sha256', signingSecret).update(sigBasestring, 'utf8').digest('hex');

    return this.safeCompare(expectedSig, signatureHeader);
  }

  /**
   * Verifies GitHub webhook signature:
   * sha256=HMAC-SHA256(secret, rawBody)
   */
  public static verifyGitHubSignature(
    secret: string,
    signatureHeader: string,
    rawBody: string
  ): boolean {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    const expectedSig = 'sha256=' + createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return this.safeCompare(expectedSig, signatureHeader);
  }

  /**
   * Verifies Linear webhook signature:
   * HMAC-SHA256(secret, rawBody)
   */
  public static verifyLinearSignature(
    secret: string,
    signatureHeader: string,
    rawBody: string
  ): boolean {
    const expectedSig = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return this.safeCompare(expectedSig, signatureHeader);
  }

  /**
   * Verifies Telegram secret token in header:
   * X-Telegram-Bot-Api-Secret-Token
   */
  public static verifyTelegramSecret(
    expectedSecret: string,
    secretHeader: string
  ): boolean {
    return this.safeCompare(expectedSecret, secretHeader);
  }

  /**
   * Verifies generic HMAC-SHA256 signature for webhooks.
   */
  public static verifyGenericHmac(
    secret: string,
    signature: string,
    rawBody: string
  ): boolean {
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return this.safeCompare(expected, signature);
  }
}

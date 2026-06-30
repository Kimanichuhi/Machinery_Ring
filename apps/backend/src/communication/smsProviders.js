class MockProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = "mock";
  }

  async send({ message, recipients }) {
    return {
      provider: this.name,
      status: "queued",
      message,
      recipients: recipients.map((recipient, index) => ({
        phone: recipient.phone,
        providerId: `mock-${Date.now()}-${index}`,
        status: "queued",
      })),
    };
  }

  async getBalance() {
    return { provider: this.name, balance: null, configured: true };
  }
}

class NotConfiguredProvider extends MockProvider {
  constructor(name) {
    super();
    this.name = name;
  }

  async send() {
    throw new Error(`${this.name} SMS provider is not configured.`);
  }
}

class TextSmsProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = "textsms";
  }

  isSuccessResponse(responseBody) {
    if (!responseBody) return true;

    if (typeof responseBody === "string") {
      const normalized = responseBody.toLowerCase();
      return !["error", "failed", "invalid", "insufficient"].some((word) => normalized.includes(word));
    }

    const responseItem = Array.isArray(responseBody.responses) ? responseBody.responses[0] : null;
    const responseCode = String(responseItem?.["response-code"] || responseItem?.response_code || responseItem?.code || "");
    const status = String(responseBody.status || responseBody.response_code || responseBody.code || "").toLowerCase();
    const detail = String(responseBody.message || responseBody.description || "").toLowerCase();

    if (["0", "200", "1000"].includes(responseCode)) return true;
    if (["success", "ok", "queued", "sent", "0", "200", "1000"].includes(status)) return true;
    if (["error", "failed", "invalid", "insufficient"].some((word) => status.includes(word) || detail.includes(word))) {
      return false;
    }

    return true;
  }

  getProviderId(responseBody, fallback) {
    if (!responseBody || typeof responseBody === "string") return fallback;

    const responseItem = Array.isArray(responseBody.responses) ? responseBody.responses[0] : null;

    return (
      responseBody.message_id ||
      responseBody.messageId ||
      responseBody.sms_id ||
      responseBody.smsId ||
      responseBody["message-id"] ||
      responseItem?.messageid ||
      responseItem?.message_id ||
      responseItem?.["message-id"] ||
      fallback
    );
  }

  async parseResponse(response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async sendOne({ message, recipient, index }) {
    const mobile = String(recipient.phone || "").replace(/[^\d]/g, "");
    const payload = {
      apikey: this.config.apiKey,
      partnerID: this.config.partnerId,
      message,
      shortcode: this.config.shortcode,
      mobile,
    };

    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await this.parseResponse(response);
    if (!response.ok || !this.isSuccessResponse(responseBody)) {
      const detail = typeof responseBody === "string" ? responseBody : responseBody?.message || responseBody?.description;
      throw new Error(`TextSMS rejected ${recipient.phone}${detail ? `: ${detail}` : ""}`);
    }

    return {
      phone: recipient.phone,
      providerId: this.getProviderId(responseBody, `textsms-${Date.now()}-${index}`),
      status: "queued",
    };
  }

  async send({ message, recipients }) {
    const results = [];

    for (const [index, recipient] of recipients.entries()) {
      results.push(await this.sendOne({ message, recipient, index }));
    }

    return {
      provider: this.name,
      status: "queued",
      message,
      recipients: results,
    };
  }

  async getBalance() {
    return { provider: this.name, balance: null, configured: true };
  }
}

export function createSmsProvider(env = process.env) {
  const provider = (env.SMS_PROVIDER || "mock").toLowerCase();

  if (provider === "mock") {
    return new MockProvider({ senderId: env.SMS_SENDER_ID });
  }

  if (provider === "textsms") {
    const config = {
      endpoint: env.TEXTSMS_ENDPOINT || env.SMS_API_URL,
      apiKey: env.TEXTSMS_API_KEY || env.SMS_API_KEY,
      shortcode: env.TEXTSMS_SHORTCODE || env.SMS_SENDER_ID,
      partnerId: env.TEXTSMS_PARTNER_ID || env.SMS_USERNAME,
    };
    const hasTextSmsCredentials = Boolean(config.endpoint && config.apiKey && config.shortcode && config.partnerId);

    if (!hasTextSmsCredentials) {
      return new NotConfiguredProvider(provider);
    }

    return new TextSmsProvider(config);
  }

  const hasCredentials = Boolean(env.SMS_API_URL && env.SMS_API_KEY);
  if (!hasCredentials) {
    return new NotConfiguredProvider(provider);
  }

  // Provider-specific HTTP adapters can be filled in without touching API routes.
  return new MockProvider({
    provider,
    apiUrl: env.SMS_API_URL,
    apiKey: env.SMS_API_KEY,
    username: env.SMS_USERNAME,
    senderId: env.SMS_SENDER_ID,
  });
}

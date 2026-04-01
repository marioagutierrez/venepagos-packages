import fetch from "node-fetch";

/**
 * VenePagos API client.
 *
 * Communicates with the VenePagos backend to create payment links
 * and retrieve payment information.
 */
class VenePagosAPI {
  /**
   * @param {Object} opts
   * @param {string} opts.baseUrl  - VenePagos API base URL (e.g. https://api.venepagos.com)
   * @param {string} opts.apiKey   - API key for authentication
   */
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  /**
   * Internal helper to perform requests.
   */
  async _request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    };

    const opts = { method, headers };
    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const json = await res.json();

    if (!res.ok) {
      const err = new Error(json.message || `VenePagos API error ${res.status}`);
      err.status = res.status;
      err.response = json;
      throw err;
    }

    return json;
  }

  /**
   * Create a payment link.
   *
   * @param {Object} params
   * @param {string} params.merchantId  - Merchant identifier
   * @param {number} params.amount      - Payment amount
   * @param {string} [params.currency]  - Currency code (default: VES)
   * @param {string} [params.description] - Payment description
   * @param {string} [params.expiresAt]   - ISO 8601 expiration date
   * @returns {Promise<Object>} The created payment link data
   */
  async createPaymentLink({ merchantId, amount, currency, description, expiresAt }) {
    const payload = { merchantId, amount };
    if (currency) payload.currency = currency;
    if (description) payload.description = description;
    if (expiresAt) payload.expiresAt = expiresAt;

    const result = await this._request("POST", "/api/v1/payment-links", payload);
    return result.data;
  }

  /**
   * Get public payment info by token.
   *
   * @param {string} token - Payment link token
   * @returns {Promise<Object>} Payment information
   */
  async getPaymentInfo(token) {
    const result = await this._request("GET", `/api/v1/pay/${token}`);
    return result.data || result;
  }
}

export default VenePagosAPI;

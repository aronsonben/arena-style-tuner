# Roadmap

## Evolving for Production Deployment

1. Architectural Shift: From Client-to-API to Client-to-Backend
Currently, your app handles API keys and proxying logic in the browser. In production, you should move this to a Cloud Run service (Node.js/Express).
Secret Manager: Store your Google AI and Are.na API keys in Google Cloud Secret Manager. Your Cloud Run service can then access these securely at runtime, ensuring they are never exposed to the client.
Private Proxy: Replace the public corsproxy.io with your own proxy endpoint on Cloud Run. This eliminates rate-limit issues and gives you full control over headers and security.
2. Access Control & Abuse Prevention
To share with friends safely without dissemination:
Firebase Authentication: Implement a simple Auth layer. You can use the Email Whitelist pattern—only allowing specific emails (your friends) to sign in.
Server-Side Rate Limiting: Implement rate limiting in your Cloud Run backend (using a Redis instance like Cloud Memorystore). Track usage per user ID rather than IP address for better accuracy.
Budgets & Alerts: Set up a budget in the Google Cloud Billing console with automated alerts at 50%, 75%, and 90% of your expected monthly spend.
3. Image Processing Optimization
Move the "URL to Base64" conversion to your backend. This reduces client-side bandwidth and allows you to implement server-side image resizing/optimization before sending data to Gemini, which can save tokens and reduce latency.
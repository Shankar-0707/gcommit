// test-run.js
import { generateCommitMessage } from './src/ai.js';

const diff = `diff --git a/src/auth.js b/src/auth.js
--- a/src/auth.js
+++ b/src/auth.js
@@ -10,6 +10,12 @@ export function login(user) {
+export async function refreshToken(userId) {
+  const token = await db.tokens.findOne({ userId });
+  if (!token || token.expired) return null;
+  return generateJWT(userId);
+}`;

const result = await generateCommitMessage(
  diff,
  ['src/auth.js'],
  {
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    language: 'en',
  }
);

console.log('Suggestion:', result);
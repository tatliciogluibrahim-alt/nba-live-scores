#!/usr/bin/env node
// One-off VAPID keypair generator for No Noise Scores.
//
// Run once per environment (local dev, preview, production). Paste the
// output into the corresponding env (.env.local for local dev, Vercel
// project settings for prod). DO NOT commit the private key.
//
// Usage:  node scripts/generate-vapid-keys.mjs
//
// The same keypair must persist for the lifetime of an environment.
// Rotating the private key invalidates every existing push subscription
// on every device — every user has to re-subscribe.

import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("# Paste these into .env.local (dev) or Vercel env (prod):");
console.log("# Public key is also exposed to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
console.log("");
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@nonoisescores.app`);

/**
 * Generates a self-signed TLS certificate for local HTTPS development.
 *
 * Usage:  node scripts/generate-cert.js
 *
 * Output: server/certs/server.key  (private key)
 *         server/certs/server.crt  (certificate)
 *
 * Re-running this script is safe — it skips generation if the files already exist.
 */
import selfsigned from "selfsigned";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir  = join(__dirname, "..", "server", "certs");

mkdirSync(certsDir, { recursive: true });

const keyPath  = join(certsDir, "server.key");
const certPath = join(certsDir, "server.crt");

// Collect all non-loopback IPv4 addresses so LAN devices are covered by the cert SAN.
const lanIPs = Object.values(networkInterfaces())
  .flat()
  .filter(iface => iface && iface.family === "IPv4" && !iface.internal)
  .map(iface => iface.address);

// Always regenerate so that new LAN IPs picked up after network changes are included.
if (existsSync(keyPath)) rmSync(keyPath);
if (existsSync(certPath)) rmSync(certPath);

console.log("Generating self-signed TLS certificate...");
if (lanIPs.length) {
  console.log(`  Including LAN IPs in SAN: ${lanIPs.join(", ")}`);
}

const attrs = [
  { name: "commonName",         value: "localhost" },
  { name: "organizationName",   value: "Financial Consulting (dev)" },
  { name: "countryName",        value: "RO" },
];

const altNames = [
  { type: 2, value: "localhost" },
  { type: 7, ip:   "127.0.0.1" },
  ...lanIPs.map(ip => ({ type: 7, ip })),
];

const pems = await selfsigned.generate(attrs, {
  days:    730,
  keySize: 2048,
  algorithm: "sha256",
  extensions: [
    { name: "subjectAltName", altNames },
  ],
});

writeFileSync(keyPath,  pems.private);
writeFileSync(certPath, pems.cert);

console.log(`✓ Private key  → ${keyPath}`);
console.log(`✓ Certificate  → ${certPath}`);
console.log("");
console.log("NOTE: Your browser will warn about this certificate because it is self-signed.");
console.log("      On each new device, visit https://<this-machine-ip>:3001 and click");
console.log("      Advanced → Proceed to accept the certificate once.");

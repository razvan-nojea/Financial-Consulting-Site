import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, rmdirSync } from "node:fs";
import { NeDbDocumentStore } from "./nedb-document-store.js";

const TEST_FILE = `./data/test-nedb-${Date.now()}.db`;

describe("NeDbDocumentStore (NoSQL document store)", () => {
  let store;

  beforeEach(() => {
    store = new NeDbDocumentStore(TEST_FILE);
  });

  afterEach(async () => {
    // NeDB keeps a compaction timer — let the process clean up
    if (store?.db) {
      store.db.stopAutocompaction?.();
    }
    // Small pause so NeDB releases the file handle before we try to delete it
    await new Promise((r) => setTimeout(r, 50));
    try { if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE); } catch { /* ignore */ }
  });

  // ── Basic state ───────────────────────────────────────────────────────────────

  it("starts empty", async () => {
    expect(await store.count()).toBe(0);
    expect(await store.findRecent()).toHaveLength(0);
  });

  // ── insert ────────────────────────────────────────────────────────────────────

  it("insert persists a document and returns it with _id and _createdAt", async () => {
    const doc = await store.insert({ from: "alice@test.com", text: "Hello" });
    expect(doc._id).toBeTruthy();
    expect(doc._createdAt).toBeTruthy();
    expect(doc.from).toBe("alice@test.com");
    expect(doc.text).toBe("Hello");
  });

  it("count increments after each insert", async () => {
    await store.insert({ text: "msg1" });
    await store.insert({ text: "msg2" });
    expect(await store.count()).toBe(2);
  });

  it("insert generates a unique _id for each document", async () => {
    const d1 = await store.insert({ text: "a" });
    const d2 = await store.insert({ text: "b" });
    expect(d1._id).not.toBe(d2._id);
  });

  // ── find ──────────────────────────────────────────────────────────────────────

  it("find returns documents matching all query fields", async () => {
    await store.insert({ from: "alice", room: "general", text: "hi" });
    await store.insert({ from: "bob",   room: "general", text: "hey" });
    await store.insert({ from: "alice", room: "private", text: "secret" });

    const generalMsgs = await store.find({ room: "general" });
    expect(generalMsgs).toHaveLength(2);

    const aliceGeneral = await store.find({ from: "alice", room: "general" });
    expect(aliceGeneral).toHaveLength(1);
    expect(aliceGeneral[0].text).toBe("hi");
  });

  it("find with empty query returns all documents", async () => {
    await store.insert({ text: "a" });
    await store.insert({ text: "b" });
    expect(await store.find()).toHaveLength(2);
  });

  // ── findRecent ────────────────────────────────────────────────────────────────

  it("findRecent returns the last n documents in insertion order", async () => {
    for (let i = 1; i <= 5; i++) {
      await store.insert({ seq: i });
      // Small delay so _createdAt timestamps are distinct
      await new Promise((r) => setTimeout(r, 5));
    }
    const recent = await store.findRecent(3);
    expect(recent).toHaveLength(3);
    // Should be the 3 most-recently inserted (seq 3, 4, 5)
    const seqs = recent.map((d) => d.seq).sort((a, b) => a - b);
    expect(seqs).toEqual([3, 4, 5]);
  });

  it("findRecent returns all docs when limit exceeds count", async () => {
    await store.insert({ text: "only" });
    expect(await store.findRecent(100)).toHaveLength(1);
  });

  // ── deleteAll ─────────────────────────────────────────────────────────────────

  it("deleteAll removes every document", async () => {
    await store.insert({ text: "x" });
    await store.insert({ text: "y" });
    await store.deleteAll();
    expect(await store.count()).toBe(0);
  });

  // ── Persistence ───────────────────────────────────────────────────────────────

  it("data survives across store instances (file persistence)", async () => {
    await store.insert({ text: "persisted" });

    // Force a compaction so data is flushed before we open a second instance
    await new Promise((resolve) => store.db.compactDatafile(resolve));

    const store2 = new NeDbDocumentStore(TEST_FILE);
    // Give NeDB a moment to load the file
    await new Promise((r) => setTimeout(r, 50));

    expect(await store2.count()).toBe(1);
    const docs = await store2.find();
    expect(docs[0].text).toBe("persisted");

    store2.db.stopAutocompaction?.();
  });

  // ── Directory creation ────────────────────────────────────────────────────────

  it("creates nested directories when they do not exist", async () => {
    const ts = Date.now();
    const nestedDir  = `./data/nested-nedb-${ts}`;
    const nestedPath = `${nestedDir}/msgs.db`;
    const nestedStore = new NeDbDocumentStore(nestedPath);
    await nestedStore.insert({ text: "hi" });
    expect(await nestedStore.count()).toBe(1);
    nestedStore.db.stopAutocompaction?.();
    await new Promise((r) => setTimeout(r, 50));
    try { unlinkSync(nestedPath); } catch { /* ignore */ }
    try { rmdirSync(nestedDir);   } catch { /* ignore */ }
  });
});

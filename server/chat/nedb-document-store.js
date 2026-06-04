/**
 * NeDbDocumentStore — a NoSQL document store backed by NeDB.
 *
 * NeDB is an embedded document-oriented database with a MongoDB-compatible
 * API.  It is schema-free, stores documents as self-contained JSON objects,
 * and requires no external server or connection string — data is persisted
 * in a single local file.
 *
 * NoSQL characteristics demonstrated:
 *   • No fixed schema / no migrations needed
 *   • Document-oriented (each record is a self-contained JSON object)
 *   • No relational joins
 *   • MongoDB-style query language (field equality, $gt, $in, …)
 *
 * Public API (all methods return Promises):
 *   insert(doc)       → persists the doc; NeDB adds _id automatically
 *   find(query)       → returns documents where every key=value pair matches
 *   findRecent(n)     → returns the last n documents in insertion order
 *   count()           → total number of documents in the collection
 *   deleteAll()       → removes all documents (used in tests)
 */
import Datastore from "@seald-io/nedb";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export class NeDbDocumentStore {
  /**
   * @param {string} filePath  path to the NeDB data file
   */
  constructor(filePath) {
    // Ensure the parent directory exists before NeDB tries to open the file.
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Datastore({ filename: filePath, autoload: true });
  }

  /**
   * Inserts a document into the collection.
   * Adds `_createdAt` (ISO timestamp) for ordering; NeDB supplies `_id`.
   * @param {object} doc
   * @returns {Promise<object>} the stored document including generated fields
   */
  async insert(doc) {
    const record = { ...doc, _createdAt: new Date().toISOString() };
    return this.db.insertAsync(record);
  }

  /**
   * Returns all documents matching every key=value pair in query.
   * An empty query returns all documents.
   * @param {object} [query={}]
   * @returns {Promise<object[]>}
   */
  async find(query = {}) {
    return this.db.findAsync(query);
  }

  /**
   * Returns the last `limit` documents in ascending insertion order
   * (oldest first, newest last — natural chat display order).
   *
   * Strategy: sort descending to get the newest N, then reverse so the
   * caller receives them in chronological (ascending) order.
   *
   * @param {number} [limit=50]
   * @returns {Promise<object[]>}
   */
  async findRecent(limit = 50) {
    const docs = await this.db
      .findAsync({})
      .sort({ _createdAt: -1 })
      .limit(limit);
    return docs.reverse();
  }

  /**
   * Returns the total number of documents in the collection.
   * @returns {Promise<number>}
   */
  async count() {
    return this.db.countAsync({});
  }

  /**
   * Removes all documents.  Useful in tests and for dev resets.
   * @returns {Promise<number>} number of documents removed
   */
  async deleteAll() {
    return this.db.removeAsync({}, { multi: true });
  }
}

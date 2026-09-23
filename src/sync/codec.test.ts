import { describe, it, expect } from 'vitest';
import {
  decodeFrame,
  encodeFrame,
  SyncCodecError,
  SYNC_MESSAGE_TYPES,
  type SyncFrame,
} from '../index.js';

const u8 = new Uint8Array([1, 2, 3, 250, 0, 7]);
const frames: SyncFrame[] = [
  {
    channelId: 0,
    type: 'auth',
    payload: {
      scheme: 'firebase',
      token: 'toké中',
      deviceId: 'd',
      installId: 'i',
      clientVersion: '1',
      schemaVersion: 1,
    },
  },
  {
    channelId: 0,
    type: 'authOk',
    payload: {
      userId: 'u',
      sessionId: 's',
      serverSchemaVersion: 1,
      heartbeatMs: 25000,
      maxFrameBytes: 1048576,
    },
  },
  {
    channelId: 0,
    type: 'authError',
    payload: { code: 'UNAUTHENTICATED', message: 'm' },
  },
  { channelId: 0, type: 'reauth', payload: { token: 't' } },
  { channelId: 0, type: 'ping', payload: { t: 123 } },
  {
    channelId: 0,
    type: 'subscribe',
    payload: {
      channelId: 300,
      documentId: 'doc_x',
      epoch: 0,
      stateVector: 'AQI=',
      mode: 'edit',
    },
  },
  {
    channelId: 300,
    type: 'subscribed',
    payload: {
      documentId: 'doc_x',
      role: 'owner',
      epoch: 0,
      markPermissions: {},
      schemaVersion: 1,
    },
  },
  {
    channelId: 1,
    type: 'subscribeError',
    payload: { code: 'EPOCH_MISMATCH', detail: 2 },
  },
  { channelId: 0, type: 'unsubscribe', payload: { channelId: 1 } },
  { channelId: 1, type: 'syncStep1', payload: u8 },
  { channelId: 1, type: 'syncStep2', payload: new Uint8Array(0) },
  {
    channelId: 1,
    type: 'update',
    payload: {
      epoch: 2,
      clientSeq: 70000,
      update: new Uint8Array(200).fill(9),
    },
  },
  { channelId: 1, type: 'ack', payload: { clientSeq: 1, serverSeq: 5 } },
  {
    channelId: 1,
    type: 'reject',
    payload: { clientSeq: 1, code: 'PAYLOAD_TOO_LARGE', detail: 'x' },
  },
  { channelId: 1, type: 'awareness', payload: u8 },
  {
    channelId: 1,
    type: 'epochChanged',
    payload: {
      newEpoch: 1,
      reason: 'snapshot-open',
      byUserId: 'u',
      snapshotId: 'snap_x',
    },
  },
  {
    channelId: 1,
    type: 'roleChanged',
    payload: { role: 'none', markPermissions: {} },
  },
  {
    channelId: 1,
    type: 'documentDeleted',
    payload: { byUserId: 'u', recoverableUntil: '2026-01-01T00:00:00Z' },
  },
  {
    channelId: 1,
    type: 'normalized',
    payload: { serverSeq: 1, contentHashes: { el_a: 'h' } },
  },
  { channelId: 0, type: 'serverShutdown', payload: { reconnectAfterMs: 1000 } },
];

describe('sync frame codec', () => {
  it('round-trips every frame type', () => {
    for (const f of frames) {
      expect(decodeFrame(encodeFrame(f)), f.type).toEqual(f);
    }
    const covered = new Set<string>(frames.map((f) => f.type));
    for (const name of Object.keys(SYNC_MESSAGE_TYPES)) {
      if (name === 'pong') continue; // shares code 4 with ping
      expect(covered.has(name), name).toBe(true);
    }
  });

  it('encodes pong as code 4 and decodes it as ping', () => {
    const bytes = encodeFrame({
      channelId: 0,
      type: 'pong',
      payload: { t: 5 },
    });
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(4);
    expect(decodeFrame(bytes).type).toBe('ping');
  });

  it('uses the spec layout: channel varuint, type varuint, payload', () => {
    const bytes = encodeFrame({
      channelId: 1,
      type: 'syncStep1',
      payload: new Uint8Array([9, 8]),
    });
    expect(Array.from(bytes)).toEqual([1, 20, 2, 9, 8]);
    const upd = encodeFrame({
      channelId: 2,
      type: 'update',
      payload: { epoch: 0, clientSeq: 3, update: new Uint8Array([7]) },
    });
    expect(Array.from(upd)).toEqual([2, 22, 0, 3, 1, 7]);
  });

  it('throws SyncCodecError on malformed input', () => {
    expect(() => decodeFrame(new Uint8Array(0))).toThrow(SyncCodecError);
    expect(() => decodeFrame(new Uint8Array([0, 99]))).toThrow(SyncCodecError); // unknown type
    expect(() => decodeFrame(new Uint8Array([1, 20, 5, 1]))).toThrow(
      SyncCodecError
    ); // short varuint8array
    expect(() => decodeFrame(new Uint8Array([0, 0, 123]))).toThrow(
      SyncCodecError
    ); // bad JSON
    expect(() => decodeFrame(new Uint8Array([0, 20, 0]))).toThrow(
      SyncCodecError
    ); // syncStep1 on control channel
  });
});

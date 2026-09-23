/**
 * Binary wire codec for sync frames (spec 03 §2.2). Shared by the API and the frontend client.
 * Platform-free: only `lib0` (pure JS), no Node built-ins, no DOM.
 *
 *   frame := channelId:varuint  messageType:varuint  payload
 *
 * Payload by type:
 *  - JSON UTF-8 (the JSON text fills the rest of the frame): auth, authOk, authError, reauth, ping/pong, subscribe, subscribed, subscribeError,
 *    unsubscribe, ack, reject, epochChanged, roleChanged, documentDeleted, normalized,
 *    serverShutdown.
 *  - syncStep1 / syncStep2 / awareness: `varuint8array` (the y-protocols payload, which is
 *    exactly what follows the message-type tag in y-protocols/sync and /awareness).
 *  - update: `epoch:varuint clientSeq:varuint update:varuint8array`.
 *
 * ping and pong share code 4. `decodeFrame` returns type `ping` for it; a heartbeat frame is a
 * liveness signal only and must never be answered (otherwise the two sides would echo forever).
 */
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as string from 'lib0/string';
import {
  SYNC_MESSAGE_TYPES,
  syncFrameSchema,
  type SyncFrame,
} from './index.js';

export class SyncCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncCodecError';
  }
}

const BINARY_TYPES = new Set(['syncStep1', 'syncStep2', 'awareness']);

const NAME_BY_CODE = new Map<number, SyncFrame['type']>();
for (const [name, code] of Object.entries(SYNC_MESSAGE_TYPES)) {
  // ping and pong share a code: the first registration (ping) wins on decode.
  if (!NAME_BY_CODE.has(code))
    NAME_BY_CODE.set(code, name as SyncFrame['type']);
}

export function encodeFrame(frame: SyncFrame): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, frame.channelId);
  encoding.writeVarUint(enc, SYNC_MESSAGE_TYPES[frame.type]);
  if (BINARY_TYPES.has(frame.type)) {
    encoding.writeVarUint8Array(enc, frame.payload as Uint8Array);
  } else if (frame.type === 'update') {
    encoding.writeVarUint(enc, frame.payload.epoch);
    encoding.writeVarUint(enc, frame.payload.clientSeq);
    encoding.writeVarUint8Array(enc, frame.payload.update);
  } else {
    encoding.writeUint8Array(
      enc,
      string.encodeUtf8(JSON.stringify(frame.payload))
    );
  }
  return encoding.toUint8Array(enc);
}

/** Throws `SyncCodecError` on any malformed or schema-invalid frame. */
export function decodeFrame(bytes: Uint8Array): SyncFrame {
  let candidate: unknown;
  try {
    const dec = decoding.createDecoder(bytes);
    const channelId = decoding.readVarUint(dec);
    const code = decoding.readVarUint(dec);
    const type = NAME_BY_CODE.get(code);
    if (!type) throw new SyncCodecError(`unknown message type ${code}`);
    let payload: unknown;
    if (BINARY_TYPES.has(type)) {
      payload = decoding.readVarUint8Array(dec);
      if (decoding.hasContent(dec)) throw new SyncCodecError('trailing bytes');
    } else if (type === 'update') {
      const epoch = decoding.readVarUint(dec);
      const clientSeq = decoding.readVarUint(dec);
      const update = decoding.readVarUint8Array(dec);
      if (decoding.hasContent(dec)) throw new SyncCodecError('trailing bytes');
      payload = { epoch, clientSeq, update };
    } else {
      const rest = decoding.readTailAsUint8Array(dec);
      payload = JSON.parse(string.decodeUtf8(rest));
    }
    candidate = { channelId, type, payload };
  } catch (e) {
    if (e instanceof SyncCodecError) throw e;
    throw new SyncCodecError(
      `malformed frame: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  const parsed = syncFrameSchema.safeParse(candidate);
  if (!parsed.success)
    throw new SyncCodecError(`invalid frame: ${parsed.error.message}`);
  return parsed.data;
}

/**
 * Production packets (spec 11 §7, spec 05 §6.22), slice B10. Schemas are the contract MCP and generators consume
 * (`scenePacketSchema` and friends); the API validates its own output against them in tests.
 * Asset lists are always empty until slice B11 (assets) lands.
 */
import { z } from 'zod';

export const PACKET_VERSION = 1;

/** `?snapshotId=&include=` shared by the four packet routes. `include` is a comma list of packet flags. */
export const PACKET_INCLUDE_FLAGS = ['assets', 'assetUrls', 'script', 'neighbors', 'pages'] as const;
export const packetQuerySchema = z.object({
  snapshotId: z.string().min(1).optional(),
  include: z
    .preprocess(
      v => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v),
      z.array(z.enum(['assets', 'assetUrls=original', 'script', 'neighbors', 'pages']))
    )
    .optional(),
});
export type PacketQuery = z.infer<typeof packetQuerySchema>;

/** 2 MB JSON cap (spec 11 §7.1): beyond it script text is truncated per element with `truncated: true`. */
export const PACKET_MAX_BYTES = 2 * 1024 * 1024;

const envelope = <K extends string, B extends z.ZodType>(kind: K, body: B) =>
  z.object({
    packetVersion: z.literal(PACKET_VERSION),
    kind: z.literal(kind),
    documentId: z.string(),
    documentTitle: z.string(),
    snapshotId: z.string().nullable(),
    templateId: z.string(),
    language: z.string(),
    generatedAt: z.string(),
    /** `packetHash` of the packet without `generatedAt`, `hash` and signed-URL fields (spec 11 §4.2). */
    hash: z.string(),
    truncated: z.boolean().optional(),
    body,
  });

const assetSummary = z.object({ assetId: z.string(), role: z.string(), kind: z.string(), title: z.string() }).passthrough();

const pages = z.object({ start: z.string(), end: z.string(), eighths: z.number().int() }).nullable();

export const packetElementSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('character'), text: z.string(), speakerEntityId: z.string().nullable(), extension: z.string().nullable() }),
  z.object({ id: z.string(), type: z.literal('parenthetical'), text: z.string(), speakerEntityId: z.string().nullable() }),
  z.object({ id: z.string(), type: z.literal('dialogue'), text: z.string(), speakerEntityId: z.string().nullable(), dual: z.boolean(), lineIndex: z.number().int() }),
  // every other role: sceneHeading, action, transition, shot, normal, ...
  z.object({ id: z.string(), type: z.string().refine(t => !['character', 'parenthetical', 'dialogue'].includes(t)), text: z.string() }),
]);
export type PacketElement = z.infer<typeof packetElementSchema>;

const shotSummary = z.object({
  id: z.string(),
  number: z.string().nullable(),
  label: z.string().nullable(),
  status: z.string(),
  camera: z.record(z.string(), z.unknown()),
  estimatedDurationMs: z.number().nullable(),
  description: z.string().nullable(),
  elementIds: z.array(z.string()),
  contentHash: z.string(),
  assets: z.array(assetSummary),
});
export type ShotSummary = z.infer<typeof shotSummary>;

const sceneRef = z.object({ id: z.string(), number: z.string().nullable(), heading: z.string(), synopsis: z.string() });

const sceneHeader = z.object({
  id: z.string(),
  number: z.string().nullable(),
  ordinal: z.number().int(),
  omitted: z.boolean(),
  heading: z.object({ raw: z.string(), intro: z.string().nullable(), location: z.string().nullable(), time: z.string().nullable() }),
  locationEntityId: z.string().nullable(),
  synopsis: z.string(),
  color: z.string().nullable(),
  pages,
  estimatedDurationMs: z.number(),
  folders: z.array(z.object({ id: z.string(), kind: z.string(), title: z.string() })),
  contentHash: z.string(),
  scriptDay: z.string().nullable(),
});

const locationBlock = z
  .object({ entityId: z.string(), name: z.string(), fields: z.record(z.string(), z.unknown()), description: z.string(), assets: z.array(assetSummary) })
  .nullable();

export const scenePacketBodySchema = z.object({
  scene: sceneHeader,
  script: z.array(packetElementSchema),
  cast: z.array(
    z.object({
      entityId: z.string(),
      name: z.string(),
      speaking: z.boolean(),
      lineCount: z.number().int(),
      wordCount: z.number().int(),
      firstAppearance: z.boolean(),
      summary: z.string(),
      fields: z.record(z.string(), z.unknown()),
      traits: z.record(z.string(), z.union([z.string(), z.number()])),
      assets: z.array(assetSummary),
    })
  ),
  location: locationBlock,
  elements: z.array(z.object({ entityId: z.string(), kind: z.string(), name: z.string(), description: z.string(), tagCount: z.number().int(), assets: z.array(assetSummary) })),
  shots: z.array(shotSummary),
  notes: z.array(z.object({ id: z.string(), type: z.string(), text: z.string(), anchorElementId: z.string().nullable() })),
  sceneAssets: z.array(assetSummary),
  neighbors: z.object({ previous: sceneRef.nullable(), next: sceneRef.nullable() }).optional(),
});
export const scenePacketSchema = envelope('scene', scenePacketBodySchema);
export type ScenePacket = z.infer<typeof scenePacketSchema>;

export const characterPacketBodySchema = z.object({
  character: z.object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    description: z.string(),
    fields: z.record(z.string(), z.unknown()),
    traits: z.record(z.string(), z.union([z.string(), z.number()])),
    attributes: z.record(z.string(), z.unknown()),
    contentHash: z.string(),
  }),
  ages: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      ageValue: z.number().nullable(),
      description: z.string(),
      skeleton: z.array(z.object({ section: z.string().nullable(), label: z.string(), answer: z.string() })),
      appearances: z.array(z.object({ id: z.string(), label: z.string(), description: z.string(), assetIds: z.array(z.string()) })),
      sceneCount: z.number().int(),
    })
  ),
  skeleton: z.array(z.object({ section: z.string().nullable(), label: z.string(), answer: z.string() })),
  stats: z.object({
    sceneCount: z.number().int(),
    speakingSceneCount: z.number().int(),
    lineCount: z.number().int(),
    wordCount: z.number().int(),
    firstSceneId: z.string().nullable(),
    lastSceneId: z.string().nullable(),
  }),
  scenes: z.array(
    z.object({
      id: z.string(),
      number: z.string().nullable(),
      heading: z.string(),
      speaking: z.boolean(),
      lineCount: z.number().int(),
      ageId: z.string().nullable(),
      appearanceId: z.string().nullable(),
    })
  ),
  sampleDialogue: z.array(z.object({ elementId: z.string(), sceneId: z.string(), text: z.string() })),
  relationships: z.array(z.object({ entityId: z.string(), name: z.string(), sharedSceneCount: z.number().int() })),
  props: z.array(z.object({ entityId: z.string(), name: z.string() })),
  assets: z.array(assetSummary),
});
export const characterPacketSchema = envelope('character', characterPacketBodySchema);
export type CharacterPacket = z.infer<typeof characterPacketSchema>;

export const locationPacketBodySchema = z.object({
  location: z.object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    description: z.string(),
    fields: z.record(z.string(), z.unknown()),
    parent: z.object({ id: z.string(), name: z.string() }).nullable(),
    children: z.array(z.object({ id: z.string(), name: z.string() })),
    contentHash: z.string(),
  }),
  versions: z.array(z.object({ id: z.string(), label: z.string(), description: z.string(), setting: z.string().nullable(), sceneCount: z.number().int() })),
  scenes: z.array(
    z.object({
      id: z.string(),
      number: z.string().nullable(),
      heading: z.string(),
      time: z.string().nullable(),
      pages,
      cast: z.array(z.string()),
      versionId: z.string().nullable(),
    })
  ),
  totals: z.object({ sceneCount: z.number().int(), eighths: z.number().int(), timesOfDay: z.record(z.string(), z.number().int()) }),
  setElements: z.array(z.object({ entityId: z.string(), kind: z.string(), name: z.string() })),
  assets: z.array(assetSummary),
});
export const locationPacketSchema = envelope('location', locationPacketBodySchema);
export type LocationPacket = z.infer<typeof locationPacketSchema>;

export const shotPacketBodySchema = z.object({
  shot: shotSummary.extend({
    sceneId: z.string(),
    range: z.object({ startElementId: z.string(), endElementId: z.string(), text: z.string() }).nullable(),
  }),
  scene: z.object({
    id: z.string(),
    number: z.string().nullable(),
    heading: z.object({ raw: z.string(), intro: z.string().nullable(), location: z.string().nullable(), time: z.string().nullable() }),
    locationEntityId: z.string().nullable(),
    contentHash: z.string(),
  }),
  script: z.array(packetElementSchema),
  subjects: z.array(z.object({ entityId: z.string(), kind: z.string(), name: z.string(), fields: z.record(z.string(), z.unknown()), assets: z.array(assetSummary) })),
  location: locationBlock,
  previousShot: shotSummary.nullable(),
  nextShot: shotSummary.nullable(),
});
export const shotPacketSchema = envelope('shot', shotPacketBodySchema);
export type ShotPacket = z.infer<typeof shotPacketSchema>;

export type AnyPacket = ScenePacket | CharacterPacket | LocationPacket | ShotPacket;

import { describe, expect, it } from "vitest";
import {
  channelAttributionJson,
  normalizeChannelAttributionDetails,
  readChannelAttributionDetails,
  scoreChannelAttribution,
} from "./diagnostics";

describe("channel attribution scoring", () => {
  it("no considera respondida una selección vacía", () => {
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({}))).toBeNull();
  });

  it("asigna nivel inicial cuando la empresa no identifica sus canales", () => {
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({ unknownChannels: true }))).toBe(1);
  });

  it("distingue uso, evidencia parcial y cobertura mayoritaria", () => {
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({
      usedChannels: ["google_maps", "website", "instagram"],
    }))).toBe(2);
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({
      usedChannels: ["google_maps", "website", "instagram"],
      provenChannels: ["google_maps"],
    }))).toBe(3);
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({
      usedChannels: ["google_maps", "website", "instagram"],
      provenChannels: ["google_maps", "website"],
    }))).toBe(4);
  });

  it("solo concede nivel 5 con resultados en todos los canales y medición", () => {
    const channels = ["google_maps", "website", "instagram"];
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({
      usedChannels: channels,
      provenChannels: channels,
      tracksPerformance: false,
    }))).toBe(4);
    expect(scoreChannelAttribution(normalizeChannelAttributionDetails({
      usedChannels: channels,
      provenChannels: channels,
      tracksPerformance: true,
    }))).toBe(5);
  });

  it("descarta canales desconocidos y resultados que no fueron seleccionados", () => {
    const details = normalizeChannelAttributionDetails({
      usedChannels: ["website", "invalid"],
      provenChannels: ["website", "instagram", "invalid"],
      tracksPerformance: true,
    });
    expect(details.usedChannels).toEqual(["website"]);
    expect(details.provenChannels).toEqual(["website"]);
    expect(readChannelAttributionDetails(channelAttributionJson(details))).toEqual(details);
  });
});

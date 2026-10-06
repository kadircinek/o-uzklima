import { describe, expect, it } from "vitest";
import { argumanlariCoz, ipadSec } from "../scripts/ipad-simulator.mjs";

const cihaz = (name: string, udid: string, state = "Shutdown") => ({ name, udid, state, isAvailable: true });

const LISTE = {
  devices: {
    "com.apple.CoreSimulator.SimRuntime.iOS-17-5": [
      cihaz("iPad Pro (12.9-inch) (6th generation)", "eski-13"),
      cihaz("iPad Pro (11-inch) (4th generation)", "eski-11"),
      cihaz("iPhone 15", "telefon"),
    ],
    "com.apple.CoreSimulator.SimRuntime.iOS-18-2": [
      cihaz("iPad Pro 13-inch (M4)", "yeni-13"),
      cihaz("iPad Pro 11-inch (M4)", "yeni-11"),
      cihaz("iPad Air 13-inch (M2)", "air"),
    ],
  },
};

describe("Xcode iPad Pro seçimi", () => {
  it("en yeni iOS sürümündeki iPad Pro'yu seçer", () => {
    expect(ipadSec(LISTE, "13")?.udid).toBe("yeni-13");
    expect(ipadSec(LISTE, "11")?.udid).toBe("yeni-11");
  });

  it("açık olan simülatörü tercih eder", () => {
    const liste = structuredClone(LISTE);
    liste.devices["com.apple.CoreSimulator.SimRuntime.iOS-17-5"][0].state = "Booted";
    expect(ipadSec(liste, "13")?.udid).toBe("eski-13");
  });

  it("12.9 inç eski modeli 13 inç sayar; iPad Air'i seçmez", () => {
    const liste = { devices: { "com.apple.CoreSimulator.SimRuntime.iOS-17-5": LISTE.devices["com.apple.CoreSimulator.SimRuntime.iOS-17-5"] } };
    expect(ipadSec(liste, "13")?.udid).toBe("eski-13");
    expect(ipadSec({ devices: { x: [cihaz("iPad Air 13-inch (M2)", "air")] } }, "13")).toBeNull();
  });

  it("adres ve model komut satırından okunur", () => {
    expect(argumanlariCoz([])).toEqual({ adres: "http://localhost:3000", model: "13" });
    expect(argumanlariCoz(["https://lifeos.example.com/", "--11"])).toEqual({ adres: "https://lifeos.example.com", model: "11" });
  });
});

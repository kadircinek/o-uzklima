import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

// Dosyalar paylaşılan test kullanıcısının verisini sırayla kullanır
// (arayuz → ekip → eposta → motor → ses); önceki çalıştırmanın sonucuna
// göre yeniden sıralanmasınlar.
class AlfabetikSira extends BaseSequencer {
  async sort(dosyalar: TestSpecification[]) {
    return [...dosyalar].sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }
}

// Uçtan uca testler: çalışan uygulama + yerel Supabase gerekir (e2e/calistir.sh).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: ["e2e/kurulum.ts"],
    fileParallelism: false,
    sequence: { concurrent: false, sequencer: AlfabetikSira },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});

import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      include: ["lib"],
      tsconfigPath: "./tsconfig.app.json",
      rollupTypes: true,
      afterBuild: () => {
        console.log('Type files generated for discrub-core');
      },
    }),
  ],
  build: {
    lib: {
      formats: ["es"],
      entry: {
        "discord-service": resolve(__dirname, "lib/services/discord-service.ts"),
        "github-service": resolve(__dirname, "lib/services/github-service.ts"),
        "export-data-service": resolve(__dirname, "lib/services/export-data-service.ts"),
        "discrub-guards": resolve(__dirname, "lib/guards/discrub-guards.ts"),
        "common-guards": resolve(__dirname, "lib/guards/common-guards.ts"),
        "discrub-utils": resolve(__dirname, "lib/utils/discrub-utils.ts"),
        "common-utils": resolve(__dirname, "lib/utils/common-utils.ts"),
        "message-formatting-utils": resolve(__dirname, "lib/utils/message-formatting-utils.ts"),
        "export-utils": resolve(__dirname, "lib/utils/export-utils.ts"),
        "html-formatting-utils": resolve(__dirname, "lib/utils/html-formatting-utils.ts"),
        "system-messages": resolve(__dirname, "lib/utils/system-messages.ts"),
        filtering: resolve(__dirname, "lib/filtering/index.ts"),
        messages: resolve(__dirname, "lib/messages/index.ts"),
        regex: resolve(__dirname, "lib/regex/index.ts"),
        constants: resolve(__dirname, "lib/constants/index.ts"),
        "common-enum": resolve(__dirname, "lib/enum/common-enum.ts"),
        "discord-enum": resolve(__dirname, "lib/enum/discord-enum.ts"),
        "discrub-enum": resolve(__dirname, "lib/enum/discrub-enum.ts"),
        "types/discord-types": resolve(__dirname, "lib/types/discord-types.ts"),
        "types/discrub-types": resolve(__dirname, "lib/types/discrub-types.ts"),
        "types/html-formatting-types": resolve(__dirname, "lib/types/html-formatting-types.ts"),
      },
    },
    copyPublicDir: false,
  },
});

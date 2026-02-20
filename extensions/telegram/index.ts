import type { ZeroPluginApi } from "zero/plugin-sdk";
import { emptyPluginConfigSchema } from "zero/plugin-sdk";

import { telegramPlugin } from "./src/channel.js";
import { setTelegramRuntime } from "./src/runtime.js";

const plugin = {
  id: "telegram",
  name: "Telegram",
  description: "Telegram channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: ZeroPluginApi) {
    setTelegramRuntime(api.runtime);
    api.registerChannel({ plugin: telegramPlugin });
  },
};

export default plugin;

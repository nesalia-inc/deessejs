export type Plugin = {
  name: string;
};

export function plugin(config: { name: string }): Plugin {
  return { name: config.name };
}

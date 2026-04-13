import { type ZodSchema } from "zod";

export type Plugin = {
  name: string;
};

export type PluginConfig<TParams = never> = {
  name: string;
  schema?: ZodSchema<TParams>;
};

export function plugin<TParams = never>(
  config: PluginConfig<TParams>
): (params: TParams) => Plugin {
  return (params) => {
    if (config.schema) {
      config.schema.parse(params);
    }
    return { name: config.name };
  };
}

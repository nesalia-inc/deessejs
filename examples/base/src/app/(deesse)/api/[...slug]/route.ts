import { config } from "@deesse-config";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);

import { deesseAuth } from "@/lib/deesse";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET({ auth: deesseAuth });
export const POST = REST_POST({ auth: deesseAuth });
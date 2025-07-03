import { ConvexHttpClient } from "convex/browser";

const address = process.env.NEXT_PUBLIC_CONVEX_URL as string;
const convex = new ConvexHttpClient(address);

export default convex;
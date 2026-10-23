import { getPlatformProxy } from "wrangler";
import { connect } from "@/db";
import { seedCatalog } from "@/db/seed";

const { env, dispose } = await getPlatformProxy<CloudflareEnv>();
try {
  console.log(await seedCatalog(connect(env.DB)));
} finally {
  await dispose();
}

import "dotenv/config";
import { seedIfEmpty } from "./store.js";

await seedIfEmpty();
console.log("TaskFlow demo data is ready.");

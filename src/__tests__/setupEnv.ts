import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const testEnvPath = path.resolve(process.cwd(), ".env.test");
const defaultEnvPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
}

process.env.NODE_ENV = "test";

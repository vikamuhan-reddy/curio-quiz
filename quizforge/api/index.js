import serverless from "serverless-http";
import app from "../src/backend/server.js";

export default serverless(app);
import { IS_DEMO } from "../constants/config";
import type { DataSource } from "../types";
import { demoDataSource } from "./demoStore";
import { liveDataSource } from "./live";

export const data: DataSource = IS_DEMO ? demoDataSource : liveDataSource;

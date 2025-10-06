// db.ts
import pgPromise, { IDatabase, IMain } from "pg-promise";
import fs from "fs";
import { MalaPeticionException } from "../errors";

const pgp: IMain = pgPromise({});
const user = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const host = process.env.POSTGRES_HOST;
const dbName = process.env.POSTGRES_DB;
const db = pgp({
    host: host,
    port: 5432,
    database: dbName,
    user: user,
    password: password,
});

async function executeFile(filePath: string, model: { [key: string]: any }) {
    // Read text plain
    const sql = fs.readFileSync(filePath, "utf-8");
    // Render and execute
    return db.any<any>(sql, model);
}

async function executeText(sql: string, model: { [key: string]: any }) {
    // Render and execute
    return db.any<any>(sql, model);
}

export {
    db,
    pgp,
    executeFile,
    executeText,
};

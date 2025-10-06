import { Request, Response, } from 'express';
import { ApiResponse } from "../app";
import { executeText, executeFile } from "../tools/db";

export class SampleSrv {
    static async callDB1(req: Request, res: Response) {
        const model: any = {

        };
        const script = "SELECT CURRENT_DATE;";
        const dbResponse = await executeText(script, model);
        const response: ApiResponse = {
            success: true,
            message: '',
            data: { rows: dbResponse },
            timestamp: new Date()
        };
        res.status(200).json(response);
    }
    static async callDB2(req: Request, res: Response) {
        const model: any = {

        };
        const dbResponse = await executeFile("./src/sql/test.sql", model);
        const response: ApiResponse = {
            success: true,
            message: '',
            data: { rows: dbResponse },
            timestamp: new Date()
        };
        res.status(200).json(response);
    }
}
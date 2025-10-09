import express, { Request, Response, } from 'express';
import { ApiResponse } from '../app';

export class HealthSrv {
    static health(req: Request, res: Response) {
        console.log('Health check endpoint called');
        const response: ApiResponse = {
            success: true,
            message: 'Server is healthy',
            timestamp: new Date()
        };
        res.status(200).json(response);
    }
    static echo(req: Request, res: Response) { 
        const response: ApiResponse = {
            success: true,
            message: 'Data received successfully',
            data: req.body,
            timestamp: new Date()
        };
        res.status(201).json(response);
    }
}
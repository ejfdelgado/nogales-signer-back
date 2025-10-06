import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { CustomError } from './errors';
import { HealthSrv } from "./services/health";
import { asyncHandler } from "./tools/General";
import { SampleSrv } from "./services/sample_db";

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: any;
    timestamp: Date;
}

const allowedOrigins = [
    'http://localhost:4200',
];

if (process.env.CORS_MAIN_ALLOWED_ORIGIN) {
    allowedOrigins.push(...process.env.CORS_MAIN_ALLOWED_ORIGIN.split(","));
}

class App {
    public app: Application;
    public port: number;

    constructor(port: number) {
        this.app = express();
        this.port = port;

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddlewares(): void {
        this.app.use(cors({
            methods: ["GET", "POST", "DELETE"],
            origin: (origin, callback) => {
                // allow requests with no origin (like mobile apps or curl)
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
        }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Logging middleware
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.app.get('/public/health', asyncHandler(HealthSrv.health));
        this.app.post('/public/echo', asyncHandler(HealthSrv.echo));

        this.app.get('/public/sample/db1', asyncHandler(SampleSrv.callDB1));
        this.app.get('/public/sample/db2', asyncHandler(SampleSrv.callDB2));

        this.app.use('*', (req: Request, res: Response) => {
            const response: ApiResponse = {
                success: false,
                message: 'Route not found',
                timestamp: new Date()
            };
            res.status(404).json(response);
        });
    }

    private initializeErrorHandling(): void {
        // Error handling middleware
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            console.error('Some error:', err);

            const response: ApiResponse = {
                success: false,
                message: err.message,
                timestamp: new Date()
            };

            if (err instanceof CustomError) {
                res.status((err as CustomError).httpCode).json(response);
            } else {
                res.status(500).json(response);
            }
        });
    }

    public listen(): void {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${this.port}/public/health`);
        });
    }
}

export default App;
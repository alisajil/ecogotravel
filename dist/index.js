#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const axios_1 = __importDefault(require("axios"));
// Configuration
const API_KEY = process.env.TRIPJACK_API_KEY;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const BASE_URL = process.env.TRIPJACK_API_URL || 'https://apitest.tripjack.com';
// Validate API key
if (!API_KEY) {
    console.error('[Error] TRIPJACK_API_KEY environment variable is required');
    process.exit(1);
}
class TripjackServer {
    constructor() {
        // Initialize Axios instance with default configuration
        this.axiosInstance = axios_1.default.create({
            baseURL: BASE_URL,
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds timeout
        });
        // Create HTTP server
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
        // Error handling
        process.on('SIGINT', async () => {
            await this.close();
            process.exit(0);
        });
        console.error('[Setup] Initializing Tripjack MCP server...');
    }
    async handleRequest(req, res) {
        try {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
            }
            // Only accept POST requests
            if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
            }
            // Parse URL
            const url = req.url || '/';
            console.error(`[Request] ${req.method} ${url}`);
            // Handle different endpoints
            if (url === '/get_flight_data') {
                await this.handleGetFlightData(req, res);
            }
            else if (url === '/book_best_flight') {
                await this.handleBookBestFlight(req, res);
            }
            else if (url === '/get_ticket_info') {
                await this.handleGetTicketInfo(req, res);
            }
            else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        }
        catch (error) {
            console.error('[Error] Unhandled error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async getRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', (error) => {
                reject(error);
            });
        });
    }
    async handleGetFlightData(req, res) {
        try {
            // Parse request body
            const body = await this.getRequestBody(req);
            const request = JSON.parse(body);
            console.error('[API] Flight search request:', request);
            // Validate request
            if (!request.departureCity || !request.arrivalCity || !request.travelDate) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing required fields' }));
                return;
            }
            // Prepare search request
            const searchRequest = {
                searchQuery: {
                    cabinClass: "ECONOMY",
                    paxInfo: {
                        ADULT: request.adults || 1,
                        CHILD: request.children || 0,
                        INFANT: request.infants || 0,
                    },
                    routeInfos: [
                        {
                            fromCityOrAirport: { code: request.departureCity },
                            toCityOrAirport: { code: request.arrivalCity },
                            travelDate: request.travelDate,
                        },
                    ],
                },
            };
            // Call Tripjack API
            console.error('[API] Calling Tripjack search API...');
            const response = await this.axiosInstance.post('/fms/v1/air-search-all', searchRequest);
            console.error('[API] Search response received');
            // Send response
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: true,
                data: response.data,
            }));
        }
        catch (error) {
            console.error('[Error] Flight search failed:', error.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: error.response?.data?.message || error.message,
            }));
        }
    }
    async handleBookBestFlight(req, res) {
        try {
            // Parse request body
            const body = await this.getRequestBody(req);
            const request = JSON.parse(body);
            console.error('[API] Book flight request:', request);
            // Validate request
            if (!request.priceId || !request.passengers || !request.contactInfo) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing required fields' }));
                return;
            }
            // First, review the selected flight
            console.error('[API] Reviewing selected flight...');
            const reviewResponse = await this.axiosInstance.post('/fms/v1/review', {
                priceIds: [request.priceId],
            });
            // Prepare booking request
            const bookingId = reviewResponse.data.bookingId;
            const travellerInfo = [];
            // Add adult passengers
            for (const adult of request.passengers.adults) {
                travellerInfo.push({
                    ti: adult.title,
                    fN: adult.firstName,
                    lN: adult.lastName,
                    pt: 'ADULT',
                    ...(adult.dob && { dob: adult.dob }),
                });
            }
            // Add child passengers
            if (request.passengers.children) {
                for (const child of request.passengers.children) {
                    travellerInfo.push({
                        ti: child.title,
                        fN: child.firstName,
                        lN: child.lastName,
                        pt: 'CHILD',
                        dob: child.dob,
                    });
                }
            }
            // Add infant passengers
            if (request.passengers.infants) {
                for (const infant of request.passengers.infants) {
                    travellerInfo.push({
                        ti: infant.title,
                        fN: infant.firstName,
                        lN: infant.lastName,
                        pt: 'INFANT',
                        dob: infant.dob,
                    });
                }
            }
            // Create booking request
            const bookRequest = {
                bookingId,
                travellerInfo,
                deliveryInfo: {
                    emails: [request.contactInfo.email],
                    contacts: [request.contactInfo.phone],
                },
            };
            // Call Tripjack API to book the flight
            console.error('[API] Calling Tripjack book API...');
            const bookResponse = await this.axiosInstance.post('/oms/v1/air/book', bookRequest);
            console.error('[API] Book response received');
            // Send response
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: true,
                data: bookResponse.data,
            }));
        }
        catch (error) {
            console.error('[Error] Flight booking failed:', error.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: error.response?.data?.message || error.message,
            }));
        }
    }
    async handleGetTicketInfo(req, res) {
        try {
            // Parse request body
            const body = await this.getRequestBody(req);
            const request = JSON.parse(body);
            console.error('[API] Get ticket info request:', request);
            // Validate request
            if (!request.bookingId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing required fields' }));
                return;
            }
            // Call Tripjack API
            console.error('[API] Calling Tripjack booking details API...');
            const response = await this.axiosInstance.post('/oms/v1/booking-details', {
                bookingId: request.bookingId,
            });
            console.error('[API] Booking details response received');
            // Send response
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: true,
                data: response.data,
            }));
        }
        catch (error) {
            console.error('[Error] Getting ticket info failed:', error.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: error.response?.data?.message || error.message,
            }));
        }
    }
    async close() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.error('[Server] Closed');
                resolve();
            });
        });
    }
    async run() {
        return new Promise((resolve) => {
            this.server.listen(PORT, () => {
                console.error(`[Server] Tripjack MCP server running on http://localhost:${PORT}`);
                resolve();
            });
        });
    }
}
// Start the server
const server = new TripjackServer();
server.run().catch(console.error);

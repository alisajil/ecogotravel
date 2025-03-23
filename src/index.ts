#!/usr/bin/env node

import * as http from 'http';
import axios, { AxiosInstance } from 'axios';

// Configuration
const API_KEY = process.env.TRIPJACK_API_KEY;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const BASE_URL = process.env.TRIPJACK_API_URL || 'https://apitest.tripjack.com';

// Validate API key
if (!API_KEY) {
  console.error('[Error] TRIPJACK_API_KEY environment variable is required');
  process.exit(1);
}

// Types
interface FlightSearchRequest {
  departureCity: string;
  arrivalCity: string;
  travelDate: string;
  adults?: number;
  children?: number;
  infants?: number;
}

interface BookFlightRequest {
  priceId: string;
  passengers: {
    adults: {
      firstName: string;
      lastName: string;
      title: string;
      dob?: string;
    }[];
    children?: {
      firstName: string;
      lastName: string;
      title: string;
      dob: string;
    }[];
    infants?: {
      firstName: string;
      lastName: string;
      title: string;
      dob: string;
    }[];
  };
  contactInfo: {
    email: string;
    phone: string;
  };
}

interface TicketInfoRequest {
  bookingId: string;
}

class TripjackServer {
  private server: http.Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    // Initialize Axios instance with default configuration
    this.axiosInstance = axios.create({
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

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
      } else if (url === '/book_best_flight') {
        await this.handleBookBestFlight(req, res);
      } else if (url === '/get_ticket_info') {
        await this.handleGetTicketInfo(req, res);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('[Error] Unhandled error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private async getRequestBody(req: http.IncomingMessage): Promise<string> {
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

  private async handleGetFlightData(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      // Parse request body
      const body = await this.getRequestBody(req);
      const request: FlightSearchRequest = JSON.parse(body);
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
    } catch (error: any) {
      console.error('[Error] Flight search failed:', error.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error.response?.data?.message || error.message,
      }));
    }
  }

  private async handleBookBestFlight(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      // Parse request body
      const body = await this.getRequestBody(req);
      const request: BookFlightRequest = JSON.parse(body);
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
    } catch (error: any) {
      console.error('[Error] Flight booking failed:', error.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error.response?.data?.message || error.message,
      }));
    }
  }

  private async handleGetTicketInfo(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      // Parse request body
      const body = await this.getRequestBody(req);
      const request: TicketInfoRequest = JSON.parse(body);
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
    } catch (error: any) {
      console.error('[Error] Getting ticket info failed:', error.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error.response?.data?.message || error.message,
      }));
    }
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.error('[Server] Closed');
        resolve();
      });
    });
  }

  public async run(): Promise<void> {
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

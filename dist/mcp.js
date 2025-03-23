"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
// Configuration
const API_KEY = process.env.TRIPJACK_API_KEY;
const BASE_URL = process.env.TRIPJACK_API_URL || 'https://apitest.tripjack.com';
// Validate API key
if (!API_KEY) {
    console.error('[Error] TRIPJACK_API_KEY environment variable is required');
    process.exit(1);
}
class TripjackMcpServer {
    constructor() {
        this.server = new index_js_1.Server({
            name: 'tripjack-mcp',
            version: '0.1.0',
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        this.axiosInstance = axios_1.default.create({
            baseURL: BASE_URL,
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds timeout
        });
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
        console.error('[Setup] Initializing Tripjack MCP server...');
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_flight_data',
                    description: 'Get real-time flight data',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            departureCity: {
                                type: 'string',
                                description: 'Departure city code (e.g., DEL for Delhi)',
                            },
                            arrivalCity: {
                                type: 'string',
                                description: 'Arrival city code (e.g., BOM for Mumbai)',
                            },
                            travelDate: {
                                type: 'string',
                                format: 'date',
                                description: 'Travel date in YYYY-MM-DD format',
                            },
                            adults: {
                                type: 'integer',
                                description: 'Number of adult passengers',
                                default: 1,
                            },
                            children: {
                                type: 'integer',
                                description: 'Number of child passengers',
                                default: 0,
                            },
                            infants: {
                                type: 'integer',
                                description: 'Number of infant passengers',
                                default: 0,
                            },
                        },
                        required: ['departureCity', 'arrivalCity', 'travelDate'],
                    },
                },
                {
                    name: 'book_best_flight',
                    description: 'Book the best flight based on travel request',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            priceId: {
                                type: 'string',
                                description: 'Price ID from flight search results',
                            },
                            passengers: {
                                type: 'object',
                                properties: {
                                    adults: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                firstName: {
                                                    type: 'string',
                                                    description: 'First name of passenger',
                                                },
                                                lastName: {
                                                    type: 'string',
                                                    description: 'Last name of passenger',
                                                },
                                                title: {
                                                    type: 'string',
                                                    description: 'Title (Mr, Mrs, Ms)',
                                                    enum: ['Mr', 'Mrs', 'Ms'],
                                                },
                                                dob: {
                                                    type: 'string',
                                                    format: 'date',
                                                    description: 'Date of birth in YYYY-MM-DD format',
                                                },
                                            },
                                            required: ['firstName', 'lastName', 'title'],
                                        },
                                    },
                                    children: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                firstName: {
                                                    type: 'string',
                                                    description: 'First name of passenger',
                                                },
                                                lastName: {
                                                    type: 'string',
                                                    description: 'Last name of passenger',
                                                },
                                                title: {
                                                    type: 'string',
                                                    description: 'Title (Ms, Master)',
                                                    enum: ['Ms', 'Master'],
                                                },
                                                dob: {
                                                    type: 'string',
                                                    format: 'date',
                                                    description: 'Date of birth in YYYY-MM-DD format',
                                                },
                                            },
                                            required: ['firstName', 'lastName', 'title', 'dob'],
                                        },
                                    },
                                    infants: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                firstName: {
                                                    type: 'string',
                                                    description: 'First name of passenger',
                                                },
                                                lastName: {
                                                    type: 'string',
                                                    description: 'Last name of passenger',
                                                },
                                                title: {
                                                    type: 'string',
                                                    description: 'Title (Ms, Master)',
                                                    enum: ['Ms', 'Master'],
                                                },
                                                dob: {
                                                    type: 'string',
                                                    format: 'date',
                                                    description: 'Date of birth in YYYY-MM-DD format',
                                                },
                                            },
                                            required: ['firstName', 'lastName', 'title', 'dob'],
                                        },
                                    },
                                },
                                required: ['adults'],
                            },
                            contactInfo: {
                                type: 'object',
                                properties: {
                                    email: {
                                        type: 'string',
                                        format: 'email',
                                        description: 'Contact email',
                                    },
                                    phone: {
                                        type: 'string',
                                        description: 'Contact phone number',
                                    },
                                },
                                required: ['email', 'phone'],
                            },
                        },
                        required: ['priceId', 'passengers', 'contactInfo'],
                    },
                },
                {
                    name: 'get_ticket_info',
                    description: 'Get ticket information',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            bookingId: {
                                type: 'string',
                                description: 'Booking ID',
                            },
                        },
                        required: ['bookingId'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            if (request.params.name === 'get_flight_data') {
                return this.handleGetFlightData(request.params.arguments);
            }
            else if (request.params.name === 'book_best_flight') {
                return this.handleBookBestFlight(request.params.arguments);
            }
            else if (request.params.name === 'get_ticket_info') {
                return this.handleGetTicketInfo(request.params.arguments);
            }
            else {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        });
    }
    async handleGetFlightData(args) {
        try {
            console.error('[API] Flight search request:', args);
            // Validate request
            if (!args.departureCity || !args.arrivalCity || !args.travelDate) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Missing required fields: departureCity, arrivalCity, travelDate',
                        },
                    ],
                    isError: true,
                };
            }
            // Prepare search request
            const searchRequest = {
                searchQuery: {
                    cabinClass: "ECONOMY",
                    paxInfo: {
                        ADULT: args.adults || 1,
                        CHILD: args.children || 0,
                        INFANT: args.infants || 0,
                    },
                    routeInfos: [
                        {
                            fromCityOrAirport: { code: args.departureCity },
                            toCityOrAirport: { code: args.arrivalCity },
                            travelDate: args.travelDate,
                        },
                    ],
                },
            };
            // Call Tripjack API
            console.error('[API] Calling Tripjack search API...');
            const response = await this.axiosInstance.post('/fms/v1/air-search-all', searchRequest);
            console.error('[API] Search response received');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('[Error] Flight search failed:', error.message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Tripjack API error: ${error.response?.data?.message || error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    async handleBookBestFlight(args) {
        try {
            console.error('[API] Book flight request:', args);
            // Validate request
            if (!args.priceId || !args.passengers || !args.contactInfo) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Missing required fields: priceId, passengers, contactInfo',
                        },
                    ],
                    isError: true,
                };
            }
            // First, review the selected flight
            console.error('[API] Reviewing selected flight...');
            const reviewResponse = await this.axiosInstance.post('/fms/v1/review', {
                priceIds: [args.priceId],
            });
            // Prepare booking request
            const bookingId = reviewResponse.data.bookingId;
            const travellerInfo = [];
            // Add adult passengers
            for (const adult of args.passengers.adults) {
                travellerInfo.push({
                    ti: adult.title,
                    fN: adult.firstName,
                    lN: adult.lastName,
                    pt: 'ADULT',
                    ...(adult.dob && { dob: adult.dob }),
                });
            }
            // Add child passengers
            if (args.passengers.children) {
                for (const child of args.passengers.children) {
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
            if (args.passengers.infants) {
                for (const infant of args.passengers.infants) {
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
                    emails: [args.contactInfo.email],
                    contacts: [args.contactInfo.phone],
                },
            };
            // Call Tripjack API to book the flight
            console.error('[API] Calling Tripjack book API...');
            const bookResponse = await this.axiosInstance.post('/oms/v1/air/book', bookRequest);
            console.error('[API] Book response received');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(bookResponse.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('[Error] Flight booking failed:', error.message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Tripjack API error: ${error.response?.data?.message || error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    async handleGetTicketInfo(args) {
        try {
            console.error('[API] Get ticket info request:', args);
            // Validate request
            if (!args.bookingId) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Missing required field: bookingId',
                        },
                    ],
                    isError: true,
                };
            }
            // Call Tripjack API
            console.error('[API] Calling Tripjack booking details API...');
            const response = await this.axiosInstance.post('/oms/v1/booking-details', {
                bookingId: args.bookingId,
            });
            console.error('[API] Booking details response received');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('[Error] Getting ticket info failed:', error.message);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Tripjack API error: ${error.response?.data?.message || error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('[Server] Tripjack MCP server running on stdio');
    }
}
// Start the server
const server = new TripjackMcpServer();
server.run().catch(console.error);

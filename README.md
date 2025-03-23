Ecogo  MCP Server Implementation

Created a TypeScript-based MCP server using the official MCP SDK
Implemented three tools:
get_flight_data: Search for available flights
book_best_flight: Book flights based on search results
get_ticket_info: Retrieve booking details and ticket information
Added comprehensive error handling and logging
API Integration:

Integrated with Tripjack's flight search, booking, and ticket information APIs
Implemented proper request/response handling
Added validation for all API requests
Configuration:


How to Use the MCP Server
Search for Flights:

use_mcp_tool(
  server_name: "ecogoai",
  tool_name: "get_flight_data",
  arguments: {
    "departureCity": "DEL",
    "arrivalCity": "BOM",
    "travelDate": "2025-04-01",
    "adults": 1
  }
)
Book a Flight:

use_mcp_tool(
  server_name: "tripjack",
  tool_name: "book_best_flight",
  arguments: {
    "priceId": "[priceId from search results]",
    "passengers": {
      "adults": [
        {
          "firstName": "John",
          "lastName": "Doe",
          "title": "Mr"
        }
      ]
    },
    "contactInfo": {
      "email": "john.doe@example.com",
      "phone": "9999999999"
    }
  }
)
Get Ticket Information:

use_mcp_tool(
  server_name: "tripjack",
  tool_name: "get_ticket_info",
  arguments: {
    "bookingId": "[booking ID from booking response]"
  }
)

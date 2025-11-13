// =======================================
//  Amadeus Service - Group Ticketing Module
// =======================================

// Load environment variables first
import dotenv from "dotenv";
dotenv.config();

import Amadeus from "amadeus";

// Validate Amadeus credentials before initializing
if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    console.error("Missing Amadeus credentials in .env file.");
    throw new Error("Missing required Amadeus credentials (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET).");
}

// Initialize Amadeus client
export const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    hostname: process.env.NODE_ENV === "production" ? "production" : "test", // "test" for sandbox mode
});

// Fetch live flight offers
export const fetchFlights = async (origin, dest, date, adults = 1) => {
    try {
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: dest,
            departureDate: date,
            adults,
            currencyCode: "USD",
            max: 10,
        });
        return response.data;
    } catch (err) {
        console.error("Error fetching flights:", err.response?.data || err.message);
        throw new Error("Failed to fetch flight offers from Amadeus.");
    }
};

// Fetch list of airlines
export const fetchAirlines = async () => {
    try {
        const response = await amadeus.referenceData.airlines.get();
        return response.data;
    } catch (err) {
        console.error("Error fetching airlines:", err.response?.data || err.message);
        throw new Error("Failed to fetch airlines list.");
    }
};

// Fetch airport search suggestions
export const fetchAirports = async (keyword) => {
    try {
        const response = await amadeus.referenceData.locations.get({
            keyword,
            subType: "AIRPORT",
        });
        return response.data;
    } catch (err) {
        console.error("Error fetching airports:", err.response?.data || err.message);
        throw new Error("Failed to fetch airport suggestions.");
    }
};

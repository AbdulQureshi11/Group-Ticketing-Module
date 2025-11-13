import { fetchFlights, fetchAirlines, fetchAirports } from "./amadeusService.js";
import db from "../../config/models.js";
const { FlightGroup } = db;

// Search live flights
export const searchFlightsController = async (req, res) => {
    try {
        const { origin, dest, date, adults } = req.query;
        if (!origin || !dest || !date)
            return res.status(400).json({ success: false, message: "origin, dest, date required" });

        const flights = await fetchFlights(origin, dest, date, adults || 1);
        res.status(200).json({ success: true, total: flights.length, data: flights });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching flights", error: err.message });
    }
};

// Airlines
export const getAirlinesController = async (req, res) => {
    try {
        const airlines = await fetchAirlines();
        res.status(200).json({ success: true, total: airlines.length, data: airlines });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching airlines", error: err.message });
    }
};

// Airport suggestions
export const getAirportsController = async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword)
            return res.status(400).json({ success: false, message: "keyword required" });

        const airports = await fetchAirports(keyword);
        res.status(200).json({ success: true, total: airports.length, data: airports });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching airports", error: err.message });
    }
};
import db from "../../config/models.js";
const { FlightGroup } = db;

/**
 * Import selected flight from Amadeus response into FlightGroups
 * Body: { carrierCode, flightNumber, origin, destination, departureTime, arrivalTime, price }
 */
export const importAmadeusFlight = async (req, res) => {
    try {
        const { carrierCode, flightNumber, origin, destination, departureTime, arrivalTime, price } =
            req.body;
        const user = req.user;

        if (!carrierCode || !flightNumber || !origin || !destination || !departureTime || !arrivalTime) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (carrierCode, flightNumber, origin, destination, departureTime, arrivalTime).",
            });
        }

        // Create new Flight Group record
        const group = await FlightGroup.create({
            flight: `${carrierCode}-${flightNumber}`,
            route: `${origin}-${destination}`,
            pnr_mode: "PER_BOOKING",
            sales_window_start: new Date(), // default current date
            sales_window_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
            baggage: "30KG",
            seat_buckets: [
                {
                    class: "Economy",
                    seats: 50,
                    price: price || 500,
                },
            ],
            notes: "Imported from Amadeus API",
            terms: "Non-refundable fare",
            created_by: user?.user_id || null,
            status: "PUBLISHED",
        });

        return res.status(201).json({
            success: true,
            message: "Flight imported and group created successfully.",
            data: group,
        });
    } catch (error) {
        console.error("Import Amadeus Flight Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error importing flight.",
            error: error.message,
        });
    }
};

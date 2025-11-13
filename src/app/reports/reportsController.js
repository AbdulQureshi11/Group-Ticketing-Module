import db from "../../config/models.js";
import { Parser } from "json2csv";

const { FlightGroup, Booking, GroupSeatBucket } = db;

/**
 * Helper: send data in CSV or JSON
 */
const sendResponse = (res, data, format, filename) => {
    if (format === "csv") {
        const parser = new Parser();
        const csv = parser.parse(data);
        res.header("Content-Type", "text/csv");
        res.attachment(`${filename}.csv`);
        return res.send(csv);
    }
    return res.status(200).json({ success: true, total: data.length, data });
};

/**
 * GET /reports/groups
 * List all flight groups + summary info
 */
export const reportGroups = async (req, res) => {
    try {
        const { format } = req.query;

        // Include seat buckets if table exists
        const groups = await FlightGroup.findAll({
            include: [{ model: GroupSeatBucket, as: "buckets", required: false }],
            attributes: [
                "id",
                "carrier_code",
                "flight_number",
                "origin",
                "destination",
                "departure_time_local",
                "arrival_time_local",
                "pnr_mode",
                "sales_start",
                "sales_end",
                "status",
                "created_at",
            ],
            order: [["created_at", "DESC"]],
        });

        const reportData = groups.map((g) => ({
            id: g.id,
            flight: `${g.carrier_code || ""}${g.flight_number || ""}`,
            route: `${g.origin || ""}-${g.destination || ""}`,
            status: g.status,
            pnr_mode: g.pnr_mode,
            sales_window: `${g.sales_start?.toISOString().split("T")[0]} → ${g.sales_end?.toISOString().split("T")[0]
                }`,
            total_buckets: g.buckets ? g.buckets.length : 0,
        }));

        return sendResponse(res, reportData, format, "groups-report");
    } catch (err) {
        console.error("Group Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error generating group report.",
            error: err.message,
        });
    }
};

/**
 * GET /reports/bookings
 * Show booking summary with key fields
 */
export const reportBookings = async (req, res) => {
    try {
        const { format } = req.query;
        const bookings = await Booking.findAll({
            attributes: [
                "id",
                "flight_group_id",
                "agency_id",
                "status",
                "pax_counts",
                "remarks",
                "approved_at",
                "payment_received_at",
                "issued_at",
                "created_at",
            ],
            order: [["created_at", "DESC"]],
        });

        const reportData = bookings.map((b) => ({
            booking_id: b.id,
            flight_group_id: b.flight_group_id,
            agency_id: b.agency_id,
            status: b.status,
            adt: b.pax_counts?.adt || 0,
            chd: b.pax_counts?.chd || 0,
            inf: b.pax_counts?.inf || 0,
            remarks: b.remarks || "",
            approved_at: b.approved_at,
            paid_at: b.payment_received_at,
            issued_at: b.issued_at,
        }));

        return sendResponse(res, reportData, format, "bookings-report");
    } catch (err) {
        console.error("Bookings Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error generating bookings report.",
            error: err.message,
        });
    }
};

/**
 * GET /reports/sales
 * Compute total revenue via seat bucket data
 * Formula: (base + tax + fee) × seats_issued
 */
export const reportSales = async (req, res) => {
    try {
        const { format } = req.query;

        // Check if normalized seat bucket table exists
        const buckets = await GroupSeatBucket.findAll({
            attributes: [
                "flight_group_id",
                "class",
                "currency",
                "base_price",
                "tax",
                "fee",
                "seats_issued",
            ],
        });

        const salesData = buckets.map((b) => ({
            flight_group_id: b.flight_group_id,
            class: b.class,
            currency: b.currency || "PKR",
            base_price: b.base_price || 0,
            tax: b.tax || 0,
            fee: b.fee || 0,
            seats_issued: b.seats_issued || 0,
            total_revenue:
                ((b.base_price || 0) + (b.tax || 0) + (b.fee || 0)) *
                (b.seats_issued || 0),
        }));

        return sendResponse(res, salesData, format, "sales-report");
    } catch (err) {
        console.error("Sales Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Error generating sales report.",
            error: err.message,
        });
    }
};

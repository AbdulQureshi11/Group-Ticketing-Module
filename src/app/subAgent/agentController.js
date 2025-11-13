// src/app/subAgent/subAgentController.js

import bcrypt from "bcryptjs";
import db from "../../config/models.js";
import { createNotification } from "../../utils/notificationHelper.js";

const { SubAgentRequest } = db;

/**
 * Public — Register a new Sub-Agent
 * Includes full agency details (PRD requirement)
 */
export const registerSubAgent = async (req, res) => {
  try {
    const {
      agency_name,
      address,
      phone,
      email,
      username,
      password,
      remarks
    } = req.body;

    // Validation
    if (!agency_name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "agency_name, username, email, and password are required.",
      });
    }

    // Check duplicate email or username
    const existing = await SubAgentRequest.findOne({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A registration request with this email already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Sub-Agent Request (PENDING)
    const newRequest = await SubAgentRequest.create({
      agency_name,
      address: address || null,
      phone: phone || null,
      email,
      username,
      password_hash: hashedPassword,
      remarks: remarks || null,
      status: "PENDING",
    });

    // Notification to Admin (PRD requirement)
    await createNotification({
      title: "New Sub-Agent Registration Request",
      message: `A new sub-agent (${username}) has submitted a registration request.`,
      type: "AGENCY",
    });

    res.status(201).json({
      success: true,
      message:
        "Sub-Agent registration submitted successfully. Awaiting admin approval.",
      data: {
        id: newRequest.id,
        agency_name: newRequest.agency_name,
        username: newRequest.username,
        email: newRequest.email,
        phone: newRequest.phone,
        address: newRequest.address,
        status: newRequest.status,
      },
    });
  } catch (error) {
    console.error("Sub-Agent Registration Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting registration request.",
      error: error.message,
    });
  }
};

/**
 * Admin — Get all Sub-Agent registration requests
 * Optional query: ?status=PENDING|APPROVED|REJECTED
 */
export const getAllSubAgentRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const requests = await SubAgentRequest.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Sub-Agent requests fetched successfully.",
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get Sub-Agent Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching Sub-Agent requests.",
      error: error.message,
    });
  }
};

import bcrypt from 'bcryptjs';
import { User } from '../../database/index.js';
import { ROLES } from '../../core/constants/roles.js';
import { Op } from 'sequelize';

/**
 * POST /users
 * Create new user within agency (Admin within agency only)
 * Body: { username, email, password, name, role }
 */
export const createUser = async (req, res) => {
  try {
    const { username, email, password, name, role, phone } = req.body;
    const agencyId = req.user.agencyId; // From authenticated user

    // Validate required fields
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and name are required'
      });
    }

    // Validate role
    if (role && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${Object.values(ROLES).join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        agencyId: agencyId,
        [Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists in your agency'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      username,
      email,
      passwordHash: hashedPassword,
      name,
      role: role || ROLES.AGENT,
      phone,
      agencyId,
      isActive: true
    });

    // Remove password from response
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      agencyId: newUser.agencyId,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * PATCH /users/:id
 * Update user details (Admin only)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const agencyId = req.user.agencyId;

    // Find user
    const user = await User.findOne({
      where: {
        id: parseInt(id),
        agencyId: agencyId
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate allowed updates
    const allowedFields = ['name', 'email', 'phone', 'role', 'isActive'];
    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidFields.join(', ')}`
      });
    }

    // Validate role if being updated
    if (updates.role && !Object.values(ROLES).includes(updates.role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${Object.values(ROLES).join(', ')}`
      });
    }

    // Update user
    await user.update({
      ...updates,
      updatedAt: new Date()
    });

    // Remove password from response
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      agencyId: user.agencyId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

import express from "express";
import { verifyToken, requireRole } from "../../middlewares/authMiddleware.js";
import { createUser, updateUser } from "./userController.js";

const userRouter = express.Router();

userRouter.post("/", verifyToken, requireRole(["ADMIN"]), createUser);
userRouter.patch("/:id", verifyToken, requireRole(["ADMIN"]), updateUser);

export default userRouter;

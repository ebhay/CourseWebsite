import dotenv from "dotenv";
dotenv.config();

import bodyParser from 'body-parser'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

import adminRouter from "./routes/admin.js"
import userRouter from "./routes/user.js";
import courseRouter from "./routes/course.js";

const app = express()
const prisma = new PrismaClient()

app.use(bodyParser.json())
app.use(cors())

app.use("/admin",adminRouter);
app.use("/user",userRouter);
app.use("/course",courseRouter);


app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

export {prisma};
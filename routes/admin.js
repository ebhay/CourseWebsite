import express from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../index.js'
import { verifyPassword, generateToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const Admincheck = await prisma.Admin.findUnique({
            where: { email }
        })
        if (Admincheck) {
            return res.status(400).json({ message: "Admin already exists" })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const Admin = await prisma.Admin.create({
            data: { name, email, password: hashedPassword }
        })
        res.status(201).json({ message: "Admin created successfully", Admin })
     } catch (error) {
        console.error('Admin registration error:', error)
        res.status(500).json({ message: "Internal server error" })
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const Admin = await prisma.Admin.findUnique({
            where: { email }
        })
        if (!Admin) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        
        const isPasswordValid = await verifyPassword(password, Admin.password)
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        
        const token = generateToken({ adminId: Admin.id, email: Admin.email })
        
        res.status(200).json({ 
            message: "Login successful", 
            token,
            admin: { id: Admin.id, name: Admin.name, email: Admin.email }
        })
    }
    catch (error) {
        console.error('Admin login error:', error)
        res.status(500).json({ message: "Internal server error" })
    }
})

export default router;
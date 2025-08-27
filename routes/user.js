import express from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../index.js'
import { verifyPassword, generateToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const Usercheck = await prisma.User.findUnique({
            where: { email }
        })
        if (Usercheck) {
            return res.status(400).json({ message: "User already exists" })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const User = await prisma.User.create({
            data: { name, email, password: hashedPassword }
        })
        res.status(201).json({ message: "User created successfully", User })
     } catch (error) {
        console.error('User registration error:', error)
        res.status(500).json({ message: "Internal server error" })
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const User = await prisma.User.findUnique({
            where: { email }
        })
        if (!User) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        
        const isPasswordValid = await verifyPassword(password, User.password)
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        
        const token = generateToken({ userId: User.id, email: User.email })
        
        res.status(200).json({ 
            message: "Login successful", 
            token,
            user: { id: User.id, name: User.name, email: User.email }
        })
    }
    catch (error) {
        console.error('User login error:', error)
        res.status(500).json({ message: "Internal server error" })
    }
})

export default router;
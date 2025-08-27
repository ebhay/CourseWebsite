import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Create course (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
    const { title, description, imageLink, price } = req.body;
    const adminId = req.user.adminId;
    
    if (!title || !description || !imageLink || !price) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const course = await prisma.course.create({
            data: { 
                title, 
                description, 
                imageLink, 
                price: parseFloat(price),
                adminId
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json({ 
            message: 'Course created successfully', 
            course 
        });
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update course (admin only - can only update their own courses)
router.put('/:courseId', authenticateAdmin, async (req, res) => {
    const { courseId } = req.params;
    const { title, description, imageLink, price } = req.body;
    const adminId = req.user.adminId;

    try {
        // Check if course exists and belongs to the admin
        const existingCourse = await prisma.course.findFirst({
            where: { 
                id: courseId,
                adminId: adminId
            }
        });

        if (!existingCourse) {
            return res.status(404).json({ message: "Course not found or you don't have permission to update it" });
        }

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                title: title || existingCourse.title,
                description: description || existingCourse.description,
                imageLink: imageLink || existingCourse.imageLink,
                price: price ? parseFloat(price) : existingCourse.price
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json({ 
            message: 'Course updated successfully', 
            course: updatedCourse 
        });
    } catch (error) {
        console.error('Course update error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete course (admin only - can only delete their own courses)
router.delete('/:courseId', authenticateAdmin, async (req, res) => {
    const { courseId } = req.params;
    const adminId = req.user.adminId;

    try {
        // Check if course exists and belongs to the admin
        const existingCourse = await prisma.course.findFirst({
            where: { 
                id: courseId,
                adminId: adminId
            }
        });

        if (!existingCourse) {
            return res.status(404).json({ message: "Course not found or you don't have permission to delete it" });
        }

        // Delete related UserCourse records first (due to foreign key constraints)
        await prisma.userCourse.deleteMany({
            where: { courseId }
        });

        // Delete the course
        await prisma.course.delete({
            where: { id: courseId }
        });

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Course deletion error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all courses (admin view - all courses)
router.get('/admin/all', authenticateAdmin, async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                purchasedBy: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get admin's own courses
router.get('/admin/my-courses', authenticateAdmin, async (req, res) => {
    const adminId = req.user.adminId;
    
    try {
        const courses = await prisma.course.findMany({
            where: {
                adminId: adminId
            },
            include: {
                purchasedBy: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({ 
            message: "Your courses retrieved successfully",
            courses 
        });
    } catch (error) {
        console.error('Get admin courses error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== PUBLIC ROUTES ====================

// Get all courses (public view)
router.get('/', async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get course by ID (public)
router.get('/:courseId', async (req, res) => {
    const { courseId } = req.params;

    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== USER ROUTES ====================

// Purchase course (authenticated user)
router.post('/:courseId/purchase', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.userId;

    try {
        // Check if course exists
        const course = await prisma.course.findUnique({
            where: { id: courseId }
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if user already purchased this course
        const existingPurchase = await prisma.userCourse.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            }
        });

        if (existingPurchase) {
            return res.status(400).json({ message: "Course already purchased" });
        }

        // Create purchase record
        const purchase = await prisma.userCourse.create({
            data: {
                userId,
                courseId
            },
            include: {
                course: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json({ 
            message: "Course purchased successfully", 
            purchase 
        });
    } catch (error) {
        console.error('Course purchase error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user's purchased courses
router.get('/user/purchased', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const purchasedCourses = await prisma.userCourse.findMany({
            where: { userId },
            include: {
                course: true
            },
            orderBy: {
                purchasedAt: 'desc'
            }
        });

        res.json({ 
            message: "Purchased courses retrieved successfully",
            purchasedCourses 
        });
    } catch (error) {
        console.error('Get purchased courses error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Check if user has purchased a specific course
router.get('/:courseId/purchased', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.userId;

    try {
        const purchase = await prisma.userCourse.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId
                }
            }
        });

        res.json({ 
            isPurchased: !!purchase,
            purchase 
        });
    } catch (error) {
        console.error('Check purchase status error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;

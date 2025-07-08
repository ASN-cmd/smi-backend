import express from 'express';
import admin from '../firebaseAdmin.js';

const router = express.Router();
const classesCollection = admin.firestore().collection('classes');
const tasksCollection = admin.firestore().collection('tasks');

router.post('/create', async (req, res) => {
    try {
        const { name, description, teacherId, coachId } = req.body;
        const classData = { 
            name,
            studentIds: [],
            createdAt: new Date()
        };
        if (description !== undefined) classData.description = description;
        if (teacherId !== undefined) classData.teacherId = teacherId;
        if (coachId !== undefined) classData.coachId = coachId;
        const classDoc = await classesCollection.add(classData);
        res.json({ id: classDoc.id, name, description: description ?? "", teacherId: teacherId ?? "", coachId: coachId ?? "" });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: 'Failed to create class', details: error.message });
    }
})

router.get('/list', async (req, res) => {
    try {
        const snapshot = await classesCollection.get();
        const classes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(classes);
    } catch (error) {
        // Add this line for detailed logging
        console.error('Error fetching classes:', error, error.stack);
        res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
    }
})

router.post('/:classId/add-student', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        
        const classDoc = await classesCollection.doc(classId).get();
        if (!classDoc.exists) {
            return res.status(404).json({ error: 'Class not found' });
        }
        
        const classData = classDoc.data();
        const studentIds = classData.studentIds || [];
        
        if (studentIds.includes(studentId)) {
            return res.status(400).json({ error: 'Student already in class' });
        }
        
        // Check if student is already enrolled in any other class
        const allClassesSnapshot = await classesCollection.get();
        for (const doc of allClassesSnapshot.docs) {
            if (doc.id !== classId) { // Skip current class
                const otherClassData = doc.data();
                const otherStudentIds = otherClassData.studentIds || [];
                if (otherStudentIds.includes(studentId)) {
                    return res.status(400).json({ 
                        error: 'Student is already enrolled in another class',
                        details: `Student is currently in class: ${otherClassData.name}`
                    });
                }
            }
        }
        
        studentIds.push(studentId);
        await classesCollection.doc(classId).update({ studentIds });
        
        res.json({ success: true, message: 'Student added to class' });
    } catch (error) {
        console.error('Error adding student to class:', error);
        res.status(500).json({ error: 'Failed to add student to class', details: error.message });
    }
})

router.post('/:classId/remove-student', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        
        const classDoc = await classesCollection.doc(classId).get();
        if (!classDoc.exists) {
            return res.status(404).json({ error: 'Class not found' });
        }
        
        const classData = classDoc.data();
        const studentIds = classData.studentIds || [];
        
        if (!studentIds.includes(studentId)) {
            return res.status(400).json({ error: 'Student not in class' });
        }
        
        const updatedStudentIds = studentIds.filter(id => id !== studentId);
        await classesCollection.doc(classId).update({ studentIds: updatedStudentIds });
        
        res.json({ success: true, message: 'Student removed from class' });
    } catch (error) {
        console.error('Error removing student from class:', error);
        res.status(500).json({ error: 'Failed to remove student from class', details: error.message });
    }
})

// Task Management Routes
router.post('/:classId/tasks', async (req, res) => {
    try {
        const { classId } = req.params;
        const { title, description, dueDate, assignedStudents } = req.body;
        
        const classDoc = await classesCollection.doc(classId).get();
        if (!classDoc.exists) {
            return res.status(404).json({ error: 'Class not found' });
        }
        
        const taskData = {
            classId,
            title,
            description: description || '',
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedStudents: assignedStudents || [],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const taskDoc = await tasksCollection.add(taskData);
        res.json({ 
            success: true, 
            message: 'Task created successfully',
            taskId: taskDoc.id,
            task: { id: taskDoc.id, ...taskData }
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task', details: error.message });
    }
})

router.get('/:classId/tasks', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const tasksSnapshot = await tasksCollection
            .where('classId', '==', classId)
            .get();
        
        const tasks = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sort by createdAt in descending order (newest first)
        tasks.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }
})

router.put('/:classId/tasks/:taskId', async (req, res) => {
    try {
        const { classId, taskId } = req.params;
        const { title, description, dueDate, assignedStudents, status } = req.body;
        
        const taskDoc = await tasksCollection.doc(taskId).get();
        if (!taskDoc.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        await tasksCollection.doc(taskId).update(updateData);
        res.json({ success: true, message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task', details: error.message });
    }
})

router.delete('/:classId/tasks/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        
        await tasksCollection.doc(taskId).delete();
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task', details: error.message });
    }
})

router.delete('/:classId', async (req, res) => {
    try {
        await classesCollection.doc(req.params.classId).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete class', details: error.message });
    }
})

// Add endpoint to update class details, including coachId
router.put('/:classId/update', async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description, teacherId, coachId } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (teacherId !== undefined) updateData.teacherId = teacherId;
        if (coachId !== undefined) updateData.coachId = coachId;
        updateData.updatedAt = new Date();
        await classesCollection.doc(classId).update(updateData);
        res.json({ success: true, message: 'Class updated successfully' });
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ error: 'Failed to update class', details: error.message });
    }
});

// Endpoint for coach to fetch their assigned classes and student details
router.get('/coach/:coachId/classes', async (req, res) => {
    try {
        const { coachId } = req.params;
        // Fetch all classes where coachId matches
        const classesSnapshot = await classesCollection.where('coachId', '==', coachId).get();
        const classes = [];
        for (const doc of classesSnapshot.docs) {
            const classData = doc.data();
            // Fetch student details for each studentId
            let students = [];
            if (classData.studentIds && classData.studentIds.length > 0) {
                const usersCollection = admin.firestore().collection('users');
                const studentPromises = classData.studentIds.map(studentId => usersCollection.doc(studentId).get());
                const studentDocs = await Promise.all(studentPromises);
                students = studentDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
            }
            classes.push({ id: doc.id, ...classData, students });
        }
        res.json(classes);
    } catch (error) {
        console.error('Error fetching coach classes:', error);
        res.status(500).json({ error: 'Failed to fetch coach classes', details: error.message });
    }
});

export default router;
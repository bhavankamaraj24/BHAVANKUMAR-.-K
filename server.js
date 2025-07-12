const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/todoapp';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully!');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error);
});

// Task Schema
const taskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    completed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

taskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Task = mongoose.model('Task', taskSchema);

// Create API router
const apiRouter = express.Router();

// GET /api/tasks - Get all tasks
apiRouter.get('/tasks', async (req, res) => {
    try {
        const { filter } = req.query;
        let query = {};
        
        if (filter === 'active') {
            query.completed = false;
        } else if (filter === 'completed') {
            query.completed = true;
        }
        
        const tasks = await Task.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: tasks,
            count: tasks.length
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasks',
            error: error.message
        });
    }
});

// GET /api/tasks/:id - Get specific task
apiRouter.get('/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching task',
            error: error.message
        });
    }
});

// POST /api/tasks - Create new task
apiRouter.post('/tasks', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Task text is required'
            });
        }
        
        const newTask = new Task({
            text: text.trim()
        });
        
        const savedTask = await newTask.save();
        
        res.status(201).json({
            success: true,
            data: savedTask,
            message: 'Task created successfully'
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating task',
            error: error.message
        });
    }
});

// PUT /api/tasks/:id - Update task
apiRouter.put('/tasks/:id', async (req, res) => {
    try {
        const { text, completed } = req.body;
        const taskId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }
        
        const updateData = {};
        if (text !== undefined) updateData.text = text.trim();
        if (completed !== undefined) updateData.completed = completed;
        updateData.updatedAt = Date.now();
        
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            data: updatedTask,
            message: 'Task updated successfully'
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating task',
            error: error.message
        });
    }
});

// DELETE /api/tasks/:id - Delete task
apiRouter.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }
        
        const deletedTask = await Task.findByIdAndDelete(taskId);
        
        if (!deletedTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        res.json({
            success: true,
            data: deletedTask,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting task',
            error: error.message
        });
    }
});

// PATCH /api/tasks/:id/toggle - Toggle task completion
apiRouter.patch('/tasks/:id/toggle', async (req, res) => {
    try {
        const taskId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }
        
        const task = await Task.findById(taskId);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        task.completed = !task.completed;
        task.updatedAt = Date.now();
        
        const updatedTask = await task.save();
        
        res.json({
            success: true,
            data: updatedTask,
            message: `Task marked as ${updatedTask.completed ? 'completed' : 'active'}`
        });
    } catch (error) {
        console.error('Error toggling task:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling task',
            error: error.message
        });
    }
});

// GET /api/stats - Get statistics
apiRouter.get('/stats', async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments();
        const completedTasks = await Task.countDocuments({ completed: true });
        const activeTasks = await Task.countDocuments({ completed: false });
        
        res.json({
            success: true,
            data: {
                total: totalTasks,
                completed: completedTasks,
                active: activeTasks
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

// Use the API router
app.use('/api', apiRouter);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 for unknown routes
app.use((req, res) => {
    if (req.url.startsWith('/api')) {
        res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    } else {
        res.status(404).send('Page not found');
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/tasks`);
    console.log(`🎯 MongoDB connected to: ${MONGODB_URI}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
});

module.exports = app;
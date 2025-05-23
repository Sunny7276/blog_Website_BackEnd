const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'blogwebsite',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// -------- AUTH ROUTES -----------

// Signup route
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });
  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ? OR userName = ?', [email, username]);
    if (rows.length > 0) {
      return res.status(409).json({ success: false, message: 'User or Email already exists' });
    }
    await pool.query('INSERT INTO user (userName, email, password) VALUES (?, ?, ?)', [username, email, password]);
    res.json({ success: true, message: 'Signup successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ? AND password = ?', [email, password]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Return minimal user info to frontend
    const user = rows[0];
    res.json({ success: true, user: { userId: user.userId, userName: user.userName, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// -------- BLOG ROUTES -----------

// Get all public, active blogs (for Home)
app.get('/api/blogs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT b.blogId, b.blogTopic, b.blogTitle, b.createdOn, b.likes, b.dislikes, u.userName AS author FROM blogcontent b JOIN user u ON b.blogAuthor = u.userId WHERE b.privacy = false AND b.status = true ORDER BY b.createdOn DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

// Get blog by ID - check privacy and user
app.get('/api/blogs/:id', async (req, res) => {
  const blogId = req.params.id;
  const userId = req.query.userId; // optional userId from frontend
  try {
    const [rows] = await pool.query(
      'SELECT b.*, u.userName AS author FROM blogcontent b JOIN user u ON b.blogAuthor = u.userId WHERE b.blogId = ? AND b.status = true',
      [blogId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });

    const blog = rows[0];
    // If private blog, only owner can view
    if (blog.privacy && blog.blogAuthor != userId) {
      return res.status(403).json({ message: 'You do not have permission to view this blog' });
    }

    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching blog' });
  }
});

// Create new blog post
app.post('/api/blogs', async (req, res) => {
  const { blogAuthor, blogTopic, blogTitle, blogContent, privacy } = req.body;
  if (!blogAuthor || !blogTopic || !blogTitle) {
    return res.status(400).json({ message: 'Required fields missing' });
  }
  try {
    await pool.query(
      'INSERT INTO blogcontent (blogAuthor, blogTopic, blogTitle, blogContent, privacy) VALUES (?, ?, ?, ?, ?)',
      [blogAuthor, blogTopic, blogTitle, blogContent || '', privacy || false]
    );
    res.json({ message: 'Blog created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating blog' });
  }
});

// Get all blogs of a user (active only)
app.get('/api/blogs/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM blogcontent WHERE blogAuthor = ? AND status = true ORDER BY createdOn DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching user blogs' });
  }
});

// Update blog by ID (only owner)
app.put('/api/blogs/:id', async (req, res) => {
  const blogId = req.params.id;
  const { blogAuthor, blogTopic, blogTitle, blogContent, privacy, status } = req.body;
  if (!blogAuthor) return res.status(400).json({ message: 'Author ID required' });

  try {
    // Check ownership
    const [rows] = await pool.query('SELECT blogAuthor FROM blogcontent WHERE blogId = ?', [blogId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });
    if (rows[0].blogAuthor != blogAuthor) return res.status(403).json({ message: 'Not authorized' });

    await pool.query(
      'UPDATE blogcontent SET blogTopic = ?, blogTitle = ?, blogContent = ?, privacy = ?, status = ? WHERE blogId = ?',
      [blogTopic, blogTitle, blogContent, privacy, status, blogId]
    );
    res.json({ message: 'Blog updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating blog' });
  }
});

// -------- COMMENT ROUTES -----------

// Get comments for blog (active only)
app.get('/api/comments/:blogId', async (req, res) => {
  const blogId = req.params.blogId;
  try {
    const [rows] = await pool.query(
      'SELECT commentId, commentContent, commentedOn FROM blogcomment WHERE blogId = ? AND status = true ORDER BY commentedOn DESC',
      [blogId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Add comment to blog
app.post('/api/comments', async (req, res) => {
  const { blogId, commentContent } = req.body;
  if (!blogId || !commentContent) return res.status(400).json({ message: 'Blog ID and comment content required' });
  try {
    await pool.query('INSERT INTO blogcomment (blogId, commentContent) VALUES (?, ?)', [blogId, commentContent]);
    res.json({ message: 'Comment added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Soft delete comment by ID
app.delete('/api/comments/:commentId', async (req, res) => {
  const commentId = req.params.commentId;
  try {
    await pool.query('UPDATE blogcomment SET status = false WHERE commentId = ?', [commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

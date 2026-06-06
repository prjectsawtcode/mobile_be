const { pool } = require('../../config/db');

const createPostsTable = `
  CREATE TABLE IF NOT EXISTS community_posts (
    id CHAR(36) PRIMARY KEY,
    author_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

const createCommentsTable = `
  CREATE TABLE IF NOT EXISTS community_comments (
    id CHAR(36) PRIMARY KEY,
    post_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

const createLikesTable = `
  CREATE TABLE IF NOT EXISTS community_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    UNIQUE KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`;

async function init() {
  await pool.query(createPostsTable);
  await pool.query(createCommentsTable);
  await pool.query(createLikesTable);
}

async function getPosts(page, limit) {
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM community_posts WHERE is_deleted = FALSE'
  );
  const [rows] = await pool.query(
    `SELECT p.id, p.author_id, u.name as author_name, p.content, p.image_url, p.is_deleted, p.created_at,
     (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as like_count,
     (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comment_count
     FROM community_posts p JOIN users u ON p.author_id = u.id
     WHERE p.is_deleted = FALSE ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
  return { rows, total, page, limit };
}

async function createPost(data) {
  await pool.query(
    'INSERT INTO community_posts (id, author_id, content, image_url) VALUES (?, ?, ?, ?)',
    [data.id, data.author_id, data.content, data.image_url]
  );
  return { id: data.id, author_id: data.author_id, content: data.content, image_url: data.image_url };
}

async function softDelete(id) {
  await pool.query('UPDATE community_posts SET is_deleted = TRUE WHERE id = ?', [id]);
}

async function toggleLike(postId, userId) {
  const [existing] = await pool.query('SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  if (existing.length) {
    await pool.query('DELETE FROM community_likes WHERE id = ?', [existing[0].id]);
    return { liked: false };
  }
  await pool.query('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  return { liked: true };
}

async function getComments(postId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id, c.author_id, u.name as author_name, c.content, c.created_at
     FROM community_comments c JOIN users u ON c.author_id = u.id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`, [postId]
  );
  return rows;
}

async function createComment(data) {
  await pool.query(
    'INSERT INTO community_comments (id, post_id, author_id, content) VALUES (?, ?, ?, ?)',
    [data.id, data.post_id, data.author_id, data.content]
  );
  return { id: data.id, post_id: data.post_id, author_id: data.author_id, content: data.content };
}

async function deleteComment(id) {
  await pool.query('DELETE FROM community_comments WHERE id = ?', [id]);
}

module.exports = { init, getPosts, createPost, softDelete, toggleLike, getComments, createComment, deleteComment };

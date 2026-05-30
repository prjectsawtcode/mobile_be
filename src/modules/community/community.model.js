const db = require('../../config/db');

const CommunityModel = {
  async listPosts({ page, limit }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT cp.*, u.name as author_name, u.id as author_id,
        (SELECT COUNT(*) FROM community_likes WHERE post_id = cp.id) as like_count,
        (SELECT COUNT(*) FROM community_comments WHERE post_id = cp.id AND is_deleted = 0) as comment_count
       FROM community_posts cp 
       JOIN users u ON u.id = cp.author_id 
       WHERE cp.is_deleted = 0 
       ORDER BY cp.created_at DESC 
       LIMIT ? OFFSET ?`,
      [String(limit), String(offset)]
    );
    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM community_posts WHERE is_deleted = 0'
    );
    return { rows, total: count, page, limit };
  },

  async createPost(data) {
    await db.query('INSERT INTO community_posts SET ?', data);
  },

  async softDeletePost(id) {
    await db.query('UPDATE community_posts SET is_deleted = 1 WHERE id = ?', [id]);
  },

  async findPost(id) {
    const [rows] = await db.query('SELECT * FROM community_posts WHERE id = ? AND is_deleted = 0', [id]);
    return rows[0];
  },

  async toggleLike(postId, userId) {
    const [existing] = await db.query(
      'SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
    if (existing[0]) {
      await db.query('DELETE FROM community_likes WHERE id = ?', [existing[0].id]);
      return { liked: false };
    }
    await db.query('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    return { liked: true };
  },

  async getComments(postId) {
    const [rows] = await db.query(
      `SELECT cc.*, u.name as author_name 
       FROM community_comments cc 
       JOIN users u ON u.id = cc.author_id 
       WHERE cc.post_id = ? AND cc.is_deleted = 0 
       ORDER BY cc.created_at ASC`,
      [postId]
    );
    return rows;
  },

  async addComment(data) {
    await db.query('INSERT INTO community_comments SET ?', data);
  },

  async findComment(id) {
    const [rows] = await db.query('SELECT * FROM community_comments WHERE id = ?', [id]);
    return rows[0];
  },

  async softDeleteComment(id) {
    await db.query('UPDATE community_comments SET is_deleted = 1 WHERE id = ?', [id]);
  },
};

module.exports = CommunityModel;

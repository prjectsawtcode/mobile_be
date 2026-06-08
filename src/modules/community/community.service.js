const { randomUUID } = require('crypto');
const model = require('./community.model');

async function listPosts(query) {
  return model.getPosts(Number(query.page) || 1, Number(query.limit) || 20);
}

async function createPost(userId, { content, image_url }) {
  return model.createPost({ id: randomUUID(), author_id: userId, content, image_url });
}

async function deletePost(userId, postId) {
  const { pool } = require('../../config/db');
  const [posts] = await pool.query(
    'SELECT author_id FROM community_posts WHERE id = ?', [postId]
  );
  if (!posts[0]) throw Object.assign(new Error('Post not found'), { status: 404 });
  if (posts[0].author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  await model.softDelete(postId);
  return { message: 'Post deleted' };
}

async function toggleLike(userId, postId) {
  const { pool } = require('../../config/db');
  const [posts] = await pool.query(
    'SELECT id FROM community_posts WHERE id = ?', [postId]
  );
  if (!posts[0]) throw Object.assign(new Error('Post not found'), { status: 404 });
  return model.toggleLike(postId, userId);
}

async function listComments(postId) {
  return model.getComments(postId);
}

async function createComment(userId, postId, { content }) {
  const { pool } = require('../../config/db');
  const [posts] = await pool.query(
    'SELECT id FROM community_posts WHERE id = ?', [postId]
  );
  if (!posts[0]) throw Object.assign(new Error('Post not found'), { status: 404 });
  return model.createComment({ id: randomUUID(), post_id: postId, author_id: userId, content });
}

async function deleteComment(userId, commentId) {
  const { pool } = require('../../config/db');
  const [comments] = await pool.query(
    'SELECT author_id FROM community_comments WHERE id = ?', [commentId]
  );
  if (!comments[0]) throw Object.assign(new Error('Comment not found'), { status: 404 });
  if (comments[0].author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  await model.deleteComment(commentId);
  return { message: 'Comment deleted' };
}

module.exports = { listPosts, createPost, deletePost, toggleLike, listComments, createComment, deleteComment };

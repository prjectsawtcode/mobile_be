const { v4: uuidv4 } = require('uuid');
const { get, set, del } = require('../../config/cache');
const CommunityModel = require('./community.model');

exports.listPosts = async (query) => {
  const { page = 1, limit = 20 } = query;
  const cacheKey = `community:posts:${page}:${limit}`;

  const cached = await get(cacheKey);
  if (cached) return cached;

  const result = await CommunityModel.listPosts({ page: Number(page), limit: Number(limit) });
  await set(cacheKey, result, 30);
  return result;
};

exports.createPost = async (userId, data) => {
  const post = { id: uuidv4(), author_id: userId, ...data };
  await CommunityModel.createPost(post);
  await del('community:posts:1:20');
  return post;
};

exports.deletePost = async (userId, postId, userRole) => {
  const post = await CommunityModel.findPost(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  if (post.author_id !== userId && userRole !== 'admin') {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  await CommunityModel.softDeletePost(postId);
  return { message: 'Post deleted' };
};

exports.toggleLike = async (postId, userId) => {
  const post = await CommunityModel.findPost(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  const result = await CommunityModel.toggleLike(postId, userId);
  return result;
};

exports.getComments = async (postId) => {
  const cacheKey = `community:comments:${postId}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  const comments = await CommunityModel.getComments(postId);
  await set(cacheKey, comments, 30);
  return comments;
};

exports.addComment = async (userId, postId, data) => {
  const post = await CommunityModel.findPost(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  const comment = { id: uuidv4(), post_id: postId, author_id: userId, ...data };
  await CommunityModel.addComment(comment);
  await del(`community:comments:${postId}`);
  return comment;
};

exports.deleteComment = async (userId, commentId, userRole) => {
  const comment = await CommunityModel.findComment(commentId);
  if (!comment) throw Object.assign(new Error('Comment not found'), { status: 404 });
  if (comment.author_id !== userId && userRole !== 'admin') {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  await CommunityModel.softDeleteComment(commentId);
  return { message: 'Comment deleted' };
};

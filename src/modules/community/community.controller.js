const CommunityService = require('./community.service');

exports.listPosts = async (req, res, next) => {
  try {
    const result = await CommunityService.listPosts(req.query);
    res.json(result);
  } catch (e) { next(e); }
};

exports.createPost = async (req, res, next) => {
  try {
    const result = await CommunityService.createPost(req.user.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const result = await CommunityService.deletePost(req.user.id, req.params.id, req.user.role);
    res.json(result);
  } catch (e) { next(e); }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const result = await CommunityService.toggleLike(req.params.id, req.user.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.getComments = async (req, res, next) => {
  try {
    const result = await CommunityService.getComments(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

exports.addComment = async (req, res, next) => {
  try {
    const result = await CommunityService.addComment(req.user.id, req.params.id, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const result = await CommunityService.deleteComment(req.user.id, req.params.id, req.user.role);
    res.json(result);
  } catch (e) { next(e); }
};

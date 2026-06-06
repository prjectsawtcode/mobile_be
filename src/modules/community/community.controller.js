const service = require('./community.service');

exports.listPosts = async (req, res, next) => {
  try { res.json(await service.listPosts(req.query)); } catch (e) { next(e); }
};

exports.createPost = async (req, res, next) => {
  try { res.status(201).json(await service.createPost(req.user.id, req.body)); } catch (e) { next(e); }
};

exports.deletePost = async (req, res, next) => {
  try { res.json(await service.deletePost(req.user.id, req.params.id)); } catch (e) { next(e); }
};

exports.toggleLike = async (req, res, next) => {
  try { res.json(await service.toggleLike(req.user.id, req.params.id)); } catch (e) { next(e); }
};

exports.listComments = async (req, res, next) => {
  try {
    const comments = await service.listComments(req.params.id);
    res.json({ rows: comments });
  } catch (e) { next(e); }
};

exports.createComment = async (req, res, next) => {
  try { res.status(201).json(await service.createComment(req.user.id, req.params.id, req.body)); } catch (e) { next(e); }
};

exports.deleteComment = async (req, res, next) => {
  try { res.json(await service.deleteComment(req.user.id, req.params.id)); } catch (e) { next(e); }
};

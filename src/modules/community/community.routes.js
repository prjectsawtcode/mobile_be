const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ctrl = require('./community.controller');
const schema = require('./community.validation');

const router = Router();

router.get('/posts', authenticate, ctrl.listPosts);
router.post('/posts', authenticate, validate(schema.createPost), ctrl.createPost);
router.delete('/posts/:id', authenticate, ctrl.deletePost);
router.post('/posts/:id/like', authenticate, ctrl.toggleLike);
router.get('/posts/:id/comments', authenticate, ctrl.getComments);
router.post('/posts/:id/comments', authenticate, validate(schema.addComment), ctrl.addComment);
router.delete('/comments/:id', authenticate, ctrl.deleteComment);

module.exports = router;

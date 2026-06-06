const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./community.controller');
const schema = require('./community.validation');

const router = Router();

router.get('/posts', authenticate, controller.listPosts);
router.post('/posts', authenticate, validate(schema.createPost), controller.createPost);
router.delete('/posts/:id', authenticate, controller.deletePost);
router.post('/posts/:id/like', authenticate, controller.toggleLike);
router.get('/posts/:id/comments', authenticate, controller.listComments);
router.post('/posts/:id/comments', authenticate, validate(schema.createComment), controller.createComment);
router.delete('/comments/:id', authenticate, controller.deleteComment);

module.exports = router;

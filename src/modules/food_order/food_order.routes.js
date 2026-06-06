const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./food_order.controller');
const schema = require('./food_order.validation');

const router = Router();

router.get('/menu', authenticate, controller.getMenu);
router.get('/menu/my', authenticate, controller.listMyMenu);
router.get('/categories', authenticate, controller.getCategories);
router.get('/categories/:id', authenticate, controller.getCategoryById);
router.post('/categories', authenticate, authorize('admin', 'subscriber'), validate(schema.createCategory), controller.createCategory);
router.patch('/categories/:id', authenticate, authorize('admin', 'subscriber'), validate(schema.updateCategory), controller.updateCategory);
router.delete('/categories/:id', authenticate, authorize('admin', 'subscriber'), controller.removeCategory);
router.get('/categories/:categoryId/items', authenticate, controller.getMenuItems);
router.post('/items', authenticate, authorize('admin', 'subscriber'), validate(schema.createMenuItem), controller.createMenuItem);
router.patch('/items/:id', authenticate, authorize('admin', 'subscriber'), validate(schema.updateMenuItem), controller.updateMenuItem);
router.delete('/items/:id', authenticate, authorize('admin', 'subscriber'), controller.removeMenuItem);

module.exports = router;

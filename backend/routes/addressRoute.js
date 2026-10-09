const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const verifyToken = require('../middleware/verifyToken');

// add address (always saved for the logged-in user)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { houseNo, pincode, city, state } = req.body;
        const data = new Address({
            userId: req.user.id,   // from the login token, not from the request body
            houseNo,
            pincode,
            city,
            state,
        });
        await data.save();
        res.json({ msg: 'Address added successfully' });
    }
    catch (er) {
        res.json({ msg: 'Failed to add address' });
    }
});

// addresses of a particular user (only that user can see them)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        if (req.params.id !== req.user.id) {
            return res.status(403).json({ msg: 'You are not allowed to view these addresses' });
        }
        const data = await Address.find({
            userId: req.user.id,
            status: { $in: ['active', 'default'] },
        }).lean();
        res.json({ msg: 'Address featch successfully', data: data });
    }
    catch (er) {
        res.json({ msg: 'Failed to fetch address' });
    }
});

// set default address (only one default per user)
router.patch('/default/:id', verifyToken, async (req, res) => {
    try {
        // looks up by address id AND owner, so other people's addresses are "not found"
        const address = await Address.findOne({ _id: req.params.id, userId: req.user.id });
        if (!address) return res.status(404).json({ msg: 'Address not found' });

        // 1. demote the user's current default
        await Address.updateMany(
            { userId: req.user.id, status: 'default' },
            { status: 'active' }
        );

        // 2. promote the chosen one
        address.status = 'default';
        await address.save();

        res.json({ msg: 'Default address set successfully', data: address });
    }
    catch (er) {
        res.json({ msg: 'Failed to set default address' });
    }
});

// delete address (soft delete, so old orders still have their address)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const data = await Address.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { status: 'inactive' },
            { new: true }
        );
        if (!data) return res.status(404).json({ msg: 'Address not found' });
        res.json({ msg: 'Address deleted successfully', data: data });
    }
    catch (er) {
        res.json({ msg: 'Failed to delete address' });
    }
});

module.exports = router;
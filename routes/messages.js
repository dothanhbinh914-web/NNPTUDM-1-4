var express = require('express')
var router = express.Router()
let mongoose = require('mongoose')
let messageModel = require('../schemas/messages')
let { CheckLogin } = require('../utils/authHandler')
let { uploadFile } = require('../utils/uploadHandler')

// GET /:userID - Lấy toàn bộ message giữa user hiện tại và userID
router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id
        let otherUser = req.params.userID

        let messages = await messageModel.find({
            $or: [
                { from: currentUser, to: otherUser },
                { from: otherUser, to: currentUser }
            ]
        })
            .populate('from', 'username fullName avatarUrl')
            .populate('to', 'username fullName avatarUrl')
            .sort({ createdAt: 1 })

        res.send(messages)
    } catch (error) {
        res.status(404).send({ message: error.message })
    }
})

// POST / - Gửi message (text hoặc file)
router.post('/', CheckLogin, uploadFile.single('file'), async function (req, res, next) {
    try {
        let currentUser = req.user._id
        let to = req.body.to

        if (!to) {
            return res.status(400).send({ message: 'to khong duoc de trong' })
        }

        let messageContent
        if (req.file) {
            messageContent = {
                type: 'file',
                text: req.file.path
            }
        } else {
            if (!req.body.text) {
                return res.status(400).send({ message: 'text khong duoc de trong' })
            }
            messageContent = {
                type: 'text',
                text: req.body.text
            }
        }

        let newMessage = new messageModel({
            from: currentUser,
            to: to,
            messageContent: messageContent
        })
        await newMessage.save()

        let result = await messageModel.findById(newMessage._id)
            .populate('from', 'username fullName avatarUrl')
            .populate('to', 'username fullName avatarUrl')

        res.send(result)
    } catch (error) {
        res.status(404).send({ message: error.message })
    }
})

// GET / - Lấy message cuối cùng của mỗi user đã nhắn tin với user hiện tại
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id

        let messages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUser },
                        { to: currentUser }
                    ]
                }
            },
            {
                $addFields: {
                    partner: {
                        $cond: {
                            if: { $eq: ['$from', currentUser] },
                            then: '$to',
                            else: '$from'
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$partner',
                    lastMessage: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$lastMessage' } },
            { $sort: { createdAt: -1 } }
        ])

        await messageModel.populate(messages, { path: 'from', select: 'username fullName avatarUrl' })
        await messageModel.populate(messages, { path: 'to', select: 'username fullName avatarUrl' })

        res.send(messages)
    } catch (error) {
        res.status(404).send({ message: error.message })
    }
})

module.exports = router
